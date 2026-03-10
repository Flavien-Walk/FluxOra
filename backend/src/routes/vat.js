const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const {
  getVatSummary,
  getVatDeclarations,
  getVatDeclaration,
  createVatDeclaration,
  updateCreditOption,
} = require('../controllers/vatController');

// @route   GET /api/vat/summary
// @desc    Récupère un résumé de la TVA collectée et déductible sur une période
// @access  Privé
router.get('/summary', requireAuth, getVatSummary);

// @route   GET /api/vat/declarations
// @desc    Récupère la liste des déclarations de TVA passées
// @access  Privé
router.get('/declarations', requireAuth, getVatDeclarations);

// @route   GET /api/vat/declarations/:id
// @desc    Récupère le détail d'une déclaration de TVA
// @access  Privé
router.get('/declarations/:id', requireAuth, getVatDeclaration);

// @route   POST /api/vat/declarations
// @desc    Crée et sauvegarde une nouvelle déclaration de TVA
// @access  Privé
router.post('/declarations', requireAuth, createVatDeclaration);

// @route   PUT /api/vat/declarations/:id/credit-option
// @desc    Met à jour l'option pour un crédit de TVA
// @access  Privé
router.put('/declarations/:id/credit-option', requireAuth, updateCreditOption);

module.exports = router;
