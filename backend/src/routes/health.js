const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

router.get('/', (req, res) => {
  res.json({
    status: 'ok',
    service: 'Fluxora API',
    version: '1.0.0',
    db: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    market: require('../services/market/equitiesService').getMarketHealth(),
    advisor: require('../services/advisor/advisorService').getStatus(),
    timestamp: new Date().toISOString(),
  });
});

module.exports = router;
