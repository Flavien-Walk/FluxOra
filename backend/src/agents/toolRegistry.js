/**
 * toolRegistry.js
 * Registre des outils disponibles pour l'agent Fluxora.
 * Format Anthropic tool_use — tous les outils sont en LECTURE seule.
 * Les actions d'écriture passent par confirmation utilisateur (modales).
 */

const Client  = require('../models/Client');
const Invoice = require('../models/Invoice');
const Quote   = require('../models/Quote');
const Expense = require('../models/Expense');
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
   DÉFINITIONS ANTHROPIC (passées à messages.create({ tools }))
   ══════════════════════════════════════════════════════════════ */
const TOOL_DEFINITIONS = [
  {
    name: 'search_clients',
    description: 'Recherche des clients dans Fluxora par nom ou société. Appelle cet outil AVANT de proposer la création d\'un devis ou d\'une facture pour vérifier si le client existe.',
    input_schema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Nom du client ou de la société à rechercher' },
      },
      required: ['name'],
    },
  },
  {
    name: 'search_invoices',
    description: 'Recherche des factures par montant approximatif (±10%), statut ou client. Utilise-le quand l\'utilisateur mentionne un paiement reçu ou veut retrouver une facture.',
    input_schema: {
      type: 'object',
      properties: {
        amount: { type: 'number', description: 'Montant en euros (tolérance ±10% appliquée automatiquement)' },
        client_name: { type: 'string', description: 'Nom du client pour filtrer' },
        status: { type: 'string', enum: ['draft', 'sent', 'late', 'paid', 'payment_pending', 'cancelled'], description: 'Statut de la facture' },
      },
    },
  },
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
  {
    name: 'get_client_history',
    description: 'Récupère l\'historique complet d\'un client : factures, devis, totaux encaissés. Utilise client_id si disponible après search_clients.',
    input_schema: {
      type: 'object',
      properties: {
        client_id: { type: 'string', description: 'ID MongoDB du client (préféré)' },
        client_name: { type: 'string', description: 'Nom du client si l\'ID n\'est pas connu' },
      },
    },
  },
  {
    name: 'check_draft_duplicate',
    description: 'Vérifie si un brouillon de devis ou de facture existe déjà pour ce client dans les 24 dernières heures. Appelle cet outil avant de proposer la création d\'un nouveau document.',
    input_schema: {
      type: 'object',
      properties: {
        client_id: { type: 'string', description: 'ID MongoDB du client' },
        type: { type: 'string', enum: ['quote', 'invoice'], description: 'Type de document à vérifier' },
      },
      required: ['type'],
    },
  },
  {
    name: 'list_late_invoices',
    description: 'Liste les factures en retard de paiement avec les noms des clients. Utilise-le pour les demandes de relance ou de suivi.',
    input_schema: {
      type: 'object',
      properties: {
        limit: { type: 'number', description: 'Nombre maximum de résultats (défaut: 10)' },
      },
    },
  },
  {
    name: 'get_expense_categories',
    description: 'Retourne la répartition des dépenses par catégorie pour l\'année en cours. Utilise-le pour l\'analyse budgétaire.',
    input_schema: {
      type: 'object',
      properties: {},
    },
  },
];

/* ══════════════════════════════════════════════════════════════
   EXÉCUTEURS (logique DB par outil)
   ══════════════════════════════════════════════════════════════ */

