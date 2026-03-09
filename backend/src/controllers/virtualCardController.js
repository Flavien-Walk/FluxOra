const VirtualCard = require('../models/VirtualCard');
const Organization = require('../models/Organization');

const getUserOrg = async (userId) =>
  Organization.findOne({
    $or: [{ clerkOwnerId: userId }, { 'members.clerkUserId': userId }],
  });

const COLORS = ['indigo', 'violet', 'emerald', 'rose', 'amber', 'sky'];

function generateLast4() {
  return String(Math.floor(1000 + Math.random() * 9000));
}

// GET /api/cards
const getCards = async (req, res) => {
  const org = await getUserOrg(req.userId);
  if (!org) return res.status(404).json({ error: 'Organisation introuvable.' });

  const cards = await VirtualCard.find({ organizationId: org._id, status: { $ne: 'cancelled' } })
    .sort({ createdAt: -1 });

  res.json({ cards });
};

// POST /api/cards
const createCard = async (req, res) => {
  const org = await getUserOrg(req.userId);
  if (!org) return res.status(404).json({ error: 'Organisation introuvable.' });

  const { name, category, monthlyLimit, linkedVendor, color } = req.body;

  const now = new Date();
  const expiryMonth = now.getMonth() + 1;
  const expiryYear  = now.getFullYear() + 3;

  const card = await VirtualCard.create({
    organizationId: org._id,
    name,
    category:    category || 'other',
    last4:       generateLast4(),
    expiryMonth,
    expiryYear,
    monthlyLimit: monthlyLimit || 500,
    linkedVendor,
    color:       color || COLORS[Math.floor(Math.random() * COLORS.length)],
  });

  res.status(201).json(card);
};

// PATCH /api/cards/:id/status
const updateCardStatus = async (req, res) => {
  const org = await getUserOrg(req.userId);
  if (!org) return res.status(404).json({ error: 'Organisation introuvable.' });

  const { status } = req.body;
  if (!['active', 'blocked', 'cancelled'].includes(status)) {
    return res.status(400).json({ error: 'Statut invalide.' });
  }

  const card = await VirtualCard.findOneAndUpdate(
    { _id: req.params.id, organizationId: org._id },
    { status },
    { new: true }
  );
  if (!card) return res.status(404).json({ error: 'Carte introuvable.' });

  res.json(card);
};

// PUT /api/cards/:id
const updateCard = async (req, res) => {
  const org = await getUserOrg(req.userId);
  if (!org) return res.status(404).json({ error: 'Organisation introuvable.' });

  const card = await VirtualCard.findOneAndUpdate(
    { _id: req.params.id, organizationId: org._id },
    req.body,
    { new: true, runValidators: true }
  );
  if (!card) return res.status(404).json({ error: 'Carte introuvable.' });

  res.json(card);
};

// DELETE /api/cards/:id
const deleteCard = async (req, res) => {
  const org = await getUserOrg(req.userId);
  if (!org) return res.status(404).json({ error: 'Organisation introuvable.' });

  const card = await VirtualCard.findOneAndUpdate(
    { _id: req.params.id, organizationId: org._id },
    { status: 'cancelled' },
    { new: true }
  );
  if (!card) return res.status(404).json({ error: 'Carte introuvable.' });

  res.json({ message: 'Carte supprimée.' });
};

module.exports = { getCards, createCard, updateCard, updateCardStatus, deleteCard };
