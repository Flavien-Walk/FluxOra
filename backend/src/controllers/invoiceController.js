const Invoice = require('../models/Invoice');
const Payment = require('../models/Payment');
const AccountingEntry = require('../models/AccountingEntry');
const Organization = require('../models/Organization');
const { sendInvoiceEmail } = require('../services/emailService');

const getUserOrg = async (userId) =>
  Organization.findOne({
    $or: [{ clerkOwnerId: userId }, { 'members.clerkUserId': userId }],
  });

const generateInvoiceNumber = async (orgId) => {
  const year = new Date().getFullYear();
  const count = await Invoice.countDocuments({
    organizationId: orgId,
    number: { $regex: `^FAC-${year}-` },
  });
  const seq = String(count + 1).padStart(3, '0');
  return `FAC-${year}-${seq}`;
};

const getInvoices = async (req, res) => {
  const org = await getUserOrg(req.userId);
  if (!org) return res.status(404).json({ error: 'Organisation introuvable.' });
  const { status, clientId, page = 1, limit = 20 } = req.query;
  const query = { organizationId: org._id };
  if (status) query.status = status;
  if (clientId) query.clientId = clientId;
  const invoices = await Invoice.find(query)
    .populate('clientId', 'name email company')
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(Number(limit));
  const total = await Invoice.countDocuments(query);
  res.json({ invoices, total, page: Number(page), limit: Number(limit) });
};

const getInvoice = async (req, res) => {
  const org = await getUserOrg(req.userId);
  if (!org) return res.status(404).json({ error: 'Organisation introuvable.' });
  const invoice = await Invoice.findOne({ _id: req.params.id, organizationId: org._id }).populate('clientId');
  if (!invoice) return res.status(404).json({ error: 'Facture introuvable.' });
  res.json(invoice);
};

const createInvoice = async (req, res) => {
  const org = await getUserOrg(req.userId);
  if (!org) return res.status(404).json({ error: 'Organisation introuvable.' });
  const { clientId, lines, dueDate, notes, currency } = req.body;
  const number = await generateInvoiceNumber(org._id);
  const invoice = await Invoice.create({
    organizationId: org._id, clientId, number, lines, dueDate, notes,
    currency: currency || org.currency || 'EUR', status: 'draft',
  });
  res.status(201).json(invoice);
};

const updateInvoice = async (req, res) => {
  const org = await getUserOrg(req.userId);
  if (!org) return res.status(404).json({ error: 'Organisation introuvable.' });
  const invoice = await Invoice.findOne({ _id: req.params.id, organizationId: org._id });
  if (!invoice) return res.status(404).json({ error: 'Facture introuvable.' });
  if (invoice.status === 'paid') return res.status(400).json({ error: 'Une facture payée ne peut pas être modifiée.' });

  const { lines, dueDate, notes, status, clientId } = req.body;
  const wasUnpaid = invoice.status !== 'paid';
  if (lines) invoice.lines = lines;
  if (dueDate) invoice.dueDate = dueDate;
  if (notes !== undefined) invoice.notes = notes;
  if (status) invoice.status = status;
  if (clientId) invoice.clientId = clientId;

  if (status === 'paid' && wasUnpaid) {
    invoice.paidAt = new Date();
    await invoice.save();
    const payment = await Payment.create({
      organizationId: org._id, invoiceId: invoice._id,
      amount: invoice.total, currency: invoice.currency || 'EUR',
      status: 'succeeded', paidAt: invoice.paidAt,
    });
    await AccountingEntry.create({
      organizationId: org._id, date: invoice.paidAt,
      description: `Paiement facture ${invoice.number}`,
      category: 'revenue', type: 'credit',
      amount: invoice.total, currency: invoice.currency || 'EUR',
      source: 'invoice', sourceId: invoice._id, sourceModel: 'Invoice',
    });
  } else {
    await invoice.save();
  }
  res.json(invoice);
};

const deleteInvoice = async (req, res) => {
  const org = await getUserOrg(req.userId);
  if (!org) return res.status(404).json({ error: 'Organisation introuvable.' });
  const invoice = await Invoice.findOneAndDelete({
    _id: req.params.id, organizationId: org._id,
    status: { $in: ['draft', 'cancelled'] },
  });
  if (!invoice) return res.status(404).json({ error: 'Facture introuvable ou non supprimable.' });
  res.json({ message: 'Facture supprimée.' });
};

const sendEmail = async (req, res) => {
  const org = await getUserOrg(req.userId);
  if (!org) return res.status(404).json({ error: 'Organisation introuvable.' });
  const invoice = await Invoice.findOne({ _id: req.params.id, organizationId: org._id }).populate('clientId');
  if (!invoice) return res.status(404).json({ error: 'Facture introuvable.' });
  const { overrideEmail } = req.body;
  await sendInvoiceEmail({ invoice, org, client: invoice.clientId, overrideEmail });
  if (invoice.status === 'draft') {
    invoice.status = 'sent';
    invoice.sentAt = new Date();
    await invoice.save();
  }
  res.json({ message: 'Facture envoyée par email.', status: invoice.status });
};

module.exports = { getInvoices, getInvoice, createInvoice, updateInvoice, deleteInvoice, sendEmail };
