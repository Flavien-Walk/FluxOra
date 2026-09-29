const mongoose = require('mongoose');

// Données de référence d'une valeur (nom complet, nombre d'actions…), mémorisées à chaque succès de Yahoo.
// Elles permettent d'afficher noms et capitalisations même quand Yahoo limite l'accès du serveur.
const marketRefSchema = new mongoose.Schema({
  yahooSymbol: { type: String, required: true, unique: true },
  isin: { type: String, index: true },
  longName: { type: String },
  shortName: { type: String },
  sharesOutstanding: { type: Number },
  marketCap: { type: Number },
  currency: { type: String },
  fxToEur: { type: Number },
  updatedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('MarketRef', marketRefSchema);
