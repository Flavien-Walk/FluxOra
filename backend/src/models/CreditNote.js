const mongoose = require('mongoose');

// Avoir : annule (tout ou partie de) une facture émise. Numérotation propre AV-AAAA-NNN.
const lineSchema = new mongoose.Schema(
  {
    description: { type: String, required: true },
    quantity: { type: Number, required: true, default: 1 },
    unitPrice: { type: Number, required: true },
    vatRate: { type: Number, default: 20 },
  },
  { _id: false }
);

const creditNoteSchema = new mongoose.Schema(
  {
    organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true },
    invoiceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Invoice', required: true, index: true },
    invoiceNumber: { type: String, required: true },
    number: { type: String, required: true },
    reason: { type: String, trim: true, maxlength: 500 },
    lines: [lineSchema],
    subtotal: { type: Number, default: 0 },
    vatAmount: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
    currency: { type: String, default: 'EUR' },
    issueDate: { type: Date, default: Date.now },
    // issued : facture impayée annulée (rien à rembourser) · to_refund : facture déjà encaissée · refunded : remboursé
    status: { type: String, enum: ['issued', 'to_refund', 'refunded'], default: 'issued' },
    refundedAt: { type: Date },
  },
  { timestamps: true }
);

creditNoteSchema.index({ organizationId: 1, number: 1 }, { unique: true });

creditNoteSchema.pre('save', function (next) {
  let subtotal = 0; let vat = 0;
  this.lines.forEach((l) => { const t = l.quantity * l.unitPrice; subtotal += t; vat += t * (l.vatRate / 100); });
  this.subtotal = Math.round(subtotal * 100) / 100;
  this.vatAmount = Math.round(vat * 100) / 100;
  this.total = Math.round((subtotal + vat) * 100) / 100;
  next();
});

module.exports = mongoose.model('CreditNote', creditNoteSchema);
