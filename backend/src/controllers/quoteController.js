const Quote = require('../models/Quote');
const Invoice = require('../models/Invoice');
const Organization = require('../models/Organization');
const Client = require('../models/Client');
const { sendQuoteEmail } = require('../services/emailService');

const getUserOrg = async (userId) =>
  Organization.findOne({
    $or: [{ clerkOwnerId: userId }, { 'members.clerkUserId': userId }],
  });

const generateQuoteNumber = async (orgId) => {
  const year = new Date().getFullYear();
  const count = await Quote.countDocuments({
    organizationId: orgId,
    number: { $regex: `^DEV-${year}-` },
  });
  const seq = String(count + 1).padStart(3, '0');
  return `DEV-${year}-${seq}`;
};

// GET /api/quotes
const getQuotes = async (req, res) => {
  const org = await getUserOrg(req.userId);
  if (!org) return res.status(404).json({ error: 'Organisation introuvable.' });

  const { status, clientId, page = 1, limit = 20 } = req.query;
  const query = { organizationId: org._id };
  if (status) query.status = status;
  if (clientId) query.clientId = clientId;

  const quotes = await Quote.find(query)
    .populate('clientId', 'name email company')
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(Number(limit));

  const total = await Quote.countDocuments(query);
  res.json({ quotes, total, page: Number(page), limit: Number(limit) });
};

// GET /api/quotes/:id
const getQuote = async (req, res) => {
  const org = await getUserOrg(req.userId);
  if (!org) return res.status(404).json({ error: 'Organisation introuvable.' });

  const quote = await Quote.findOne({ _id: req.params.id, organizationId: org._id })
    .populate('clientId')
    .populate('invoiceId', 'number status');

  if (!quote) return res.status(404).json({ error: 'Devis introuvable.' });
  res.json(quote);
};

// POST /api/quotes
const createQuote = async (req, res) => {
  const org = await getUserOrg(req.userId);
  if (!org) return res.status(404).json({ error: 'Organisation introuvable.' });

  const { clientId, lines, expiryDate, notes, currency } = req.body;
  const number = await generateQuoteNumber(org._id);

  const quote = await Quote.create({
    organizationId: org._id,
    clientId,
    number,
    lines,
    expiryDate,
    notes,
    currency: currency || org.currency || 'EUR',
  });

  res.status(201).json(quote);
};

// PUT /api/quotes/:id
const updateQuote = async (req, res) => {
  const org = await getUserOrg(req.userId);
  if (!org) return res.status(404).json({ error: 'Organisation introuvable.' });

  const quote = await Quote.findOne({ _id: req.params.id, organizationId: org._id });
  if (!quote) return res.status(404).json({ error: 'Devis introuvable.' });

  const locked = ['accepted', 'rejected'];
  if (locked.includes(quote.status)) {
    return res.status(400).json({ error: 'Ce devis ne peut plus être modifié.' });
  }

  const { lines, expiryDate, notes, status, clientId } = req.body;
  if (lines) quote.lines = lines;
  if (expiryDate) quote.expiryDate = expiryDate;
  if (notes !== undefined) quote.notes = notes;
  if (status) quote.status = status;
  if (clientId) quote.clientId = clientId;
  if (status === 'accepted') quote.acceptedAt = new Date();

  await quote.save();
  res.json(quote);
};

// DELETE /api/quotes/:id
const deleteQuote = async (req, res) => {
  const org = await getUserOrg(req.userId);
  if (!org) return res.status(404).json({ error: 'Organisation introuvable.' });

  const quote = await Quote.findOneAndDelete({
    _id: req.params.id,
    organizationId: org._id,
    status: { $in: ['draft', 'rejected', 'expired'] },
  });
  if (!quote) return res.status(404).json({ error: 'Devis introuvable ou non supprimable.' });
  res.json({ message: 'Devis supprimé.' });
};

// POST /api/quotes/:id/send-email
const sendEmail = async (req, res) => {
  const org = await getUserOrg(req.userId);
  if (!org) return res.status(404).json({ error: 'Organisation introuvable.' });

  const quote = await Quote.findOne({ _id: req.params.id, organizationId: org._id })
    .populate('clientId');
  if (!quote) return res.status(404).json({ error: 'Devis introuvable.' });

  const { overrideEmail } = req.body;

  await sendQuoteEmail({
    quote,
    org,
    client: quote.clientId,
    overrideEmail,
  });

  // Marquer comme envoyé si brouillon
  if (quote.status === 'draft') {
    quote.status = 'sent';
    quote.sentAt = new Date();
    await quote.save();
  }

  res.json({ message: 'Devis envoyé par email.', status: quote.status });
};

// POST /api/quotes/:id/convert — convertit en facture
const convertToInvoice = async (req, res) => {
  const org = await getUserOrg(req.userId);
  if (!org) return res.status(404).json({ error: 'Organisation introuvable.' });

  const quote = await Quote.findOne({ _id: req.params.id, organizationId: org._id });
  if (!quote) return res.status(404).json({ error: 'Devis introuvable.' });
  if (quote.invoiceId) return res.status(400).json({ error: 'Ce devis a déjà été converti en facture.' });

  // Génère numéro facture
  const year = new Date().getFullYear();
  const count = await Invoice.countDocuments({
    organizationId: org._id,
    number: { $regex: `^FAC-${year}-` },
  });
  const seq = String(count + 1).padStart(3, '0');
  const invoiceNumber = `FAC-${year}-${seq}`;

  const invoice = await Invoice.create({
    organizationId: org._id,
    clientId: quote.clientId,
    number: invoiceNumber,
    lines: quote.lines,
    dueDate: req.body.dueDate,
    notes: quote.notes,
    currency: quote.currency,
    status: 'draft',
  });

  quote.invoiceId = invoice._id;
  quote.status = 'accepted';
  quote.acceptedAt = new Date();
  await quote.save();

  res.status(201).json({ invoice, quote });
};

module.exports = { getQuotes, getQuote, createQuote, updateQuote, deleteQuote, sendEmail, convertToInvoice };
