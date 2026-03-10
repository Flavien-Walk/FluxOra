const express = require('express');
const router = express.Router();
const { getVatSummaryForPeriod } = require('../controllers/vatController');

// GET /api/vat/summary?from=...&to=...
router.get('/summary', getVatSummaryForPeriod);

module.exports = router;