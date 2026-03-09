const Invoice    = require('../models/Invoice');
const Expense    = require('../models/Expense');
const Transfer   = require('../models/Transfer');
const Organization = require('../models/Organization');

const getUserOrg = async (userId) =>
  Organization.findOne({
    $or: [{ clerkOwnerId: userId }, { 'members.clerkUserId': userId }],
  });

// GET /api/transactions
const getTransactions = async (req, res) => {
  const org = await getUserOrg(req.userId);
  if (!org) return res.status(404).json({ error: 'Organisation introuvable.' });

  const orgId = org._id;
  const { type, from, to, page = 1, limit = 50 } = req.query;

  const fromDate = from ? new Date(from) : null;
  const toDate   = to   ? new Date(to)   : null;

  // 1. Factures payées → revenus
  const invoiceFilter = { organizationId: orgId, status: 'paid' };
  if (fromDate) invoiceFilter.paidAt = { ...invoiceFilter.paidAt, $gte: fromDate };
  if (toDate)   invoiceFilter.paidAt = { ...invoiceFilter.paidAt, $lte: toDate };

  const paidInvoices = (type === 'expense' || type === 'transfer') ? [] :
    await Invoice.find(invoiceFilter)
      .populate('clientId', 'name company')
      .lean();

  // 2. Dépenses
  const expenseFilter = { organizationId: orgId };
  if (fromDate) expenseFilter.date = { ...expenseFilter.date, $gte: fromDate };
  if (toDate)   expenseFilter.date = { ...expenseFilter.date, $lte: toDate };

  const expenses = (type === 'revenue' || type === 'transfer') ? [] :
    await Expense.find(expenseFilter).lean();

  // 3. Virements complétés
  const transferFilter = { organizationId: orgId, status: 'completed' };
  if (fromDate) transferFilter.executedAt = { ...transferFilter.executedAt, $gte: fromDate };
  if (toDate)   transferFilter.executedAt = { ...transferFilter.executedAt, $lte: toDate };

  const transfers = (type === 'revenue' || type === 'expense') ? [] :
    await Transfer.find(transferFilter)
      .populate('beneficiaryId', 'name iban')
      .lean();

  // 4. Normaliser + fusionner
  const rows = [
    ...paidInvoices.map((inv) => ({
      _id:       inv._id,
      date:      inv.paidAt || inv.updatedAt,
      type:      'revenue',
      label:     `Paiement ${inv.number}`,
      party:     inv.clientId?.name || '—',
      amount:    inv.total,
      status:    'completed',
      reference: inv.number,
      source:    'invoice',
    })),
    ...expenses.map((exp) => ({
      _id:       exp._id,
      date:      exp.date,
      type:      'expense',
      label:     exp.description,
      party:     exp.vendor || '—',
      amount:    exp.amount,
      status:    exp.status || 'validated',
      reference: null,
      source:    'expense',
      category:  exp.category,
    })),
    ...transfers.map((tr) => ({
      _id:       tr._id,
      date:      tr.executedAt || tr.createdAt,
      type:      'transfer',
      label:     tr.reference || `Virement`,
      party:     tr.beneficiaryId?.name || '—',
      amount:    tr.amount,
      status:    tr.status,
      reference: tr.reference,
      source:    'transfer',
    })),
  ];

  // Trier par date décroissante
  rows.sort((a, b) => new Date(b.date) - new Date(a.date));

  // Pagination
  const total  = rows.length;
  const offset = (parseInt(page) - 1) * parseInt(limit);
  const paged  = rows.slice(offset, offset + parseInt(limit));

  // Totaux
  const totalRevenue  = rows.filter((r) => r.type === 'revenue').reduce((s, r) => s + r.amount, 0);
  const totalExpenses = rows.filter((r) => r.type === 'expense').reduce((s, r) => s + r.amount, 0);
  const totalTransfer = rows.filter((r) => r.type === 'transfer').reduce((s, r) => s + r.amount, 0);

  res.json({
    transactions: paged,
    total,
    page:  parseInt(page),
    totalRevenue,
    totalExpenses,
    totalTransfer,
  });
};

module.exports = { getTransactions };
