const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const {
  getExpenses,
  getExpense,
  createExpense,
  updateExpense,
  deleteExpense,
} = require('../controllers/expenseController');

router.get('/', requireAuth, getExpenses);
router.get('/:id', requireAuth, getExpense);
router.post('/', requireAuth, createExpense);
router.put('/:id', requireAuth, updateExpense);
router.delete('/:id', requireAuth, deleteExpense);

module.exports = router;
