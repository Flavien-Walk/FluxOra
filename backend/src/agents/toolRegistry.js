/**
 * toolRegistry.js
 * Registre des outils disponibles pour l'agent Fluxora.
 * Format Anthropic tool_use.
 *
 * Outils lecture : search_clients, search_invoices, search_quotes,
 *                  search_expenses, get_client_history,
 *                  check_draft_duplicate, list_late_invoices,
 *                  list_alerts, get_expense_categories
 * Outil workflow : prepare_workflow (stocke en mémoire pour confirmation)
 */

const Client  = require('../models/Client');
const Invoice = require('../models/Invoice');
const Quote   = require('../models/Quote');
const Expense = require('../models/Expense');
const Alert   = require('../models/Alert');
const {
  findInvoicesByAmount,
  findExpensesByVendorOrAmount,
  findClientHistory,
  checkRecentDraft,
  escapeRegex,
  invoicesToObjectCards,
  quotesToObjectCards,
  expensesToObjectCards,
} = require('../services/assistantSearch');

/* ══════════════════════════════════════════════════════════════
   DÉFINITIONS ANTHROPIC
   ══════════════════════════════════════════════════════════════ */
const TOOL_DEFINITIONS = [
  /* ── Clients ─────────────────────────────────────────────── */
  {
    name: 'search_clients',
    description: 'Recherche des clients dans Fluxora par nom ou société. Appelle cet outil AVANT toute création de devis/facture pour vérifier si le client existe.',
    input_schema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Nom du client ou de la société à rechercher' },
      },
      required: ['name'],
    },
  },

  /* ── Factures ─────────────────────────────────────────────── */
  {
    name: 'search_invoices',
    description: 'Recherche des factures par montant approximatif (±10%), statut ou client. Utilise-le quand l\'utilisateur mentionne un paiement reçu ou veut retrouver une facture.',
    input_schema: {
      type: 'object',
      properties: {
        amount:      { type: 'number', description: 'Montant en euros (tolérance ±10% appliquée automatiquement)' },
        client_name: { type: 'string', description: 'Nom du client pour filtrer' },
        status:      { type: 'string', enum: ['draft', 'sent', 'late', 'paid', 'payment_pending', 'cancelled'], description: 'Statut de la facture' },
      },
    },
  },

  /* ── Devis ────────────────────────────────────────────────── */
  {
    name: 'search_quotes',
    description: 'Recherche des devis par client, statut ou période. Utilise-le quand l\'utilisateur veut voir les devis existants, vérifier le statut d\'un devis ou retrouver un brouillon.',
    input_schema: {
      type: 'object',
      properties: {
        client_name: { type: 'string', description: 'Nom du client pour filtrer les devis' },
        status:      { type: 'string', enum: ['draft', 'sent', 'accepted', 'refused', 'expired'], description: 'Statut du devis' },
        limit:       { type: 'number', description: 'Nombre maximum de résultats (défaut: 5)' },
      },
    },
  },

  /* ── Dépenses ─────────────────────────────────────────────── */
  {
    name: 'search_expenses',
    description: 'Recherche des dépenses par fournisseur et/ou montant. Utilise-le quand l\'utilisateur décrit une dépense inconnue ou veut requalifier une catégorie.',
    input_schema: {
      type: 'object',
      properties: {
        vendor: { type: 'string', description: 'Nom du fournisseur (ex: Stripe, OVH, AWS)' },
        amount: { type: 'number', description: 'Montant en euros (tolérance ±10%)' },
      },
    },
  },

  /* ── Historique client ─────────────────────────────────────── */
  {
    name: 'get_client_history',
    description: 'Récupère l\'historique complet d\'un client : factures, devis, totaux encaissés. Utilise client_id si disponible après search_clients.',
    input_schema: {
      type: 'object',
      properties: {
        client_id:   { type: 'string', description: 'ID MongoDB du client (préféré)' },
        client_name: { type: 'string', description: 'Nom du client si l\'ID n\'est pas connu' },
      },
    },
  },

  /* ── Anti-doublon ──────────────────────────────────────────── */
  {
    name: 'check_draft_duplicate',
    description: 'Vérifie si un brouillon de devis ou de facture existe déjà pour ce client dans les 24 dernières heures. Appelle cet outil avant de préparer la création d\'un document si le client existe déjà.',
    input_schema: {
      type: 'object',
      properties: {
        client_id: { type: 'string', description: 'ID MongoDB du client' },
        type:      { type: 'string', enum: ['quote', 'invoice'], description: 'Type de document à vérifier' },
      },
      required: ['type'],
    },
  },

  /* ── Factures en retard ─────────────────────────────────────── */
  {
    name: 'list_late_invoices',
    description: 'Liste les factures en retard de paiement avec les noms des clients. Utilise-le pour les demandes de relance ou de suivi des impayés.',
    input_schema: {
      type: 'object',
      properties: {
        limit: { type: 'number', description: 'Nombre maximum de résultats (défaut: 10)' },
      },
    },
  },

  /* ── Alertes ────────────────────────────────────────────────── */
  {
    name: 'list_alerts',
    description: 'Liste les alertes comptables et financières ouvertes. Utilise-le quand l\'utilisateur demande ses alertes, signale une anomalie ou veut un contrôle de cohérence.',
    input_schema: {
      type: 'object',
      properties: {
        severity: { type: 'string', enum: ['low', 'medium', 'high', 'critical'], description: 'Filtrer par sévérité (optionnel)' },
        limit:    { type: 'number', description: 'Nombre maximum de résultats (défaut: 10)' },
      },
    },
  },

  /* ── Catégories dépenses ───────────────────────────────────── */
  {
    name: 'get_expense_categories',
    description: 'Retourne la répartition des dépenses par catégorie pour l\'année en cours. Utilise-le pour l\'analyse budgétaire ou quand l\'utilisateur veut comprendre ses coûts.',
    input_schema: {
      type: 'object',
      properties: {},
    },
  },

  /* ── Workflow de création/modification ─────────────────────── */
  {
    name: 'prepare_workflow',
    description: 'Prépare et stocke un workflow complet (création ou mise à jour) pour confirmation utilisateur. Appelle cet outil quand tu as suffisamment de données pour agir. Pour une création : appelle APRÈS search_clients. Pour une mise à jour client : appelle après avoir localisé le client. Ne demande pas de confirmation textuelle — l\'interface affiche un bouton dédié.',
    input_schema: {
      type: 'object',
      properties: {
        workflow_type: {
          type: 'string',
          enum: ['create_document', 'update_client'],
          description: 'Type de workflow : create_document (devis/facture) ou update_client (enrichissement données)',
        },
        /* Champs pour create_document */
        document_type: {
          type: 'string',
          enum: ['quote', 'invoice'],
          description: 'Type de document à créer (requis si workflow_type = create_document)',
        },
        client_exists:  { type: 'boolean', description: 'true si le client existe déjà en base (trouvé par search_clients)' },
        client_id:      { type: 'string',  description: 'ID MongoDB du client si client_exists = true' },
        client_name:    { type: 'string',  description: 'Nom complet du client' },
        client_email:   { type: 'string',  description: 'Email du client (si fourni dans le message)' },
        client_phone:   { type: 'string',  description: 'Téléphone du client (si fourni dans le message)' },
        client_company: { type: 'string',  description: 'Société du client (si fourni dans le message)' },
        lines: {
          type: 'array',
          description: 'Lignes du document (minimum 1 requise pour create_document)',
          items: {
            type: 'object',
            properties: {
              description: { type: 'string', description: 'Intitulé de la prestation' },
              quantity:    { type: 'number', description: 'Quantité (défaut : 1)' },
              unit_price:  { type: 'number', description: 'Prix unitaire HT en euros' },
              vat_rate:    { type: 'number', description: 'Taux de TVA en % (défaut : 20)' },
            },
            required: ['description', 'unit_price'],
          },
        },
        /* Envoi email post-création */
        send_email: {
          type: 'boolean',
          description: 'true si l\'utilisateur a demandé l\'envoi par email après création. Positionner à true uniquement si l\'utilisateur l\'a explicitement mentionné ("envoie", "envoyer par mail", "il faut lui envoyer", etc.)',
        },
        recipient_email: {
          type: 'string',
          description: 'Adresse email du destinataire. Si non précisée séparément, réutilise client_email. Laisser vide si aucun email fourni.',
        },
        /* Champs pour update_client */
        update_fields: {
          type: 'object',
          description: 'Champs à mettre à jour pour update_client (email, phone, company, address, notes)',
          properties: {
            email:   { type: 'string' },
            phone:   { type: 'string' },
            company: { type: 'string' },
            address: { type: 'string' },
            notes:   { type: 'string' },
          },
        },
      },
      required: ['workflow_type', 'client_name'],
    },
  },
];

