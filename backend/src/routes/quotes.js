const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const {
  getQuotes,
  getQuote,
  createQuote,
  updateQuote,
  deleteQuote,
  sendEmail,
  convertToInvoice,
} = require('../controllers/quoteController');

router.get('/', requireAuth, getQuotes);
router.get('/:id', requireAuth, getQuote);
router.post('/', requireAuth, createQuote);
router.put('/:id', requireAuth, updateQuote);
router.delete('/:id', requireAuth, deleteQuote);
router.post('/:id/send-email', requireAuth, sendEmail);
router.post('/:id/convert', requireAuth, convertToInvoice);

module.exports = router;
