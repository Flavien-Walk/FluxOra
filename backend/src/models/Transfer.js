const mongoose = require('mongoose');

const transferSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    beneficiaryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Beneficiary',
      required: true,
    },
    amount:    { type: Number, required: true },
    currency:  { type: String, default: 'EUR' },
    reference: { type: String, trim: true },
    status: {
      type: String,
      enum: ['processing', 'completed', 'failed', 'cancelled'],
      default: 'processing',
    },
    executedAt:       { type: Date },
    failureReason:    { type: String },
    accountingEntryId: { type: mongoose.Schema.Types.ObjectId },
    initiatedBy:       { type: String }, // clerkUserId
  },
  { timestamps: true }
);

module.exports = mongoose.model('Transfer', transferSchema);
