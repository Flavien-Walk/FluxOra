const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const { getSummary } = require('../controllers/dashboardController');

router.get('/summary', requireAuth, getSummary);

module.exports = router;
