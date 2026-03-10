/**
 * assistantService.js
 * ─────────────────────────────────────────────────────────────────
 * Stratégie : backend fait toutes les agrégations / calculs métier.
 * Claude reçoit uniquement un contexte compact (~600 tokens max).
 * Les actions sont construites de façon déterministe (0 token IA).
 * ─────────────────────────────────────────────────────────────────
 */
const Anthropic    = require('@anthropic-ai/sdk');
const Organization = require('../models/Organization');
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

/* ── Score de santé financière 0-100, 100% JS ─────────────────── */
function computeHealthScore({ monthRev, monthExp, lateCount, lateAmount, pendingTotal, alertCount }) {
  let score = 70;
  if (monthRev > 0 && monthExp > 0) {
    const r = monthRev / monthExp;
    if      (r > 2.0) score += 15;
    else if (r > 1.3) score += 8;
    else if (r > 1.0) score += 3;
    else if (r < 0.7) score -= 20;
    else if (r < 1.0) score -= 10;
  } else if (monthExp > 0 && monthRev === 0) {
    score -= 15;
  }
  if      (lateCount > 5) score -= 20;
  else if (lateCount > 2) score -= 10;
  else if (lateCount > 0) score -= 5;
  if (pendingTotal > 0 && lateAmount > 0) {
    const r = lateAmount / pendingTotal;
    if (r > 0.5) score -= 10;
    else if (r > 0.3) score -= 5;
  }
  if      (alertCount > 10) score -= 15;
  else if (alertCount > 5)  score -= 8;
  else if (alertCount > 2)  score -= 3;
  return Math.max(10, Math.min(100, Math.round(score)));
}

/* ── Prévision cash-flow 30j ───────────────────────────────────── */
function computeCashflowPreview(pendingInvoices, avgMonthlyExp) {
  const expectedIn = pendingInvoices.reduce((s, inv) => {
    const factor = inv.status === 'late' ? 0.4 : 0.8;
    return s + inv.total * factor;
  }, 0);
  return {
    expectedIn:   Math.round(expectedIn),
    estimatedOut: Math.round(avgMonthlyExp),
    netForecast:  Math.round(expectedIn - avgMonthlyExp),
  };
}

/* ── Détection d'intention (déterministe, 0 token IA) ─────────── */
function detectIntent(lastMessage) {
  const msg = (lastMessage || '').toLowerCase();
  if (/\b(crée|créer|nouvelle?|générer?)\b.*\bfacture\b|\bfacture\b.*\b(créer|nouveau|nouv)\b/.test(msg)) return 'create_invoice';
  if (/\b(crée|créer|nouvelle?|générer?)\b.*\bdevis\b|\bdevis\b.*\b(créer|nouveau|nouv)\b/.test(msg))   return 'create_quote';
  if (/\bvirement|virer|payer\b.*\bfournisseur|\bfournisseur\b.*\bpayer/.test(msg))                      return 'prepare_transfer';
  if (/\brelance|relanc|rappel|impayé/.test(msg))                                                        return 'send_reminder';
  if (/\btrésorerie|treso|cashflow|cash.flow|liquidité|30.?jour/.test(msg))                              return 'analyze_cashflow';
  if (/\bdépense|note.de.frais|coût/.test(msg))                                                          return 'analyze_expenses';
  if (/\bfournisseur|vendor|prestataire/.test(msg))                                                      return 'analyze_vendors';
  if (/\bsanté|health|score/.test(msg))                                                                  return 'health_score';
  if (/\bbudget|répartit|allocation/.test(msg))                                                          return 'adjust_budget';
  if (/\bclient/.test(msg))                                                                              return 'show_clients';
  return 'general_analysis';
}

