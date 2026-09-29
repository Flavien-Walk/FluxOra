const mongoose = require('mongoose');

// Portefeuille VIRTUEL d'une organisation : capital fictif, espèces disponibles et historique de valorisation.
// Aucune somme réelle n'est engagée.
const snapshotSchema = new mongoose.Schema(
  {
    day:         { type: String, required: true }, // AAAA-MM-JJ (heure de Paris)
    valueEur:    { type: Number, required: true }, // espèces + actions valorisées
    cashEur:     { type: Number, required: true },
    investedEur: { type: Number, required: true }, // capital apporté à cette date
    cac:         { type: Number },                 // niveau du CAC 40 (référence)
  },
  { _id: false }
);

const virtualWalletSchema = new mongoose.Schema(
  {
    organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, unique: true },
    initialCapital: { type: Number, required: true }, // capital de départ + apports
    cash:           { type: Number, required: true, min: 0 },
    startedAt:      { type: Date, default: Date.now },
    resets:         { type: Number, default: 0 },
    snapshots:      { type: [snapshotSchema], default: [] },
  },
  { timestamps: true }
);

module.exports = mongoose.model('VirtualWallet', virtualWalletSchema);
