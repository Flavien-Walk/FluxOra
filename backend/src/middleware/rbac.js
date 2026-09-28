/**
 * Contrôle d'accès par rôle (RBAC) — appliqué par préfixe de route dans index.js.
 *
 *   viewer  : lecture seule
 *   manager : + clients, factures, devis, dépenses, alertes, assistant (actions), communication
 *   finance : + virements, cartes, placements, TVA, comptabilité
 *   admin   : tout (dont paramètres de l'organisation, membres, export / suppression)
 *
 * Le propriétaire de l'organisation (clerkOwnerId) est toujours admin.
 */
const { getAuth } = require('@clerk/express');
const Organization = require('../models/Organization');

const RANK = { viewer: 0, manager: 1, finance: 2, admin: 3 };

const getMemberRole = (org, userId) => {
  if (!org) return null;
  if (org.clerkOwnerId === userId) return 'admin';
  return org.members.find((m) => m.clerkUserId === userId)?.role || null;
};

/**
 * @param {string} minRole     rôle minimal requis pour écrire (POST/PUT/PATCH/DELETE)
 * @param {object} [opts]
 * @param {string[]} [opts.openWrites]  chemins (relatifs au préfixe) accessibles en écriture à tous les membres
 */
function requireRole(minRole, { openWrites = [] } = {}) {
  return async (req, res, next) => {
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
    if (openWrites.some((p) => req.path === p || req.path.startsWith(`${p}/`))) return next();

    let userId;
    try { userId = getAuth(req)?.userId; } catch { userId = null; }
    if (!userId) return next(); // la route renverra 401 via requireAuth

    const org = await Organization.findOne({ $or: [{ clerkOwnerId: userId }, { 'members.clerkUserId': userId }] });
    if (!org) return next(); // création d'organisation / 404 gérés par la route

    const role = getMemberRole(org, userId);
    req.memberRole = role;
    if (RANK[role] === undefined || RANK[role] < RANK[minRole]) {
      return res.status(403).json({ error: `Action réservée au rôle « ${minRole} » ou supérieur.`, code: 'FORBIDDEN_ROLE' });
    }
    next();
  };
}

module.exports = { requireRole, getMemberRole, RANK };
