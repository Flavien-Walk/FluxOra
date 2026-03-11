const mongoose = require('mongoose');

const investmentSchema = new mongoose.Schema({
  organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
  productId: { type: String, required: true }, // 'money-market', 'short-bond', 'oat-1-3y', 'cat'
  productName: { type: String, required: true },
  amount: { type: Number, required: true }, // montant investi en EUR
  expectedRate: { type: Number, required: true }, // taux annuel % au moment de l'investissement
  status: {
    type: String,
    enum: ['active', 'withdrawn', 'matured'],
    default: 'active'
  },
  investedAt: { type: Date, default: Date.now },
  maturityDate: { type: Date }, // null = liquidité quotidienne
  withdrawnAt: { type: Date },
  withdrawnAmount: { type: Number }, // montant récupéré (principal + intérêts)
  notes: { type: String }
}, { timestamps: true });

// Calcule le gain théorique à ce jour
investmentSchema.virtual('currentGain').get(function () {
  if (this.status !== 'active') return 0;
  const days = (Date.now() - this.investedAt.getTime()) / (1000 * 60 * 60 * 24);
  return parseFloat((this.amount * (this.expectedRate / 100) * (days / 365)).toFixed(2));
});

investmentSchema.virtual('currentValue').get(function () {
  return parseFloat((this.amount + this.currentGain).toFixed(2));
});

investmentSchema.set('toJSON', { virtuals: true });
investmentSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Investment', investmentSchema);
