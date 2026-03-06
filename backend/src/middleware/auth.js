const { clerkMiddleware, getAuth } = require('@clerk/express');

// Middleware Clerk — vérifie le JWT sur chaque requête
const requireAuth = (req, res, next) => {
  try {
    const auth = getAuth(req);
    if (!auth || !auth.userId) {
      return res.status(401).json({ error: 'Non authentifié' });
    }
    req.userId = auth.userId;
    next();
  } catch (err) {
    console.error('Auth error:', err.message);
    return res.status(401).json({ error: 'Token invalide ou manquant' });
  }
};

module.exports = { clerkMiddleware, requireAuth };
