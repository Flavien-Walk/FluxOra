const express = require('express');
const router  = express.Router();
const { requireAuth } = require('../middleware/auth');
const { getTransactions } = require('../controllers/transactionController');

router.get('/', requireAuth, getTransactions);

module.exports = router;
