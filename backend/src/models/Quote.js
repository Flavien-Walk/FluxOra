const mongoose = require('mongoose');

const quoteLineSchema = new mongoose.Schema(
  {
    description: { type: String, required: true },
    quantity: { type: Number, required: true, default: 1 },
    unitPrice: { type: Number, required: true },
    vatRate: { type: Number, default: 20 },
  },
  { _id: false }
);

const quoteSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    clientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Client',
      required: true,
    },
    number: { type: String, required: true }, // DEV-2024-001
    status: {
      type: String,
      enum: ['draft', 'sent', 'accepted', 'rejected', 'expired'],
      default: 'draft',
    },
    lines: [quoteLineSchema],
    subtotal: { type: Number, default: 0 },
    vatAmount: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
    currency: { type: String, default: 'EUR' },
    issueDate: { type: Date, default: Date.now },
    expiryDate: { type: Date },
    notes: { type: String, trim: true },
    sentAt: { type: Date },
    acceptedAt: { type: Date },
    // Référence à la facture générée lors de la conversion
    invoiceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Invoice' },
  },
  { timestamps: true }
);

quoteSchema.pre('save', function (next) {
  let subtotal = 0;
  let vatAmount = 0;
  this.lines.forEach((line) => {
    const lineTotal = line.quantity * line.unitPrice;
    subtotal += lineTotal;
    vatAmount += lineTotal * (line.vatRate / 100);
  });
  this.subtotal = Math.round(subtotal * 100) / 100;
  this.vatAmount = Math.round(vatAmount * 100) / 100;
  this.total = Math.round((subtotal + vatAmount) * 100) / 100;
  next();
});

module.exports = mongoose.model('Quote', quoteSchema);
