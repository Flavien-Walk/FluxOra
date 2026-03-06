const Quote = require('../models/Quote');
const Invoice = require('../models/Invoice');
const Payment = require('../models/Payment');
const AccountingEntry = require('../models/AccountingEntry');

// 1x1 GIF transparent pour le tracking pixel
const TRACKING_PIXEL = Buffer.from(
  'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
  'base64'
);

const sendPixel = (res) => {
  res.setHeader('Content-Type', 'image/gif');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.send(TRACKING_PIXEL);
};

// ─── DEVIS ───────────────────────────────────────────────────────────────────

// GET /api/public/track/quote/:token — pixel de tracking email
const trackQuoteOpen = async (req, res) => {
  try {
    const quote = await Quote.findOne({ trackingToken: req.params.token });
    if (quote && !quote.events.some((e) => e.type === 'email_opened')) {
      quote.events.push({ type: 'email_opened', timestamp: new Date() });
      if (quote.status === 'sent') {
        quote.status = 'email_opened';
      }
      await quote.save();
    }
  } catch (_) { /* ne pas bloquer l'envoi du pixel */ }
  sendPixel(res);
};

// GET /api/public/quotes/:token — page devis client
const getPublicQuote = async (req, res) => {
  const quote = await Quote.findOne({ trackingToken: req.params.token })
    .populate('clientId', 'name email company address')
    .populate('organizationId', 'name email address phone siret vatNumber');

  if (!quote) return res.status(404).json({ error: 'Devis introuvable ou lien expiré.' });

  // Vérification expiration automatique
  if (quote.expiryDate && new Date() > new Date(quote.expiryDate) && !['accepted', 'refused', 'expired'].includes(quote.status)) {
    quote.status = 'expired';
    quote.events.push({ type: 'expired', timestamp: new Date() });
    await quote.save();
  }

  // Enregistrer "viewed" (première fois seulement)
  if (!quote.events.some((e) => e.type === 'viewed')) {
    quote.events.push({ type: 'viewed', timestamp: new Date() });
    if (['sent', 'email_opened'].includes(quote.status)) {
      quote.status = 'viewed';
    }
    await quote.save();
  }

  res.json({
    _id: quote._id,
    number: quote.number,
    status: quote.status,
    lines: quote.lines,
    subtotal: quote.subtotal,
    vatAmount: quote.vatAmount,
    total: quote.total,
    currency: quote.currency,
    issueDate: quote.issueDate,
    expiryDate: quote.expiryDate,
    notes: quote.notes,
    customMessage: quote.customMessage,
    organization: quote.organizationId,
    client: quote.clientId,
    events: quote.events,
    acceptedAt: quote.acceptedAt,
    refusedAt: quote.refusedAt,
    invoiceId: quote.invoiceId,
  });
};

// POST /api/public/quotes/:token/accept
const acceptQuote = async (req, res) => {
  const quote = await Quote.findOne({ trackingToken: req.params.token });
  if (!quote) return res.status(404).json({ error: 'Devis introuvable.' });
  if (quote.status === 'accepted') return res.json({ message: 'Devis déjà accepté.', status: 'accepted' });
  if (quote.status === 'refused') return res.status(400).json({ error: 'Ce devis a déjà été refusé.' });
  if (quote.status === 'expired') return res.status(400).json({ error: 'Ce devis a expiré et ne peut plus être accepté.' });

  quote.status = 'accepted';
  quote.acceptedAt = new Date();
  quote.events.push({ type: 'accepted', timestamp: new Date() });
  await quote.save();

  res.json({ message: 'Devis accepté avec succès.', status: 'accepted' });
};

// POST /api/public/quotes/:token/refuse
const refuseQuote = async (req, res) => {
  const quote = await Quote.findOne({ trackingToken: req.params.token });
  if (!quote) return res.status(404).json({ error: 'Devis introuvable.' });
  if (quote.status === 'refused') return res.json({ message: 'Devis déjà refusé.', status: 'refused' });
  if (quote.status === 'accepted') return res.status(400).json({ error: 'Ce devis a déjà été accepté.' });
  if (quote.status === 'expired') return res.status(400).json({ error: 'Ce devis a expiré.' });

  const { reason } = req.body;
  quote.status = 'refused';
  quote.refusedAt = new Date();
  quote.events.push({ type: 'refused', timestamp: new Date(), note: reason || undefined });
  await quote.save();

  res.json({ message: 'Devis refusé.', status: 'refused' });
};

