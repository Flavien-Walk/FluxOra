const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const { getAlerts, resolveAlert } = require('../controllers/alertController');

router.get('/',               requireAuth, getAlerts);
router.patch('/:id/resolve',  requireAuth, resolveAlert);

module.exports = router;
