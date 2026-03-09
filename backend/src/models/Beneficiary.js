const mongoose = require('mongoose');

const beneficiarySchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    name:       { type: String, required: true, trim: true },
    iban:       { type: String, required: true, trim: true },
    bic:        { type: String, trim: true },
    email:      { type: String, trim: true },
    isVerified: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Beneficiary', beneficiarySchema);
