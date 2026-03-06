const Client = require('../models/Client');
const Organization = require('../models/Organization');

// Récupère l'org de l'utilisateur connecté
const getUserOrg = async (userId) => {
  return Organization.findOne({
    $or: [{ clerkOwnerId: userId }, { 'members.clerkUserId': userId }],
  });
};

// GET /api/clients
const getClients = async (req, res) => {
  const org = await getUserOrg(req.userId);
  if (!org) return res.status(404).json({ error: 'Organisation introuvable.' });

  const { search, page = 1, limit = 20 } = req.query;
  const query = { organizationId: org._id };

  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
      { company: { $regex: search, $options: 'i' } },
    ];
  }

  const clients = await Client.find(query)
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(Number(limit));

  const total = await Client.countDocuments(query);
  res.json({ clients, total, page: Number(page), limit: Number(limit) });
};

// GET /api/clients/:id
const getClient = async (req, res) => {
  const org = await getUserOrg(req.userId);
  if (!org) return res.status(404).json({ error: 'Organisation introuvable.' });

  const client = await Client.findOne({
    _id: req.params.id,
    organizationId: org._id,
  });
  if (!client) return res.status(404).json({ error: 'Client introuvable.' });
  res.json(client);
};

// POST /api/clients
const createClient = async (req, res) => {
  const org = await getUserOrg(req.userId);
  if (!org) return res.status(404).json({ error: 'Organisation introuvable.' });

  const { name, email, phone, company, address, city, country, vatNumber, siret, notes } = req.body;

  const client = await Client.create({
    organizationId: org._id,
    name,
    email,
    phone,
    company,
    address,
    city,
    country,
    vatNumber,
    siret,
    notes,
  });

  res.status(201).json(client);
};

// PUT /api/clients/:id
const updateClient = async (req, res) => {
  const org = await getUserOrg(req.userId);
  if (!org) return res.status(404).json({ error: 'Organisation introuvable.' });

  const client = await Client.findOneAndUpdate(
    { _id: req.params.id, organizationId: org._id },
    req.body,
    { new: true, runValidators: true }
  );
  if (!client) return res.status(404).json({ error: 'Client introuvable.' });
  res.json(client);
};

// DELETE /api/clients/:id
const deleteClient = async (req, res) => {
  const org = await getUserOrg(req.userId);
  if (!org) return res.status(404).json({ error: 'Organisation introuvable.' });

  const client = await Client.findOneAndDelete({
    _id: req.params.id,
    organizationId: org._id,
  });
  if (!client) return res.status(404).json({ error: 'Client introuvable.' });
  res.json({ message: 'Client supprimé.' });
};

module.exports = { getClients, getClient, createClient, updateClient, deleteClient };
