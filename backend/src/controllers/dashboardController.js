const Invoice  = require('../models/Invoice');
const Expense  = require('../models/Expense');
const Quote    = require('../models/Quote');
const Transfer = require('../models/Transfer');
const CreditNote = require('../models/CreditNote');
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
    // CA total HT (factures payées) — les avoirs sont déduits plus bas
    Invoice.aggregate([
      { $match: { organizationId: orgId, status: 'paid' } },
      { $group: { _id: null, total: { $sum: '$subtotal' }, cash: { $sum: '$total' } } },
    ]),

    // CA HT du mois + encaissements TTC du mois (pour le cashflow)
    Invoice.aggregate([
      { $match: { organizationId: orgId, status: 'paid', paidAt: { $gte: startOfMonth } } },
      { $group: { _id: null, total: { $sum: '$subtotal' }, cash: { $sum: '$total' } } },
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

    // Évolution CA HT par mois (6 mois)
    Invoice.aggregate([
      { $match: { organizationId: orgId, status: 'paid', paidAt: { $gte: sixMonthsAgo } } },
      { $group: { _id: { year: { $year: '$paidAt' }, month: { $month: '$paidAt' } }, total: { $sum: '$subtotal' } } },
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

  // Avoirs sur factures encaissées : diminuent le CA ; remboursements : sortie de trésorerie
  const [creditsAll, creditsMonth, refundsMonth] = await Promise.all([
    CreditNote.aggregate([{ $match: { organizationId: orgId, status: { $in: ['to_refund', 'refunded'] } } }, { $group: { _id: null, total: { $sum: '$subtotal' } } }]),
    CreditNote.aggregate([{ $match: { organizationId: orgId, status: { $in: ['to_refund', 'refunded'] }, issueDate: { $gte: startOfMonth } } }, { $group: { _id: null, total: { $sum: '$subtotal' } } }]),
    CreditNote.aggregate([{ $match: { organizationId: orgId, status: 'refunded', refundedAt: { $gte: startOfMonth } } }, { $group: { _id: null, total: { $sum: '$total' } } }]),
  ]);
  const round2 = (n) => Math.round(n * 100) / 100;
  const revenueTotal  = round2((revenueData[0]?.total || 0) - (creditsAll[0]?.total || 0));
  const revenueMonth  = round2((revenueMonthData[0]?.total || 0) - (creditsMonth[0]?.total || 0));
  const cashInMonth   = revenueMonthData[0]?.cash || 0;
  const expensesMonth = expensesMonthData[0]?.total || 0;
  const transfersMonth = transfersMonthData[0]?.total || 0; // informatif : un virement fournisseur correspond souvent à une dépense déjà saisie
  const cashflowNet   = round2(cashInMonth - expensesMonth - (refundsMonth[0]?.total || 0));

  res.json({
    revenue: {
      total: revenueTotal,
      month: revenueMonth,
      basis: 'HT',
    },
    pending: {
      total: pendingData[0]?.total || 0,
      count: pendingData[0]?.count || 0,
    },
    expenses: {
      month: expensesMonth,
    },
    cashflowNet,
    cashflow: { in: round2(cashInMonth), out: round2(expensesMonth), refunds: round2(refundsMonth[0]?.total || 0), transfers: round2(transfersMonth) },
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

const DAY = 24 * 3600 * 1000;
const UNPAID = ['sent', 'email_opened', 'viewed', 'late', 'payment_pending'];

// GET /api/dashboard/aging — impayés par ancienneté (balance âgée) et principaux débiteurs
const getAging = async (req, res) => {
  const org = await getUserOrg(req.userId);
  if (!org) return res.status(404).json({ error: 'Organisation introuvable.' });
  const invoices = await Invoice.find({ organizationId: org._id, status: { $in: UNPAID } })
    .populate('clientId', 'name company email').lean();

  const BUCKETS = [
    { key: 'notDue', label: 'Non échues', min: -Infinity, max: 0 },
    { key: 'd30', label: '1 à 30 jours', min: 1, max: 30 },
    { key: 'd60', label: '31 à 60 jours', min: 31, max: 60 },
    { key: 'd90', label: '61 à 90 jours', min: 61, max: 90 },
    { key: 'd90plus', label: 'Plus de 90 jours', min: 91, max: Infinity },
  ];
  const buckets = BUCKETS.map((b) => ({ key: b.key, label: b.label, total: 0, count: 0 }));
  const byClient = new Map();
  const now = Date.now();
  for (const inv of invoices) {
    const late = inv.dueDate ? Math.floor((now - new Date(inv.dueDate).getTime()) / DAY) : 0;
    const i = BUCKETS.findIndex((b) => late >= b.min && late <= b.max);
    buckets[i].total += inv.total; buckets[i].count += 1;
    const id = String(inv.clientId?._id || 'inconnu');
    const c = byClient.get(id) || { clientId: inv.clientId?._id, name: inv.clientId?.company || inv.clientId?.name || 'Client inconnu', total: 0, overdue: 0, count: 0, maxDaysLate: 0 };
    c.total += inv.total; c.count += 1;
    if (late > 0) { c.overdue += inv.total; c.maxDaysLate = Math.max(c.maxDaysLate, late); }
    byClient.set(id, c);
  }
  const r2 = (n) => Math.round(n * 100) / 100;
  buckets.forEach((b) => { b.total = r2(b.total); });
  const total = r2(buckets.reduce((s, b) => s + b.total, 0));
  const overdue = r2(buckets.filter((b) => b.key !== 'notDue').reduce((s, b) => s + b.total, 0));
  const debtors = [...byClient.values()].filter((c) => c.overdue > 0)
    .map((c) => ({ ...c, total: r2(c.total), overdue: r2(c.overdue) }))
    .sort((a, b) => b.overdue - a.overdue).slice(0, 10);
  res.json({ total, overdue, count: invoices.length, buckets, debtors });
};

// GET /api/dashboard/forecast — prévisionnel de trésorerie sur 13 semaines
// Solde de départ : écritures comptables ; entrées : factures à encaisser à leur échéance (retards en semaine 1) ;
// sorties : moyenne hebdomadaire des dépenses des 3 derniers mois + avoirs à rembourser.
const getForecast = async (req, res) => {
  const org = await getUserOrg(req.userId);
  if (!org) return res.status(404).json({ error: 'Organisation introuvable.' });
  const orgId = org._id;
  const AccountingEntry = require('../models/AccountingEntry');
  const now = new Date();
  const threeMonthsAgo = new Date(now.getTime() - 91 * DAY);

  const [balanceAgg, receivables, expenses3m, toRefund] = await Promise.all([
    AccountingEntry.aggregate([{ $match: { organizationId: orgId } }, { $group: { _id: '$type', total: { $sum: '$amount' } } }]),
    Invoice.find({ organizationId: orgId, status: { $in: UNPAID } }, 'total dueDate status number').lean(),
    Expense.aggregate([{ $match: { organizationId: orgId, date: { $gte: threeMonthsAgo, $lte: now } } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
    CreditNote.aggregate([{ $match: { organizationId: orgId, status: 'to_refund' } }, { $group: { _id: null, total: { $sum: '$total' } } }]),
  ]);
  const credit = balanceAgg.find((b) => b._id === 'credit')?.total || 0;
  const debit = balanceAgg.find((b) => b._id === 'debit')?.total || 0;
  const startBalance = credit - debit;
  const weeklyOut = (expenses3m[0]?.total || 0) / 13;

  const r2 = (n) => Math.round(n * 100) / 100;
  const weeks = Array.from({ length: 13 }, (_, i) => {
    const start = new Date(now.getTime() + i * 7 * DAY);
    return { week: i + 1, start, inflow: 0, outflow: weeklyOut, overdueInflow: 0 };
  });
  weeks[0].outflow += toRefund[0]?.total || 0;
  for (const inv of receivables) {
    const due = inv.dueDate ? new Date(inv.dueDate) : now;
    const idx = Math.floor((due.getTime() - now.getTime()) / (7 * DAY));
    if (idx < 0) { weeks[0].inflow += inv.total; weeks[0].overdueInflow += inv.total; } // en retard : attendu au plus tôt
    else if (idx < 13) weeks[idx].inflow += inv.total;
  }
  let balance = startBalance;
  const series = weeks.map((w) => {
    balance += w.inflow - w.outflow;
    return { week: w.week, start: w.start, inflow: r2(w.inflow), outflow: r2(w.outflow), overdueInflow: r2(w.overdueInflow), balance: r2(balance) };
  });
  const at = (week) => series[Math.min(week, series.length) - 1].balance;
  const lowest = series.reduce((m, w) => (w.balance < m.balance ? w : m), series[0]);
  res.json({
    startBalance: r2(startBalance),
    horizons: { d30: at(4), d60: at(9), d90: at(13) },
    lowest: { week: lowest.week, start: lowest.start, balance: lowest.balance },
    weeklyOutflowAverage: r2(weeklyOut),
    receivablesTotal: r2(receivables.reduce((s, i) => s + i.total, 0)),
    series,
    method: 'Solde comptable actuel + factures à encaisser à leur échéance (retards comptés en semaine 1) − moyenne des dépenses des 3 derniers mois − avoirs à rembourser.',
  });
};

module.exports = { getSummary, getAging, getForecast };
