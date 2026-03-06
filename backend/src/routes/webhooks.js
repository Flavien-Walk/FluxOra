const express = require('express');
const router = express.Router();
const Invoice = require('../models/Invoice');
const Payment = require('../models/Payment');
const AccountingEntry = require('../models/AccountingEntry');

// POST /api/webhooks/stripe
// Corps brut requis — monté avant express.json() dans index.js
router.post('/stripe', async (req, res) => {
  const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('Webhook signature invalide:', err.message);
    return res.status(400).json({ error: `Webhook Error: ${err.message}` });
  }

  // Paiement Stripe réussi
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const invoiceId = session.metadata?.invoiceId;
    if (!invoiceId) return res.json({ received: true });

    const invoice = await Invoice.findById(invoiceId);
    if (!invoice) return res.json({ received: true });

    // Mise à jour de la facture
    invoice.status = 'paid';
    invoice.paidAt = new Date();
    invoice.stripeSessionId = session.id;
    await invoice.save();

    // Création du paiement
    const payment = await Payment.create({
      organizationId: invoice.organizationId,
      invoiceId: invoice._id,
      stripePaymentId: session.payment_intent,
      amount: session.amount_total / 100, // Stripe envoie en centimes
      currency: session.currency?.toUpperCase() || 'EUR',
      status: 'succeeded',
      paidAt: new Date(),
    });

    // Écriture comptable automatique
    await AccountingEntry.create({
      organizationId: invoice.organizationId,
      date: new Date(),
      description: `Paiement facture ${invoice.number}`,
      category: 'revenue',
      type: 'credit',
      amount: payment.amount,
      currency: payment.currency,
      source: 'payment',
      sourceId: payment._id,
      sourceModel: 'Payment',
    });
  }

  res.json({ received: true });
});

module.exports = router;
