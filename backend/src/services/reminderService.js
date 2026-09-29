/**
 * Relances des factures impayées et des devis en attente : envoi manuel et automatique (cron quotidien).
 * Chaque envoi est tracé dans reminderConfig.history (statut sent / failed) ; un même type de relance
 * n'est jamais envoyé deux fois automatiquement pour un document.
 */
const Invoice = require('../models/Invoice');
const Quote = require('../models/Quote');
const Organization = require('../models/Organization');
const { sendReminderEmail } = require('./emailService');

const LABELS = {
  quote_reminder: 'Rappel commercial',
  expiry_warning: 'Rappel avant expiration',
  post_expiry: 'Relance après expiration',
  before_due: 'Rappel avant échéance',
  on_due: 'Rappel jour échéance',
  overdue_1: '1ère relance impayée',
  overdue_2: '2ème relance impayée',
  overdue_3: 'Dernière relance',
};
const INVOICE_TYPES = ['before_due', 'on_due', 'overdue_1', 'overdue_2', 'overdue_3'];
const QUOTE_TYPES = ['quote_reminder', 'expiry_warning', 'post_expiry'];
const UNPAID = ['sent', 'email_opened', 'viewed', 'late', 'payment_pending'];
const PENDING_QUOTE = ['sent', 'email_opened', 'viewed'];

const httpError = (status, message) => Object.assign(new Error(message), { status });
const DAY = 24 * 3600 * 1000;
const startOfDay = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
const daysBetween = (from, to) => Math.round((startOfDay(to) - startOfDay(from)) / DAY);

/**
 * Envoie une relance et l'enregistre dans l'historique du document.
 * @returns {{ historyEntry, doc }}
 */
async function sendDocumentReminder({ docType, doc, org, type, overrideEmail, automatic = false }) {
  const allowed = docType === 'invoice' ? INVOICE_TYPES : QUOTE_TYPES;
  if (!allowed.includes(type)) throw httpError(400, 'Type de relance invalide.');
  const client = doc.clientId;
  const to = (overrideEmail || client?.email || '').trim();
  if (!to) throw httpError(400, 'Ce client n’a pas d’adresse email : ajoutez-la sur sa fiche.');
  // Domaines réservés (RFC 2606) : adresses fictives des données de démo, jamais contactées
  if (!isReachable(to)) {
    throw httpError(400, `Adresse fictive (${to}) : relance non envoyée. Renseignez un email réel sur la fiche client.`);
  }

  const entry = {
    type,
    sentAt: new Date(),
    subject: '',
    recipientEmail: to,
    status: 'sent',
    note: `${LABELS[type]}${automatic ? ' (automatique)' : ''}`,
  };

  let error = null;
  try {
    const { subject } = await sendReminderEmail({ docType, doc, org, client, type, to });
    entry.subject = subject;
  } catch (err) {
    error = err;
    entry.status = 'failed';
    entry.subject = LABELS[type];
    entry.note = `${entry.note} — échec : ${err.message}`.slice(0, 300);
  }

  if (!doc.reminderConfig) doc.set('reminderConfig', {});
  doc.reminderConfig.history = [...(doc.reminderConfig.history || []), entry];
  if (!error) doc.events.push({ type: 'reminder_sent', timestamp: new Date(), note: entry.note });
  doc.markModified('reminderConfig');
  await doc.save();

  if (error) throw httpError(502, `L’email n’a pas pu être envoyé : ${error.message}`);
  return { historyEntry: entry, doc };
}