/* ── Construction des actions (déterministe, basées sur données réelles) */
function buildActions(intent, ctx) {
  const late  = ctx.cashflow.lateCount;
  const alerts = ctx.alerts.count;
  const acts  = [];

  switch (intent) {
    case 'create_invoice':
      acts.push({ id: 'new_invoice',  label: 'Créer une facture',       icon: 'plus',  type: 'redirect', path: '/invoices',  style: 'primary' });
      acts.push({ id: 'view_clients', label: 'Sélectionner un client',  icon: 'users', type: 'redirect', path: '/clients',   style: 'secondary' });
      break;

    case 'create_quote':
      acts.push({ id: 'new_quote',    label: 'Créer un devis',          icon: 'plus',  type: 'redirect', path: '/quotes',    style: 'primary' });
      acts.push({ id: 'view_clients', label: 'Voir les clients',        icon: 'users', type: 'redirect', path: '/clients',   style: 'secondary' });
      break;

    case 'prepare_transfer':
      acts.push({ id: 'new_transfer', label: 'Préparer un virement',   icon: 'send',  type: 'redirect', path: '/transfers', style: 'primary' });
      acts.push({ id: 'view_exp',     label: 'Voir les dépenses',      icon: 'chart', type: 'redirect', path: '/expenses',  style: 'secondary' });
      break;

    case 'send_reminder':
      if (late > 0) acts.push({ id: 'late_inv', label: `${late} facture(s) en retard`, icon: 'alert', type: 'redirect', path: '/invoices?filter=late', style: 'warning' });
      acts.push({ id: 'all_inv', label: 'Voir toutes les factures', icon: 'list', type: 'redirect', path: '/invoices', style: 'secondary' });
      break;

    case 'analyze_cashflow':
      acts.push({ id: 'pending_inv',  label: 'Factures en attente',    icon: 'list',  type: 'redirect', path: '/invoices?filter=sent', style: 'primary' });
      if (late > 0) acts.push({ id: 'late_inv', label: `${late} retard(s) à relancer`, icon: 'alert', type: 'redirect', path: '/invoices?filter=late', style: 'warning' });
      acts.push({ id: 'new_invoice',  label: 'Créer une facture',      icon: 'plus',  type: 'redirect', path: '/invoices',  style: 'secondary' });
      break;

    case 'analyze_expenses':
      acts.push({ id: 'view_exp', label: 'Analyser les dépenses',     icon: 'chart', type: 'redirect', path: '/expenses',  style: 'primary' });
      acts.push({ id: 'accounting', label: 'Tableau comptable',       icon: 'book',  type: 'redirect', path: '/accounting', style: 'secondary' });
      break;

    case 'analyze_vendors':
      acts.push({ id: 'view_exp',     label: 'Dépenses par fournisseur', icon: 'chart', type: 'redirect', path: '/expenses',  style: 'primary' });
      acts.push({ id: 'new_transfer', label: 'Préparer un paiement',    icon: 'send',  type: 'redirect', path: '/transfers', style: 'secondary' });
      break;

    case 'health_score':
      if (alerts > 0) acts.push({ id: 'view_alerts', label: `${alerts} alerte(s) à traiter`,   icon: 'bell',  type: 'redirect', path: '/accounting', style: 'danger' });
      if (late > 0)   acts.push({ id: 'late_inv',    label: `Relancer ${late} retard(s)`,       icon: 'alert', type: 'redirect', path: '/invoices?filter=late', style: 'warning' });
      acts.push({ id: 'dashboard', label: 'Tableau de bord', icon: 'home', type: 'redirect', path: '/dashboard', style: 'secondary' });
      break;

    case 'adjust_budget':
      acts.push({ id: 'view_exp',  label: 'Voir les dépenses',   icon: 'chart', type: 'redirect', path: '/expenses',  style: 'primary' });
      acts.push({ id: 'dashboard', label: 'Vue d\'ensemble',     icon: 'home',  type: 'redirect', path: '/dashboard', style: 'secondary' });
      break;

    case 'show_clients':
      acts.push({ id: 'view_clients', label: 'Voir les clients',    icon: 'users', type: 'redirect', path: '/clients',  style: 'primary' });
      acts.push({ id: 'new_invoice',  label: 'Créer une facture',   icon: 'plus',  type: 'redirect', path: '/invoices', style: 'secondary' });
      break;

    default:
      acts.push({ id: 'dashboard',   label: 'Tableau de bord',    icon: 'home',  type: 'redirect', path: '/dashboard', style: 'secondary' });
      acts.push({ id: 'new_invoice', label: 'Créer une facture',   icon: 'plus',  type: 'redirect', path: '/invoices',  style: 'secondary' });
  }
  return acts;
}

