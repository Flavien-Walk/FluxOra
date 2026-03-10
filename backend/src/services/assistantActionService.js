/**
 * assistantActionService.js
 * ────────────────────────────────────────────────────────────────
 * Exécution des actions confirmées par l'utilisateur depuis
 * l'assistant IA. Crée de vraies entités dans MongoDB.
 * Aucun appel IA — logique 100% déterministe.
 * ────────────────────────────────────────────────────────────────
 */
const Organization = require('../models/Organization');
const Client       = require('../models/Client');
const Quote        = require('../models/Quote');
const Invoice      = require('../models/Invoice');

const getUserOrg = (userId) =>
  Organization.findOne({
    $or: [{ clerkOwnerId: userId }, { 'members.clerkUserId': userId }],
  });

/* ── Générateurs de numéros (même logique que les controllers) ── */

async function generateQuoteNumber(orgId) {
  const year  = new Date().getFullYear();
  const count = await Quote.countDocuments({ organizationId: orgId, number: { $regex: `^DEV-${year}-` } });
  return `DEV-${year}-${String(count + 1).padStart(3, '0')}`;
}

async function generateInvoiceNumber(orgId) {
  const year  = new Date().getFullYear();
  const count = await Invoice.countDocuments({ organizationId: orgId, number: { $regex: `^FAC-${year}-` } });
  return `FAC-${year}-${String(count + 1).padStart(3, '0')}`;
}

/* ── Exécuteur central ───────────────────────────────────────── */

/**
 * Exécute une action confirmée depuis le panel assistant.
 * @param {string} userId  - Clerk userId
 * @param {string} type    - type d'action
 * @param {object} payload - données de l'action
 * @returns {{ entityType, entityId, redirectTo, clientCreated? }}
 */
async function executeAction(userId, type, payload) {
  const org = await getUserOrg(userId);
  if (!org) throw Object.assign(new Error('Organisation introuvable.'), { status: 404 });
  const orgId = org._id;

  switch (type) {

    /* ── Brouillon devis (client déjà existant) ──────────────── */
    case 'create_draft_quote': {
      const { clientId, clientName } = payload || {};
      if (!clientId && !clientName) {
        throw Object.assign(new Error('Client requis pour créer un devis.'), { status: 400 });
      }
      const resolvedClientId = clientId || (await Client.create({ organizationId: orgId, name: clientName }))._id;
      const number = await generateQuoteNumber(orgId);
      const quote  = await Quote.create({ organizationId: orgId, clientId: resolvedClientId, number, status: 'draft', lines: [] });
      return { entityType: 'quote', entityId: quote._id.toString(), redirectTo: `/quotes/${quote._id}` };
    }

    /* ── Brouillon facture (client déjà existant) ─────────────── */
    case 'create_draft_invoice': {
      const { clientId, clientName } = payload || {};
      if (!clientId && !clientName) {
        throw Object.assign(new Error('Client requis pour créer une facture.'), { status: 400 });
      }
      const resolvedClientId = clientId || (await Client.create({ organizationId: orgId, name: clientName }))._id;
      const number  = await generateInvoiceNumber(orgId);
      const invoice = await Invoice.create({ organizationId: orgId, clientId: resolvedClientId, number, status: 'draft', lines: [] });
      return { entityType: 'invoice', entityId: invoice._id.toString(), redirectTo: `/invoices/${invoice._id}` };
    }

    /* ── Créer client + brouillon devis (enchaîné) ───────────── */
    case 'create_client_then_draft_quote': {
      const { clientName } = payload || {};
      if (!clientName) throw Object.assign(new Error('Nom du client requis.'), { status: 400 });
      const client = await Client.create({ organizationId: orgId, name: clientName });
      const number = await generateQuoteNumber(orgId);
      const quote  = await Quote.create({ organizationId: orgId, clientId: client._id, number, status: 'draft', lines: [] });
      return { entityType: 'quote', entityId: quote._id.toString(), redirectTo: `/quotes/${quote._id}`, clientCreated: true };
    }

    /* ── Créer client + brouillon facture (enchaîné) ──────────── */
    case 'create_client_then_draft_invoice': {
      const { clientName } = payload || {};
      if (!clientName) throw Object.assign(new Error('Nom du client requis.'), { status: 400 });
      const client  = await Client.create({ organizationId: orgId, name: clientName });
      const number  = await generateInvoiceNumber(orgId);
      const invoice = await Invoice.create({ organizationId: orgId, clientId: client._id, number, status: 'draft', lines: [] });
      return { entityType: 'invoice', entityId: invoice._id.toString(), redirectTo: `/invoices/${invoice._id}`, clientCreated: true };
    }

    /* ── Créer client seul ───────────────────────────────────── */
    case 'create_client': {
      const { clientName } = payload || {};
      if (!clientName) throw Object.assign(new Error('Nom du client requis.'), { status: 400 });
      const client = await Client.create({ organizationId: orgId, name: clientName });
      return { entityType: 'client', entityId: client._id.toString(), redirectTo: `/clients/${client._id}` };
    }

    default:
      throw Object.assign(new Error(`Action inconnue : ${type}`), { status: 400 });
  }
}

module.exports = { executeAction };
