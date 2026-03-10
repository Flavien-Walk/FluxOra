const mongoose = require('mongoose');

// Lignes de la déclaration de TVA
// Permet de garder une trace détaillée des calculs
const vatLineSchema = new mongoose.Schema(
  {
    rate: { type: Number, required: true },
    base: { type: Number, required: true },
    amount: { type: Number, required: true },
  },
  { _id: false }
);

const vatDeclarationSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    // Période de la déclaration
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    // Régime fiscal
    regime: {
      type: String,
      enum: ['CA3', 'CA12'],
      required: true,
    },
    status: {
      type: String,
      enum: ['draft', 'finalized'],
      default: 'draft',
    },
    // Montants aggrégés
    collectedVAT: { type: Number, default: 0 },
    deductibleVAT_services: { type: Number, default: 0 }, // Biens et services
    deductibleVAT_assets: { type: Number, default: 0 },   // Immobilisations
    totalDeductibleVAT: { type: Number, default: 0 },
    vatDue: { type: Number, default: 0 },                 // TVA due ou à payer
    vatCredit: { type: Number, default: 0 },              // Crédit de TVA
    creditOption: {
      type: String,
      enum: ['carry_forward', 'refund'],
    },

    // Détail des calculs par taux
    collectedVAT_details: [vatLineSchema],
    deductibleVAT_services_details: [vatLineSchema],
    deductibleVAT_assets_details: [vatLineSchema],
  },
  { timestamps: true }
);

// Index pour des recherches rapides par organisation et période
vatDeclarationSchema.index({ organizationId: 1, startDate: -1, endDate: -1 });

module.exports = mongoose.model('VATDeclaration', vatDeclarationSchema);
