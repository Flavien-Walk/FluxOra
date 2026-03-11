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
 * @returns {{ entityType, entityId, number?, redirectTo, clientCreated? }}
 */
async function executeAction(userId, type, payload) {
  const org = await getUserOrg(userId);
  if (!org) throw Object.assign(new Error('Organisation introuvable.'), { status: 404 });
  const orgId = org._id;

  switch (type) {

    /* ── Workflow agentique complet (client + document) ──────── */
    case 'confirm_agent_workflow': {
      const { workflow } = payload || {};
      if (!workflow) throw Object.assign(new Error('Workflow introuvable.'), { status: 400 });
      if (!workflow.client?.name) throw Object.assign(new Error('Nom du client requis.'), { status: 400 });

      // Effacer le workflow de la mémoire
      try {
        const { clearPendingWorkflow } = require('../agents/agentMemory');
        clearPendingWorkflow(userId);
      } catch (_) { /* non bloquant */ }

      // Résoudre le client
      let clientId;
      if (workflow.client.exists && workflow.client.id) {
        clientId = workflow.client.id;
      } else {
        const client = await Client.create({
          organizationId: orgId,
          name:    workflow.client.name,
          email:   workflow.client.email   || '',
          phone:   workflow.client.phone   || '',
          company: workflow.client.company || '',
        });
        clientId = client._id;
      }

      // Normaliser les lignes (unitPrice = snake ou camel)
      const lines = (workflow.lines || []).map(l => ({
        description: l.description || 'Prestation',
        quantity:    Number(l.quantity  || l.qty)       || 1,
        unitPrice:   Number(l.unitPrice || l.unit_price) || 0,
        vatRate:     Number(l.vatRate   || l.vat_rate)   || 20,
      }));

      if (workflow.type === 'create_invoice') {
        const number  = await generateInvoiceNumber(orgId);
        const invoice = await Invoice.create({ organizationId: orgId, clientId, number, status: 'draft', lines });
        return {
          entityType:    'invoice',
          entityId:      invoice._id.toString(),
          number:        invoice.number,
          redirectTo:    `/invoices/${invoice._id}`,
          clientCreated: !workflow.client.exists,
        };
      } else {
        const number = await generateQuoteNumber(orgId);
        const quote  = await Quote.create({ organizationId: orgId, clientId, number, status: 'draft', lines });
        return {
          entityType:    'quote',
          entityId:      quote._id.toString(),
          number:        quote.number,
          redirectTo:    `/quotes/${quote._id}`,
          clientCreated: !workflow.client.exists,
        };
      }
    }

    /* ── Brouillon devis (client déjà existant) ──────────────── */
    case 'create_draft_quote': {
      const { clientId, clientName } = payload || {};
      if (!clientId && !clientName) {
        throw Object.assign(new Error('Client requis pour créer un devis.'), { status: 400 });
      }
      const resolvedClientId = clientId || (await Client.create({ organizationId: orgId, name: clientName }))._id;
      const number = await generateQuoteNumber(orgId);
      const quote  = await Quote.create({ organizationId: orgId, clientId: resolvedClientId, number, status: 'draft', lines: [] });
      return { entityType: 'quote', entityId: quote._id.toString(), number: quote.number, redirectTo: `/quotes/${quote._id}` };
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
      return { entityType: 'invoice', entityId: invoice._id.toString(), number: invoice.number, redirectTo: `/invoices/${invoice._id}` };
    }

    /* ── Créer client + brouillon devis (enchaîné) ───────────── */
    case 'create_client_then_draft_quote': {
      const { clientName } = payload || {};
      if (!clientName) throw Object.assign(new Error('Nom du client requis.'), { status: 400 });
      const client = await Client.create({ organizationId: orgId, name: clientName });
      const number = await generateQuoteNumber(orgId);
      const quote  = await Quote.create({ organizationId: orgId, clientId: client._id, number, status: 'draft', lines: [] });
      return { entityType: 'quote', entityId: quote._id.toString(), number: quote.number, redirectTo: `/quotes/${quote._id}`, clientCreated: true };
    }

    /* ── Créer client + brouillon facture (enchaîné) ──────────── */
    case 'create_client_then_draft_invoice': {
      const { clientName } = payload || {};
      if (!clientName) throw Object.assign(new Error('Nom du client requis.'), { status: 400 });
      const client  = await Client.create({ organizationId: orgId, name: clientName });
      const number  = await generateInvoiceNumber(orgId);
      const invoice = await Invoice.create({ organizationId: orgId, clientId: client._id, number, status: 'draft', lines: [] });
      return { entityType: 'invoice', entityId: invoice._id.toString(), number: invoice.number, redirectTo: `/invoices/${invoice._id}`, clientCreated: true };
    }

    /* ── Créer client seul ───────────────────────────────────── */
    case 'create_client': {
      const { clientName } = payload || {};
      if (!clientName) throw Object.assign(new Error('Nom du client requis.'), { status: 400 });
      const client = await Client.create({ organizationId: orgId, name: clientName });
      return { entityType: 'client', entityId: client._id.toString(), redirectTo: `/clients/${client._id}` };
    }

    /* ── Mise à jour client (champs enrichis) ────────────────── */
    case 'update_client': {
      const { clientId, fields } = payload || {};
      if (!clientId) throw Object.assign(new Error('Client ID requis.'), { status: 400 });
      if (!fields || !Object.keys(fields).length) {
        throw Object.assign(new Error('Aucune donnée à mettre à jour.'), { status: 400 });
      }
      const ALLOWED = ['email', 'phone', 'company', 'address', 'notes'];
      const updateData = {};
      for (const key of ALLOWED) {
        if (fields[key] !== undefined && fields[key] !== null) updateData[key] = fields[key];
      }
      if (!Object.keys(updateData).length) {
        throw Object.assign(new Error('Champs non reconnus ou vides.'), { status: 400 });
      }
      const client = await Client.findOneAndUpdate(
        { _id: clientId, organizationId: orgId },
        { $set: updateData },
        { new: true }
      );
      if (!client) throw Object.assign(new Error('Client introuvable.'), { status: 404 });
      return {
        entityType: 'client',
        entityId:   client._id.toString(),
        redirectTo: `/clients/${client._id}`,
        updated:    Object.keys(updateData),
      };
    }

    default:
      throw Object.assign(new Error(`Action inconnue : ${type}`), { status: 400 });
  }
}

module.exports = { executeAction };
