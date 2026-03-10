const mongoose = require('mongoose');

const VATAmountSchema = new mongoose.Schema({
  rate: { type: Number, required: true },
  base: { type: Number, required: true },
  amount: { type: Number, required: true },
}, { _id: false });

const VATDeclarationSchema = new mongoose.Schema({
  organizationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true,
    index: true,
  },
  period: {
    type: String, // ex: "2023-11" pour mensuel, "2023" pour annuel
    required: true,
  },
  type: {
    type: String,
    enum: ['CA3', 'CA12'], // CA3: Normal/mensuel, CA12: Simplifié/annuel
    required: true,
  },
  status: {
    type: String,
    enum: ['draft', 'finalized', 'declared'],
    default: 'draft',
  },
  collectedVAT: {
    breakdown: [VATAmountSchema],
    total: { type: Number, default: 0 },
  },
  deductibleVAT: {
    goodsAndServices: { // Ligne 20
      breakdown: [VATAmountSchema],
      total: { type: Number, default: 0 },
    },
    fixedAssets: { // Ligne 19
      breakdown: [VATAmountSchema],
      total: { type: Number, default: 0 },
    },
    total: { type: Number, default: 0 },
  },
  vatDue: { type: Number, default: 0 }, // Si positif
  vatCredit: { type: Number, default: 0 }, // Si négatif
  creditCarriedOver: { type: Number, default: 0 }, // Crédit de la période précédente
  reimbursementRequested: { type: Boolean, default: false },
  
}, { timestamps: true });

VATDeclarationSchema.index({ organizationId: 1, period: 1 }, { unique: true });

module.exports = mongoose.model('VATDeclaration', VATDeclarationSchema);