const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const { listCreditNotes, getCreditNote, markRefunded } = require('../controllers/creditNoteController');

router.get('/', requireAuth, listCreditNotes);
router.get('/:id', requireAuth, getCreditNote);
router.post('/:id/refund', requireAuth, markRefunded);

module.exports = router;
