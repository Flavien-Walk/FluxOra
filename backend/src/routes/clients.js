const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const {
  getClients,
  getClient,
  createClient,
  updateClient,
  deleteClient,
} = require('../controllers/clientController');

router.get('/', requireAuth, getClients);
router.get('/:id', requireAuth, getClient);
router.post('/', requireAuth, createClient);
router.put('/:id', requireAuth, updateClient);
router.delete('/:id', requireAuth, deleteClient);

module.exports = router;
