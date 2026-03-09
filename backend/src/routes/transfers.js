const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const {
  getBeneficiaries, createBeneficiary, deleteBeneficiary,
  getTransfers, createTransfer, cancelTransfer,
} = require('../controllers/transferController');

// Bénéficiaires
router.get('/beneficiaries',         requireAuth, getBeneficiaries);
router.post('/beneficiaries',        requireAuth, createBeneficiary);
router.delete('/beneficiaries/:id',  requireAuth, deleteBeneficiary);

// Virements
router.get('/',              requireAuth, getTransfers);
router.post('/',             requireAuth, createTransfer);
router.patch('/:id/cancel',  requireAuth, cancelTransfer);

module.exports = router;
