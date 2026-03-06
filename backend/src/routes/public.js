const express = require('express');
const router = express.Router();
const {
  trackQuoteOpen,
  getPublicQuote,
  acceptQuote,
  refuseQuote,
  trackInvoiceOpen,
  getPublicInvoice,
  payInvoice,
} = require('../controllers/publicController');

// ─── Devis ────────────────────────────────────────────────────────────────────
router.get('/track/quote/:token', trackQuoteOpen);
router.get('/quotes/:token', getPublicQuote);
router.post('/quotes/:token/accept', acceptQuote);
router.post('/quotes/:token/refuse', refuseQuote);

// ─── Factures ─────────────────────────────────────────────────────────────────
router.get('/track/invoice/:token', trackInvoiceOpen);
router.get('/invoices/:token', getPublicInvoice);
router.post('/invoices/:token/pay', payInvoice);

module.exports = router;
