const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const {
  getInvoices,
  getInvoice,
  createInvoice,
  updateInvoice,
  deleteInvoice,
  sendEmail,
} = require('../controllers/invoiceController');

router.get('/', requireAuth, getInvoices);
router.get('/:id', requireAuth, getInvoice);
router.post('/', requireAuth, createInvoice);
router.put('/:id', requireAuth, updateInvoice);
router.delete('/:id', requireAuth, deleteInvoice);
router.post('/:id/send-email', requireAuth, sendEmail);

const { updateInvoiceReminders, sendInvoiceReminder } = require('../controllers/reminderController');
router.put('/:id/reminders', requireAuth, updateInvoiceReminders);
router.post('/:id/send-reminder', requireAuth, sendInvoiceReminder);

module.exports = router;
