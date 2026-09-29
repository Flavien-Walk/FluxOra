const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const {
  getProducts,
  getRates,
  getInvestments,
  createInvestment,
  withdrawInvestment,
  deleteInvestment,
  getEquities,
  getEquity,
} = require('../controllers/investmentController');

// Taux & catalogue (auth requis pour cohérence multi-tenant)
router.get('/products', requireAuth, getProducts);
router.get('/rates', requireAuth, getRates);

// Marchés actions : Euronext Paris et Euronext Growth (cours différés de 15 min)
router.get('/market/equities', requireAuth, getEquities);
router.get('/market/equities/:isin', requireAuth, getEquity);

// Portefeuille
router.get('/', requireAuth, getInvestments);
router.post('/', requireAuth, createInvestment);
router.post('/:id/withdraw', requireAuth, withdrawInvestment);
router.delete('/:id', requireAuth, deleteInvestment);

module.exports = router;
