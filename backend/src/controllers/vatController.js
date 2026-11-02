const Organization = require('../models/Organization');
const Invoice = require('../models/Invoice');
const Expense = require('../models/Expense');
const VATDeclaration = require('../models/VATDeclaration');
const PDFDocument = require('pdfkit');

// Fonction utilitaire pour récupérer l'organisation de l'utilisateur
const getUserOrg = async (userId) =>
  Organization.findOne({
    $or: [{ clerkOwnerId: userId }, { 'members.clerkUserId': userId }],
  });

/**
 * Calcule la TVA (collectée ou déductible) en agrégeant les montants
 * depuis les modèles Invoice ou Expense pour une période donnée.
 */
const calculateVAT = async (model, orgId, dateRange, sumField, extraMatch = {}) => {
  const result = await model.aggregate([
    {
      $match: {
        organizationId: orgId,
        ...dateRange,
        ...extraMatch,
      },
    },
    {
      $group: {
        _id: null,
        total: { $sum: `$${sumField}` },
      },
    },
  ]);

  return result.length > 0 ? result[0].total : 0;
};

/**
 * Période de filtrage. Une date de fin sans heure (AAAA-MM-JJ) couvre toute la journée,
 * sinon les opérations du dernier jour seraient exclues.
 */
const periodRange = (from, to) => {
  const end = new Date(to);
  if (end.getTime() % 86400000 === 0) end.setUTCHours(23, 59, 59, 999);
  return { $gte: new Date(from), $lte: end };
};

// Lit et valide la période de la requête ; répond 400 et renvoie null si elle est invalide
const parsePeriod = (req, res) => {
  const { from, to } = req.query;
  if (!from || !to) {
    res.status(400).json({ error: 'Les dates de début (from) et de fin (to) sont requises.' });
    return null;
  }
  const range = periodRange(from, to);
  if (Number.isNaN(range.$gte.getTime()) || Number.isNaN(range.$lte.getTime())) {
    res.status(400).json({ error: 'Période invalide.' });
    return null;
  }
  return range;
};

/**
 * Opérations retenues pour la TVA (mêmes critères que le résumé), triées par date croissante.
 */
const getVatOperations = async (orgId, range) => {
  const [invoices, expenses] = await Promise.all([
    Invoice.find({ organizationId: orgId, status: 'paid', paidAt: range }).populate('clientId', 'name').lean(),
    Expense.find({ organizationId: orgId, status: 'validated', date: range, vatRecoverable: { $gt: 0 } }).lean(),
  ]);

  return [
    ...invoices.map((inv) => ({
      id: inv._id,
      date: inv.paidAt,
      type: 'sale',
      label: `Facture ${inv.number}`,
      thirdParty: inv.clientId?.name || 'Client inconnu',
      amountHT: inv.subtotal,
      vatAmount: inv.vatAmount,
      amountTTC: inv.total,
    })),
    ...expenses.map((exp) => ({
      id: exp._id,
      date: exp.date,
      type: exp.assetCategory ? 'asset' : 'purchase',
      label: exp.description,
      thirdParty: exp.vendor || 'Fournisseur',
      amountHT: exp.amountHT,
      vatAmount: exp.vatRecoverable,
      amountTTC: exp.amount,
    })),
  ].sort((a, b) => new Date(a.date) - new Date(b.date));
};

