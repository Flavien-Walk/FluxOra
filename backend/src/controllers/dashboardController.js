const Invoice  = require('../models/Invoice');
const Expense  = require('../models/Expense');
const Quote    = require('../models/Quote');
const Transfer = require('../models/Transfer');
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
  const now   = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfYear  = new Date(now.getFullYear(), 0, 1);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

  const [
    revenueData,
    revenueMonthData,
    pendingData,
    expensesMonthData,
    lateCount,
    expensesByCategory,
    revenueByMonth,
    quoteStats,
    recentInvoices,
    recentQuotes,
    relanceInvoices,
    transfersMonthData,
  ] = await Promise.all([
    // CA total (factures payées)
    Invoice.aggregate([
      { $match: { organizationId: orgId, status: 'paid' } },
      { $group: { _id: null, total: { $sum: '$total' } } },
    ]),

    // CA du mois
    Invoice.aggregate([
      { $match: { organizationId: orgId, status: 'paid', paidAt: { $gte: startOfMonth } } },
      { $group: { _id: null, total: { $sum: '$total' } } },
    ]),

    // Factures en attente
    Invoice.aggregate([
      { $match: { organizationId: orgId, status: { $in: ['sent', 'late'] } } },
      { $group: { _id: null, total: { $sum: '$total' }, count: { $sum: 1 } } },
    ]),

    // Dépenses du mois
    Expense.aggregate([
      { $match: { organizationId: orgId, date: { $gte: startOfMonth } } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),

    // Factures en retard
    Invoice.countDocuments({ organizationId: orgId, status: 'late' }),

    // Dépenses par catégorie (année)
    Expense.aggregate([
      { $match: { organizationId: orgId, date: { $gte: startOfYear } } },
      { $group: { _id: '$category', total: { $sum: '$amount' } } },
      { $sort: { total: -1 } },
    ]),

    // Évolution CA par mois (6 mois)
    Invoice.aggregate([
      { $match: { organizationId: orgId, status: 'paid', paidAt: { $gte: sixMonthsAgo } } },
      { $group: { _id: { year: { $year: '$paidAt' }, month: { $month: '$paidAt' } }, total: { $sum: '$total' } } },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
    ]),

    // Stats devis
    Quote.aggregate([
      { $match: { organizationId: orgId } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          total: { $sum: '$total' },
        },
      },
    ]),

    // 5 dernières factures
    Invoice.find({ organizationId: orgId })
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('clientId', 'name company')
      .lean(),

    // 5 derniers devis
    Quote.find({ organizationId: orgId })
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('clientId', 'name company')
      .lean(),

    // Factures à relancer (envoyées > 7 jours, non payées)
    Invoice.find({
      organizationId: orgId,
      status: { $in: ['sent', 'late'] },
      sentAt: { $lte: sevenDaysAgo },
    })
      .sort({ sentAt: 1 })
      .limit(5)
      .populate('clientId', 'name company')
      .lean(),

    // Virements du mois
    Transfer.aggregate([
      { $match: { organizationId: orgId, status: 'completed', executedAt: { $gte: startOfMonth } } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),
  ]);

  // Calcul taux d'acceptation des devis
  const qStats = {};
  quoteStats.forEach((s) => { qStats[s._id] = s; });
  const totalSentQuotes = (qStats.sent?.count || 0) + (qStats.accepted?.count || 0) + (qStats.rejected?.count || 0) + (qStats.expired?.count || 0);
  const acceptanceRate  = totalSentQuotes > 0 ? Math.round((qStats.accepted?.count || 0) / totalSentQuotes * 100) : null;

  const revenueMonth   = revenueMonthData[0]?.total   || 0;
  const expensesMonth  = expensesMonthData[0]?.total  || 0;
  const transfersMonth = transfersMonthData[0]?.total || 0;
  const cashflowNet    = revenueMonth - expensesMonth - transfersMonth;

  res.json({
    revenue: {
      total: revenueData[0]?.total || 0,
      month: revenueMonth,
    },
    pending: {
      total: pendingData[0]?.total || 0,
      count: pendingData[0]?.count || 0,
    },
    expenses: {
      month: expensesMonth,
    },
    cashflowNet,
    lateInvoices: lateCount,
    expensesByCategory,
    revenueByMonth,
    quotes: {
      pendingCount:   (qStats.sent?.count   || 0) + (qStats.draft?.count || 0),
      acceptedCount:  qStats.accepted?.count  || 0,
      acceptanceRate,
      pendingTotal:   qStats.sent?.total      || 0,
    },
    recentInvoices,
    recentQuotes,
    relanceInvoices,
  });
};

module.exports = { getSummary };
