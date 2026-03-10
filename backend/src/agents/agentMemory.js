/**
 * agentMemory.js
 * Mémoire métier par utilisateur pour l'agent Fluxora.
 * In-process Map avec TTL de 30 minutes.
 * Reset automatique si l'utilisateur efface la conversation.
 */

const TTL_MS = 30 * 60 * 1000; // 30 minutes

/** @type {Map<string, { data: object, updatedAt: number }>} */
const store = new Map();

/* ── Récupère la mémoire active d'un utilisateur ────────────── */
function getMemory(userId) {
  const entry = store.get(userId);
  if (!entry) return {};
  if (Date.now() - entry.updatedAt > TTL_MS) {
    store.delete(userId);
    return {};
  }
  return entry.data;
}

/* ── Met à jour la mémoire (patch partiel) ───────────────────── */
function patchMemory(userId, patch) {
  const current = getMemory(userId);
  const next = { ...current };

  if (patch.clientName) {
    next.mentionedClients = [...new Set([...(next.mentionedClients || []), patch.clientName])].slice(-5);
  }
  if (patch.amount != null) {
    next.mentionedAmounts = [...new Set([...(next.mentionedAmounts || []), patch.amount])].slice(-5);
  }
  if (patch.lastIntent)    next.lastIntent    = patch.lastIntent;
  if (patch.lastEntityId)  next.lastEntityId  = patch.lastEntityId;
  if (patch.lastEntityType) next.lastEntityType = patch.lastEntityType;
  if (patch.toolCallCount != null) next.toolCallCount = (next.toolCallCount || 0) + patch.toolCallCount;

  store.set(userId, { data: next, updatedAt: Date.now() });
}

/* ── Réinitialise la mémoire (quand l'utilisateur efface le chat) */
function clearMemory(userId) {
  store.delete(userId);
}

/* ── Sérialise la mémoire pour le system prompt ─────────────── */
function buildMemoryBlock(userId) {
  const mem = getMemory(userId);
  if (!Object.keys(mem).length) return '';

  const parts = [];
  if (mem.mentionedClients?.length) parts.push(`Clients mentionnés : ${mem.mentionedClients.join(', ')}`);
  if (mem.mentionedAmounts?.length) parts.push(`Montants évoqués : ${mem.mentionedAmounts.map(a => `${a}€`).join(', ')}`);
  if (mem.lastIntent) parts.push(`Dernier intent : ${mem.lastIntent}`);
  if (mem.lastEntityType && mem.lastEntityId) parts.push(`Dernière entité : ${mem.lastEntityType} #${mem.lastEntityId}`);

  return parts.length ? `\nMÉMOIRE SESSION:\n${parts.join(' | ')}` : '';
}

/* ── Nettoyage périodique des entrées expirées ───────────────── */
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of store) {
    if (now - value.updatedAt > TTL_MS) store.delete(key);
  }
}, 10 * 60 * 1000);

module.exports = { getMemory, patchMemory, clearMemory, buildMemoryBlock };
