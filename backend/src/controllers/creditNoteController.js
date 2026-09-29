/**
 * Avoirs : seule façon de corriger ou d'annuler une facture émise (une facture ne se supprime pas).
 * - Facture impayée → avoir total, la facture passe « annulée ».
 * - Facture payée → avoir « à rembourser » ; le remboursement crée l'écriture de sortie de trésorerie.
 */
const Invoice = require('../models/Invoice');
const CreditNote = require('../models/CreditNote');
const AccountingEntry = require('../models/AccountingEntry');
const Organization = require('../models/Organization');
const { nextNumber } = require('../services/numberingService');

const getUserOrg = (userId) =>
  Organization.findOne({ $or: [{ clerkOwnerId: userId }, { 'members.clerkUserId': userId }] });

// POST /api/invoices/:id/credit-note  { reason, amount? }  (amount HT pour un avoir partiel)
const createCreditNote = async (req, res) => {
  const org = await getUserOrg(req.userId);
  if (!org) return res.status(404).json({ error: 'Organisation introuvable.' });
  const invoice = await Invoice.findOne({ _id: req.params.id, organizationId: org._id });
  if (!invoice) return res.status(404).json({ error: 'Facture introuvable.' });
  if (invoice.status === 'draft') return res.status(400).json({ error: 'Un brouillon se supprime ou se modifie : pas besoin d’avoir.' });
  if (invoice.status === 'cancelled') return res.status(400).json({ error: 'Cette facture est déjà annulée.' });

  const existing = await CreditNote.find({ organizationId: org._id, invoiceId: invoice._id }).lean();
  const alreadyCredited = existing.reduce((s, c) => s + c.subtotal, 0);
  const remaining = Math.round((invoice.subtotal - alreadyCredited) * 100) / 100;
  if (remaining <= 0) return res.status(400).json({ error: 'Cette facture a déjà été entièrement créditée.' });

  const reason = String(req.body?.reason || '').trim().slice(0, 500);
  if (!reason) return res.status(400).json({ error: 'Indiquez le motif de l’avoir.' });

  // Avoir total (reprise des lignes) ou partiel (montant HT au taux de TVA principal)
  let lines;
  const partial = req.body?.amount != null && req.body.amount !== '';
  if (partial) {
    const amount = Math.round(Number(req.body.amount) * 100) / 100;
    if (!Number.isFinite(amount) || amount <= 0) return res.status(400).json({ error: 'Montant de l’avoir invalide.' });
    if (amount > remaining) return res.status(400).json({ error: `Montant supérieur au reste à créditer (${remaining.toFixed(2)} € HT).` });
    const mainRate = invoice.lines[0]?.vatRate ?? 20;
    lines = [{ description: `Avoir partiel sur facture ${invoice.number} — ${reason}`, quantity: 1, unitPrice: amount, vatRate: mainRate }];
  } else {
    if (existing.length) return res.status(400).json({ error: `Un avoir existe déjà : il reste ${remaining.toFixed(2)} € HT à créditer (avoir partiel).` });
    lines = invoice.lines.map((l) => ({ description: l.description, quantity: l.quantity, unitPrice: l.unitPrice, vatRate: l.vatRate }));
  }

  const wasPaid = invoice.status === 'paid';
  const creditNote = await CreditNote.create({
    organizationId: org._id,
    clientId: invoice.clientId,
    invoiceId: invoice._id,
    invoiceNumber: invoice.number,
    number: await nextNumber(org._id, 'AV'),
    reason,
    lines,
    currency: invoice.currency,
    status: wasPaid ? 'to_refund' : 'issued',
  });

  // Avoir total sur facture impayée : la facture est annulée (plus de relance ni de paiement possible)
  const fullyCredited = !partial || Math.abs(remaining - creditNote.subtotal) < 0.005;
  if (!wasPaid && fullyCredited) {
    invoice.status = 'cancelled';
    invoice.events.push({ type: 'cancelled', timestamp: new Date(), note: `Annulée par l'avoir ${creditNote.number}` });
  } else {
    invoice.events.push({ type: 'credited', timestamp: new Date(), note: `Avoir ${creditNote.number} : ${creditNote.total.toFixed(2)} € TTC` });
  }
  await invoice.save();

  res.status(201).json({ creditNote, invoiceStatus: invoice.status });
};

// GET /api/credit-notes  (?invoiceId=)
const listCreditNotes = async (req, res) => {
  const org = await getUserOrg(req.userId);
  if (!org) return res.status(404).json({ error: 'Organisation introuvable.' });
  const query = { organizationId: org._id };
  if (req.query.invoiceId) query.invoiceId = req.query.invoiceId;
  const creditNotes = await CreditNote.find(query).populate('clientId', 'name company email').sort({ issueDate: -1 }).lean();
  res.json({ creditNotes });
};

// GET /api/credit-notes/:id
const getCreditNote = async (req, res) => {
  const org = await getUserOrg(req.userId);
  if (!org) return res.status(404).json({ error: 'Organisation introuvable.' });
  const creditNote = await CreditNote.findOne({ _id: req.params.id, organizationId: org._id }).populate('clientId').lean();
  if (!creditNote) return res.status(404).json({ error: 'Avoir introuvable.' });
  res.json({ creditNote });
};

// POST /api/credit-notes/:id/refund — le remboursement au client a été effectué
const markRefunded = async (req, res) => {
  const org = await getUserOrg(req.userId);
  if (!org) return res.status(404).json({ error: 'Organisation introuvable.' });
  const cn = await CreditNote.findOne({ _id: req.params.id, organizationId: org._id });
  if (!cn) return res.status(404).json({ error: 'Avoir introuvable.' });
  if (cn.status !== 'to_refund') return res.status(400).json({ error: 'Cet avoir n’est pas en attente de remboursement.' });
  cn.status = 'refunded';
  cn.refundedAt = new Date();
  await cn.save();
  await AccountingEntry.create({
    organizationId: org._id, date: cn.refundedAt,
    description: `Remboursement avoir ${cn.number} (facture ${cn.invoiceNumber})`,
    category: 'revenue', type: 'debit', amount: cn.total, currency: cn.currency,
    source: 'manual', sourceId: cn._id,
  });
  res.json({ creditNote: cn });
};

module.exports = { createCreditNote, listCreditNotes, getCreditNote, markRefunded };
