require('dotenv').config();
require('express-async-errors');

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { rateLimit, ipKeyGenerator } = require('express-rate-limit');
const { clerkMiddleware, getAuth } = require('@clerk/express');
const connectDB = require('./config/db');
const { requireRole } = require('./middleware/rbac');
const { auditLog } = require('./middleware/auditLog');

const app = express();
const PORT = process.env.PORT || 5000;

// Connexion MongoDB
connectDB();

// En-têtes de sécurité (API JSON). CORP cross-origin : le pixel de suivi est chargé depuis les webmails.
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));

// CORS — accepte localhost (dev) + Vercel (prod) + URL custom via CLIENT_URL
const allowedOrigins = [
  'http://localhost:3000',
  'https://flux-ora.vercel.app',
  process.env.CLIENT_URL,
].filter(Boolean);

app.use(cors({
  origin: (origin, cb) => {
    // Autorise les requêtes sans origin (Postman, curl, Render healthcheck)
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    cb(Object.assign(new Error('Origine non autorisée.'), { status: 403 }));
  },
  credentials: true,
}));

// Limites de débit — clé = IP réelle (Cloudflare) pour les routes publiques, utilisateur Clerk sinon
const clientIp = (req) => ipKeyGenerator(String(req.headers['cf-connecting-ip'] || req.ip || ''));
const limiterOptions = { standardHeaders: 'draft-8', legacyHeaders: false, validate: { xForwardedForHeader: false } };
const publicLimiter = rateLimit({ ...limiterOptions, windowMs: 60_000, limit: 60, keyGenerator: clientIp,
  message: { error: 'Trop de requêtes. Réessayez dans une minute.', code: 'RATE_LIMIT' } });
const apiLimiter = rateLimit({ ...limiterOptions, windowMs: 60_000, limit: 300,
  keyGenerator: (req) => { try { return getAuth(req)?.userId || clientIp(req); } catch { return clientIp(req); } },
  message: { error: 'Trop de requêtes. Réessayez dans une minute.', code: 'RATE_LIMIT' } });

// Webhook Stripe — body brut AVANT express.json()
app.use('/api/webhooks', express.raw({ type: 'application/json' }));

// Body parser JSON (5 Mo : photos de reçus en base64 pour l'OCR)
app.use(express.json({ limit: '5mb' }));

// Piste d'audit de toutes les écritures
app.use(auditLog);

// Routes publiques (sans auth) — AVANT le clerkMiddleware
app.use('/api/public', publicLimiter, require('./routes/public'));
// Callback OAuth des réseaux sociaux (sécurisé par un state signé)
app.use('/api/social', publicLimiter, require('./routes/social').publicRouter);

// Clerk middleware — parse le JWT sur chaque requête
app.use(clerkMiddleware());
app.use('/api', apiLimiter);

// Routes (rôle minimal requis pour les écritures ; la lecture est ouverte à tous les membres)
app.use('/api/health', require('./routes/health'));
app.use('/api/organizations', requireRole('admin'), require('./routes/organizations'));
app.use('/api/clients',       requireRole('manager'), require('./routes/clients'));
app.use('/api/invoices',      requireRole('manager'), require('./routes/invoices'));
app.use('/api/quotes',        requireRole('manager'), require('./routes/quotes'));
app.use('/api/credit-notes',  requireRole('manager'), require('./routes/creditNotes'));
app.use('/api/expenses',      requireRole('manager'), require('./routes/expenses'));
app.use('/api/accounting',    requireRole('finance'), require('./routes/accounting'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/alerts',        requireRole('manager'), require('./routes/alerts'));
app.use('/api/cards',         requireRole('finance'), require('./routes/cards'));
app.use('/api/transfers',     requireRole('finance'), require('./routes/transfers'));
app.use('/api/vat',           requireRole('finance'), require('./routes/vat'));
app.use('/api/transactions', require('./routes/transactions'));
app.use('/api/webhooks',     require('./routes/webhooks'));
app.use('/api/assistant',     requireRole('manager', { openWrites: ['/chat', '/agent', '/reset-context'] }), require('./routes/assistant'));
app.use('/api/investments',   requireRole('finance'), require('./routes/investments'));
app.use('/api/social',        requireRole('manager'), require('./routes/social').router);

// Gestion des erreurs globale — pas de détail interne renvoyé au client
app.use((err, req, res, next) => {
  const statusCode = err.status || err.statusCode || 500;
  if (statusCode >= 500) console.error(err.stack);
  const message = statusCode >= 500 ? 'Erreur interne du serveur.' : (err.message || 'Requête invalide.');
  res.status(statusCode).json({ error: message });
});

app.listen(PORT, () => {
  console.log(`Fluxora API démarrée sur http://localhost:${PORT}`);

  // Cron quotidien — mise à jour des taux marché (08h15 CET, après publication ECB à 08h00)
  const cron = require('node-cron');
  const { updateMarketRates } = require('./services/marketDataService');

  cron.schedule('15 7 * * 1-5', async () => {
    try { await updateMarketRates(); }
    catch (e) { console.error('[Cron] Erreur updateMarketRates:', e.message); }
  }, { timezone: 'Europe/Paris' });

  // Publication des posts programmés (Communication) — vérification chaque minute
  const { processScheduledPosts } = require('./services/social/socialPostService');
  cron.schedule('* * * * *', () => {
    processScheduledPosts().catch(e => console.error('[Cron] Erreur posts programmés:', e.message));
  });

  // Relances automatiques (factures impayées, devis) — chaque jour à 9 h, organisations volontaires uniquement
  const { runAutomaticReminders } = require('./services/reminderService');
  cron.schedule('0 9 * * *', async () => {
    try { console.log('[Relances]', await runAutomaticReminders()); }
    catch (e) { console.error('[Cron] Erreur relances :', e.message); }
  }, { timezone: 'Europe/Paris' });

  // Préchargement des marchés actions (liste + cours) pour une première page rapide
  const equities = require('./services/market/equitiesService');
  Promise.all(['paris', 'growth'].map((segment) => equities.listStocks({ segment, limit: 10 })))
    .catch(e => console.error('[Marchés] préchargement :', e.message));

  // Fetch immédiat au démarrage si pas de données aujourd'hui
  updateMarketRates().catch(e => console.error('[MarketData] Init error:', e.message));
});
