/**
 * assistantService.js
 * ─────────────────────────────────────────────────────────────────
 * Copilote financier IA Fluxora.
 * Stratégie :
 *   - intents CRUD → réponse déterministe (0 token IA) + entité résolue
 *   - intents ANALYSE → appel Claude Haiku avec contexte compact
 *   - actions construites sur vraies données MongoDB
 * ─────────────────────────────────────────────────────────────────
 */
const Anthropic    = require('@anthropic-ai/sdk');
const Organization = require('../models/Organization');
const Client       = require('../models/Client');
const Invoice      = require('../models/Invoice');
const Expense      = require('../models/Expense');
const Quote        = require('../models/Quote');
const Transfer     = require('../models/Transfer');
const Alert        = require('../models/Alert');

// Lazy init — évite crash si clé absente au démarrage
let _client = null;
const getClient = () => {
  if (!_client) _client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return _client;
};

/* ═══════════════════════════════════════════════════════════════
   HELPERS DÉTERMINISTES
   ═══════════════════════════════════════════════════════════════ */

function computeHealthScore({ monthRev, monthExp, lateCount, lateAmount, pendingTotal, alertCount }) {
  let score = 70;
  if (monthRev > 0 && monthExp > 0) {
    const r = monthRev / monthExp;
    if (r > 2.0) score += 15; else if (r > 1.3) score += 8; else if (r > 1.0) score += 3;
    else if (r < 0.7) score -= 20; else if (r < 1.0) score -= 10;
  } else if (monthExp > 0 && monthRev === 0) score -= 15;
  if (lateCount > 5) score -= 20; else if (lateCount > 2) score -= 10; else if (lateCount > 0) score -= 5;
  if (pendingTotal > 0 && lateAmount / pendingTotal > 0.5) score -= 10;
  else if (pendingTotal > 0 && lateAmount / pendingTotal > 0.3) score -= 5;
  if (alertCount > 10) score -= 15; else if (alertCount > 5) score -= 8; else if (alertCount > 2) score -= 3;
  return Math.max(10, Math.min(100, Math.round(score)));
}

function computeCashflowPreview(pendingInvoices, avgMonthlyExp) {
  const expectedIn = pendingInvoices.reduce((s, inv) => s + inv.total * (inv.status === 'late' ? 0.4 : 0.8), 0);
  return { expectedIn: Math.round(expectedIn), estimatedOut: Math.round(avgMonthlyExp), netForecast: Math.round(expectedIn - avgMonthlyExp) };
}

