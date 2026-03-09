const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const {
  getExpenses,
  getExpense,
  getVatSummary,
  scanReceipt,
  createExpense,
  updateExpense,
  deleteExpense,
} = require('../controllers/expenseController');

// Routes fixes AVANT /:id pour éviter les conflits
router.get('/vat-summary', requireAuth, getVatSummary);
router.post('/scan',        requireAuth, scanReceipt);
router.get('/',      requireAuth, getExpenses);
router.get('/:id',   requireAuth, getExpense);
router.post('/',     requireAuth, createExpense);
router.put('/:id',   requireAuth, updateExpense);
router.delete('/:id', requireAuth, deleteExpense);

module.exports = router;