// Relance due aujourd'hui pour une facture (ou null)
function dueInvoiceType(inv, now) {
  if (!inv.dueDate) return null;
  const cfg = inv.reminderConfig || {};
  const d = daysBetween(now, inv.dueDate); // > 0 : avant échéance
  if (d > 0 && cfg.beforeDueDays && d <= cfg.beforeDueDays) return 'before_due';
  if (d === 0 && cfg.onDueDayEnabled !== false) return 'on_due';
  if (d < 0) {
    const late = -d;
    const steps = [...(cfg.afterDueDays?.length ? cfg.afterDueDays : [5, 15])].sort((a, b) => a - b);
    const types = ['overdue_1', 'overdue_2', 'overdue_3'];
    // la relance la plus avancée atteinte et pas encore envoyée
    for (let i = Math.min(steps.length, 3) - 1; i >= 0; i--) {
      if (late >= steps[i]) return types[i];
    }
  }
  return null;
}

function dueQuoteType(q, now) {
  const cfg = q.reminderConfig || {};
  if (q.expiryDate) {
    const d = daysBetween(now, q.expiryDate);
    if (d < 0 && cfg.afterExpiryEnabled) return 'post_expiry';
    if (d >= 0 && cfg.beforeExpiryDays && d <= cfg.beforeExpiryDays) return 'expiry_warning';
  }
  if (q.sentAt && cfg.firstReminderDays && daysBetween(q.sentAt, now) >= cfg.firstReminderDays) return 'quote_reminder';
  return null;
}

// Adresse exploitable : présente et hors domaines réservés aux exemples (RFC 2606)
const FAKE_DOMAIN = /\.(example|test|invalid|localhost)$/i;
const isReachable = (email) => Boolean(email) && !FAKE_DOMAIN.test(String(email).split('@')[1] || '');

const alreadySent = (doc, type) => (doc.reminderConfig?.history || []).some((h) => h.type === type && h.status !== 'failed');

/** Cron quotidien : envoie les relances automatiques dues. */
async function runAutomaticReminders(now = new Date()) {
  const stats = { sent: 0, failed: 0, markedLate: 0 };
  const orgCache = new Map();
  const getOrg = async (id) => {
    const key = String(id);
    if (!orgCache.has(key)) orgCache.set(key, await Organization.findById(id));
    return orgCache.get(key);
  };

  // Seules les organisations qui ont activé les relances automatiques sont concernées
  const orgIds = (await Organization.find({ autoRemindersEnabled: true }, '_id').lean()).map((o) => o._id);

  // Factures dont l'échéance est passée → statut « en retard »
  const late = await Invoice.updateMany(
    { status: { $in: ['sent', 'email_opened', 'viewed'] }, dueDate: { $lt: startOfDay(now) } },
    { $set: { status: 'late' }, $push: { events: { type: 'late', timestamp: now } } }
  );
  stats.markedLate = late.modifiedCount || 0;

  const invoices = await Invoice.find({ organizationId: { $in: orgIds }, status: { $in: UNPAID }, 'reminderConfig.enabled': { $ne: false } }).populate('clientId');
  for (const inv of invoices) {
    const type = dueInvoiceType(inv, now);
    if (!type || alreadySent(inv, type) || !isReachable(inv.clientId?.email)) continue;
    const org = await getOrg(inv.organizationId);
    if (!org) continue;
    try { await sendDocumentReminder({ docType: 'invoice', doc: inv, org, type, automatic: true }); stats.sent++; }
    catch { stats.failed++; }
  }

  const quotes = await Quote.find({ organizationId: { $in: orgIds }, status: { $in: [...PENDING_QUOTE, 'expired'] }, 'reminderConfig.enabled': { $ne: false } }).populate('clientId');
  for (const q of quotes) {
    const type = dueQuoteType(q, now);
    if (!type || alreadySent(q, type) || !isReachable(q.clientId?.email)) continue;
    if (type !== 'post_expiry' && q.status === 'expired') continue;
    const org = await getOrg(q.organizationId);
    if (!org) continue;
    try { await sendDocumentReminder({ docType: 'quote', doc: q, org, type, automatic: true }); stats.sent++; }
    catch { stats.failed++; }
  }
  return stats;
}

module.exports = { sendDocumentReminder, runAutomaticReminders, dueInvoiceType, dueQuoteType, LABELS };