// GET /api/vat/summary?from=...&to=...
const getVatSummary = async (req, res) => {
  const org = await getUserOrg(req.userId);
  if (!org) return res.status(404).json({ error: 'Organisation introuvable.' });

  const { from, to } = req.query;
  if (!from || !to) {
    return res.status(400).json({ error: 'Les dates de début (from) et de fin (to) sont requises.' });
  }

  const dateRangeInvoices = { paidAt: periodRange(from, to) };
  const dateRangeExpenses = { date: periodRange(from, to) };

  const r = (n) => Math.round(n * 100) / 100;

  // 1. TVA collectée totale
  const collectedVAT = await calculateVAT(Invoice, org._id, dateRangeInvoices, 'vatAmount', { status: 'paid' });

  // 2. TVA collectée par taux (pour mapping CA3 cases 01/11/13)
  const collectedByRate = await Invoice.aggregate([
    { $match: { organizationId: org._id, status: 'paid', ...dateRangeInvoices } },
    { $unwind: '$lines' },
    { $group: {
      _id: '$lines.vatRate',
      vatAmount: { $sum: { $multiply: ['$lines.quantity', '$lines.unitPrice', { $divide: ['$lines.vatRate', 100] }] } },
      baseHT:    { $sum: { $multiply: ['$lines.quantity', '$lines.unitPrice'] } }
    }}
  ]);
  const collectedVAT_details = {};
  collectedByRate.forEach(({ _id, vatAmount, baseHT }) => {
    if (_id != null) collectedVAT_details[_id] = { vatAmount: r(vatAmount), baseHT: r(baseHT) };
  });

  // 3. TVA déductible — services (assetCategory false ou absent)
  const deductibleVAT_services = await calculateVAT(Expense, org._id, dateRangeExpenses, 'vatRecoverable', {
    status: 'validated', assetCategory: { $ne: true },
  });

  // 4. TVA déductible — immobilisations
  const deductibleVAT_assets = await calculateVAT(Expense, org._id, dateRangeExpenses, 'vatRecoverable', {
    status: 'validated', assetCategory: true,
  });

  const totalDeductibleVAT = deductibleVAT_services + deductibleVAT_assets;
  const vatBalance = collectedVAT - totalDeductibleVAT;

  // 5. Statistiques de complétude des justificatifs
  const completionAgg = await Expense.aggregate([
    { $match: { organizationId: org._id, status: 'validated', ...dateRangeExpenses } },
    { $group: {
      _id: null,
      total: { $sum: 1 },
      withReceipt: { $sum: { $cond: [{ $and: [{ $ne: ['$receiptUrl', null] }, { $ne: ['$receiptUrl', ''] }] }, 1, 0] } }
    }}
  ]);
  const completionRaw = completionAgg[0] || { total: 0, withReceipt: 0 };
  const completionStats = {
    totalExpenses: completionRaw.total,
    withReceipt: completionRaw.withReceipt,
    completionPct: completionRaw.total > 0 ? r((completionRaw.withReceipt / completionRaw.total) * 100) : 100
  };

  // 6. Liste des dépenses validées pour l'export PDF
  const expenses = await Expense.find({
    organizationId: org._id, status: 'validated', ...dateRangeExpenses,
  }).select('description vendor date category amountHT vatRate vatRecoverable amount receiptUrl assetCategory').sort({ date: -1 }).lean();

  res.json({
    collectedVAT:          r(collectedVAT),
    collectedVAT_details,
    deductibleVAT_services: r(deductibleVAT_services),
    deductibleVAT_assets:   r(deductibleVAT_assets),
    totalDeductibleVAT:     r(totalDeductibleVAT),
    vatDue:    vatBalance > 0 ? r(vatBalance)  : 0,
    vatCredit: vatBalance < 0 ? r(-vatBalance) : 0,
    completionStats,
    expenses,
  });
};

// GET /api/vat/declarations
const getVatDeclarations = async (req, res) => {
  const org = await getUserOrg(req.userId);
  if (!org) return res.status(404).json({ error: 'Organisation introuvable.' });

  const declarations = await VATDeclaration.find({ organizationId: org._id }).sort({ startDate: -1 });

  res.json(declarations);
};

