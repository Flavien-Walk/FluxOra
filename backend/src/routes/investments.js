const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const {
  getProducts,
  getRates,
  getInvestments,
  createInvestment,
  withdrawInvestment,
  deleteInvestment
} = require('../controllers/investmentController');

// Taux & catalogue (auth requis pour cohérence multi-tenant)
router.get('/products', requireAuth, getProducts);
router.get('/rates', requireAuth, getRates);

// Portefeuille
router.get('/', requireAuth, getInvestments);
router.post('/', requireAuth, createInvestment);
router.post('/:id/withdraw', requireAuth, withdrawInvestment);
router.delete('/:id', requireAuth, deleteInvestment);

module.exports = router;