/* ══════════════════════════════════════════════════════════════
   EXÉCUTEURS
   ══════════════════════════════════════════════════════════════ */

async function exec_search_clients(input, orgId) {
  const safe    = escapeRegex(input.name || '');
  const clients = await Client.find({
    organizationId: orgId,
    $or: [
      { name:    { $regex: safe, $options: 'i' } },
      { company: { $regex: safe, $options: 'i' } },
    ],
  }).limit(5).lean();

  const nameLower  = (input.name || '').toLowerCase();
  const exactMatch = clients.find(c => c.name.toLowerCase() === nameLower);
  const confidence = exactMatch ? 0.97 : clients.length === 1 ? 0.82 : clients.length > 1 ? 0.65 : 0.0;

  return {
    found: clients.length > 0,
    count: clients.length,
    clients: clients.map(c => ({
      id:      c._id.toString(),
      name:    c.name,
      email:   c.email   || '',
      phone:   c.phone   || '',
      company: c.company || '',
    })),
    confidence,
  };
}

async function exec_search_invoices(input, orgId) {
  let invoices = [];
  if (input.amount) {
    invoices = await findInvoicesByAmount(orgId, input.amount);
  } else {
    const query = { organizationId: orgId };
    if (input.status) query.status = input.status;
    if (input.client_name) {
      const safe = escapeRegex(input.client_name);
      const clients = await Client.find({ organizationId: orgId, name: { $regex: safe, $options: 'i' } }).select('_id').lean();
      if (clients.length) query.clientId = { $in: clients.map(c => c._id) };
    }
    invoices = await Invoice.find(query).sort({ updatedAt: -1 }).limit(5).populate('clientId', 'name').lean();
  }

  const confidence  = invoices.length === 1 ? 0.85 : invoices.length > 1 ? 0.6 : 0.0;
  const objectCards = invoicesToObjectCards(invoices);

  return {
    found: invoices.length > 0,
    count: invoices.length,
    invoices: invoices.map(i => ({
      id:         i._id.toString(),
      number:     i.number,
      status:     i.status,
      total:      i.total,
      clientName: i.clientId?.name || 'Inconnu',
      dueDate:    i.dueDate || null,
    })),
    objectCards,
    confidence,
  };
}

