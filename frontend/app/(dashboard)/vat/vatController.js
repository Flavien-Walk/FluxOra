const Organization = require('../models/Organization');
const VATDeclaration = require('../models/VATDeclaration');
const Invoice = require('../models/Invoice');
const Expense = require('../models/Expense');
const PDFDocument = require('pdfkit');

const getUserOrg = async (userId) =>
  Organization.findOne({
    $or: [{ clerkOwnerId: userId }, { 'members.clerkUserId': userId }],
  });

/**
 * Helper: Aggregates VAT data from a list of items
 */
const aggregateVatRate = (map, rate, baseAmount, vatAmount) => {
  const current = map.get(rate) || { rate, base: 0, amount: 0 };
  current.base += baseAmount;
  current.amount += vatAmount;
  map.set(rate, current);
};

/**
 * Helper: Formats aggregated map to array
 */
const formatBreakdown = (map) => {
    const breakdown = Array.from(map.values()).map(v => ({
        ...v,
        base: Math.round(v.base * 100) / 100,
        amount: Math.round(v.amount * 100) / 100,
    })).sort((a, b) => a.rate - b.rate);
    const total = breakdown.reduce((sum, v) => sum + v.amount, 0);
    return { breakdown, total: Math.round(total * 100) / 100 };
};

/**
 * Core Calculation Logic (Reused)
 */
const generateVatData = async (orgId, from, to, creditCarriedOver = 0) => {
  const [paidInvoices, expenses] = await Promise.all([
    Invoice.find({ organizationId: orgId, status: 'paid', paidAt: { $gte: from, $lte: to } }),
    Expense.find({ organizationId: orgId, date: { $gte: from, $lte: to }, status: { $ne: 'non_eligible' } })
  ]);

  const collectedMap = new Map();
  paidInvoices.forEach(inv => {
    aggregateVatRate(collectedMap, inv.vatRate || 20, inv.subtotal, inv.vatAmount);
  });

  const deductibleGoodsMap = new Map();
  const deductibleAssetsMap = new Map();
  
  expenses.forEach(exp => {
    if (exp.vatRecoverable > 0) {
      const map = exp.assetCategory ? deductibleAssetsMap : deductibleGoodsMap;
      aggregateVatRate(map, exp.vatRate, exp.amountHT, exp.vatRecoverable);
    }
  });

  const collectedVAT = formatBreakdown(collectedMap);
  const deductibleVAT = {
    goodsAndServices: formatBreakdown(deductibleGoodsMap),
    fixedAssets: formatBreakdown(deductibleAssetsMap),
    total: 0
  };
  deductibleVAT.total = Math.round((deductibleVAT.goodsAndServices.total + deductibleVAT.fixedAssets.total) * 100) / 100;

  const balance = collectedVAT.total - deductibleVAT.total - creditCarriedOver;

  return {
    collectedVAT,
    deductibleVAT,
    creditCarriedOver,
    vatDue: balance > 0 ? balance : 0,
    vatCredit: balance < 0 ? -balance : 0,
  };
};

/**
 * GET /api/vat/summary
 */
const getVatSummaryForPeriod = async (req, res) => {
    const org = await getUserOrg(req.userId);
    if (!org) return res.status(404).json({ error: 'Organisation introuvable.' });

    const { from, to } = req.query;
    if (!from || !to) return res.status(400).json({ error: 'Les dates "from" et "to" sont requises.' });
    
    // Simplification: crédit reporté hardcodé à 0 ou récupéré depuis la dernière déclaration finalisée
    const previousDeclaration = null; 
    const creditCarriedOver = previousDeclaration?.status === 'finalized' ? previousDeclaration.vatCredit : 0;

    const data = await generateVatData(org._id, new Date(from), new Date(to), creditCarriedOver);
    res.json(data);
};

/**
 * GET /api/vat/details
 * Returns a flat list of all operations (sales & purchases) for the period
 */
