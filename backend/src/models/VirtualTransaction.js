const mongoose = require('mongoose');

// Journal des opérations du portefeuille virtuel (apports, achats, ventes, remises à zéro)
const virtualTransactionSchema = new mongoose.Schema({
  organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
  createdBy:      { type: String },                  // clerkUserId
  type:           { type: String, enum: ['deposit', 'buy', 'sell', 'reset'], required: true },
  isin:           { type: String },
  name:           { type: String },
  quantity:       { type: Number },
  priceEur:       { type: Number },
  feesEur:        { type: Number, default: 0 },
  amountEur:      { type: Number, required: true },  // flux d'espèces : + crédit, − débit
  cashAfter:      { type: Number, required: true },
  pnlEur:         { type: Number },                  // plus-value réalisée (ventes)
  at:             { type: Date, default: Date.now, index: true },
});

module.exports = mongoose.model('VirtualTransaction', virtualTransactionSchema);
