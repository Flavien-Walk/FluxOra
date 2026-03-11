const mongoose = require('mongoose');

// Snapshot quotidien des taux du marché (ECB + ETFs monétaires)
const marketRateSchema = new mongoose.Schema({
  date: { type: String, required: true, index: true }, // YYYY-MM-DD
  estr: { type: Number }, // €STR en % (ex: 1.93)
  aaa3m: { type: Number }, // courbe AAA zone euro 3 mois (%)
  aaa1y: { type: Number }, // courbe AAA zone euro 1 an (%)
  aaa3y: { type: Number }, // courbe AAA zone euro 3 ans (proxy depuis 2Y+5Y)
  etfs: {
    'XEON.DE': { price: Number, changePercent: Number }, // fonds monétaire EUR
    'CSH2.PA': { price: Number, changePercent: Number }, // iShares €STR
    'C3M.PA':  { price: Number, changePercent: Number }  // obligations court terme
  },
  fetchedAt: { type: Date, default: Date.now }
}, { timestamps: false });

marketRateSchema.index({ date: 1 }, { unique: true });

module.exports = mongoose.model('MarketRate', marketRateSchema);
