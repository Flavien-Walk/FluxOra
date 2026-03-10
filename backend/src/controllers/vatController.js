const Organization = require('../models/Organization');
const Invoice = require('../models/Invoice');
const Expense = require('../models/Expense');
const VATDeclaration = require('../models/VATDeclaration');

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

// GET /api/vat/summary?from=...&to=...
const getVatSummary = async (req, res) => {
  const org = await getUserOrg(req.userId);
  if (!org) return res.status(404).json({ error: 'Organisation introuvable.' });

  const { from, to } = req.query;
  if (!from || !to) {
    return res.status(400).json({ error: 'Les dates de début (from) et de fin (to) sont requises.' });
  }

  const dateRangeInvoices = { paidAt: { $gte: new Date(from), $lte: new Date(to) } };
  const dateRangeExpenses = { date: { $gte: new Date(from), $lte: new Date(to) } };

  // 1. Calcul de la TVA collectée (sur les factures payées)
  const collectedVAT = await calculateVAT(Invoice, org._id, dateRangeInvoices, 'vatAmount', {
    status: 'paid',
  });

  // 2. Calcul de la TVA déductible sur biens et services
  const deductibleVAT_services = await calculateVAT(Expense, org._id, dateRangeExpenses, 'vatRecoverable', {
    status: 'validated',
    assetCategory: false,
  });

  // 3. Calcul de la TVA déductible sur immobilisations
  const deductibleVAT_assets = await calculateVAT(Expense, org._id, dateRangeExpenses, 'vatRecoverable', {
    status: 'validated',
    assetCategory: true,
  });
  
  const totalDeductibleVAT = deductibleVAT_services + deductibleVAT_assets;
  const vatBalance = collectedVAT - totalDeductibleVAT;

  res.json({
    collectedVAT: Math.round(collectedVAT * 100) / 100,
    deductibleVAT_services: Math.round(deductibleVAT_services * 100) / 100,
    deductibleVAT_assets: Math.round(deductibleVAT_assets * 100) / 100,
    totalDeductibleVAT: Math.round(totalDeductibleVAT * 100) / 100,
    vatDue: vatBalance > 0 ? Math.round(vatBalance * 100) / 100 : 0,
    vatCredit: vatBalance < 0 ? Math.round(-vatBalance * 100) / 100 : 0,
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
  const dateRangeInvoices = { paidAt: { $gte: new Date(startDate), $lte: new Date(endDate) } };
  const dateRangeExpenses = { date: { $gte: new Date(startDate), $lte: new Date(endDate) } };
  
  const collectedVAT = await calculateVAT(Invoice, org._id, dateRangeInvoices, 'vatAmount', { status: 'paid' });
  const deductibleVAT_services = await calculateVAT(Expense, org._id, dateRangeExpenses, 'vatRecoverable', { status: 'validated', assetCategory: false });
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
  const dateRangeInvoices = { paidAt: { $gte: declaration.startDate, $lte: declaration.endDate } };
  const dateRangeExpenses = { date: { $gte: declaration.startDate, $lte: declaration.endDate } };

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


module.exports = {
  getVatSummary,
  getVatDeclarations,
  getVatDeclaration,
  createVatDeclaration,
  updateCreditOption,
};