async function exec_search_quotes(input, orgId) {
  const query = { organizationId: orgId };
  if (input.status) query.status = input.status;
  if (input.client_name) {
    const safe = escapeRegex(input.client_name);
    const clients = await Client.find({ organizationId: orgId, name: { $regex: safe, $options: 'i' } }).select('_id').lean();
    if (clients.length) query.clientId = { $in: clients.map(c => c._id) };
  }

  const quotes      = await Quote.find(query).sort({ updatedAt: -1 }).limit(input.limit || 5).populate('clientId', 'name').lean();
  const objectCards = quotesToObjectCards(quotes);
  const confidence  = quotes.length === 1 ? 0.85 : quotes.length > 1 ? 0.65 : 0.0;

  return {
    found: quotes.length > 0,
    count: quotes.length,
    quotes: quotes.map(q => ({
      id:         q._id.toString(),
      number:     q.number,
      status:     q.status,
      total:      q.total,
      clientName: q.clientId?.name || 'Inconnu',
      expiryDate: q.expiryDate || null,
    })),
    objectCards,
    confidence,
  };
}

async function exec_search_expenses(input, orgId) {
  const expenses    = await findExpensesByVendorOrAmount(orgId, input.vendor || null, input.amount || null);
  const objectCards = expensesToObjectCards(expenses);
  const confidence  = expenses.length === 1 ? 0.82 : expenses.length > 1 ? 0.60 : 0.0;

  return {
    found: expenses.length > 0,
    count: expenses.length,
    expenses: expenses.map(e => ({
      id:          e._id.toString(),
      description: e.description || '',
      vendor:      e.vendor      || '',
      amount:      e.amount,
      category:    e.category,
      status:      e.status,
      date:        e.date || null,
    })),
    objectCards,
    confidence,
  };
}

