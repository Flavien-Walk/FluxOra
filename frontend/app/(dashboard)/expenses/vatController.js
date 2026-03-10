const Organization = require('../models/Organization');
const VATDeclaration = require('../models/VATDeclaration');
const Invoice = require('../models/Invoice');
const Expense = require('../models/Expense');

const getUserOrg = async (userId) =>
  Organization.findOne({
    $or: [{ clerkOwnerId: userId }, { 'members.clerkUserId': userId }],
  });

// Logique de calcul principale, pourrait être dans un service
const generateVatData = async (orgId, from, to) => {
    const [paidInvoices, expenses] = await Promise.all([
        Invoice.find({ organizationId: orgId, status: 'paid', paidAt: { $gte: from, $lte: to } }),
        Expense.find({ organizationId: orgId, date: { $gte: from, $lte: to }, status: { $ne: 'non_eligible' } })
    ]);

    const collectedVAT = { breakdown: [], total: 0 };
    paidInvoices.forEach(inv => {
        collectedVAT.total += inv.vatAmount;
        // Agréger par taux si nécessaire (non fait ici pour la simplicité)
    });

    const deductibleVAT = {
        goodsAndServices: { breakdown: [], total: 0 },
        fixedAssets: { breakdown: [], total: 0 },
        total: 0
    };

    expenses.forEach(exp => {
        if (exp.vatRecoverable > 0) {
            if (exp.assetCategory) {
                deductibleVAT.fixedAssets.total += exp.vatRecoverable;
            } else {
                deductibleVAT.goodsAndServices.total += exp.vatRecoverable;
            }
        }
    });
    deductibleVAT.total = deductibleVAT.goodsAndServices.total + deductibleVAT.fixedAssets.total;

    const balance = collectedVAT.total - deductibleVAT.total;

    return {
        collectedVAT,
        deductibleVAT,
        vatDue: balance > 0 ? balance : 0,
        vatCredit: balance < 0 ? -balance : 0,
    };
};

const getVatSummaryForPeriod = async (req, res) => {
    const org = await getUserOrg(req.userId);
    if (!org) return res.status(404).json({ error: 'Organisation introuvable.' });

    const { from, to } = req.query;
    if (!from || !to) return res.status(400).json({ error: 'Les dates "from" et "to" sont requises.' });

    const data = await generateVatData(org._id, new Date(from), new Date(to));
    res.json(data);
};

module.exports = { getVatSummaryForPeriod };