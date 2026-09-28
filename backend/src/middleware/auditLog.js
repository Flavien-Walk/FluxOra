/**
 * Piste d'audit : enregistre chaque requête d'écriture (qui, quoi, quand, résultat).
 * Aucune donnée de corps n'est stockée ; les jetons des liens publics sont masqués.
 */
const { getAuth } = require('@clerk/express');
const AuditLog = require('../models/AuditLog');
const Organization = require('../models/Organization');

const maskPath = (p) => p.replace(/[a-f0-9]{24,}/gi, (m) => (m.length === 24 ? m : '***'));

// IPv4 → /24, IPv6 → /48 : suffisant pour enquêter, sans conserver l'adresse complète
const ipPrefix = (ip = '') => {
  const clean = String(ip).replace(/^::ffff:/, '');
  if (clean.includes('.')) return clean.split('.').slice(0, 3).join('.') + '.0';
  return clean.split(':').slice(0, 3).join(':') + '::';
};

function auditLog(req, res, next) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  res.on('finish', async () => {
    try {
      let userId = null;
      try { userId = getAuth(req)?.userId || null; } catch { /* route publique */ }
      const org = userId
        ? await Organization.findOne({ $or: [{ clerkOwnerId: userId }, { 'members.clerkUserId': userId }] }, '_id').lean()
        : null;
      await AuditLog.create({
        organizationId: org?._id,
        clerkUserId: userId,
        method: req.method,
        path: maskPath(req.originalUrl.split('?')[0]),
        status: res.statusCode,
        ipPrefix: ipPrefix(req.headers['cf-connecting-ip'] || req.ip),
      });
    } catch (e) {
      console.error('[Audit] écriture impossible :', e.message);
    }
  });
  next();
}

module.exports = { auditLog, maskPath, ipPrefix };
