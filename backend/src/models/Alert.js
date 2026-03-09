const mongoose = require('mongoose');

const alertSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ['missing_vat', 'missing_receipt', 'manual'],
      required: true,
    },
    severity: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'medium',
    },
    expenseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Expense',
    },
    message: { type: String, required: true },
    status: {
      type: String,
      enum: ['open', 'resolved'],
      default: 'open',
      index: true,
    },
    resolvedAt: { type: Date },
    resolvedBy: { type: String }, // clerkUserId
  },
  { timestamps: true }
);

module.exports = mongoose.model('Alert', alertSchema);
