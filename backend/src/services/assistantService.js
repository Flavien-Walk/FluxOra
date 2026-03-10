/**
 * assistantService.js
 * ─────────────────────────────────────────────────────────────────
 * Stratégie : backend fait toutes les agrégations / calculs métier.
 * Claude reçoit uniquement un contexte compact (~600 tokens max).
 * ─────────────────────────────────────────────────────────────────
 */
const Anthropic       = require('@anthropic-ai/sdk');
const Organization    = require('../models/Organization');
const Invoice         = require('../models/Invoice');
const Expense         = require('../models/Expense');
const Quote           = require('../models/Quote');
const Transfer        = require('../models/Transfer');
const Alert           = require('../models/Alert');

// Lazy init — évite crash si clé absente au démarrage
let _client = null;
const getClient = () => {
  if (!_client) _client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return _client;
};

/* ── Helpers de calcul déterministe ──────────────────────────── */

/** Score de santé financière 0-100, 100% JS, 0 appel IA */
function computeHealthScore({ monthRev, monthExp, lateCount, lateAmount, pendingTotal, alertCount }) {
  let score = 70;

  // Ratio revenus / dépenses
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

  // Factures en retard
  if      (lateCount > 5) score -= 20;
  else if (lateCount > 2) score -= 10;
  else if (lateCount > 0) score -= 5;

  // Part des retards dans les créances
  if (pendingTotal > 0 && lateAmount > 0) {
    const r = lateAmount / pendingTotal;
    if (r > 0.5) score -= 10;
    else if (r > 0.3) score -= 5;
  }

  // Alertes comptables ouvertes
  if      (alertCount > 10) score -= 15;
  else if (alertCount > 5)  score -= 8;
  else if (alertCount > 2)  score -= 3;

  return Math.max(10, Math.min(100, Math.round(score)));
}

/** Prévision cash-flow 30j basée sur factures à venir + dépenses estimées */
function computeCashflowPreview(pendingInvoices, avgMonthlyExp) {
  const expectedIn = pendingInvoices.reduce((s, inv) => {
    // Pondérer par statut : sent=80%, late=40%
    const factor = inv.status === 'late' ? 0.4 : 0.8;
    return s + inv.total * factor;
  }, 0);
  const estimatedOut = avgMonthlyExp;
  return {
    expectedIn: Math.round(expectedIn),
    estimatedOut: Math.round(estimatedOut),
    netForecast: Math.round(expectedIn - estimatedOut),
  };
}

/* ── Collecte du contexte minimal ──────────────────────────────── */

