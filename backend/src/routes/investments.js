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
const stockSim = require('../controllers/stockSimulationController');

// Taux & catalogue (auth requis pour cohérence multi-tenant)
router.get('/products', requireAuth, getProducts);
router.get('/rates', requireAuth, getRates);

// Marchés actions : Euronext Paris et Euronext Growth (cours différés de 15 min)
router.get('/market/equities', requireAuth, getEquities);
router.get('/market/equities/:isin', requireAuth, getEquity);

// Conseiller : Score Fluxora (50 variables) et portefeuille optimisé
const advisorCtl = require('../controllers/advisorController');
router.get('/advisor/methodology', requireAuth, advisorCtl.getMethodology);
router.get('/advisor/ranking', requireAuth, advisorCtl.getRanking);
router.get('/advisor/score/:isin', requireAuth, advisorCtl.getScore);
router.get('/advisor/portfolio', requireAuth, advisorCtl.getPortfolio);
router.post('/advisor/portfolio/invest', requireAuth, advisorCtl.investPortfolio);
router.post('/advisor/refresh', requireAuth, advisorCtl.refresh);

// Simulation d'investissement en actions (aucun ordre réel)
router.get('/stocks', requireAuth, stockSim.getPortfolio);
router.post('/stocks', requireAuth, stockSim.buy);
router.post('/stocks/:id/sell', requireAuth, stockSim.sell);
router.delete('/stocks/:id', requireAuth, stockSim.remove);

// Portefeuille
router.get('/', requireAuth, getInvestments);
router.post('/', requireAuth, createInvestment);
router.post('/:id/withdraw', requireAuth, withdrawInvestment);
router.delete('/:id', requireAuth, deleteInvestment);

module.exports = router;
