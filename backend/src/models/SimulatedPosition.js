const mongoose = require('mongoose');

// Position d'actions SIMULÉE (aucun ordre réel, aucune écriture comptable)
const simulatedPositionSchema = new mongoose.Schema(
  {
    organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    createdBy:      { type: String, required: true }, // clerkUserId
    isin:           { type: String, required: true },
    symbol:         { type: String, required: true },
    yahooSymbol:    { type: String, required: true },
    name:           { type: String, required: true },
    segment:        { type: String, enum: ['paris', 'growth'], required: true },
    market:         { type: String },
    currency:       { type: String, default: 'EUR' }, // devise de cotation
    quantity:       { type: Number, required: true, min: 1 },
    buyPrice:       { type: Number, required: true },  // devise de cotation
    buyPriceEur:    { type: Number, required: true },
    fees:           { type: Number, default: 0 },      // EUR, frais simulés
    investedEur:    { type: Number, required: true },  // quantité × cours € + frais
    status:         { type: String, enum: ['open', 'sold'], default: 'open', index: true },
    boughtAt:       { type: Date, default: Date.now },
    soldAt:         { type: Date },
    sellPriceEur:   { type: Number },
    proceedsEur:    { type: Number },                  // produit de cession net de frais
    realizedPnlEur: { type: Number },
  },
  { timestamps: true }
);

module.exports = mongoose.model('SimulatedPosition', simulatedPositionSchema);
