const Invoice = require('../models/Invoice');
const Expense = require('../models/Expense');
const Payment = require('../models/Payment');
const Organization = require('../models/Organization');

const getUserOrg = async (userId) =>
  Organization.findOne({
    $or: [{ clerkOwnerId: userId }, { 'members.clerkUserId': userId }],
  });

// GET /api/dashboard/summary
const getSummary = async (req, res) => {
  const org = await getUserOrg(req.userId);
  if (!org) return res.status(404).json({ error: 'Organisation introuvable.' });

  const orgId = org._id;
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfYear = new Date(now.getFullYear(), 0, 1);

  // Chiffre d'affaires (factures payées)
  const [revenueData] = await Invoice.aggregate([
    { $match: { organizationId: orgId, status: 'paid' } },
    { $group: { _id: null, total: { $sum: '$total' } } },
  ]);

  // CA du mois en cours
  const [revenueMonthData] = await Invoice.aggregate([
    { $match: { organizationId: orgId, status: 'paid', paidAt: { $gte: startOfMonth } } },
    { $group: { _id: null, total: { $sum: '$total' } } },
  ]);

  // Factures en attente (sent + late)
  const [pendingData] = await Invoice.aggregate([
    { $match: { organizationId: orgId, status: { $in: ['sent', 'late'] } } },
    { $group: { _id: null, total: { $sum: '$total' }, count: { $sum: 1 } } },
  ]);

  // Dépenses du mois
  const [expensesMonthData] = await Expense.aggregate([
    { $match: { organizationId: orgId, date: { $gte: startOfMonth } } },
    { $group: { _id: null, total: { $sum: '$amount' } } },
  ]);

  // Factures en retard
  const lateCount = await Invoice.countDocuments({
    organizationId: orgId,
    status: 'late',
  });

  // Dépenses par catégorie (année en cours)
  const expensesByCategory = await Expense.aggregate([
    { $match: { organizationId: orgId, date: { $gte: startOfYear } } },
    { $group: { _id: '$category', total: { $sum: '$amount' } } },
    { $sort: { total: -1 } },
  ]);

  // Évolution CA par mois (6 derniers mois)
  const revenueByMonth = await Invoice.aggregate([
    {
      $match: {
        organizationId: orgId,
        status: 'paid',
        paidAt: { $gte: new Date(now.getFullYear(), now.getMonth() - 5, 1) },
      },
    },
    {
      $group: {
        _id: { year: { $year: '$paidAt' }, month: { $month: '$paidAt' } },
        total: { $sum: '$total' },
      },
    },
    { $sort: { '_id.year': 1, '_id.month': 1 } },
  ]);

  res.json({
    revenue: {
      total: revenueData?.total || 0,
      month: revenueMonthData?.total || 0,
    },
    pending: {
      total: pendingData?.total || 0,
      count: pendingData?.count || 0,
    },
    expenses: {
      month: expensesMonthData?.total || 0,
    },
    lateInvoices: lateCount,
    expensesByCategory,
    revenueByMonth,
  });
};

module.exports = { getSummary };