const getVatDetails = async (req, res) => {
    const org = await getUserOrg(req.userId);
    if (!org) return res.status(404).json({ error: 'Organisation introuvable.' });

    const { from, to } = req.query;
    if (!from || !to) return res.status(400).json({ error: 'Dates requises.' });

    const startDate = new Date(from);
    const endDate = new Date(to);

    const [invoices, expenses] = await Promise.all([
        Invoice.find({ organizationId: org._id, status: 'paid', paidAt: { $gte: startDate, $lte: endDate } }).populate('clientId', 'name'),
        Expense.find({ organizationId: org._id, date: { $gte: startDate, $lte: endDate }, status: { $ne: 'non_eligible' }, vatRecoverable: { $gt: 0 } })
    ]);

    const operations = [
        ...invoices.map(inv => ({
            id: inv._id,
            date: inv.paidAt,
            type: 'sale',
            label: `Facture ${inv.number}`,
            thirdParty: inv.clientId?.name || 'Client inconnu',
            amountHT: inv.subtotal,
            vatRate: inv.vatRate || 20,
            vatAmount: inv.vatAmount,
            amountTTC: inv.total,
            category: 'sales'
        })),
        ...expenses.map(exp => ({
            id: exp._id,
            date: exp.date,
            type: 'purchase',
            label: exp.description,
            thirdParty: exp.vendor || 'Fournisseur',
            amountHT: exp.amountHT,
            vatRate: exp.vatRate,
            vatAmount: exp.vatRecoverable,
            amountTTC: exp.amount,
            category: exp.assetCategory ? 'fixed_asset' : 'goods_services'
        }))
    ];

    // Sort by date descending
    operations.sort((a, b) => new Date(b.date) - new Date(a.date));

    res.json({ operations });
};

const drawOperationsTable = (doc, operations) => {
    let y = doc.y;
    const startX = 50;
    const rowHeight = 20;
    const tableTop = y;

    const colWidths = [65, 55, 150, 80, 80, 80];
    const headers = ['Date', 'Type', 'Tiers', 'Montant HT', 'Montant TVA', 'Montant TTC'];

    const drawHeader = (yPos) => {
        doc.fontSize(9).font('Helvetica-Bold');
        let currentX = startX;
        headers.forEach((header, i) => {
            doc.text(header, currentX, yPos, { width: colWidths[i], align: i > 2 ? 'right' : 'left' });
            currentX += colWidths[i];
        });
        const finalX = startX + colWidths.reduce((a, b) => a + b, 0);
        doc.moveTo(startX, yPos + 15).lineTo(finalX, yPos + 15).strokeColor("#cccccc").stroke();
    };

    drawHeader(y);
    y += 25;

    doc.fontSize(8).font('Helvetica');
    const fmt = (n) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n ?? 0);
    const fmtDate = (d) => new Date(d).toLocaleDateString('fr-FR');

    operations.forEach(op => {
        if (y > 720) { // Check for page break
            doc.addPage();
            y = 50;
            drawHeader(y);
            y += 25;
        }

        let currentX = startX;
        const rowY = y;

        doc.text(fmtDate(op.date), currentX, rowY, { width: colWidths[0], align: 'left' });
        currentX += colWidths[0];
        
        const typeColor = op.type === 'Vente' ? 'blue' : 'indigo';
        doc.fillColor(typeColor).text(op.type, currentX, rowY, { width: colWidths[1], align: 'left' });
        currentX += colWidths[1];
        
        doc.fillColor('black').text(op.thirdParty, currentX, rowY, { width: colWidths[2], align: 'left', ellipsis: true });
        currentX += colWidths[2];

        doc.text(fmt(op.amountHT), currentX, rowY, { width: colWidths[3], align: 'right' });
        currentX += colWidths[3];

        doc.text(fmt(op.vatAmount), currentX, rowY, { width: colWidths[4], align: 'right' });
        currentX += colWidths[4];

        doc.font('Helvetica-Bold').text(fmt(op.amountTTC), currentX, rowY, { width: colWidths[5], align: 'right' });
        doc.font('Helvetica');
        
        y += rowHeight;
    });
};

/**
 * GET /api/vat/pdf
 * Generates a PDF report for the period
 */