async function exec_search_clients(input, orgId) {
  const safe = escapeRegex(input.name || '');
  const clients = await Client.find({
    organizationId: orgId,
    $or: [
      { name: { $regex: safe, $options: 'i' } },
      { company: { $regex: safe, $options: 'i' } },
    ],
  }).limit(5).lean();

  const nameLower = (input.name || '').toLowerCase();
  const exactMatch = clients.find(c => c.name.toLowerCase() === nameLower);
  const confidence = exactMatch ? 0.97 : clients.length === 1 ? 0.82 : clients.length > 1 ? 0.65 : 0.0;

  return {
    found: clients.length > 0,
    count: clients.length,
    clients: clients.map(c => ({ id: c._id.toString(), name: c.name, email: c.email || '', company: c.company || '' })),
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

  const confidence = invoices.length === 1 ? 0.85 : invoices.length > 1 ? 0.6 : 0.0;
  const objectCards = invoicesToObjectCards(invoices);

  return {
    found: invoices.length > 0,
    count: invoices.length,
    invoices: invoices.map(i => ({
      id: i._id.toString(),
      number: i.number,
      status: i.status,
      total: i.total,
      clientName: i.clientId?.name || 'Inconnu',
      dueDate: i.dueDate || null,
    })),
    objectCards,
    confidence,
  };
}

async function exec_search_expenses(input, orgId) {
  const expenses = await findExpensesByVendorOrAmount(orgId, input.vendor || null, input.amount || null);
  const objectCards = expensesToObjectCards(expenses);
  const confidence = expenses.length === 1 ? 0.82 : expenses.length > 1 ? 0.60 : 0.0;

  return {
    found: expenses.length > 0,
    count: expenses.length,
    expenses: expenses.map(e => ({
      id: e._id.toString(),
      description: e.description || '',
      vendor: e.vendor || '',
      amount: e.amount,
      category: e.category,
      status: e.status,
      date: e.date || null,
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
    clientDoc = await Client.findOne({ organizationId: orgId, name: { $regex: safe, $options: 'i' } }).lean();
  }
  if (!clientDoc) return { found: false, reason: 'Client introuvable', confidence: 0 };

  const history = await findClientHistory(orgId, clientDoc._id);
  const totalInvoiced = history.invoices.reduce((s, i) => s + (i.total || 0), 0);
  const totalPaid = history.invoices.filter(i => i.status === 'paid').reduce((s, i) => s + (i.total || 0), 0);
  const lateCount = history.invoices.filter(i => i.status === 'late').length;
  const objectCards = [
    ...invoicesToObjectCards(history.invoices),
    ...quotesToObjectCards(history.quotes),
  ];

  return {
    found: true,
    client: { id: clientDoc._id.toString(), name: clientDoc.name, email: clientDoc.email || '', company: clientDoc.company || '' },
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
      id: i._id.toString(),
      number: i.number,
      total: i.total,
      clientName: i.clientId?.name || 'Inconnu',
      dueDate: i.dueDate || null,
    })),
    objectCards,
    confidence: 1.0,
  };
}

async function exec_get_expense_categories(input, orgId) {
  const startYear = new Date(new Date().getFullYear(), 0, 1);
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

/* ── Dispatch central ────────────────────────────────────────── */
async function executeTool(name, input, orgId) {
  const t0 = Date.now();
  let result;
  switch (name) {
    case 'search_clients':        result = await exec_search_clients(input, orgId);        break;
    case 'search_invoices':       result = await exec_search_invoices(input, orgId);       break;
    case 'search_expenses':       result = await exec_search_expenses(input, orgId);       break;
    case 'get_client_history':    result = await exec_get_client_history(input, orgId);    break;
    case 'check_draft_duplicate': result = await exec_check_draft_duplicate(input, orgId); break;
    case 'list_late_invoices':    result = await exec_list_late_invoices(input, orgId);    break;
    case 'get_expense_categories':result = await exec_get_expense_categories(input, orgId);break;
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
    case 'search_clients':        return result.found ? `${result.count} client(s) trouvé(s)` : 'Aucun client trouvé';
    case 'search_invoices':       return result.found ? `${result.count} facture(s) trouvée(s)` : 'Aucune facture trouvée';
    case 'search_expenses':       return result.found ? `${result.count} dépense(s) trouvée(s)` : 'Aucune dépense trouvée';
    case 'get_client_history':    return result.found ? `${result.summary?.invoiceCount || 0} fact., ${result.summary?.quoteCount || 0} devis` : 'Client introuvable';
    case 'check_draft_duplicate': return result.hasDuplicate ? `Doublon : ${result.draft?.number}` : 'Aucun doublon';
    case 'list_late_invoices':    return `${result.count} facture(s) en retard`;
    case 'get_expense_categories':return `${result.categories?.length || 0} catégorie(s)`;
    default: return JSON.stringify(result).slice(0, 80);
  }
}

module.exports = { TOOL_DEFINITIONS, executeTool, summarizeResult };