/* ── Suggestions dynamiques à l'ouverture du panel (0 appel IA) ─ */
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

  const lateCount    = lateData[0]?.count    || 0;
  const pendingCount = pendingData[0]?.count  || 0;

  const list = [];
  if (lateCount > 0)    list.push({ text: `Relancer mes ${lateCount} facture(s) en retard`,         badge: lateCount,    badgeStyle: 'warning' });
  if (alertCount > 0)   list.push({ text: `Analyser mes ${alertCount} alerte(s) comptable(s)`,      badge: alertCount,   badgeStyle: 'danger'  });
  if (pendingCount > 0) list.push({ text: `Anticiper mes ${pendingCount} encaissement(s) à venir`,  badge: pendingCount, badgeStyle: 'info'    });
  if (quoteData > 0)    list.push({ text: `Suivre mes ${quoteData} devis envoyé(s)`,                badge: quoteData,    badgeStyle: 'info'    });

  list.push({ text: 'Anticipe ma trésorerie sur 30 jours' });
  list.push({ text: 'Quel est mon score de santé financière ?' });
  list.push({ text: 'Analyse mes dépenses du mois' });
  list.push({ text: 'Quels fournisseurs me coûtent le plus cher ?' });
  list.push({ text: 'Propose une meilleure répartition budgétaire' });
  list.push({ text: 'Créer une nouvelle facture' });

  return list.slice(0, 6);
}

/* ── Collecte du contexte minimal ──────────────────────────────── */
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
    Invoice.find({ organizationId: orgId, status: { $in: ['sent', 'late'] }, dueDate: { $exists: true, $lte: in30d } }).select('total status dueDate').lean(),
    Alert.find({ organizationId: orgId, status: 'open' }).select('type severity').lean(),
    Transfer.aggregate([{ $match: { organizationId: orgId, status: 'completed', executedAt: { $gte: startMonth } } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
  ]);

  const monthRev   = monthRevData[0]?.total   || 0;
  const prevRev    = prevMonthRevData[0]?.total || 0;
  const monthExp   = monthExpData[0]?.total   || 0;
  const lateCount  = lateData[0]?.count       || 0;
  const lateAmt    = lateData[0]?.total       || 0;
  const pending    = pendingData[0]?.total    || 0;
  const alertCount = alerts.length;

  const healthScore = computeHealthScore({ monthRev, monthExp, lateCount, lateAmount: lateAmt, pendingTotal: pending, alertCount });
  const cashflow30  = computeCashflowPreview(pendingInvoices, monthExp);

  return {
    org:      { name: org.name, currency: org.currency || 'EUR' },
    date:     now.toISOString().split('T')[0],
    revenue:  { thisMonth: monthRev, prevMonth: prevRev, trend: prevRev > 0 ? Math.round((monthRev - prevRev) / prevRev * 100) : null },
    expenses: { thisMonth: monthExp, byCategory: expByCat.map(e => ({ cat: e._id, total: e.total, n: e.count })), topVendors: topVendors.map(v => ({ vendor: v._id || 'Inconnu', total: v.total })) },
    cashflow: { netMonth: monthRev - monthExp - (transfersMonth[0]?.total || 0), pending, late: lateAmt, lateCount, ...cashflow30 },
    alerts:   { count: alertCount, types: [...new Set(alerts.map(a => a.type))] },
    healthScore,
  };
}

