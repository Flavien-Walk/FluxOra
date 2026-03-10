/**
 * assistantSearch.js
 * Fonctions de recherche d'entités Fluxora pour l'agent assistant.
 * Retourne des données structurées avec score de confiance.
 */

const Invoice = require('../models/Invoice');
const Expense = require('../models/Expense');
const Quote   = require('../models/Quote');
const Client  = require('../models/Client');

/* ── Helpers regex ────────────────────────────────────────────── */
function escapeRegex(str) { return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

/* ── Extraction de montant depuis un texte français ──────────── */
function extractAmount(message) {
  if (!message) return null;
  const text = message.replace(/\u00a0/g, ' ');
  const re = /(\d[\d\s]*(?:[,.]\d{1,3})*)\s*(?:€|euros?)/gi;
  const match = re.exec(text);
  if (match) {
    const raw = match[1].trim().replace(/\s+/g, '');
    const normalized = raw.replace(/[.,](?=\d{3}(?:[.,]|$))/g, '').replace(',', '.');
    const num = parseFloat(normalized);
    if (!isNaN(num) && num > 0 && num < 10_000_000) return Math.round(num * 100) / 100;
  }
  return null;
}

function extractAllAmounts(message) {
  if (!message) return [];
  const text = message.replace(/\u00a0/g, ' ');
  const re = /(\d[\d\s]*(?:[,.]\d{1,3})*)\s*(?:€|euros?)/gi;
  const result = [];
  let match;
  while ((match = re.exec(text)) !== null) {
    const raw = match[1].trim().replace(/\s+/g, '').replace(/[.,](?=\d{3}(?:[.,]|$))/g, '').replace(',', '.');
    const num = parseFloat(raw);
    if (!isNaN(num) && num > 0 && num < 10_000_000) result.push(Math.round(num * 100) / 100);
  }
  return result;
}

/* ── Extraction d'un nom de fournisseur ──────────────────────── */
const KNOWN_VENDORS = ['stripe', 'ovh', 'aws', 'google', 'apple', 'notion', 'slack',
  'shopify', 'heroku', 'vercel', 'render', 'github', 'linear', 'figma', 'zoom',
  'dropbox', 'hubspot', 'salesforce', 'microsoft', 'adobe', 'mailchimp', 'sendgrid'];

function extractVendorName(message) {
  if (!message) return null;
  const m = message.toLowerCase();
  const known = KNOWN_VENDORS.find((v) => m.includes(v));
  if (known) return known.charAt(0).toUpperCase() + known.slice(1);
  const patterns = [
    /(?:chez|de chez|fournisseur|prestataire|société|marque)\s+([A-ZÀ-Ÿa-zà-ÿ][^\s,?!.]{1,30})/i,
    /(?:virement|débit|prélévement|paiement)\s+(?:de\s+)?([A-ZÀ-Ÿ][A-ZÀ-Ÿa-zà-ÿ\s]{1,20}?)(?:\s+de|\s*$)/i,
  ];
  for (const pattern of patterns) {
    const match = message.match(pattern);
    if (match) return match[1].trim();
  }
  return null;
}

/* ── Recherche de factures par montant (± 10%) ───────────────── */
async function findInvoicesByAmount(orgId, amount) {
  if (!amount || amount <= 0) return [];
  return Invoice.find({
    organizationId: orgId,
    total: { $gte: amount * 0.90, $lte: amount * 1.10 },
    status: { $in: ['sent', 'late', 'payment_pending', 'paid', 'draft'] },
  })
    .sort({ updatedAt: -1 })
    .limit(5)
    .populate('clientId', 'name company')
    .lean();
}

/* ── Recherche de dépenses par fournisseur et/ou montant ────── */
async function findExpensesByVendorOrAmount(orgId, vendor, amount) {
  const conditions = [];
  if (vendor) {
    const safe = escapeRegex(vendor);
    conditions.push({ vendor: { $regex: safe, $options: 'i' } });
    conditions.push({ description: { $regex: safe, $options: 'i' } });
  }
  if (amount && amount > 0) {
    conditions.push({ amount: { $gte: amount * 0.90, $lte: amount * 1.10 } });
  }
  if (!conditions.length) return [];
  return Expense.find({ organizationId: orgId, $or: conditions })
    .sort({ date: -1 })
    .limit(5)
    .lean();
}

/* ── Historique complet d'un client ──────────────────────────── */
async function findClientHistory(orgId, clientId) {
  const [invoices, quotes] = await Promise.all([
    Invoice.find({ organizationId: orgId, clientId })
      .select('number status total issueDate dueDate')
      .sort({ issueDate: -1 })
      .limit(8)
      .lean(),
    Quote.find({ organizationId: orgId, clientId })
      .select('number status total issueDate expiryDate')
      .sort({ issueDate: -1 })
      .limit(5)
      .lean(),
  ]);
  return { invoices, quotes };
}

/* ── Anti-doublon : brouillon existant dans les 24h ─────────── */
async function checkRecentDraft(orgId, clientId, type) {
  const Model = type === 'quote' ? Quote : Invoice;
  return Model.findOne({
    organizationId: orgId,
    clientId,
    status: 'draft',
    createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
  }).lean();
}

/* ── Builders objectCards ────────────────────────────────────── */
const STATUS_LABEL = {
  draft: 'Brouillon', sent: 'Envoyée', late: 'En retard',
  paid: 'Payée', payment_pending: 'En attente', cancelled: 'Annulée',
  accepted: 'Accepté', refused: 'Refusé', expired: 'Expiré',
};
const STATUS_TONE  = { late: 'warning', paid: 'success', cancelled: 'danger', refused: 'danger', expired: 'warning' };
const CAT_LABEL    = { software: 'Logiciels', marketing: 'Marketing', suppliers: 'Fournisseurs', salaries: 'Salaires', taxes: 'Taxes', banking: 'Banque', travel: 'Déplacements', office: 'Bureautique', other: 'Autre' };
const EXP_TONE     = { pending_review: 'warning', non_eligible: 'danger', validated: 'success' };

function invoicesToObjectCards(invoices, currency = 'EUR') {
  const fmt = (n) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency }).format(n || 0);
  return invoices.map((inv) => ({
    id: inv._id.toString(),
    type: 'invoice',
    tone: STATUS_TONE[inv.status] || 'default',
    title: `Facture ${inv.number || '#'}`,
    subtitle: inv.clientId?.name || 'Client inconnu',
    badge: STATUS_LABEL[inv.status] || inv.status,
    fields: [
      { label: 'Montant', value: fmt(inv.total) },
      { label: 'Émise le', value: inv.issueDate ? new Date(inv.issueDate).toLocaleDateString('fr-FR') : '—' },
      { label: 'Échéance', value: inv.dueDate ? new Date(inv.dueDate).toLocaleDateString('fr-FR') : '—' },
    ],
  }));
}

