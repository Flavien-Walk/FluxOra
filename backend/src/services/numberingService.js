/**
 * Numérotation des pièces (CGI art. 242 nonies A : numérotation continue, chronologique, sans doublon).
 *
 * - Compteur atomique par organisation, type de pièce et année : un numéro n'est jamais réutilisé.
 * - Les factures brouillon portent un numéro provisoire « BROUILLON-… » ; le numéro définitif
 *   FAC-AAAA-NNN est attribué à l'émission (envoi, passage en « payée »…), ce qui évite les trous
 *   dus aux brouillons supprimés.
 */
const mongoose = require('mongoose');

const counterSchema = new mongoose.Schema({
  organizationId: { type: mongoose.Schema.Types.ObjectId, required: true },
  key: { type: String, required: true }, // ex. « FAC-2026 »
  seq: { type: Number, default: 0 },
});
counterSchema.index({ organizationId: 1, key: 1 }, { unique: true });
const Counter = mongoose.models.Counter || mongoose.model('Counter', counterSchema);

const DRAFT_PREFIX = 'BROUILLON-';
const isDraftNumber = (number) => !number || String(number).startsWith(DRAFT_PREFIX);
const draftNumber = () => `${DRAFT_PREFIX}${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).slice(2, 5).toUpperCase()}`;

// Modèle correspondant à un préfixe (pour reprendre le plus grand numéro déjà existant)
const MODEL_BY_PREFIX = { FAC: 'Invoice', DEV: 'Quote', AV: 'CreditNote' };

async function highestExisting(orgId, prefix, year) {
  const modelName = MODEL_BY_PREFIX[prefix];
  if (!modelName || !mongoose.models[modelName]) return 0;
  const docs = await mongoose.models[modelName]
    .find({ organizationId: orgId, number: { $regex: `^${prefix}-${year}-\\d+$` } }, 'number').lean();
  return docs.reduce((max, d) => Math.max(max, Number(d.number.split('-').pop()) || 0), 0);
}

/** Prochain numéro définitif, ex. nextNumber(orgId, 'FAC') → « FAC-2026-042 ». */
async function nextNumber(orgId, prefix, date = new Date()) {
  const year = date.getFullYear();
  const key = `${prefix}-${year}`;
  // Initialise le compteur à partir des pièces existantes (données antérieures au compteur)
  const exists = await Counter.exists({ organizationId: orgId, key });
  if (!exists) {
    const start = await highestExisting(orgId, prefix, year);
    await Counter.updateOne({ organizationId: orgId, key }, { $setOnInsert: { seq: start } }, { upsert: true }).catch(() => {});
  }
  const c = await Counter.findOneAndUpdate({ organizationId: orgId, key }, { $inc: { seq: 1 } }, { new: true, upsert: true });
  return `${prefix}-${year}-${String(c.seq).padStart(3, '0')}`;
}

/** Attribue le numéro définitif à une facture brouillon au moment de son émission (document Mongoose). */
async function issueInvoice(invoice) {
  if (!isDraftNumber(invoice.number)) return invoice;
  invoice.number = await nextNumber(invoice.organizationId, 'FAC');
  invoice.issueDate = new Date();
  return invoice;
}

module.exports = { nextNumber, issueInvoice, draftNumber, isDraftNumber, DRAFT_PREFIX, Counter };