/* ─── Extraction du nom d'entité depuis le message ─────────── */
function escapeRegex(str) { return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

function extractEntityName(message) {
  const msg = message.trim();
  const stopWords = new Set(['le', 'la', 'les', 'un', 'une', 'des', 'mon', 'ma', 'mes', 'ce', 'cette', 'tout', 'tous']);
  const patterns = [
    /au nom d[eu']\s+(.+?)(?:\s*$|\s+(?:et|avec|pour|sur|le|la))/i,
    /au nom\s+(.+?)(?:\s*$|\s+(?:et|avec|pour))/i,
    /(?:pour|à|avec)\s+(?:l[ae]s?\s+)?(?:client[e]?\s+|entreprise\s+|société\s+)?([A-ZÀ-Ÿ][^\s,?!.]+(?:\s+[A-ZÀ-Ÿ][^\s,?!.]+)*)/,
    /(?:fournisseur|client[e]?)\s+([A-ZÀ-Ÿ][^\s,?!.]+(?:\s+[A-ZÀ-Ÿ][^\s,?!.]+)*)/i,
  ];
  for (const pattern of patterns) {
    const match = msg.match(pattern);
    if (match) {
      const name = match[1].trim().replace(/\s+$/, '');
      if (name.length >= 2 && !stopWords.has(name.toLowerCase())) return name;
    }
  }
  return null;
}

/* ─── Recherche de client (insensible à la casse) ──────────── */
async function findClientByName(orgId, name) {
  if (!name) return null;
  const safe = escapeRegex(name);
  return (
    await Client.findOne({ organizationId: orgId, name: { $regex: `^${safe}$`, $options: 'i' } }).lean() ||
    await Client.findOne({ organizationId: orgId, name: { $regex: safe, $options: 'i' } }).lean()
  );
}

/* ═══════════════════════════════════════════════════════════════
   DÉTECTION D'INTENTION (0 token IA)
   ═══════════════════════════════════════════════════════════════ */
function detectIntent(msg) {
  const m = (msg || '').toLowerCase();
  if (/\b(crée|créer|nouvelle?|générer?|faire|fais|fait)\b.*\bfacture|\bfacture\b.*\b(créer|nouveau|faire)\b/.test(m)) return 'create_invoice';
  if (/\b(crée|créer|nouvelle?|générer?|faire|fais|fait)\b.*\bdevis|\bdevis\b.*\b(créer|nouveau|faire)\b/.test(m))    return 'create_quote';
  if (/\bvirement|virer|payer\b.*\bfournisseur|\bfournisseur\b.*\bpayer/.test(m))                                    return 'prepare_transfer';
  if (/\brelance|relanc|rappel|impayé/.test(m))                                                                      return 'send_reminder';
  if (/\btrésorerie|treso|cashflow|cash.flow|liquidité|30.?jour/.test(m))                                            return 'analyze_cashflow';
  if (/\bdépense|note.de.frais|coût/.test(m))                                                                        return 'analyze_expenses';
  if (/\bfournisseur|vendor|prestataire/.test(m))                                                                    return 'analyze_vendors';
  if (/\bsanté|health|score/.test(m))                                                                                return 'health_score';
  if (/\bbudget|répartit|allocation/.test(m))                                                                        return 'adjust_budget';
  if (/\bclient/.test(m))                                                                                            return 'show_clients';
  return 'general_analysis';
}

// Ces intents ne nécessitent PAS d'appel IA
const DETERMINISTIC_INTENTS = new Set(['create_invoice', 'create_quote', 'send_reminder', 'prepare_transfer', 'show_clients']);

/* ═══════════════════════════════════════════════════════════════
   RÉPONSES DÉTERMINISTES (0 crédit IA)
   ═══════════════════════════════════════════════════════════════ */
function buildDeterministicReply(intent, entityCtx, ctx) {
  const late = ctx.cashflow.lateCount;
  switch (intent) {
    case 'create_quote':
      if (!entityCtx?.clientName) return "Pour créer un devis, précisez le nom du client.\n\nExemple : *Crée un devis pour Kevin Tran*";
      if (entityCtx.clientFound)  return `**${entityCtx.clientName}** est déjà dans vos clients.\n\nJe peux créer le brouillon immédiatement — vous n'aurez qu'à ajouter les lignes et le montant dans la page devis.`;
      return `**${entityCtx.clientName}** n'est pas encore dans vos clients.\n\nJe peux créer le client automatiquement et préparer un brouillon de devis en une seule étape.`;

    case 'create_invoice':
      if (!entityCtx?.clientName) return "Pour créer une facture, précisez le nom du client.\n\nExemple : *Crée une facture pour Sophie Martin*";
      if (entityCtx.clientFound)  return `**${entityCtx.clientName}** est dans vos clients.\n\nJe prépare le brouillon de facture — vous pourrez ajouter les lignes, le montant et la date d'échéance.`;
      return `**${entityCtx.clientName}** n'est pas encore dans vos clients.\n\nJe peux créer le client et préparer un brouillon de facture en une seule action.`;

    case 'send_reminder':
      if (late > 0) return `Vous avez **${late} facture(s) en retard** à relancer.\n\nAccédez à la liste pour envoyer les relances directement depuis chaque facture.`;
      return "Aucune facture en retard. Vos créances sont à jour.";

    case 'prepare_transfer':
      return "Je peux préparer un virement depuis Fluxora.\n\nRendez-vous dans Virements pour configurer le bénéficiaire, le montant et la date d'exécution.";

    case 'show_clients':
      return "Voici l'accès à votre base clients. Vous pouvez rechercher, créer ou modifier vos contacts depuis cette page.";

    default:
      return "Je suis prêt à vous aider. Posez votre question ou choisissez une action.";
  }
}

/* ═══════════════════════════════════════════════════════════════
   CONSTRUCTION DES ACTIONS
   ═══════════════════════════════════════════════════════════════ */
function buildEntityActions(intent, entityCtx) {
  if (!entityCtx?.clientName) return null;
  const n = entityCtx.clientName;
  const acts = [];

  if (intent === 'create_quote') {
    acts.push(entityCtx.clientFound
      ? { id: 'confirm_draft_quote', label: 'Créer le brouillon de devis', icon: 'plus', type: 'action', actionType: 'create_draft_quote', payload: { clientId: entityCtx.clientId, clientName: n }, style: 'primary' }
      : { id: 'create_client_then_quote', label: `Créer ${n} puis le devis`, icon: 'plus', type: 'action', actionType: 'create_client_then_draft_quote', payload: { clientName: n }, style: 'primary' }
    );
    acts.push({ id: 'go_quotes',   label: 'Voir les devis',   icon: 'list',  type: 'redirect', path: '/quotes',   style: 'secondary' });
    acts.push({ id: 'go_clients',  label: 'Voir les clients', icon: 'users', type: 'redirect', path: '/clients',  style: 'secondary' });
  }

  if (intent === 'create_invoice') {
    acts.push(entityCtx.clientFound
      ? { id: 'confirm_draft_invoice', label: 'Créer le brouillon de facture', icon: 'plus', type: 'action', actionType: 'create_draft_invoice', payload: { clientId: entityCtx.clientId, clientName: n }, style: 'primary' }
      : { id: 'create_client_then_invoice', label: `Créer ${n} puis la facture`, icon: 'plus', type: 'action', actionType: 'create_client_then_draft_invoice', payload: { clientName: n }, style: 'primary' }
    );
    acts.push({ id: 'go_invoices', label: 'Voir les factures', icon: 'list',  type: 'redirect', path: '/invoices', style: 'secondary' });
    acts.push({ id: 'go_clients',  label: 'Voir les clients',  icon: 'users', type: 'redirect', path: '/clients',  style: 'secondary' });
  }

  return acts.length ? acts : null;
}

function buildActions(intent, ctx) {
  const late   = ctx.cashflow.lateCount;
  const alerts = ctx.alerts.count;
  const acts   = [];

  switch (intent) {
    case 'prepare_transfer':
      acts.push({ id: 'go_transfers', label: 'Aller aux virements', icon: 'send',  type: 'redirect', path: '/transfers', style: 'primary' });
      acts.push({ id: 'go_expenses',  label: 'Voir les dépenses',   icon: 'chart', type: 'redirect', path: '/expenses',  style: 'secondary' });
      break;
    case 'send_reminder':
      if (late > 0) acts.push({ id: 'late_inv', label: `${late} facture(s) en retard`, icon: 'alert', type: 'redirect', path: '/invoices?filter=late', style: 'warning' });
      acts.push({ id: 'all_inv', label: 'Voir toutes les factures', icon: 'list', type: 'redirect', path: '/invoices', style: 'secondary' });
      break;
    case 'analyze_cashflow':
      acts.push({ id: 'pending_inv', label: 'Factures en attente', icon: 'list', type: 'redirect', path: '/invoices?filter=sent', style: 'primary' });
      if (late > 0) acts.push({ id: 'late_inv', label: `${late} retard(s) à relancer`, icon: 'alert', type: 'redirect', path: '/invoices?filter=late', style: 'warning' });
      acts.push({ id: 'new_inv', label: 'Créer une facture', icon: 'plus', type: 'redirect', path: '/invoices', style: 'secondary' });
      break;
    case 'analyze_expenses':
      acts.push({ id: 'go_exp',      label: 'Analyser les dépenses', icon: 'chart', type: 'redirect', path: '/expenses',    style: 'primary' });
      acts.push({ id: 'go_account',  label: 'Tableau comptable',     icon: 'book',  type: 'redirect', path: '/accounting',  style: 'secondary' });
      break;
    case 'analyze_vendors':
      acts.push({ id: 'go_exp',      label: 'Dépenses par fournisseur', icon: 'chart', type: 'redirect', path: '/expenses',  style: 'primary' });
      acts.push({ id: 'go_transfer', label: 'Préparer un paiement',     icon: 'send',  type: 'redirect', path: '/transfers', style: 'secondary' });
      break;
    case 'health_score':
      if (alerts > 0) acts.push({ id: 'go_alerts', label: `${alerts} alerte(s) à traiter`,  icon: 'bell',  type: 'redirect', path: '/accounting', style: 'danger' });
      if (late > 0)   acts.push({ id: 'late_inv',  label: `Relancer ${late} retard(s)`,     icon: 'alert', type: 'redirect', path: '/invoices?filter=late', style: 'warning' });
      acts.push({ id: 'dashboard', label: 'Tableau de bord', icon: 'home', type: 'redirect', path: '/dashboard', style: 'secondary' });
      break;
    case 'adjust_budget':
      acts.push({ id: 'go_exp',   label: 'Voir les dépenses', icon: 'chart', type: 'redirect', path: '/expenses',  style: 'primary' });
      acts.push({ id: 'dashboard', label: "Vue d'ensemble",   icon: 'home',  type: 'redirect', path: '/dashboard', style: 'secondary' });
      break;
    case 'show_clients':
      acts.push({ id: 'go_clients', label: 'Voir les clients',  icon: 'users', type: 'redirect', path: '/clients',  style: 'primary' });
      acts.push({ id: 'new_inv',    label: 'Créer une facture', icon: 'plus',  type: 'redirect', path: '/invoices', style: 'secondary' });
      break;
    default:
      acts.push({ id: 'dashboard', label: 'Tableau de bord',  icon: 'home', type: 'redirect', path: '/dashboard', style: 'secondary' });
      acts.push({ id: 'new_inv',   label: 'Créer une facture', icon: 'plus', type: 'redirect', path: '/invoices',  style: 'secondary' });
  }
  return acts;
}

/* ═══════════════════════════════════════════════════════════════
   CONTEXTE FINANCIER (pour le prompt Claude)
   ═══════════════════════════════════════════════════════════════ */
async function buildContext(userId) {
  const org = await Organization.findOne({
    $or: [{ clerkOwnerId: userId }, { 'members.clerkUserId': userId }],
  }).lean();
  if (!org) return null;

  const orgId      = org._id;
  const now        = new Date();
  const startMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startYear  = new Date(now.getFullYear(), 0, 1);
  const prevMonth  = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const in30d      = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  const [
    monthRevData, prevMonthRevData, pendingData, lateData,
    monthExpData, expByCat, topVendors, pendingInvoices, alerts, transfersMonth,
  ] = await Promise.all([
    Invoice.aggregate([{ $match: { organizationId: orgId, status: 'paid', paidAt: { $gte: startMonth } } }, { $group: { _id: null, total: { $sum: '$total' } } }]),
    Invoice.aggregate([{ $match: { organizationId: orgId, status: 'paid', paidAt: { $gte: prevMonth, $lt: startMonth } } }, { $group: { _id: null, total: { $sum: '$total' } } }]),
    Invoice.aggregate([{ $match: { organizationId: orgId, status: { $in: ['sent', 'late'] } } }, { $group: { _id: null, total: { $sum: '$total' }, count: { $sum: 1 } } }]),
    Invoice.aggregate([{ $match: { organizationId: orgId, status: 'late' } }, { $group: { _id: null, total: { $sum: '$total' }, count: { $sum: 1 } } }]),
    Expense.aggregate([{ $match: { organizationId: orgId, date: { $gte: startMonth } } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
    Expense.aggregate([{ $match: { organizationId: orgId, date: { $gte: startYear } } }, { $group: { _id: '$category', total: { $sum: '$amount' }, count: { $sum: 1 } } }, { $sort: { total: -1 } }, { $limit: 8 }]),
    Expense.aggregate([{ $match: { organizationId: orgId, date: { $gte: startYear }, vendor: { $ne: '' } } }, { $group: { _id: '$vendor', total: { $sum: '$amount' } } }, { $sort: { total: -1 } }, { $limit: 5 }]),
    Invoice.find({ organizationId: orgId, status: { $in: ['sent', 'late'] }, dueDate: { $exists: true, $lte: in30d } }).select('total status').lean(),
    Alert.find({ organizationId: orgId, status: 'open' }).select('type severity').lean(),
    Transfer.aggregate([{ $match: { organizationId: orgId, status: 'completed', executedAt: { $gte: startMonth } } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
  ]);

  const monthRev   = monthRevData[0]?.total    || 0;
  const prevRev    = prevMonthRevData[0]?.total || 0;
  const monthExp   = monthExpData[0]?.total    || 0;
  const lateCount  = lateData[0]?.count        || 0;
  const lateAmt    = lateData[0]?.total        || 0;
  const pending    = pendingData[0]?.total     || 0;
  const alertCount = alerts.length;
  const cashflow30 = computeCashflowPreview(pendingInvoices, monthExp);

  return {
    orgObjectId: orgId,
    org:      { name: org.name, currency: org.currency || 'EUR' },
    date:     now.toISOString().split('T')[0],
    revenue:  { thisMonth: monthRev, prevMonth: prevRev, trend: prevRev > 0 ? Math.round((monthRev - prevRev) / prevRev * 100) : null },
    expenses: { thisMonth: monthExp, byCategory: expByCat.map(e => ({ cat: e._id, total: e.total, n: e.count })), topVendors: topVendors.map(v => ({ vendor: v._id || 'Inconnu', total: v.total })) },
    cashflow: { netMonth: monthRev - monthExp - (transfersMonth[0]?.total || 0), pending, late: lateAmt, lateCount, ...cashflow30 },
    alerts:   { count: alertCount, types: [...new Set(alerts.map(a => a.type))] },
    healthScore: computeHealthScore({ monthRev, monthExp, lateCount, lateAmount: lateAmt, pendingTotal: pending, alertCount }),
  };
}

/* ─── System prompt Claude ────────────────────────────────── */
function buildSystemPrompt(ctx) {
  const c    = ctx.org.currency;
  const fmt  = (n) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: c }).format(n ?? 0);
  const pct  = (n) => n != null ? `${n > 0 ? '+' : ''}${n}%` : 'N/A';
  const cats = ctx.expenses.byCategory.map(e => `  • ${e.cat}: ${fmt(e.total)} (${e.n} op.)`).join('\n') || '  Aucune donnée';
  const vend = ctx.expenses.topVendors.map(v => `  • ${v.vendor}: ${fmt(v.total)}`).join('\n') || '  Aucun';
  const lbl  = ctx.healthScore >= 75 ? 'Bonne santé' : ctx.healthScore >= 55 ? 'Santé correcte' : ctx.healthScore >= 35 ? 'Vigilance' : 'Dégradée';

  return `Tu es Fluxora Assistant, copilote financier IA pour PME/freelances.
Réponds TOUJOURS en français, de façon structurée et orientée action.
Format : résumé (1-2 phrases) → constats clés → recommandation prioritaire.
N'indique PAS que des boutons ou actions ont été préparés dans l'interface (ils s'affichent séparément).
Ne bloque JAMAIS sur des informations manquantes. Si une donnée manque, propose quand même une action.

═══ CONTEXTE FINANCIER « ${ctx.org.name} » (${ctx.date}) ═══
CA ce mois : ${fmt(ctx.revenue.thisMonth)} (préc. ${fmt(ctx.revenue.prevMonth)}, tendance ${pct(ctx.revenue.trend)})
Dépenses   : ${fmt(ctx.expenses.thisMonth)} | Cash-flow net : ${fmt(ctx.cashflow.netMonth)}
Créances   : ${fmt(ctx.cashflow.pending)} en attente, ${fmt(ctx.cashflow.late)} en retard (${ctx.cashflow.lateCount} fact.)
Prévision 30j : +${fmt(ctx.cashflow.expectedIn)} / -${fmt(ctx.cashflow.estimatedOut)} = ${fmt(ctx.cashflow.netForecast)}
Dépenses/catégorie : ${cats}
Top fournisseurs : ${vend}
Score santé : ${ctx.healthScore}/100 — ${lbl} | Alertes : ${ctx.alerts.count}`;
}

/* ═══════════════════════════════════════════════════════════════
   SUGGESTIONS DYNAMIQUES (0 appel IA)
   ═══════════════════════════════════════════════════════════════ */
async function getSuggestions(userId) {
  const org = await Organization.findOne({
    $or: [{ clerkOwnerId: userId }, { 'members.clerkUserId': userId }],
  }).lean();
  if (!org) return [];

  const orgId = org._id;
  const [lateData, alertCount, pendingData, quoteData] = await Promise.all([
    Invoice.aggregate([{ $match: { organizationId: orgId, status: 'late' } }, { $group: { _id: null, count: { $sum: 1 } } }]),
    Alert.countDocuments({ organizationId: orgId, status: 'open' }),
    Invoice.aggregate([{ $match: { organizationId: orgId, status: 'sent' } }, { $group: { _id: null, count: { $sum: 1 } } }]),
    Quote.countDocuments({ organizationId: orgId, status: 'sent' }),
  ]);

  const lateCount    = lateData[0]?.count   || 0;
  const pendingCount = pendingData[0]?.count || 0;
  const list = [];

  if (lateCount > 0)    list.push({ text: `Relancer mes ${lateCount} facture(s) en retard`,       badge: lateCount,    badgeStyle: 'warning' });
  if (alertCount > 0)   list.push({ text: `Analyser mes ${alertCount} alerte(s) comptable(s)`,    badge: alertCount,   badgeStyle: 'danger'  });
  if (pendingCount > 0) list.push({ text: `Anticiper mes ${pendingCount} encaissement(s) à venir`, badge: pendingCount, badgeStyle: 'info'    });
  if (quoteData > 0)    list.push({ text: `Suivre mes ${quoteData} devis envoyé(s)`,              badge: quoteData,    badgeStyle: 'info'    });

  // Suggestions analytiques — les actions CRUD sont dans le hub de l'assistant
  list.push({ text: 'Anticipe ma trésorerie sur 30 jours' });
  list.push({ text: 'Quel est mon score de santé financière ?' });
  list.push({ text: 'Analyse mes dépenses du mois' });
  list.push({ text: 'Quels fournisseurs me coûtent le plus cher ?' });
  list.push({ text: 'Propose une meilleure répartition budgétaire' });
  list.push({ text: 'Quel est mon bilan du mois ?' });

  return list.slice(0, 6);
}

/* ─── Clients récents pour le sélecteur du hub ─────────────── */
async function getRecentClients(userId) {
  const org = await Organization.findOne({
    $or: [{ clerkOwnerId: userId }, { 'members.clerkUserId': userId }],
  }).lean();
  if (!org) return [];
  return Client.find({ organizationId: org._id })
    .sort({ updatedAt: -1 })
    .limit(8)
    .select('name email company')
    .lean();
}

/* ═══════════════════════════════════════════════════════════════
   POINT D'ENTRÉE CHAT
   ═══════════════════════════════════════════════════════════════ */
async function chat(userId, messages) {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw Object.assign(new Error('Assistant IA non configuré.'), { status: 503, code: 'ASSISTANT_INVALID_KEY' });
  }

  const ctx = await buildContext(userId);
  if (!ctx) throw Object.assign(new Error('Organisation introuvable.'), { status: 404 });

  const lastMsg = messages.filter(m => m.role === 'user').slice(-1)[0]?.content || '';
  const intent  = detectIntent(lastMsg);

  /* ── Résolution d'entité pour intents CRUD ─────────────────── */
  let entityCtx  = null;
  let entityCard = null;

  if (['create_quote', 'create_invoice'].includes(intent)) {
    const name = extractEntityName(lastMsg);
    if (name) {
      const found  = await findClientByName(ctx.orgObjectId, name);
      entityCtx  = { clientName: name, clientFound: !!found, clientId: found?._id?.toString() };
      entityCard = { entityType: 'client', found: !!found, name, id: found?._id?.toString(), detail: found ? 'Client enregistré dans Fluxora' : null };
    }
  }

  /* ── Construction des actions ──────────────────────────────── */
  const actions = buildEntityActions(intent, entityCtx) || buildActions(intent, ctx);

  /* ── Réponse : déterministe pour CRUD, Claude pour analyse ─── */
  let reply;
  if (DETERMINISTIC_INTENTS.has(intent)) {
    reply = buildDeterministicReply(intent, entityCtx, ctx);
  } else {
    // Appel Claude pour les intents d'analyse
    const safeMessages = messages
      .filter(m => m.role && m.content && typeof m.content === 'string')
      .slice(-10)
      .map(m => ({ role: m.role, content: m.content.slice(0, 4000) }));

    try {
      const response = await getClient().messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 900,
        system: buildSystemPrompt(ctx),
        messages: safeMessages,
      });
      reply = response.content[0]?.text || 'Réponse vide.';
    } catch (err) {
      if (err.status === 401) {
        _client = null;
        throw Object.assign(new Error('Clé API invalide.'), { status: 503, code: 'ASSISTANT_INVALID_KEY' });
      }
      if (err.status === 400 && err.message?.includes('credit')) {
        throw Object.assign(new Error('Crédits IA épuisés.'), { status: 402, code: 'ASSISTANT_NO_CREDITS' });
      }
      if (err.status >= 500) throw Object.assign(new Error("L'IA est temporairement indisponible."), { status: 503, code: 'ASSISTANT_UNAVAILABLE' });
      throw Object.assign(new Error('Erreur du provider IA.'), { status: 500, code: 'ASSISTANT_ERROR' });
    }
  }

  return { reply, intent, actions, entityCard };
}

module.exports = { chat, getSuggestions, getRecentClients, buildContext, computeHealthScore };