function quotesToObjectCards(quotes, currency = 'EUR') {
  const fmt = (n) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency }).format(n || 0);
  return quotes.map((q) => ({
    id: q._id.toString(),
    type: 'quote',
    tone: STATUS_TONE[q.status] || 'default',
    title: `Devis ${q.number || '#'}`,
    subtitle: STATUS_LABEL[q.status] || q.status,
    badge: STATUS_LABEL[q.status] || q.status,
    fields: [
      { label: 'Montant', value: fmt(q.total) },
      { label: 'Émis le', value: q.issueDate ? new Date(q.issueDate).toLocaleDateString('fr-FR') : '—' },
      { label: 'Validité', value: q.expiryDate ? new Date(q.expiryDate).toLocaleDateString('fr-FR') : '—' },
    ],
  }));
}

function expensesToObjectCards(expenses, currency = 'EUR') {
  const fmt = (n) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency }).format(n || 0);
  return expenses.map((exp) => ({
    id: exp._id.toString(),
    type: 'expense',
    tone: EXP_TONE[exp.status] || 'default',
    title: exp.description || exp.vendor || 'Dépense',
    subtitle: exp.vendor || '',
    badge: CAT_LABEL[exp.category] || exp.category || 'Non catégorisé',
    fields: [
      { label: 'Montant', value: fmt(exp.amount) },
      { label: 'Date', value: exp.date ? new Date(exp.date).toLocaleDateString('fr-FR') : '—' },
      { label: 'Statut', value: exp.status === 'pending_review' ? 'À vérifier' : exp.status === 'validated' ? 'Validée' : 'Non éligible' },
    ],
  }));
}

module.exports = {
  escapeRegex,
  extractAmount,
  extractAllAmounts,
  extractVendorName,
  findInvoicesByAmount,
  findExpensesByVendorOrAmount,
  findClientHistory,
  checkRecentDraft,
  invoicesToObjectCards,
  quotesToObjectCards,
  expensesToObjectCards,
};