async function exec_get_client_history(input, orgId) {
  let clientDoc = null;
  if (input.client_id) {
    clientDoc = await Client.findOne({ _id: input.client_id, organizationId: orgId }).lean();
  } else if (input.client_name) {
    const safe = escapeRegex(input.client_name);
    clientDoc  = await Client.findOne({ organizationId: orgId, name: { $regex: safe, $options: 'i' } }).lean();
  }
  if (!clientDoc) return { found: false, reason: 'Client introuvable', confidence: 0 };

  const history        = await findClientHistory(orgId, clientDoc._id);
  const totalInvoiced  = history.invoices.reduce((s, i) => s + (i.total || 0), 0);
  const totalPaid      = history.invoices.filter(i => i.status === 'paid').reduce((s, i) => s + (i.total || 0), 0);
  const lateCount      = history.invoices.filter(i => i.status === 'late').length;
  const objectCards    = [
    ...invoicesToObjectCards(history.invoices),
    ...quotesToObjectCards(history.quotes),
  ];

  return {
    found: true,
    client:  { id: clientDoc._id.toString(), name: clientDoc.name, email: clientDoc.email || '', company: clientDoc.company || '' },
    summary: { invoiceCount: history.invoices.length, totalInvoiced, totalPaid, balance: totalInvoiced - totalPaid, lateCount, quoteCount: history.quotes.length },
    objectCards,
    confidence: 0.97,
  };
}

async function exec_check_draft_duplicate(input, orgId) {
  const dup = await checkRecentDraft(orgId, input.client_id || null, input.type);
  return {
    hasDuplicate: !!dup,
    draft: dup ? { id: dup._id.toString(), number: dup.number, status: dup.status } : null,
    confidence: 1.0,
  };
}

async function exec_list_late_invoices(input, orgId) {
  const invoices = await Invoice.find({ organizationId: orgId, status: 'late' })
    .sort({ dueDate: 1 })
    .limit(input.limit || 10)
    .populate('clientId', 'name')
    .lean();
  const objectCards = invoicesToObjectCards(invoices);
  return {
    count: invoices.length,
    invoices: invoices.map(i => ({
      id:         i._id.toString(),
      number:     i.number,
      total:      i.total,
      clientName: i.clientId?.name || 'Inconnu',
      dueDate:    i.dueDate || null,
    })),
    objectCards,
    confidence: 1.0,
  };
}

async function exec_list_alerts(input, orgId) {
  const query = { organizationId: orgId, status: 'open' };
  if (input.severity) query.severity = input.severity;

  const SEVERITY_ORDER = { critical: 0, high: 1, medium: 2, low: 3 };
  const alerts = await Alert.find(query).limit(input.limit || 10).lean();
  alerts.sort((a, b) => (SEVERITY_ORDER[a.severity] ?? 4) - (SEVERITY_ORDER[b.severity] ?? 4));

  const SEVERITY_LABELS = { critical: 'Critique', high: 'Élevée', medium: 'Moyenne', low: 'Faible' };
  const TYPE_LABELS = {
    late_invoice:     'Facture en retard',
    duplicate_client: 'Client doublon',
    missing_field:    'Champ manquant',
    budget_exceeded:  'Budget dépassé',
    anomaly:          'Anomalie',
  };

  return {
    count: alerts.length,
    alerts: alerts.map(a => ({
      id:       a._id.toString(),
      type:     a.type,
      label:    TYPE_LABELS[a.type] || a.type,
      severity: a.severity,
      severityLabel: SEVERITY_LABELS[a.severity] || a.severity,
      message:  a.message || a.description || '',
      at:       a.createdAt,
    })),
    confidence: 1.0,
  };
}

async function exec_get_expense_categories(input, orgId) {
  const startYear  = new Date(new Date().getFullYear(), 0, 1);
  const categories = await require('../models/Expense').aggregate([
    { $match: { organizationId: orgId, date: { $gte: startYear } } },
    { $group: { _id: '$category', total: { $sum: '$amount' }, count: { $sum: 1 } } },
    { $sort: { total: -1 } },
  ]);
  return {
    categories: categories.map(c => ({ cat: c._id || 'other', total: c.total, count: c.count })),
    confidence: 1.0,
  };
}

/**
 * Prépare un workflow (création ou mise à jour) en mémoire.
 * Synchrone — aucun accès DB.
 */