async function buildContext(userId) {
  const org = await Organization.findOne({
    $or: [{ clerkOwnerId: userId }, { 'members.clerkUserId': userId }],
  }).lean();
  if (!org) return null;

  const orgId        = org._id;
  const now          = new Date();
  const startMonth   = new Date(now.getFullYear(), now.getMonth(), 1);
  const startYear    = new Date(now.getFullYear(), 0, 1);
  const prevMonth    = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const in30d        = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  const [
    monthRevData, prevMonthRevData, pendingData, lateData,
    monthExpData, expByCat, topVendors,
    pendingInvoices, alerts, transfersMonth,
  ] = await Promise.all([
    // CA encaissé ce mois
    Invoice.aggregate([
      { $match: { organizationId: orgId, status: 'paid', paidAt: { $gte: startMonth } } },
      { $group: { _id: null, total: { $sum: '$total' } } },
    ]),
    // CA mois précédent (pour tendance)
    Invoice.aggregate([
      { $match: { organizationId: orgId, status: 'paid', paidAt: { $gte: prevMonth, $lt: startMonth } } },
      { $group: { _id: null, total: { $sum: '$total' } } },
    ]),
    // Factures en attente
    Invoice.aggregate([
      { $match: { organizationId: orgId, status: { $in: ['sent', 'late'] } } },
      { $group: { _id: null, total: { $sum: '$total' }, count: { $sum: 1 } } },
    ]),
    // Factures en retard
    Invoice.aggregate([
      { $match: { organizationId: orgId, status: 'late' } },
      { $group: { _id: null, total: { $sum: '$total' }, count: { $sum: 1 } } },
    ]),
    // Dépenses ce mois
    Expense.aggregate([
      { $match: { organizationId: orgId, date: { $gte: startMonth } } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),
    // Dépenses par catégorie (année) — max 8
    Expense.aggregate([
      { $match: { organizationId: orgId, date: { $gte: startYear } } },
      { $group: { _id: '$category', total: { $sum: '$amount' }, count: { $sum: 1 } } },
      { $sort: { total: -1 } },
      { $limit: 8 },
    ]),
    // Top 5 fournisseurs (année)
    Expense.aggregate([
      { $match: { organizationId: orgId, date: { $gte: startYear }, vendor: { $ne: '' } } },
      { $group: { _id: '$vendor', total: { $sum: '$amount' }, count: { $sum: 1 } } },
      { $sort: { total: -1 } },
      { $limit: 5 },
    ]),
    // Factures en attente avec dueDate (pour cashflow 30j)
    Invoice.find({
      organizationId: orgId,
      status: { $in: ['sent', 'late'] },
      dueDate: { $exists: true, $lte: in30d },
    }).select('total status dueDate').lean(),
    // Alertes ouvertes
    Alert.find({ organizationId: orgId, status: 'open' }).select('type severity').lean(),
    // Virements ce mois
    Transfer.aggregate([
      { $match: { organizationId: orgId, status: 'completed', executedAt: { $gte: startMonth } } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),
  ]);

  const monthRev  = monthRevData[0]?.total   || 0;
  const prevRev   = prevMonthRevData[0]?.total || 0;
  const monthExp  = monthExpData[0]?.total   || 0;
  const lateCount = lateData[0]?.count       || 0;
  const lateAmt   = lateData[0]?.total       || 0;
  const pending   = pendingData[0]?.total    || 0;
  const alertCount = alerts.length;

  const healthScore = computeHealthScore({
    monthRev, monthExp, lateCount,
    lateAmount: lateAmt, pendingTotal: pending, alertCount,
  });

  const cashflow30 = computeCashflowPreview(pendingInvoices, monthExp);

  return {
    org:         { name: org.name, currency: org.currency || 'EUR' },
    date:        now.toISOString().split('T')[0],
    revenue: {
      thisMonth:  monthRev,
      prevMonth:  prevRev,
      trend:      prevRev > 0 ? Math.round((monthRev - prevRev) / prevRev * 100) : null,
    },
    expenses: {
      thisMonth:  monthExp,
      byCategory: expByCat.map(e => ({ cat: e._id, total: e.total, n: e.count })),
      topVendors: topVendors.map(v => ({ vendor: v._id || 'Inconnu', total: v.total })),
    },
    cashflow: {
      netMonth:   monthRev - monthExp - (transfersMonth[0]?.total || 0),
      pending,
      late:       lateAmt,
      lateCount,
      ...cashflow30,
    },
    alerts:      { count: alertCount, types: [...new Set(alerts.map(a => a.type))] },
    healthScore,
  };
}

/* ── Appel Claude ─────────────────────────────────────────────── */

function buildSystemPrompt(ctx) {
  const c = ctx.org.currency;
  const fmtNum = (n) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: c }).format(n ?? 0);
  const pct    = (n) => n != null ? `${n > 0 ? '+' : ''}${n}%` : 'N/A';

  const catLines = ctx.expenses.byCategory
    .map(e => `  • ${e.cat}: ${fmtNum(e.total)} (${e.n} op.)`)
    .join('\n') || '  Aucune donnée';

  const vendorLines = ctx.expenses.topVendors.length
    ? ctx.expenses.topVendors.map(v => `  • ${v.vendor}: ${fmtNum(v.total)}`).join('\n')
    : '  Aucun fournisseur identifié';

  const scoreLabel = ctx.healthScore >= 75 ? 'Bonne santé'
    : ctx.healthScore >= 55 ? 'Santé correcte'
    : ctx.healthScore >= 35 ? 'Vigilance requise'
    : 'Situation dégradée';

  return `Tu es Fluxora Assistant, conseiller financier IA intégré dans Fluxora (ERP pour PME/freelances).
Réponds TOUJOURS en français, de façon structurée, concise et actionnable.
Format idéal : résumé rapide → constats → recommandations → action prioritaire.
Ne simule JAMAIS une action financière (virement, paiement) sans confirmation humaine explicite.
Si une donnée manque, dis-le clairement sans inventer.

═══ CONTEXTE FINANCIER DE « ${ctx.org.name} » (${ctx.date}) ═══

MOIS EN COURS
  CA encaissé     : ${fmtNum(ctx.revenue.thisMonth)} (mois préc. ${fmtNum(ctx.revenue.prevMonth)}, tendance ${pct(ctx.revenue.trend)})
  Dépenses        : ${fmtNum(ctx.expenses.thisMonth)}
  Cash-flow net   : ${fmtNum(ctx.cashflow.netMonth)}

CRÉANCES
  En attente      : ${fmtNum(ctx.cashflow.pending)}
  En retard       : ${fmtNum(ctx.cashflow.late)} — ${ctx.cashflow.lateCount} facture(s)

PRÉVISION 30 JOURS
  Encaissements attendus : ${fmtNum(ctx.cashflow.expectedIn)}
  Dépenses estimées      : ${fmtNum(ctx.cashflow.estimatedOut)}
  Solde prévisionnel     : ${fmtNum(ctx.cashflow.netForecast)}

DÉPENSES PAR CATÉGORIE (année)
${catLines}

TOP FOURNISSEURS (année)
${vendorLines}

SCORE DE SANTÉ : ${ctx.healthScore}/100 — ${scoreLabel}
ALERTES OUVERTES : ${ctx.alerts.count}${ctx.alerts.count > 0 ? ' (' + ctx.alerts.types.join(', ') + ')' : ''}`;
}

/**
 * Point d'entrée principal.
 * @param {string} userId - Clerk user ID
 * @param {Array}  messages - [{role:'user'|'assistant', content:string}]
 */
async function chat(userId, messages) {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw Object.assign(new Error('Assistant IA non configuré.'), { status: 503 });
  }

  const ctx = await buildContext(userId);
  if (!ctx) throw Object.assign(new Error('Organisation introuvable.'), { status: 404 });

  const systemPrompt = buildSystemPrompt(ctx);

  // Garde-fous : max 10 échanges historique, messages bien formés
  const safeMessages = messages
    .filter(m => m.role && m.content && typeof m.content === 'string')
    .slice(-10)
    .map(m => ({ role: m.role, content: m.content.slice(0, 4000) }));

  let response;
  try {
    response = await getClient().messages.create({
      model:      'claude-haiku-4-5-20251001', // rapide + économique
      max_tokens: 900,
      system:     systemPrompt,
      messages:   safeMessages,
    });
  } catch (err) {
    // Reset client si la clé est invalide (force re-init au prochain appel)
    if (err.status === 401) {
      _client = null;
      throw Object.assign(new Error('Clé API invalide. Vérifiez la variable ANTHROPIC_API_KEY.'), { status: 503, code: 'ASSISTANT_INVALID_KEY' });
    }
    if (err.status === 400 && err.message?.includes('credit')) {
      throw Object.assign(new Error('Crédits IA épuisés. Rechargez le compte Anthropic.'), { status: 402, code: 'ASSISTANT_NO_CREDITS' });
    }
    if (err.status === 529 || err.status === 503 || err.status === 502) {
      throw Object.assign(new Error('L\'IA est temporairement indisponible. Réessayez dans quelques instants.'), { status: 503, code: 'ASSISTANT_UNAVAILABLE' });
    }
    // Autres erreurs Anthropic
    throw Object.assign(new Error('Erreur du provider IA.'), { status: 500, code: 'ASSISTANT_ERROR' });
  }

  return response.content[0]?.text || 'Réponse vide.';
}

module.exports = { chat, buildContext, computeHealthScore };
