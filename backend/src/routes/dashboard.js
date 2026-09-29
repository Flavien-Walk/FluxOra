const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const { getSummary, getAging, getForecast } = require('../controllers/dashboardController');

router.get('/summary', requireAuth, getSummary);
router.get('/aging', requireAuth, getAging);
router.get('/forecast', requireAuth, getForecast);

module.exports = router;
