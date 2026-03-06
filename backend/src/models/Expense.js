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
    amount: { type: Number, required: true },
    currency: { type: String, default: 'EUR' },
    category: {
      type: String,
      enum: [
        'marketing',
        'software',
        'salaries',
        'suppliers',
        'taxes',
        'banking',
        'travel',
        'office',
        'other',
      ],
      required: true,
    },
    date: { type: Date, required: true, default: Date.now },
    receiptUrl: { type: String }, // URL du justificatif (S3, Cloudinary, etc.)
    vendor: { type: String, trim: true },
    notes: { type: String, trim: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Expense', expenseSchema);