/* ── System prompt Claude ─────────────────────────────────────── */
function buildSystemPrompt(ctx) {
  const c      = ctx.org.currency;
  const fmt    = (n) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: c }).format(n ?? 0);
  const pct    = (n) => n != null ? `${n > 0 ? '+' : ''}${n}%` : 'N/A';
  const cats   = ctx.expenses.byCategory.map(e => `  • ${e.cat}: ${fmt(e.total)} (${e.n} op.)`).join('\n') || '  Aucune donnée';
  const vendors = ctx.expenses.topVendors.length ? ctx.expenses.topVendors.map(v => `  • ${v.vendor}: ${fmt(v.total)}`).join('\n') : '  Aucun fournisseur identifié';
  const label  = ctx.healthScore >= 75 ? 'Bonne santé' : ctx.healthScore >= 55 ? 'Santé correcte' : ctx.healthScore >= 35 ? 'Vigilance requise' : 'Situation dégradée';

  return `Tu es Fluxora Assistant, copilote financier IA intégré dans Fluxora (ERP pour PME/freelances).
Réponds TOUJOURS en français, de façon structurée, concise et orientée action.
Format idéal : résumé rapide (1-2 phrases) → constats clés (liste courte) → recommandation prioritaire.
Ne simule JAMAIS une action financière réelle. Ne mentionne pas que des actions produit ont été préparées dans ta réponse (elles s'affichent séparément dans l'interface).
Si une donnée manque, dis-le clairement sans inventer.

═══ CONTEXTE FINANCIER DE « ${ctx.org.name} » (${ctx.date}) ═══

MOIS EN COURS
  CA encaissé     : ${fmt(ctx.revenue.thisMonth)} (mois préc. ${fmt(ctx.revenue.prevMonth)}, tendance ${pct(ctx.revenue.trend)})
  Dépenses        : ${fmt(ctx.expenses.thisMonth)}
  Cash-flow net   : ${fmt(ctx.cashflow.netMonth)}

CRÉANCES
  En attente      : ${fmt(ctx.cashflow.pending)}
  En retard       : ${fmt(ctx.cashflow.late)} — ${ctx.cashflow.lateCount} facture(s)

PRÉVISION 30 JOURS
  Encaissements attendus : ${fmt(ctx.cashflow.expectedIn)}
  Dépenses estimées      : ${fmt(ctx.cashflow.estimatedOut)}
  Solde prévisionnel     : ${fmt(ctx.cashflow.netForecast)}

DÉPENSES PAR CATÉGORIE (année)
${cats}

TOP FOURNISSEURS (année)
${vendors}

SCORE DE SANTÉ : ${ctx.healthScore}/100 — ${label}
ALERTES OUVERTES : ${ctx.alerts.count}${ctx.alerts.count > 0 ? ' (' + ctx.alerts.types.join(', ') + ')' : ''}`;
}

/* ── Point d'entrée chat ─────────────────────────────────────── */
async function chat(userId, messages) {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw Object.assign(new Error('Assistant IA non configuré.'), { status: 503, code: 'ASSISTANT_INVALID_KEY' });
  }

  const ctx = await buildContext(userId);
  if (!ctx) throw Object.assign(new Error('Organisation introuvable.'), { status: 404 });

  const lastUserMsg  = messages.filter(m => m.role === 'user').slice(-1)[0]?.content || '';
  const intent       = detectIntent(lastUserMsg);
  const actions      = buildActions(intent, ctx);
  const systemPrompt = buildSystemPrompt(ctx);

  const safeMessages = messages
    .filter(m => m.role && m.content && typeof m.content === 'string')
    .slice(-10)
    .map(m => ({ role: m.role, content: m.content.slice(0, 4000) }));

  let responseText;
  try {
    const response = await getClient().messages.create({
      model:      'claude-haiku-4-5-20251001',
      max_tokens: 900,
      system:     systemPrompt,
      messages:   safeMessages,
    });
    responseText = response.content[0]?.text || 'Réponse vide.';
  } catch (err) {
    if (err.status === 401) {
      _client = null;
      throw Object.assign(new Error('Clé API invalide. Vérifiez la variable ANTHROPIC_API_KEY.'), { status: 503, code: 'ASSISTANT_INVALID_KEY' });
    }
    if (err.status === 400 && err.message?.includes('credit')) {
      throw Object.assign(new Error('Crédits IA épuisés. Rechargez le compte Anthropic.'), { status: 402, code: 'ASSISTANT_NO_CREDITS' });
    }
    if (err.status === 529 || err.status === 503 || err.status === 502) {
      throw Object.assign(new Error("L'IA est temporairement indisponible. Réessayez."), { status: 503, code: 'ASSISTANT_UNAVAILABLE' });
    }
    throw Object.assign(new Error('Erreur du provider IA.'), { status: 500, code: 'ASSISTANT_ERROR' });
  }

  return { reply: responseText, actions, intent };
}

module.exports = { chat, getSuggestions, buildContext, computeHealthScore };
