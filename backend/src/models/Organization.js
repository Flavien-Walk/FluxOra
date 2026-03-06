const mongoose = require('mongoose');

const organizationSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    clerkOwnerId: { type: String, required: true }, // userId Clerk du créateur
    plan: { type: String, enum: ['free', 'pro', 'enterprise'], default: 'free' },
    email: { type: String, trim: true },
    phone: { type: String, trim: true },
    address: { type: String, trim: true },
    vatNumber: { type: String, trim: true },
    siret: { type: String, trim: true },
    currency: { type: String, default: 'EUR' },
    members: [
      {
        clerkUserId: { type: String, required: true },
        role: {
          type: String,
          enum: ['admin', 'finance', 'manager', 'viewer'],
          default: 'viewer',
        },
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model('Organization', organizationSchema);
