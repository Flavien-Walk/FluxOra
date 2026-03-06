const mongoose = require('mongoose');

const accountingEntrySchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    date: { type: Date, required: true, default: Date.now },
    description: { type: String, required: true, trim: true },
    category: {
      type: String,
      enum: [
        'revenue',
        'marketing',
        'software',
        'salaries',
        'suppliers',
        'taxes',
        'banking',
        'other',
      ],
      required: true,
    },
    type: { type: String, enum: ['debit', 'credit'], required: true },
    amount: { type: Number, required: true },
    currency: { type: String, default: 'EUR' },
    // Source de l'écriture (automatique ou manuelle)
    source: {
      type: String,
      enum: ['invoice', 'payment', 'expense', 'manual'],
      default: 'manual',
    },
    // Référence optionnelle vers l'objet source
    sourceId: { type: mongoose.Schema.Types.ObjectId },
    sourceModel: { type: String, enum: ['Invoice', 'Payment', 'Expense'] },
  },
  { timestamps: true }
);

module.exports = mongoose.model('AccountingEntry', accountingEntrySchema);
