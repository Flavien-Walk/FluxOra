const express      = require('express');
const router       = express.Router();
const { requireAuth } = require('../middleware/auth');
const { chat }     = require('../services/assistantService');

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

// Purge périodique pour ne pas garder la map en mémoire indéfiniment
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of rateMap) { if (now > v.reset) rateMap.delete(k); }
}, 5 * 60_000);

/* ── POST /api/assistant/chat ────────────────────────────────── */
router.post('/chat', requireAuth, async (req, res) => {
  const { messages } = req.body;

  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'messages[] requis.' });
  }

  if (!isAllowed(req.userId)) {
    return res.status(429).json({ error: 'Trop de requêtes. Réessayez dans une minute.' });
  }

  // Timeout 45s pour ne pas laisser une requête pendante
  const timeout = setTimeout(() => {
    if (!res.headersSent) res.status(504).json({ error: 'Délai dépassé. Réessayez.' });
  }, 45_000);

  try {
    const reply = await chat(req.userId, messages);
    clearTimeout(timeout);
    if (!res.headersSent) res.json({ reply });
  } catch (err) {
    clearTimeout(timeout);
    if (!res.headersSent) {
      const status = err.status || 500;
      res.status(status).json({ error: err.message || 'Erreur assistant.', code: err.code || 'ASSISTANT_ERROR' });
    }
  }
});

module.exports = router;
