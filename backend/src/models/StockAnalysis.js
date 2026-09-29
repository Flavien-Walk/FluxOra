const mongoose = require('mongoose');

// Données d'analyse d'une valeur (fondamentaux, cours, presse), mises en cache 24 h pour le Score Fluxora
const stockAnalysisSchema = new mongoose.Schema(
  {
    yahooSymbol: { type: String, required: true, unique: true },
    isin: { type: String, index: true },
    name: { type: String },
    segment: { type: String },
    market: { type: String },
    sector: { type: String },
    industry: { type: String },
    currency: { type: String },
    values: { type: mongoose.Schema.Types.Mixed, default: {} }, // 50 variables brutes
    closes: { type: [Number], default: [] },                     // clôtures quotidiennes ~1 an
    closesStart: { type: Date },
    news: { type: [{ title: String, source: String, link: String, date: Date, sentiment: Number, _id: false }], default: [] },
    newsScore: { type: Number },
    aiSummary: { type: String },
    aiSummaryAt: { type: Date },
    computedAt: { type: Date, default: Date.now, index: true },
  },
  { timestamps: false }
);

module.exports = mongoose.model('StockAnalysis', stockAnalysisSchema);
