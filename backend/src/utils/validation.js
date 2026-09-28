/**
 * Validations métier partagées (montants, IBAN, BIC).
 */
const httpError = (message) => Object.assign(new Error(message), { status: 400 });

// Montant strictement positif, au centime, plafonné
function parseAmount(value, { max = 1_000_000, label = 'Montant' } = {}) {
  const n = typeof value === 'string' ? Number(value.replace(',', '.')) : Number(value);
  if (!Number.isFinite(n) || n <= 0) throw httpError(`${label} invalide : il doit être supérieur à 0.`);
  if (n > max) throw httpError(`${label} trop élevé (maximum ${max.toLocaleString('fr-FR')} €).`);
  return Math.round(n * 100) / 100;
}

// IBAN : format + clé de contrôle ISO 13616 (modulo 97)
function normalizeIban(value) {
  const iban = String(value || '').replace(/\s/g, '').toUpperCase();
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/.test(iban)) throw httpError('IBAN invalide (format).');
  const rearranged = iban.slice(4) + iban.slice(0, 4);
  const numeric = rearranged.replace(/[A-Z]/g, (c) => String(c.charCodeAt(0) - 55));
  let remainder = 0;
  for (const digit of numeric) remainder = (remainder * 10 + Number(digit)) % 97;
  if (remainder !== 1) throw httpError('IBAN invalide (clé de contrôle).');
  return iban;
}

function normalizeBic(value) {
  if (!value) return undefined;
  const bic = String(value).replace(/\s/g, '').toUpperCase();
  if (!/^[A-Z]{4}[A-Z]{2}[A-Z0-9]{2}([A-Z0-9]{3})?$/.test(bic)) throw httpError('BIC invalide.');
  return bic;
}

const cleanText = (value, max = 140) => (value == null ? undefined : String(value).trim().slice(0, max));

module.exports = { parseAmount, normalizeIban, normalizeBic, cleanText };