function exec_prepare_workflow(input, orgId, userId) {
  const { setPendingWorkflow } = require('./agentMemory');

  let workflow;

  /* ── Mise à jour client ────────────────────────────────────── */
  if (input.workflow_type === 'update_client') {
    workflow = {
      type:   'update_client',
      client: { id: input.client_id || null, name: input.client_name || '' },
      fields: input.update_fields || {},
      savedAt: Date.now(),
    };
    setPendingWorkflow(userId, workflow);
    const fieldList = Object.keys(workflow.fields).join(', ');
    return {
      ok: true,
      workflow,
      summary: `Workflow mise à jour : client "${input.client_name}" — champs : ${fieldList || 'non précisés'}`,
    };
  }

  /* ── Création de document (devis / facture) ────────────────── */
  const lines = (input.lines || []).map(l => ({
    description: l.description || 'Prestation',
    quantity:    Number(l.quantity)   || 1,
    unitPrice:   Number(l.unit_price) || 0,
    vatRate:     Number(l.vat_rate)   || 20,
  }));

  const subtotal  = lines.reduce((s, l) => s + l.quantity * l.unitPrice, 0);
  const vatAmount = lines.reduce((s, l) => s + l.quantity * l.unitPrice * (l.vatRate / 100), 0);
  const total     = subtotal + vatAmount;

  const recipientEmail = input.recipient_email || input.client_email || '';

  workflow = {
    type: input.document_type === 'invoice' ? 'create_invoice' : 'create_quote',
    client: {
      exists:  !!input.client_exists,
      id:      input.client_id    || null,
      name:    input.client_name  || '',
      email:   input.client_email || '',
      phone:   input.client_phone || '',
      company: input.client_company || '',
    },
    lines,
    totals: {
      subtotal:  Math.round(subtotal  * 100) / 100,
      vatAmount: Math.round(vatAmount * 100) / 100,
      total:     Math.round(total     * 100) / 100,
    },
    sendEmail:      !!input.send_email,
    recipientEmail: recipientEmail,
    savedAt: Date.now(),
  };

  setPendingWorkflow(userId, workflow);

  const docLabel    = input.document_type === 'invoice' ? 'facture' : 'devis';
  const clientLabel = input.client_exists
    ? `client existant "${input.client_name}"`
    : `nouveau client "${input.client_name}"`;
  const emailNote   = workflow.sendEmail ? ` + envoi email à ${recipientEmail || '?'}` : '';

  return {
    ok: true,
    workflow,
    summary: `Workflow prêt : ${clientLabel} + ${docLabel} · ${workflow.totals.subtotal}€ HT / ${workflow.totals.total}€ TTC${emailNote}`,
  };
}

/* ── Dispatch central ────────────────────────────────────────── */
async function executeTool(name, input, orgId, userId) {
  const t0 = Date.now();
  let result;
  switch (name) {
    case 'search_clients':         result = await exec_search_clients(input, orgId);          break;
    case 'search_invoices':        result = await exec_search_invoices(input, orgId);         break;
    case 'search_quotes':          result = await exec_search_quotes(input, orgId);           break;
    case 'search_expenses':        result = await exec_search_expenses(input, orgId);         break;
    case 'get_client_history':     result = await exec_get_client_history(input, orgId);      break;
    case 'check_draft_duplicate':  result = await exec_check_draft_duplicate(input, orgId);   break;
    case 'list_late_invoices':     result = await exec_list_late_invoices(input, orgId);      break;
    case 'list_alerts':            result = await exec_list_alerts(input, orgId);             break;
    case 'get_expense_categories': result = await exec_get_expense_categories(input, orgId);  break;
    case 'prepare_workflow':       result =       exec_prepare_workflow(input, orgId, userId); break;
    default: result = { error: `Outil inconnu : ${name}` };
  }
  result._durationMs = Date.now() - t0;
  return result;
}

/* ── Résumé lisible pour le journal ─────────────────────────── */
function summarizeResult(toolName, result) {
  if (!result) return 'Aucun résultat';
  if (result.error) return `Erreur : ${result.error}`;
  switch (toolName) {
    case 'search_clients':         return result.found ? `${result.count} client(s) trouvé(s)` : 'Aucun client trouvé';
    case 'search_invoices':        return result.found ? `${result.count} facture(s) trouvée(s)` : 'Aucune facture trouvée';
    case 'search_quotes':          return result.found ? `${result.count} devis trouvé(s)` : 'Aucun devis trouvé';
    case 'search_expenses':        return result.found ? `${result.count} dépense(s) trouvée(s)` : 'Aucune dépense trouvée';
    case 'get_client_history':     return result.found ? `${result.summary?.invoiceCount || 0} fact., ${result.summary?.quoteCount || 0} devis` : 'Client introuvable';
    case 'check_draft_duplicate':  return result.hasDuplicate ? `Doublon : ${result.draft?.number}` : 'Aucun doublon';
    case 'list_late_invoices':     return `${result.count} facture(s) en retard`;
    case 'list_alerts':            return `${result.count} alerte(s) ouverte(s)`;
    case 'get_expense_categories': return `${result.categories?.length || 0} catégorie(s)`;
    case 'prepare_workflow':       return result.ok ? result.summary : 'Workflow non préparé';
    default: return JSON.stringify(result).slice(0, 80);
  }
}

module.exports = { TOOL_DEFINITIONS, executeTool, summarizeResult };
