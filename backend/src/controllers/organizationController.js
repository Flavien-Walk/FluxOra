const Organization = require('../models/Organization');

// POST /api/organizations
const createOrganization = async (req, res) => {
  const { name, email, phone, address, vatNumber, siret, currency } = req.body;

  const existing = await Organization.findOne({ clerkOwnerId: req.userId });
  if (existing) {
    return res.status(400).json({ error: 'Vous avez déjà une organisation.' });
  }

  const org = await Organization.create({
    name,
    email,
    phone,
    address,
    vatNumber,
    siret,
    currency: currency || 'EUR',
    clerkOwnerId: req.userId,
    members: [{ clerkUserId: req.userId, role: 'admin' }],
  });

  res.status(201).json(org);
};

// GET /api/organizations/me
const getMyOrganization = async (req, res) => {
  const org = await Organization.findOne({
    $or: [
      { clerkOwnerId: req.userId },
      { 'members.clerkUserId': req.userId },
    ],
  });

  if (!org) return res.status(404).json({ error: 'Organisation introuvable.' });
  res.json(org);
};

// PUT /api/organizations/:id
const updateOrganization = async (req, res) => {
  const { name, email, phone, address, vatNumber, siret, currency } = req.body;

  const org = await Organization.findById(req.params.id);
  if (!org) return res.status(404).json({ error: 'Organisation introuvable.' });

  const isAdmin = org.members.some(
    (m) => m.clerkUserId === req.userId && m.role === 'admin'
  );
  if (!isAdmin) return res.status(403).json({ error: 'Accès refusé.' });

  Object.assign(org, { name, email, phone, address, vatNumber, siret, currency });
  await org.save();
  res.json(org);
};

// POST /api/organizations/:id/members
const addMember = async (req, res) => {
  const { clerkUserId, role } = req.body;

  const org = await Organization.findById(req.params.id);
  if (!org) return res.status(404).json({ error: 'Organisation introuvable.' });

  const isAdmin = org.members.some(
    (m) => m.clerkUserId === req.userId && m.role === 'admin'
  );
  if (!isAdmin) return res.status(403).json({ error: 'Accès refusé.' });

  const alreadyMember = org.members.some((m) => m.clerkUserId === clerkUserId);
  if (alreadyMember) {
    return res.status(400).json({ error: 'Cet utilisateur est déjà membre.' });
  }

  org.members.push({ clerkUserId, role: role || 'viewer' });
  await org.save();
  res.json(org);
};

// DELETE /api/organizations/:id/members/:clerkUserId
const removeMember = async (req, res) => {
  const org = await Organization.findById(req.params.id);
  if (!org) return res.status(404).json({ error: 'Organisation introuvable.' });

  const isAdmin = org.members.some(
    (m) => m.clerkUserId === req.userId && m.role === 'admin'
  );
  if (!isAdmin) return res.status(403).json({ error: 'Accès refusé.' });

  org.members = org.members.filter(
    (m) => m.clerkUserId !== req.params.clerkUserId
  );
  await org.save();
  res.json(org);
};

module.exports = {
  createOrganization,
  getMyOrganization,
  updateOrganization,
  addMember,
  removeMember,
};
