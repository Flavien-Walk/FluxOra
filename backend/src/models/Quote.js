const mongoose = require('mongoose');
const crypto = require('crypto');

const quoteLineSchema = new mongoose.Schema({ description: { type: String, required: true }, quantity: { type: Number, required: true, default: 1 }, unitPrice: { type: Number, required: true }, vatRate: { type: Number, default: 20 } }, { _id: false });

const eventSchema = new mongoose.Schema({ type: { type: String, enum: ['created', 'sent', 'email_opened', 'viewed', 'accepted', 'refused', 'expired', 'reminder_sent'], required: true }, timestamp: { type: Date, default: Date.now }, note: { type: String } }, { _id: false });

const quoteSchema = new mongoose.Schema({
  organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
  clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true },
  number: { type: String, required: true },
  status: { type: String, enum: ['draft', 'sent', 'email_opened', 'viewed', 'accepted', 'refused', 'expired'], default: 'draft' },
  trackingToken: { type: String, unique: true, sparse: true, index: true },
  events: { type: [eventSchema], default: [] },
  lines: [quoteLineSchema],
  subtotal: { type: Number, default: 0 },
  vatAmount: { type: Number, default: 0 },
  total: { type: Number, default: 0 },
  currency: { type: String, default: 'EUR' },
  issueDate: { type: Date, default: Date.now },
  expiryDate: { type: Date },
  notes: { type: String, trim: true },
  customMessage: { type: String, trim: true },
  sentAt: { type: Date },
  acceptedAt: { type: Date },
  refusedAt: { type: Date },
  invoiceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Invoice' },
}, { timestamps: true });

quoteSchema.pre('save', function (next) {
  if (!this.trackingToken) this.trackingToken = crypto.randomBytes(32).toString('hex');
  let subtotal = 0, vatAmount = 0;
  this.lines.forEach((l) => { const t = l.quantity * l.unitPrice; subtotal += t; vatAmount += t * (l.vatRate / 100); });
  this.subtotal = Math.round(subtotal * 100) / 100;
  this.vatAmount = Math.round(vatAmount * 100) / 100;
  this.total = Math.round((subtotal + vatAmount) * 100) / 100;
  next();
});

module.exports = mongoose.model('Quote', quoteSchema);
