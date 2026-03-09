const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const { getCards, createCard, updateCard, updateCardStatus, deleteCard } = require('../controllers/virtualCardController');

router.get('/',              requireAuth, getCards);
router.post('/',             requireAuth, createCard);
router.put('/:id',           requireAuth, updateCard);
router.patch('/:id/status',  requireAuth, updateCardStatus);
router.delete('/:id',        requireAuth, deleteCard);

module.exports = router;
