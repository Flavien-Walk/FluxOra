require('dotenv').config();
require('express-async-errors');

const express = require('express');
const cors = require('cors');
const { clerkMiddleware } = require('./middleware/auth');
const connectDB = require('./config/db');

const app = express();
const PORT = process.env.PORT || 5000;

// Connexion MongoDB
connectDB();

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
    cb(new Error(`CORS bloqué pour : ${origin}`));
  },
  credentials: true,
}));

// Webhook Stripe — body brut AVANT express.json()
app.use('/api/webhooks', express.raw({ type: 'application/json' }));

// Body parser JSON
app.use(express.json());

// Routes publiques (sans auth) — AVANT le clerkMiddleware
app.use('/api/public', require('./routes/public'));

// Clerk middleware — parse le JWT sur chaque requête
app.use(clerkMiddleware());

// Routes
app.use('/api/health', require('./routes/health'));
app.use('/api/organizations', require('./routes/organizations'));
app.use('/api/clients', require('./routes/clients'));
app.use('/api/invoices', require('./routes/invoices'));
app.use('/api/quotes', require('./routes/quotes'));
app.use('/api/expenses', require('./routes/expenses'));
app.use('/api/accounting', require('./routes/accounting'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/alerts',    require('./routes/alerts'));
app.use('/api/cards',     require('./routes/cards'));
app.use('/api/transfers',    require('./routes/transfers'));
app.use('/api/vat',          require('./routes/vat'));
app.use('/api/transactions', require('./routes/transactions'));
app.use('/api/webhooks',     require('./routes/webhooks'));

// Gestion des erreurs globale
app.use((err, req, res, next) => {
  console.error(err.stack);
  const statusCode = err.status || 500;
  const message = err.message || 'Erreur interne du serveur.';
  res.status(statusCode).json({ error: message });
});