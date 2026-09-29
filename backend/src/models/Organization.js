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
    // Confidentialité : suivi d'ouverture des emails (pixel) désactivé par défaut, IA activable/désactivable
    emailTrackingEnabled: { type: Boolean, default: false },
    aiEnabled: { type: Boolean, default: true },
    // Relances automatiques par email (factures impayées, devis) : désactivées par défaut
    autoRemindersEnabled: { type: Boolean, default: false },
    // Invitations en attente (personnes sans compte Fluxora au moment de l'invitation)
    invites: [
      {
        email: { type: String, lowercase: true, trim: true },
        role: { type: String, enum: ['admin', 'finance', 'manager', 'viewer'], default: 'viewer' },
        invitedAt: { type: Date, default: Date.now },
        invitedBy: { type: String },
      },
    ],
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