const downloadVatPdf = async (req, res) => {
    const org = await getUserOrg(req.userId);
    if (!org) return res.status(404).json({ error: 'Organisation introuvable.' });

    const { from, to } = req.query;
    if (!from || !to) return res.status(400).json({ error: 'Dates requises.' });

    const startDate = new Date(from);
    const endDate = new Date(to);
    
    // 1. Fetch all data in parallel
    const [summary, rawDetails] = await Promise.all([
        generateVatData(org._id, startDate, endDate, 0),
        Promise.all([
            Invoice.find({ organizationId: org._id, status: 'paid', paidAt: { $gte: startDate, $lte: endDate } }).populate('clientId', 'name'),
            Expense.find({ organizationId: org._id, date: { $gte: startDate, $lte: endDate }, status: { $ne: 'non_eligible' }, vatRecoverable: { $gt: 0 } })
        ])
    ]);

    const [invoices, expenses] = rawDetails;
    const operations = [
        ...invoices.map(inv => ({
            date: inv.paidAt, type: 'Vente', thirdParty: inv.clientId?.name || 'Client',
            amountHT: inv.subtotal, vatAmount: inv.vatAmount, amountTTC: inv.total,
        })),
        ...expenses.map(exp => ({
            date: exp.date, type: exp.assetCategory ? 'Immo.' : 'Achat', thirdParty: exp.vendor || 'Fournisseur',
            amountHT: exp.amountHT, vatAmount: exp.vatRecoverable, amountTTC: exp.amount,
        }))
    ].sort((a, b) => new Date(a.date) - new Date(b.date));
    
    // 2. Setup PDF
    const doc = new PDFDocument({ margin: 50 });
    
    const filename = `Declaration_TVA_${startDate.toISOString().slice(0, 7)}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    
    doc.pipe(res);

    // 3. Header
    doc.fontSize(20).text('Relevé de TVA', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(`Entreprise : ${org.name}`);
    doc.text(`Période : Du ${startDate.toLocaleDateString('fr-FR')} au ${endDate.toLocaleDateString('fr-FR')}`);
    doc.text(`Date d'émission : ${new Date().toLocaleDateString('fr-FR')}`);
    doc.moveDown();

    // 4. Summary Table Helper
    const drawRow = (label, value, bold = false) => {
        doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').text(label, { continued: true });
        doc.text(new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(value), { align: 'right' });
    };

    doc.rect(50, doc.y, 510, 0.5).stroke();
    doc.moveDown(0.5);

    // TVA Collectée
    doc.font('Helvetica-Bold').fontSize(14).text('1. TVA Collectée (Ventes)', { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(10);
    summary.collectedVAT.breakdown.forEach(item => {
        drawRow(`Taux ${item.rate}% (Base: ${item.base.toFixed(2)}€)`, item.amount);
    });
    doc.moveDown(0.5);
    drawRow('TOTAL TVA BRUTE', summary.collectedVAT.total, true);
    doc.moveDown();

    // TVA Déductible
    doc.font('Helvetica-Bold').fontSize(14).text('2. TVA Déductible (Achats)', { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(10);
    drawRow('Sur immobilisations', summary.deductibleVAT.fixedAssets.total);
    drawRow('Sur autres biens et services', summary.deductibleVAT.goodsAndServices.total);
    doc.moveDown(0.5);
    drawRow('TOTAL TVA DÉDUCTIBLE', summary.deductibleVAT.total, true);
    doc.moveDown();

    // Résultat
    doc.rect(50, doc.y, 510, 0.5).stroke();
    doc.moveDown();
    doc.font('Helvetica-Bold').fontSize(16);
    
    if (summary.vatDue > 0) {
        doc.fillColor('red');
        drawRow('TVA NETTE À PAYER', summary.vatDue, true);
    } else {
        doc.fillColor('green');
        drawRow('CRÉDIT DE TVA', summary.vatCredit, true);
    }
    doc.fillColor('black');

    // 5. Details Section (Simplified listing)
    if (operations.length > 0) {
        doc.addPage();
        doc.font('Helvetica-Bold').fontSize(16).text('Détail des opérations', { align: 'center' });
        doc.moveDown();
        drawOperationsTable(doc, operations);
    }
    
    doc.fontSize(10).font('Helvetica-Oblique').text('Ce document est généré automatiquement par FluxOra pour faciliter votre déclaration sur impots.gouv.fr.', { align: 'center' });

    doc.end();
};

const getVatDeclaration = async (req, res) => { /* ... existing code ... */ };
const createOrUpdateVatDeclaration = async (req, res) => { /* ... existing code ... */ };

module.exports = { 
    getVatSummaryForPeriod, 
    getVatDetails, 
    downloadVatPdf,
    getVatDeclaration, 
    createOrUpdateVatDeclaration 
};