// POST /api/vat/declarations
const createVatDeclaration = async (req, res) => {
  const org = await getUserOrg(req.userId);
  if (!org) return res.status(404).json({ error: 'Organisation introuvable.' });

  const { startDate, endDate, regime } = req.body;
  if (!startDate || !endDate || !regime) {
    return res.status(400).json({ error: 'Les champs startDate, endDate et regime sont requis.' });
  }

  // Vérifier si une déclaration existe déjà pour cette période exacte
  const existing = await VATDeclaration.findOne({
    organizationId: org._id,
    startDate: new Date(startDate),
    endDate: new Date(endDate),
  });

  if (existing) {
    return res.status(409).json({ error: 'Une déclaration pour cette période existe déjà.' });
  }

  // Réutiliser la logique de calcul
  const dateRangeInvoices = { paidAt: periodRange(startDate, endDate) };
  const dateRangeExpenses = { date: periodRange(startDate, endDate) };
  
  const collectedVAT = await calculateVAT(Invoice, org._id, dateRangeInvoices, 'vatAmount', { status: 'paid' });
  const deductibleVAT_services = await calculateVAT(Expense, org._id, dateRangeExpenses, 'vatRecoverable', { status: 'validated', assetCategory: { $ne: true } });
  const deductibleVAT_assets = await calculateVAT(Expense, org._id, dateRangeExpenses, 'vatRecoverable', { status: 'validated', assetCategory: true });
  const totalDeductibleVAT = deductibleVAT_services + deductibleVAT_assets;
  const vatBalance = collectedVAT - totalDeductibleVAT;

  const declaration = await VATDeclaration.create({
    organizationId: org._id,
    startDate,
    endDate,
    regime,
    status: 'finalized',
    collectedVAT: Math.round(collectedVAT * 100) / 100,
    deductibleVAT_services: Math.round(deductibleVAT_services * 100) / 100,
    deductibleVAT_assets: Math.round(deductibleVAT_assets * 100) / 100,
    totalDeductibleVAT: Math.round(totalDeductibleVAT * 100) / 100,
    vatDue: vatBalance > 0 ? Math.round(vatBalance * 100) / 100 : 0,
    vatCredit: vatBalance < 0 ? Math.round(-vatBalance * 100) / 100 : 0,
  });

  res.status(201).json(declaration);
};

// PUT /api/vat/declarations/:id/credit-option
const updateCreditOption = async (req, res) => {
  const org = await getUserOrg(req.userId);
  if (!org) return res.status(404).json({ error: 'Organisation introuvable.' });

  const { creditOption } = req.body;
  if (!creditOption || !['carry_forward', 'refund'].includes(creditOption)) {
    return res.status(400).json({ error: 'L\'option de crédit est invalide.' });
  }

  const declaration = await VATDeclaration.findOneAndUpdate(
    { _id: req.params.id, organizationId: org._id },
    { creditOption },
    { new: true }
  );

  if (!declaration) {
    return res.status(404).json({ error: 'Déclaration introuvable.' });
  }
  
  if (declaration.vatCredit <= 0) {
    return res.status(400).json({ error: 'Cette déclaration n\'a pas de crédit de TVA.' });
  }

  res.json(declaration);
};

// GET /api/vat/declarations/:id
const getVatDeclaration = async (req, res) => {
  const org = await getUserOrg(req.userId);
  if (!org) return res.status(404).json({ error: 'Organisation introuvable.' });

  const declaration = await VATDeclaration.findOne({
    _id: req.params.id,
    organizationId: org._id,
  }).lean(); // .lean() pour un objet JS simple, plus rapide

  if (!declaration) {
    return res.status(404).json({ error: 'Déclaration introuvable.' });
  }

  // Retrouver les documents sous-jacents pour le détail
  const dateRangeInvoices = { paidAt: periodRange(declaration.startDate, declaration.endDate) };
  const dateRangeExpenses = { date: periodRange(declaration.startDate, declaration.endDate) };

  const [invoices, expenses] = await Promise.all([
    Invoice.find({
      organizationId: org._id,
      ...dateRangeInvoices,
      status: 'paid',
      vatAmount: { $gt: 0 }
    }).populate('clientId', 'name'),
    Expense.find({
      organizationId: org._id,
      ...dateRangeExpenses,
      status: 'validated',
      vatRecoverable: { $gt: 0 }
    })
  ]);

  res.json({
    ...declaration,
    sources: {
      invoices,
      expenses,
    },
  });
};

// GET /api/vat/details?from=...&to=...
const getVatDetails = async (req, res) => {
  const org = await getUserOrg(req.userId);
  if (!org) return res.status(404).json({ error: 'Organisation introuvable.' });

  const range = parsePeriod(req, res);
  if (!range) return;

  res.json({ operations: await getVatOperations(org._id, range) });
};

const OPERATION_LABELS = { sale: 'Vente', purchase: 'Achat', asset: 'Immo.' };

// Intl sépare les milliers par des espaces insécables absentes de la police Helvetica du PDF
const pdfAmount = (n) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' })
    .format(n ?? 0)
    .replace(/[\u202f\u00a0]/g, ' ');
const pdfDate = (d) => new Date(d).toLocaleDateString('fr-FR', { timeZone: 'UTC' });

