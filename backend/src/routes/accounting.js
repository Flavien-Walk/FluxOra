const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const {
  getEntries,
  createEntry,
  deleteEntry,
} = require('../controllers/accountingController');

router.get('/', requireAuth, getEntries);
router.post('/', requireAuth, createEntry);
router.delete('/:id', requireAuth, deleteEntry);

module.exports = router;
