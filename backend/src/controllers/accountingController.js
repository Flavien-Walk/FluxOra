const AccountingEntry = require('../models/AccountingEntry');
const Organization = require('../models/Organization');

const getUserOrg = async (userId) =>
  Organization.findOne({
    $or: [{ clerkOwnerId: userId }, { 'members.clerkUserId': userId }],
  });

// GET /api/accounting
const getEntries = async (req, res) => {
  const org = await getUserOrg(req.userId);
  if (!org) return res.status(404).json({ error: 'Organisation introuvable.' });

  const { type, category, source, from, to, page = 1, limit = 50 } = req.query;
  const query = { organizationId: org._id };

  if (type) query.type = type;
  if (category) query.category = category;
  if (source) query.source = source;
  if (from || to) {
    query.date = {};
    if (from) query.date.$gte = new Date(from);
    if (to) query.date.$lte = new Date(to);
  }

  const entries = await AccountingEntry.find(query)
    .sort({ date: -1 })
    .skip((page - 1) * limit)
    .limit(Number(limit));

  const total = await AccountingEntry.countDocuments(query);

  // Totaux récapitulatifs
  const [totals] = await AccountingEntry.aggregate([
    { $match: query },
    {
      $group: {
        _id: null,
        totalCredits: { $sum: { $cond: [{ $eq: ['$type', 'credit'] }, '$amount', 0] } },
        totalDebits: { $sum: { $cond: [{ $eq: ['$type', 'debit'] }, '$amount', 0] } },
      },
    },
  ]);

  res.json({
    entries,
    total,
    page: Number(page),
    limit: Number(limit),
    summary: totals || { totalCredits: 0, totalDebits: 0 },
  });
};

// POST /api/accounting — écriture manuelle
const createEntry = async (req, res) => {
  const org = await getUserOrg(req.userId);
  if (!org) return res.status(404).json({ error: 'Organisation introuvable.' });

  const { date, description, category, type, amount, currency } = req.body;

  const entry = await AccountingEntry.create({
    organizationId: org._id,
    date: date || Date.now(),
    description,
    category,
    type,
    amount,
    currency: currency || 'EUR',
    source: 'manual',
  });

  res.status(201).json(entry);
};

// DELETE /api/accounting/:id — uniquement les écritures manuelles
const deleteEntry = async (req, res) => {
  const org = await getUserOrg(req.userId);
  if (!org) return res.status(404).json({ error: 'Organisation introuvable.' });

  const entry = await AccountingEntry.findOneAndDelete({
    _id: req.params.id,
    organizationId: org._id,
    source: 'manual',
  });
  if (!entry) {
    return res.status(404).json({ error: 'Écriture introuvable ou non supprimable.' });
  }
  res.json({ message: 'Écriture supprimée.' });
};

module.exports = { getEntries, createEntry, deleteEntry };
