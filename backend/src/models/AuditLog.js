const mongoose = require('mongoose');

// Journal des actions d'écriture (piste d'audit) — conservé 12 mois (index TTL)
const auditLogSchema = new mongoose.Schema({
  organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', index: true },
  clerkUserId:    { type: String },
  method:         { type: String, required: true },
  path:           { type: String, required: true }, // jetons publics masqués
  status:         { type: Number },
  ipPrefix:       { type: String }, // IP tronquée (minimisation)
  at:             { type: Date, default: Date.now },
});

auditLogSchema.index({ at: 1 }, { expireAfterSeconds: 365 * 24 * 3600 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