const drawOperationsTable = (doc, operations) => {
  const startX = 50;
  const columns = [
    { title: 'Date', width: 60 },
    { title: 'Type', width: 45 },
    { title: 'Tiers', width: 165 },
    { title: 'HT', width: 75, right: true },
    { title: 'TVA', width: 75, right: true },
    { title: 'TTC', width: 75, right: true },
  ];

  const drawCells = (cells, y) => {
    let x = startX;
    cells.forEach((cell, i) => {
      doc.text(cell, x, y, { width: columns[i].width, align: columns[i].right ? 'right' : 'left', height: 12, ellipsis: true });
      x += columns[i].width;
    });
  };
  const drawHeader = (y) => {
    doc.font('Helvetica-Bold').fontSize(9);
    drawCells(columns.map((c) => c.title), y);
    doc.moveTo(startX, y + 14).lineTo(startX + 495, y + 14).strokeColor('#cccccc').stroke();
    doc.font('Helvetica').fontSize(8);
    return y + 22;
  };

  let y = drawHeader(doc.y);
  operations.forEach((op) => {
    if (y > 740) {
      doc.addPage();
      y = drawHeader(50);
    }
    drawCells([
      pdfDate(op.date),
      OPERATION_LABELS[op.type],
      op.thirdParty,
      pdfAmount(op.amountHT),
      pdfAmount(op.vatAmount),
      pdfAmount(op.amountTTC),
    ], y);
    y += 18;
  });
  doc.x = startX;
  doc.y = y + 10;
};

// GET /api/vat/pdf?from=...&to=...
const downloadVatPdf = async (req, res) => {
  const org = await getUserOrg(req.userId);
  if (!org) return res.status(404).json({ error: 'Organisation introuvable.' });

  const range = parsePeriod(req, res);
  if (!range) return;

  const operations = await getVatOperations(org._id, range);
  const sum = (items) => items.reduce((total, op) => total + (op.vatAmount || 0), 0);
  const collected = sum(operations.filter((op) => op.type === 'sale'));
  const services = sum(operations.filter((op) => op.type === 'purchase'));
  const assets = sum(operations.filter((op) => op.type === 'asset'));
  const balance = collected - services - assets;

  const doc = new PDFDocument({ margin: 50, size: 'A4' });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="releve-tva-${range.$gte.toISOString().slice(0, 10)}.pdf"`);
  doc.pipe(res);

  const drawRow = (label, value, bold = false) => {
    const y = doc.y;
    doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(10);
    doc.text(label, 50, y, { width: 340 });
    doc.text(pdfAmount(value), 390, y, { width: 155, align: 'right' });
    doc.moveDown(0.3);
  };
  const drawTitle = (title) => {
    doc.moveDown();
    doc.font('Helvetica-Bold').fontSize(12).text(title, 50);
    doc.moveDown(0.4);
  };

  doc.font('Helvetica-Bold').fontSize(18).text('Relevé de TVA', { align: 'center' });
  doc.moveDown();
  doc.font('Helvetica').fontSize(10);
  doc.text(`Entreprise : ${org.name}`);
  doc.text(`Période : du ${pdfDate(range.$gte)} au ${pdfDate(range.$lte)}`);
  doc.text(`Émis le : ${new Date().toLocaleDateString('fr-FR')}`);

  drawTitle('Synthèse');
  drawRow('TVA collectée (ventes)', collected);
  drawRow('TVA déductible — biens et services', services);
  drawRow('TVA déductible — immobilisations', assets);
  drawRow(balance > 0 ? 'TVA nette à payer' : 'Crédit de TVA', Math.abs(balance), true);

  drawTitle(`Détail des opérations (${operations.length})`);
  if (operations.length > 0) {
    drawOperationsTable(doc, operations);
  } else {
    doc.font('Helvetica').fontSize(10).text('Aucune opération sur cette période.');
  }

  doc.moveDown();
  doc.font('Helvetica-Oblique').fontSize(8).fillColor('#64748b').text(
    'Outil d\'aide au calcul : la validation finale doit être effectuée sur votre espace impots.gouv.fr.',
    50, doc.y, { width: 495, align: 'center' }
  );
  doc.end();
};

module.exports = {
  getVatSummary,
  getVatDetails,
  downloadVatPdf,
  getVatDeclarations,
  getVatDeclaration,
  createVatDeclaration,
  updateCreditOption,
};
