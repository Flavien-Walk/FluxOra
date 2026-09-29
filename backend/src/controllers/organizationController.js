const Organization = require('../models/Organization');

// POST /api/organizations
const createOrganization = async (req, res) => {
  const { name, email, phone, address, vatNumber, siret, currency } = req.body;

  const existing = await Organization.findOne({ $or: [{ clerkOwnerId: req.userId }, { 'members.clerkUserId': req.userId }] });
  if (existing) {
    return res.status(400).json({ error: 'Vous faites déjà partie d’une organisation.' });
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

  if (org) return res.json(org);

  // Première connexion d'une personne invitée : rattachement automatique
  const { acceptPendingInvite } = require('./memberController');
  const joined = await acceptPendingInvite(req.userId);
  if (joined) return res.json(joined);
  return res.status(404).json({ error: 'Organisation introuvable.' });
};

// PUT /api/organizations/:id
const updateOrganization = async (req, res) => {
  const { name, email, phone, address, vatNumber, siret, currency, emailTrackingEnabled, aiEnabled, autoRemindersEnabled } = req.body;

  const org = await Organization.findById(req.params.id);
  if (!org) return res.status(404).json({ error: 'Organisation introuvable.' });

  const isAdmin = org.members.some(
    (m) => m.clerkUserId === req.userId && m.role === 'admin'
  );
  if (!isAdmin) return res.status(403).json({ error: 'Accès refusé.' });

  // Seuls les champs fournis sont modifiés (un champ absent n'efface plus la valeur existante)
  const updates = { name, email, phone, address, vatNumber, siret, currency };
  for (const [k, v] of Object.entries(updates)) if (v !== undefined) org[k] = v;
  if (typeof emailTrackingEnabled === 'boolean') org.emailTrackingEnabled = emailTrackingEnabled;
  if (typeof aiEnabled === 'boolean') org.aiEnabled = aiEnabled;
  if (typeof autoRemindersEnabled === 'boolean') org.autoRemindersEnabled = autoRemindersEnabled;
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

/* ── RGPD : export et suppression ────────────────────────────── */
// Toutes les collections rattachées à une organisation
const ORG_MODELS = () => ({
  clients: require('../models/Client'),
  invoices: require('../models/Invoice'),
  quotes: require('../models/Quote'),
  expenses: require('../models/Expense'),
  payments: require('../models/Payment'),
  accountingEntries: require('../models/AccountingEntry'),
  alerts: require('../models/Alert'),
  beneficiaries: require('../models/Beneficiary'),
  transfers: require('../models/Transfer'),
  virtualCards: require('../models/VirtualCard'),
  investments: require('../models/Investment'),
  vatDeclarations: require('../models/VATDeclaration'),
  socialPosts: require('../models/SocialPost'),
  socialAccounts: require('../models/SocialAccount'),
  auditLogs: require('../models/AuditLog'),
  simulatedPositions: require('../models/SimulatedPosition'),
  creditNotes: require('../models/CreditNote'),
});

const findMyOrg = (userId) =>
  Organization.findOne({ $or: [{ clerkOwnerId: userId }, { 'members.clerkUserId': userId }] });

// GET /api/organizations/me/export — portabilité (art. 20 RGPD), réservé aux admins
const exportMyData = async (req, res) => {
  const org = await findMyOrg(req.userId);
  if (!org) return res.status(404).json({ error: 'Organisation introuvable.' });
  if (org.clerkOwnerId !== req.userId && !org.members.some((m) => m.clerkUserId === req.userId && m.role === 'admin')) {
    return res.status(403).json({ error: 'Export réservé aux administrateurs.' });
  }
  const data = { exportedAt: new Date().toISOString(), organization: org.toObject() };
  for (const [key, Model] of Object.entries(ORG_MODELS())) {
    const projection = key === 'socialAccounts' ? '-accessToken' : undefined; // jamais de jeton exporté
    data[key] = await Model.find({ organizationId: org._id }, projection).lean();
  }
  res.setHeader('Content-Disposition', `attachment; filename="fluxora-export-${new Date().toISOString().slice(0, 10)}.json"`);
  res.json(data);
};

// DELETE /api/organizations/me — effacement (art. 17 RGPD), propriétaire uniquement, confirmation par le nom
const deleteMyOrganization = async (req, res) => {
  const org = await findMyOrg(req.userId);
  if (!org) return res.status(404).json({ error: 'Organisation introuvable.' });
  if (org.clerkOwnerId !== req.userId) return res.status(403).json({ error: 'Seul le propriétaire peut supprimer l’organisation.' });
  if ((req.body?.confirm || '').trim() !== org.name) {
    return res.status(400).json({ error: 'Confirmation invalide : saisissez exactement le nom de l’organisation.' });
  }
  const counts = {};
  for (const [key, Model] of Object.entries(ORG_MODELS())) {
    counts[key] = (await Model.deleteMany({ organizationId: org._id })).deletedCount;
  }
  await Organization.deleteOne({ _id: org._id });
  res.json({ ok: true, deleted: counts });
};

module.exports = {
  exportMyData,
  deleteMyOrganization,
  createOrganization,
  getMyOrganization,
  updateOrganization,
  addMember,
  removeMember,
};
