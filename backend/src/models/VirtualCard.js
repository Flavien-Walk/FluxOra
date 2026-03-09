const mongoose = require('mongoose');

const virtualCardSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    name:     { type: String, required: true, trim: true },
    category: {
      type: String,
      enum: ['software', 'marketing', 'suppliers', 'travel', 'office', 'other'],
      required: true,
    },
    last4:       { type: String, length: 4 },
    expiryMonth: { type: Number },
    expiryYear:  { type: Number },
    status: {
      type: String,
      enum: ['active', 'blocked', 'cancelled'],
      default: 'active',
    },
    monthlyLimit:      { type: Number, default: 500 },
    currentMonthSpend: { type: Number, default: 0 },
    linkedVendor:      { type: String, trim: true },
    color: {
      type: String,
      enum: ['indigo', 'violet', 'emerald', 'rose', 'amber', 'sky'],
      default: 'indigo',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('VirtualCard', virtualCardSchema);
