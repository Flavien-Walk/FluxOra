const Quote = require('../models/Quote');
const Invoice = require('../models/Invoice');
const Organization = require('../models/Organization');
const { sendDocumentReminder } = require('../services/reminderService');

const getUserOrg = (userId) =>
  Organization.findOne({ $or: [{ clerkOwnerId: userId }, { 'members.clerkUserId': userId }] });

// Réglages de relance d'un document (champs autorisés uniquement)
const updateReminders = (Model, allowed, notFound) => async (req, res) => {
  const org = await getUserOrg(req.userId);
  if (!org) return res.status(404).json({ error: 'Organisation introuvable.' });
  const doc = await Model.findOne({ _id: req.params.id, organizationId: org._id });
  if (!doc) return res.status(404).json({ error: notFound });
  if (!doc.reminderConfig) doc.set('reminderConfig', {});
  allowed.forEach((k) => { if (req.body[k] !== undefined) doc.reminderConfig[k] = req.body[k]; });
  doc.markModified('reminderConfig');
  await doc.save();
  res.json(doc);
};

// Envoi manuel d'une relance (email réel via Brevo)
const sendReminder = (Model, docType, defaultType, notFound) => async (req, res) => {
  const org = await getUserOrg(req.userId);
  if (!org) return res.status(404).json({ error: 'Organisation introuvable.' });
  const doc = await Model.findOne({ _id: req.params.id, organizationId: org._id }).populate('clientId');
  if (!doc) return res.status(404).json({ error: notFound });
  try {
    const { historyEntry } = await sendDocumentReminder({
      docType, doc, org, type: req.body?.type || defaultType, overrideEmail: req.body?.overrideEmail,
    });
    res.json({ success: true, historyEntry });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message || 'Envoi impossible.' });
  }
};

const updateQuoteReminders = updateReminders(Quote, ['enabled', 'firstReminderDays', 'beforeExpiryDays', 'afterExpiryEnabled'], 'Devis introuvable.');
const updateInvoiceReminders = updateReminders(Invoice, ['enabled', 'beforeDueDays', 'onDueDayEnabled', 'afterDueDays'], 'Facture introuvable.');
const sendQuoteReminder = sendReminder(Quote, 'quote', 'quote_reminder', 'Devis introuvable.');
const sendInvoiceReminder = sendReminder(Invoice, 'invoice', 'overdue_1', 'Facture introuvable.');

module.exports = { updateQuoteReminders, sendQuoteReminder, updateInvoiceReminders, sendInvoiceReminder };
