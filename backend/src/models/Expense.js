const mongoose = require('mongoose');

const expenseSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    description: { type: String, required: true, trim: true },
    vendor:  { type: String, trim: true },
    date:    { type: Date, required: true, default: Date.now },
    category: {
      type: String,
      enum: ['marketing', 'software', 'salaries', 'suppliers', 'taxes', 'banking', 'travel', 'office', 'other'],
      required: true,
    },
    assetCategory: { type: Boolean, default: false }, // Pour distinguer les immobilisations

    // Montants
    amountHT:       { type: Number, default: 0 },
    vatRate:        { type: Number, enum: [0, 5.5, 10, 20], default: 20 },
    vatAmount:      { type: Number, default: 0 },
    vatRecoverable: { type: Number, default: 0 },
    amount:         { type: Number, required: true }, // TTC
    currency:       { type: String, default: 'EUR' },
    // Statut de validation
    status: {
      type: String,
      enum: ['validated', 'pending_review', 'non_eligible'],
      default: 'validated',
    },
    // Justificatif
    receiptUrl: { type: String },
    // OCR
    ocrConfidence: { type: Number }, // 0-1
    notes: { type: String, trim: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Expense', expenseSchema);