// ─── FACTURES ─────────────────────────────────────────────────────────────────

// GET /api/public/track/invoice/:token — pixel de tracking email
const trackInvoiceOpen = async (req, res) => {
  try {
    const invoice = await Invoice.findOne({ trackingToken: req.params.token });
    if (invoice && !invoice.events.some((e) => e.type === 'email_opened')) {
      invoice.events.push({ type: 'email_opened', timestamp: new Date() });
      if (invoice.status === 'sent') {
        invoice.status = 'email_opened';
      }
      await invoice.save();
    }
  } catch (_) { /* ne pas bloquer le pixel */ }
  sendPixel(res);
};

// GET /api/public/invoices/:token — page facture client
const getPublicInvoice = async (req, res) => {
  const invoice = await Invoice.findOne({ trackingToken: req.params.token })
    .populate('clientId', 'name email company address')
    .populate('organizationId', 'name email address phone siret vatNumber');

  if (!invoice) return res.status(404).json({ error: 'Facture introuvable ou lien expiré.' });

  // Enregistrer "viewed" (première fois seulement)
  if (!invoice.events.some((e) => e.type === 'viewed')) {
    invoice.events.push({ type: 'viewed', timestamp: new Date() });
    if (['sent', 'email_opened'].includes(invoice.status)) {
      invoice.status = 'viewed';
    }
    await invoice.save();
  }

  res.json({
    _id: invoice._id,
    number: invoice.number,
    status: invoice.status,
    lines: invoice.lines,
    subtotal: invoice.subtotal,
    vatAmount: invoice.vatAmount,
    total: invoice.total,
    currency: invoice.currency,
    issueDate: invoice.issueDate,
    dueDate: invoice.dueDate,
    notes: invoice.notes,
    paidAt: invoice.paidAt,
    paymentMethod: invoice.paymentMethod,
    organization: invoice.organizationId,
    client: invoice.clientId,
    events: invoice.events,
  });
};

// POST /api/public/invoices/:token/pay — paiement simulé
const payInvoice = async (req, res) => {
  const invoice = await Invoice.findOne({ trackingToken: req.params.token });
  if (!invoice) return res.status(404).json({ error: 'Facture introuvable.' });
  if (invoice.status === 'paid') return res.json({ message: 'Facture déjà réglée.', status: 'paid' });
  if (invoice.status === 'cancelled') return res.status(400).json({ error: 'Cette facture a été annulée.' });

  const { method = 'card' } = req.body;

  // Enregistrer payment_initiated
  invoice.events.push({ type: 'payment_initiated', timestamp: new Date(), note: method });
  invoice.status = 'payment_pending';
  await invoice.save();

  // Simuler un délai de traitement (1s) via setTimeout non-bloquant
  // puis marquer comme payée
  setTimeout(async () => {
    try {
      const fresh = await Invoice.findById(invoice._id);
      if (fresh && fresh.status === 'payment_pending') {
        fresh.status = 'paid';
        fresh.paidAt = new Date();
        fresh.paymentMethod = method;
        fresh.events.push({ type: 'paid', timestamp: new Date(), note: `Paiement simulé — ${method}` });
        await fresh.save();

        const payment = await Payment.create({
          organizationId: fresh.organizationId,
          invoiceId: fresh._id,
          amount: fresh.total,
          currency: fresh.currency || 'EUR',
          status: 'succeeded',
          paidAt: fresh.paidAt,
        });

        await AccountingEntry.create({
          organizationId: fresh.organizationId,
          date: fresh.paidAt,
          description: `Paiement facture ${fresh.number} (${method})`,
          category: 'revenue',
          type: 'credit',
          amount: fresh.total,
          currency: fresh.currency || 'EUR',
          source: 'invoice',
          sourceId: fresh._id,
          sourceModel: 'Invoice',
        });
      }
    } catch (_) { /* silencieux */ }
  }, 1500);

  res.json({
    message: 'Paiement en cours de traitement.',
    status: 'payment_pending',
    invoiceNumber: invoice.number,
    amount: invoice.total,
    currency: invoice.currency,
  });
};

module.exports = {
  trackQuoteOpen,
  getPublicQuote,
  acceptQuote,
  refuseQuote,
  trackInvoiceOpen,
  getPublicInvoice,
  payInvoice,
};
