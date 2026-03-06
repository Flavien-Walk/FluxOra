const mongoose = require('mongoose');

const invoiceLineSchema = new mongoose.Schema(
  {
    description: { type: String, required: true },
    quantity: { type: Number, required: true, default: 1 },
    unitPrice: { type: Number, required: true },
    vatRate: { type: Number, default: 20 }, // % TVA
  },
  { _id: false }
);

const invoiceSchema = new mongoose.Schema(
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
    number: { type: String, required: true }, // ex: FAC-2024-001
    status: {
      type: String,
      enum: ['draft', 'sent', 'paid', 'late', 'cancelled'],
      default: 'draft',
    },
    lines: [invoiceLineSchema],
    subtotal: { type: Number, default: 0 },  // HT
    vatAmount: { type: Number, default: 0 },
    total: { type: Number, default: 0 },     // TTC
    currency: { type: String, default: 'EUR' },
    issueDate: { type: Date, default: Date.now },
    dueDate: { type: Date },
    stripePaymentLink: { type: String },
    stripeSessionId: { type: String },
    notes: { type: String, trim: true },
    sentAt: { type: Date },
    paidAt: { type: Date },
  },
  { timestamps: true }
);

// Calcul automatique des totaux avant save
invoiceSchema.pre('save', function (next) {
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

module.exports = mongoose.model('Invoice', invoiceSchema);
