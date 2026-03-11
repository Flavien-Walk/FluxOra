const Quote = require('../models/Quote');
const Invoice = require('../models/Invoice');

const REMINDER_TYPE_LABELS = {
  quote_reminder: 'Rappel commercial',
  expiry_warning: 'Rappel avant expiration',
  post_expiry: 'Relance après expiration',
  before_due: 'Rappel avant échéance',
  on_due: 'Rappel jour échéance',
  overdue_1: '1ère relance impayée',
  overdue_2: '2ème relance impayée',
  overdue_3: 'Dernière relance',
};

const updateQuoteReminders = async (req, res) => {
  try {
    const { organizationId } = req.auth;
    const quote = await Quote.findOne({ _id: req.params.id, organizationId });
    if (!quote) return res.status(404).json({ error: 'Devis introuvable' });
    const allowed = ['enabled', 'firstReminderDays', 'beforeExpiryDays', 'afterExpiryEnabled'];
    allowed.forEach((k) => { if (req.body[k] !== undefined) quote.reminderConfig[k] = req.body[k]; });
    quote.markModified('reminderConfig');
    await quote.save();
    res.json(quote);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

const sendQuoteReminder = async (req, res) => {
  try {
    const { organizationId } = req.auth;
    const quote = await Quote.findOne({ _id: req.params.id, organizationId }).populate('clientId');
    if (!quote) return res.status(404).json({ error: 'Devis introuvable' });
    const { type = 'quote_reminder', overrideEmail, subject } = req.body;
    const recipientEmail = overrideEmail || quote.clientId?.email;
    if (!recipientEmail) return res.status(400).json({ error: 'Email destinataire manquant' });

    // Log reminder in history
    if (!quote.reminderConfig) quote.set('reminderConfig', {});
    const historyEntry = {
      type,
      sentAt: new Date(),
      subject: subject || `Rappel — ${quote.number}`,
      recipientEmail,
      status: 'sent',
      note: REMINDER_TYPE_LABELS[type] || type,
    };
    quote.reminderConfig.history = [...(quote.reminderConfig.history || []), historyEntry];
    quote.events.push({ type: 'reminder_sent', timestamp: new Date(), note: REMINDER_TYPE_LABELS[type] || type });
    quote.markModified('reminderConfig');
    await quote.save();

    res.json({ success: true, historyEntry, quote });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

const updateInvoiceReminders = async (req, res) => {
  try {
    const { organizationId } = req.auth;
    const invoice = await Invoice.findOne({ _id: req.params.id, organizationId });
    if (!invoice) return res.status(404).json({ error: 'Facture introuvable' });
    const allowed = ['enabled', 'beforeDueDays', 'onDueDayEnabled', 'afterDueDays'];
    allowed.forEach((k) => { if (req.body[k] !== undefined) invoice.reminderConfig[k] = req.body[k]; });
    invoice.markModified('reminderConfig');
    await invoice.save();
    res.json(invoice);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

const sendInvoiceReminder = async (req, res) => {
  try {
    const { organizationId } = req.auth;
    const invoice = await Invoice.findOne({ _id: req.params.id, organizationId }).populate('clientId');
    if (!invoice) return res.status(404).json({ error: 'Facture introuvable' });
    const { type = 'overdue_1', overrideEmail, subject } = req.body;
    const recipientEmail = overrideEmail || invoice.clientId?.email;
    if (!recipientEmail) return res.status(400).json({ error: 'Email destinataire manquant' });

    if (!invoice.reminderConfig) invoice.set('reminderConfig', {});
    const historyEntry = {
      type,
      sentAt: new Date(),
      subject: subject || `Rappel — ${invoice.number}`,
      recipientEmail,
      status: 'sent',
      note: REMINDER_TYPE_LABELS[type] || type,
    };
    invoice.reminderConfig.history = [...(invoice.reminderConfig.history || []), historyEntry];
    invoice.events.push({ type: 'reminder_sent', timestamp: new Date(), note: REMINDER_TYPE_LABELS[type] || type });
    invoice.markModified('reminderConfig');
    await invoice.save();

    res.json({ success: true, historyEntry, invoice });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

module.exports = { updateQuoteReminders, sendQuoteReminder, updateInvoiceReminders, sendInvoiceReminder };
