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
  if (patch.lastIntent)     next.lastIntent     = patch.lastIntent;
  if (patch.lastEntityId)   next.lastEntityId   = patch.lastEntityId;
  if (patch.lastEntityType) next.lastEntityType = patch.lastEntityType;
  if (patch.toolCallCount != null) next.toolCallCount = (next.toolCallCount || 0) + patch.toolCallCount;

  store.set(userId, { data: next, updatedAt: Date.now() });
}

/* ── Workflow en attente de confirmation ─────────────────────── */

/**
 * Stocke un workflow en attente de confirmation utilisateur.
 * @param {string} userId
 * @param {object} workflow - { type, client, lines, totals, savedAt }
 */
function setPendingWorkflow(userId, workflow) {
  const current = getMemory(userId);
  store.set(userId, {
    data: { ...current, pendingWorkflow: { ...workflow, savedAt: Date.now() } },
    updatedAt: Date.now(),
  });
}

/**
 * Récupère le workflow en attente (null si absent ou expiré).
 */
function getPendingWorkflow(userId) {
  const mem = getMemory(userId);
  if (!mem.pendingWorkflow) return null;
  // Expire après 30 min comme le reste de la mémoire
  if (Date.now() - (mem.pendingWorkflow.savedAt || 0) > TTL_MS) {
    clearPendingWorkflow(userId);
    return null;
  }
  return mem.pendingWorkflow;
}

/**
 * Efface le workflow en attente (après exécution ou annulation).
 */
function clearPendingWorkflow(userId) {
  const current = getMemory(userId);
  if (!current.pendingWorkflow) return;
  const { pendingWorkflow: _removed, ...rest } = current;
  store.set(userId, { data: rest, updatedAt: Date.now() });
}

/* ── Réinitialise toute la mémoire ──────────────────────────── */
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
  if (mem.pendingWorkflow) {
    const wf = mem.pendingWorkflow;
    parts.push(`Workflow en attente : ${wf.type} pour "${wf.client?.name}" (${wf.totals?.subtotal || 0}€ HT)`);
  }

  return parts.length ? `\nMÉMOIRE SESSION:\n${parts.join(' | ')}` : '';
}

/* ── Nettoyage périodique des entrées expirées ───────────────── */
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of store) {
    if (now - value.updatedAt > TTL_MS) store.delete(key);
  }
}, 10 * 60 * 1000);

module.exports = { getMemory, patchMemory, clearMemory, buildMemoryBlock, setPendingWorkflow, getPendingWorkflow, clearPendingWorkflow };
