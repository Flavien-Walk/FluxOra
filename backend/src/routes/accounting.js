const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const {
  getEntries,
  createEntry,
  deleteEntry,
  getBalance,
  downloadFec,
} = require('../controllers/accountingController');

router.get('/', requireAuth, getEntries);
router.get('/balance', requireAuth, getBalance);
router.get('/fec', requireAuth, downloadFec);
router.post('/', requireAuth, createEntry);
router.delete('/:id', requireAuth, deleteEntry);

module.exports = router;
