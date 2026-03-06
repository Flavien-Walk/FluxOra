const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const {
  getInvoices,
  getInvoice,
  createInvoice,
  updateInvoice,
  deleteInvoice,
} = require('../controllers/invoiceController');

router.get('/', requireAuth, getInvoices);
router.get('/:id', requireAuth, getInvoice);
router.post('/', requireAuth, createInvoice);
router.put('/:id', requireAuth, updateInvoice);
router.delete('/:id', requireAuth, deleteInvoice);

module.exports = router;
