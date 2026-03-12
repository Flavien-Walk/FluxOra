const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const ctrl = require('../controllers/investmentController');

router.use(requireAuth());

router.get('/',           ctrl.getInvestments);
router.get('/products',   ctrl.getProducts);
router.post('/',          ctrl.createInvestment);
router.post('/:id/withdraw', ctrl.withdraw);

module.exports = router;
