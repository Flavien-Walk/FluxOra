/**
 * Chiffrement des jetons OAuth et signature du paramètre "state".
 * Clé dérivée de SOCIAL_TOKEN_SECRET (ou, à défaut, de CLERK_SECRET_KEY).
 */
const crypto = require('crypto');

const getKey = () => {
  const secret = process.env.SOCIAL_TOKEN_SECRET || process.env.CLERK_SECRET_KEY;
  if (!secret) throw new Error('SOCIAL_TOKEN_SECRET manquant.');
  return crypto.createHash('sha256').update(`fluxora-social:${secret}`).digest();
};

function encrypt(plain) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', getKey(), iv);
  const data = Buffer.concat([cipher.update(String(plain), 'utf8'), cipher.final()]);
  return [iv, cipher.getAuthTag(), data].map((b) => b.toString('base64url')).join('.');
}

function decrypt(payload) {
  const [iv, tag, data] = String(payload).split('.').map((p) => Buffer.from(p, 'base64url'));
  const decipher = crypto.createDecipheriv('aes-256-gcm', getKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8');
}

// State OAuth signé (anti-CSRF) — valable 10 minutes
function signState(data) {
  const body = Buffer.from(JSON.stringify({ ...data, t: Date.now(), n: crypto.randomBytes(6).toString('hex') })).toString('base64url');
  const sig = crypto.createHmac('sha256', getKey()).update(body).digest('base64url');
  return `${body}.${sig}`;
}

function verifyState(state, maxAgeMs = 10 * 60 * 1000) {
  const [body, sig] = String(state || '').split('.');
  if (!body || !sig) return null;
  const expected = crypto.createHmac('sha256', getKey()).update(body).digest('base64url');
  if (sig.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  const data = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
  if (Date.now() - data.t > maxAgeMs) return null;
  return data;
}

module.exports = { encrypt, decrypt, signState, verifyState };
