const { clerkMiddleware, getAuth } = require('@clerk/express');

// Middleware Clerk — vérifie le JWT sur chaque requête
const requireAuth = (req, res, next) => {
  const auth = getAuth(req);
  if (!auth.userId) {
    return res.status(401).json({ error: 'Non authentifié' });
  }
  req.userId = auth.userId;
  next();
};

module.exports = { clerkMiddleware, requireAuth };
