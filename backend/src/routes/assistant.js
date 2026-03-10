const express      = require('express');
const router       = express.Router();
const { requireAuth }   = require('../middleware/auth');
const { chat, getSuggestions, getRecentClients } = require('../services/assistantService');
const { executeAction }        = require('../services/assistantActionService');

/* ── Rate limit simple en mémoire (10 req/min par user) ─────── */
const rateMap = new Map();
const LIMIT   = 10;
const WINDOW  = 60_000;

function isAllowed(userId) {
  const now   = Date.now();
  const entry = rateMap.get(userId) || { n: 0, reset: now + WINDOW };
  if (now > entry.reset) { entry.n = 0; entry.reset = now + WINDOW; }
  entry.n += 1;
  rateMap.set(userId, entry);
  return entry.n <= LIMIT;
}

setInterval(() => {
  const now = Date.now();
  for (const [k, v] of rateMap) { if (now > v.reset) rateMap.delete(k); }
}, 5 * 60_000);

/* ── GET /api/assistant/clients — sélecteur client du hub ────── */
router.get('/clients', requireAuth, async (req, res) => {
  try {
    const clients = await getRecentClients(req.userId);
    res.json({ clients });
  } catch (err) {
    res.json({ clients: [] });
  }
});

/* ── GET /api/assistant/suggestions ─────────────────────────── */
router.get('/suggestions', requireAuth, async (req, res) => {
  try {
    const suggestions = await getSuggestions(req.userId);
    res.json({ suggestions });
  } catch (err) {
    console.error('suggestions error:', err.message);
    res.json({ suggestions: [] });
  }
});

/* ── POST /api/assistant/chat ────────────────────────────────── */
router.post('/chat', requireAuth, async (req, res) => {
  const { messages } = req.body;

  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'messages[] requis.' });
  }
  if (!isAllowed(req.userId)) {
    return res.status(429).json({ error: 'Trop de requêtes. Réessayez dans une minute.', code: 'RATE_LIMIT' });
  }

  const timeout = setTimeout(() => {
    if (!res.headersSent) res.status(504).json({ error: 'Délai dépassé. Réessayez.', code: 'ASSISTANT_TIMEOUT' });
  }, 45_000);

  try {
    const result = await chat(req.userId, messages);
    clearTimeout(timeout);
    if (!res.headersSent) res.json(result);
  } catch (err) {
    clearTimeout(timeout);
    if (!res.headersSent) {
      res.status(err.status || 500).json({ error: err.message || 'Erreur assistant.', code: err.code || 'ASSISTANT_ERROR' });
    }
  }
});

/* ── POST /api/assistant/action ──────────────────────────────── */
/* Exécute une action confirmée par l'utilisateur (create draft, etc.) */
router.post('/action', requireAuth, async (req, res) => {
  const { type, payload } = req.body;

  if (!type) return res.status(400).json({ error: 'type requis.' });

  try {
    const result = await executeAction(req.userId, type, payload || {});
    res.json(result);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message || "Impossible d'exécuter cette action." });
  }
});

/* ── POST /api/assistant/agent ── Agent IA avec tool_use ─────── */
router.post('/agent', requireAuth, async (req, res) => {
  const { messages, context } = req.body;

  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'messages[] requis.' });
  }
  if (!isAllowed(req.userId)) {
    return res.status(429).json({ error: 'Trop de requêtes. Réessayez dans une minute.', code: 'RATE_LIMIT' });
  }

  const timeout = setTimeout(() => {
    if (!res.headersSent) res.status(504).json({ error: 'Délai dépassé. Réessayez.', code: 'AGENT_TIMEOUT' });
  }, 90_000);

  try {
    const { runAgent } = require('../agents/agentOrchestrator');
    const result = await runAgent(req.userId, messages, context || {});
    clearTimeout(timeout);
    if (!res.headersSent) res.json(result);
  } catch (err) {
    clearTimeout(timeout);
    if (!res.headersSent) {
      res.status(err.status || 500).json({ error: err.message || 'Erreur agent.', code: err.code || 'AGENT_ERROR' });
    }
  }
});

/* ── POST /api/assistant/reset-context ── Efface la mémoire ──── */
router.post('/reset-context', requireAuth, async (req, res) => {
  try {
    const { clearMemory } = require('../agents/agentMemory');
    clearMemory(req.userId);
    res.json({ ok: true });
  } catch {
    res.json({ ok: false });
  }
});

module.exports = router;
