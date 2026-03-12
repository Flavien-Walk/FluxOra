const mongoose = require('mongoose');

const investmentSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    productId: { type: String, required: true }, // identifiant du produit (ex: 'livret-pro')
    productName: { type: String, required: true },
    amount: { type: Number, required: true, min: 0 },
    rate: { type: Number, required: true }, // taux annuel en %
    startDate: { type: Date, default: Date.now },
    maturityDate: { type: Date }, // null = pas de maturité fixe
    status: {
      type: String,
      enum: ['active', 'withdrawn', 'matured'],
      default: 'active',
    },
    gainAccrued: { type: Number, default: 0 }, // gains cumulés au moment du retrait
    withdrawnAt: { type: Date },
    notes: { type: String },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Investment', investmentSchema);
