const Expense = require('../models/Expense');
const AccountingEntry = require('../models/AccountingEntry');
const Organization = require('../models/Organization');

const getUserOrg = async (userId) =>
  Organization.findOne({
    $or: [{ clerkOwnerId: userId }, { 'members.clerkUserId': userId }],
  });

// GET /api/expenses
const getExpenses = async (req, res) => {
  const org = await getUserOrg(req.userId);
  if (!org) return res.status(404).json({ error: 'Organisation introuvable.' });

  const { category, from, to, page = 1, limit = 20 } = req.query;
  const query = { organizationId: org._id };
  if (category) query.category = category;
  if (from || to) {
    query.date = {};
    if (from) query.date.$gte = new Date(from);
    if (to) query.date.$lte = new Date(to);
  }

  const expenses = await Expense.find(query)
    .sort({ date: -1 })
    .skip((page - 1) * limit)
    .limit(Number(limit));

  const total = await Expense.countDocuments(query);
  res.json({ expenses, total, page: Number(page), limit: Number(limit) });
};

// GET /api/expenses/:id
const getExpense = async (req, res) => {
  const org = await getUserOrg(req.userId);
  if (!org) return res.status(404).json({ error: 'Organisation introuvable.' });

  const expense = await Expense.findOne({ _id: req.params.id, organizationId: org._id });
  if (!expense) return res.status(404).json({ error: 'Dépense introuvable.' });
  res.json(expense);
};

// POST /api/expenses
const createExpense = async (req, res) => {
  const org = await getUserOrg(req.userId);
  if (!org) return res.status(404).json({ error: 'Organisation introuvable.' });

  const { description, amount, currency, category, date, receiptUrl, vendor, notes } = req.body;

  const expense = await Expense.create({
    organizationId: org._id,
    description,
    amount,
    currency: currency || 'EUR',
    category,
    date: date || Date.now(),
    receiptUrl,
    vendor,
    notes,
  });

  // Génération automatique de l'écriture comptable
  await AccountingEntry.create({
    organizationId: org._id,
    date: expense.date,
    description: `Dépense — ${description}`,
    category,
    type: 'debit',
    amount: expense.amount,
    currency: expense.currency,
    source: 'expense',
    sourceId: expense._id,
    sourceModel: 'Expense',
  });

  res.status(201).json(expense);
};

// PUT /api/expenses/:id
const updateExpense = async (req, res) => {
  const org = await getUserOrg(req.userId);
  if (!org) return res.status(404).json({ error: 'Organisation introuvable.' });

  const expense = await Expense.findOneAndUpdate(
    { _id: req.params.id, organizationId: org._id },
    req.body,
    { new: true, runValidators: true }
  );
  if (!expense) return res.status(404).json({ error: 'Dépense introuvable.' });
  res.json(expense);
};

// DELETE /api/expenses/:id
const deleteExpense = async (req, res) => {
  const org = await getUserOrg(req.userId);
  if (!org) return res.status(404).json({ error: 'Organisation introuvable.' });

  const expense = await Expense.findOneAndDelete({ _id: req.params.id, organizationId: org._id });
  if (!expense) return res.status(404).json({ error: 'Dépense introuvable.' });

  // Supprime l'écriture comptable associée
  await AccountingEntry.deleteOne({ sourceId: expense._id, sourceModel: 'Expense' });

  res.json({ message: 'Dépense supprimée.' });
};

module.exports = { getExpenses, getExpense, createExpense, updateExpense, deleteExpense };
