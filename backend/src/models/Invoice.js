const mongoose = require('mongoose');
const crypto = require('crypto');

const invoiceLineSchema = new mongoose.Schema(
  {
    description: { type: String, required: true },
    quantity: { type: Number, required: true, default: 1 },
    unitPrice: { type: Number, required: true },
    vatRate: { type: Number, default: 20 },
  },
  { _id: false }
);

const eventSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['created', 'sent', 'email_opened', 'viewed', 'payment_initiated', 'paid', 'late', 'reminder_sent'],
      required: true,
    },
    timestamp: { type: Date, default: Date.now },
    note: { type: String },
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
    number: { type: String, required: true },
    status: {
      type: String,
      enum: ['draft', 'sent', 'email_opened', 'viewed', 'payment_pending', 'paid', 'late', 'cancelled'],
      default: 'draft',
    },
    trackingToken: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
    },
    events: { type: [eventSchema], default: [] },
    lines: [invoiceLineSchema],
    subtotal: { type: Number, default: 0 },
    vatAmount: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
    currency: { type: String, default: 'EUR' },
    issueDate: { type: Date, default: Date.now },
    dueDate: { type: Date },
    stripePaymentLink: { type: String },
    stripeSessionId: { type: String },
    notes: { type: String, trim: true },
    sentAt: { type: Date },
    paidAt: { type: Date },
    paymentMethod: { type: String }, // card | transfer | sepa | apple_pay | google_pay | wallet
  },
  { timestamps: true }
);

invoiceSchema.pre('save', function (next) {
  if (!this.trackingToken) {
    this.trackingToken = crypto.randomBytes(32).toString('hex');
  }
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
