const mongoose = require('mongoose');

// Compte de réseau social connecté (OAuth) — un par utilisateur et par réseau
const socialAccountSchema = new mongoose.Schema(
  {
    organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    clerkUserId:    { type: String, required: true },
    network:        { type: String, enum: ['linkedin', 'instagram'], required: true },
    externalId:     { type: String, required: true }, // LinkedIn : "sub" OpenID → urn:li:person:{sub} ; Instagram : ID du compte professionnel
    name:           { type: String },
    picture:        { type: String },
    accessToken:    { type: String, required: true }, // chiffré (AES-256-GCM), jamais renvoyé au front
    expiresAt:      { type: Date },
    scopes:         [{ type: String }],
  },
  { timestamps: true }
);

socialAccountSchema.index({ organizationId: 1, clerkUserId: 1, network: 1 }, { unique: true });

module.exports = mongoose.model('SocialAccount', socialAccountSchema);
