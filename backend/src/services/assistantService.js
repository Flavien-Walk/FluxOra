/**
 * assistantService.js — Agent métier Fluxora
 * Stratégie :
 *  - Intents CRUD + recherche → réponse déterministe avec objectCards/sections/modales
 *  - Intents analyse → appel Claude Haiku avec contexte financier compact
 *  - 0 exécution silencieuse — chaque action passe par validation utilisateur
 */
const Anthropic    = require('@anthropic-ai/sdk');
const Organization = require('../models/Organization');
const Client       = require('../models/Client');
const Invoice      = require('../models/Invoice');
const Expense      = require('../models/Expense');
const Quote        = require('../models/Quote');
const Transfer     = require('../models/Transfer');
const Alert        = require('../models/Alert');
const {
  escapeRegex, extractAmount, extractAllAmounts, extractVendorName,
  findInvoicesByAmount, findExpensesByVendorOrAmount,
  findClientHistory, checkRecentDraft,
  invoicesToObjectCards, quotesToObjectCards, expensesToObjectCards,
} = require('./assistantSearch');

/* ── Anthropic client (lazy) ────────────────────────────────── */
let _anthropic = null;
const getAI = () => {
  if (!_anthropic) _anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return _anthropic;
};

/* ── Score de santé financière ──────────────────────────────── */
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

/* ── Extraction du nom de client depuis message français ─────── */
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
      const name = match[1].trim();
      if (name.length >= 2 && !stopWords.has(name.toLowerCase())) return name;
    }
  }
  return null;
}

async function findClientByName(orgId, name) {
  if (!name) return null;
  const safe = escapeRegex(name);
  return (
    await Client.findOne({ organizationId: orgId, name: { $regex: `^${safe}$`, $options: 'i' } }).lean() ||
    await Client.findOne({ organizationId: orgId, name: { $regex: safe, $options: 'i' } }).lean()
  );
}

/* ── Détection d'intention (0 token IA) ─────────────────────── */
function detectIntent(msg) {
  const m = (msg || '').toLowerCase();
  if (/\b(crée|créer|nouvelle?|générer?|faire|fais|fait)\b.*\bfacture|\bfacture\b.*\b(créer|nouveau|faire)\b/.test(m))    return 'create_invoice';
  if (/\b(crée|créer|nouvelle?|générer?|faire|fais|fait)\b.*\bdevis|\bdevis\b.*\b(créer|nouveau|faire)\b/.test(m))        return 'create_quote';
  if (/\b(retrouve|cherche|trouve|identifie)\b.*\bfacture|\bfacture\b.*\b(retrouve|cherche|trouve)\b|\bj.ai reçu\b/.test(m)) return 'find_invoice';
  if (/\bpaiement partiel|payé\b.*\bsur\b|\bacompte|seulement\b.*\b(?:€|euros?)/.test(m))                               return 'reconcile_payment';
  if (/\bc.est quoi\b.*(?:€|euros?)|(?:virement|débit|prélèvement)\b.*\bde\b.*(?:€|euros?)|\bidentifie\b.*\bdépense/.test(m)) return 'find_expense';
  if (/\b(requalifie|corriger?|changer?)\b.*\b(catégorie|dépense)|catégorie\b.*\b(incorrecte|fausse|à corriger)/.test(m)) return 'expense_reclass';
  if (/\bhistorique\b.*\bclient|tout ce que\b.*\bdoit|\brelation client\b/.test(m))                                       return 'analyze_client';
  if (/\bvirement|virer|payer\b.*\bfournisseur|\bfournisseur\b.*\bpayer/.test(m))                                         return 'prepare_transfer';
  if (/\brelance|relanc|rappel|impayé/.test(m))                                                                           return 'send_reminder';
  if (/\btrésorerie|treso|cashflow|cash.flow|liquidité|30.?jour/.test(m))                                                 return 'analyze_cashflow';
  if (/\bdépense|note.de.frais|coût/.test(m))                                                                             return 'analyze_expenses';
  if (/\bfournisseur|vendor|prestataire/.test(m))                                                                         return 'analyze_vendors';
  if (/\bsanté|health|score/.test(m))                                                                                     return 'health_score';
  if (/\bbudget|répartit|allocation/.test(m))                                                                             return 'adjust_budget';
  if (/\bclient/.test(m))                                                                                                  return 'show_clients';
  return 'general_analysis';
}

const DETERMINISTIC_INTENTS = new Set([
  'create_invoice', 'create_quote', 'send_reminder', 'prepare_transfer', 'show_clients',
  'find_invoice', 'reconcile_payment', 'find_expense', 'expense_reclass', 'analyze_client',
]);

/* ── Contexte financier (10 agrégations parallèles) ─────────── */
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

  const [monthRevData, prevMonthRevData, pendingData, lateData, monthExpData,
    expByCat, topVendors, pendingInvoices, alerts, transfersMonth] = await Promise.all([
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

/* ── System prompt Claude ────────────────────────────────────── */
function buildSystemPrompt(ctx) {
  const c   = ctx.org.currency;
  const fmt = (n) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: c }).format(n ?? 0);
  const pct = (n) => n != null ? `${n > 0 ? '+' : ''}${n}%` : 'N/A';
  const cats = ctx.expenses.byCategory.map(e => `  • ${e.cat}: ${fmt(e.total)} (${e.n} op.)`).join('\n') || '  Aucune donnée';
  const vend = ctx.expenses.topVendors.map(v => `  • ${v.vendor}: ${fmt(v.total)}`).join('\n') || '  Aucun';
  const lbl  = ctx.healthScore >= 75 ? 'Bonne santé' : ctx.healthScore >= 55 ? 'Correcte' : ctx.healthScore >= 35 ? 'Vigilance' : 'Dégradée';

  return `Tu es Fluxora Assistant, copilote financier IA pour PME/freelances.
Réponds TOUJOURS en français, structuré et orienté action.
Format : résumé (1-2 phrases) → constats clés → recommandation prioritaire.
N'indique PAS que des boutons ont été préparés dans l'interface.
Ne bloque JAMAIS sur des informations manquantes — propose une action même partielle.

═══ CONTEXTE « ${ctx.org.name} » (${ctx.date}) ═══
CA ce mois : ${fmt(ctx.revenue.thisMonth)} (préc. ${fmt(ctx.revenue.prevMonth)}, tendance ${pct(ctx.revenue.trend)})
Dépenses   : ${fmt(ctx.expenses.thisMonth)} | Cash-flow net : ${fmt(ctx.cashflow.netMonth)}
Créances   : ${fmt(ctx.cashflow.pending)} en attente, ${fmt(ctx.cashflow.late)} en retard (${ctx.cashflow.lateCount} fact.)
Prévision 30j : +${fmt(ctx.cashflow.expectedIn)} / -${fmt(ctx.cashflow.estimatedOut)} = ${fmt(ctx.cashflow.netForecast)}
Dépenses/catégorie :\n${cats}
Top fournisseurs :\n${vend}
Score santé : ${ctx.healthScore}/100 — ${lbl} | Alertes : ${ctx.alerts.count}`;
}

/* ── Constructeur de réponse enrichie ───────────────────────── */
async function buildRichResponse(intent, entityCtx, entityCard, searchResult, ctx) {
  const currency = ctx.org.currency || 'EUR';
  const fmt = (n) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency }).format(n || 0);
  const late = ctx.cashflow.lateCount;

  /* ── create_quote / create_invoice ──────────────────────── */
  if (intent === 'create_quote' || intent === 'create_invoice') {
    const isQuote = intent === 'create_quote';
    const label = isQuote ? 'devis' : 'facture';

    if (!entityCtx?.clientName) {
      return {
        reply: `Pour créer un ${label}, précisez le nom du client.\n\nExemple : *Crée un ${label} pour Sophie Martin*`,
        intent, actions: [
          { id: 'open_create_modal', label: `Créer un ${label} maintenant`, type: 'open_modal', style: 'primary', icon: 'plus',
            modal: { type: isQuote ? 'create_quote' : 'create_invoice', title: isQuote ? 'Créer un devis' : 'Créer une facture',
              missingFields: ['Client', 'Prestations', isQuote ? 'Date de validité' : 'Date d\'échéance'],
              payload: { initialValues: {} }, requiresConfirmation: true } },
          { id: 'go_clients', label: 'Voir les clients', type: 'redirect', path: '/clients', style: 'secondary', icon: 'users' },
        ],
        journalEntry: { type: 'info', label: `Création ${label} — client non précisé`, status: 'info' },
      };
    }

    const { clientName, clientFound, clientId, duplicateWarning, duplicateId, duplicateNumber } = entityCtx;
    const actions = [];

    if (duplicateWarning) {
      return {
        reply: `⚠️ Un brouillon de ${label} existe déjà pour **${clientName}** (**${duplicateNumber}**), créé récemment.\n\nSouhaitez-vous l'ouvrir ou créer un nouveau ${label} ?`,
        intent,
        entityCard,
        actions: [
          { id: 'open_existing', label: `Ouvrir ${duplicateNumber}`, type: 'redirect', path: `/${isQuote ? 'quotes' : 'invoices'}/${duplicateId}`, style: 'primary', icon: 'list' },
          { id: 'create_anyway', label: `Créer un nouveau ${label}`, type: 'action', actionType: clientFound ? (isQuote ? 'create_draft_quote' : 'create_draft_invoice') : (isQuote ? 'create_client_then_draft_quote' : 'create_client_then_draft_invoice'), payload: clientFound ? { clientId, clientName } : { clientName }, style: 'secondary', icon: 'plus' },
        ],
        confidence: { score: 0.9, label: 'Élevée' },
        journalEntry: { type: 'warning', label: `Doublon détecté — ${label} ${duplicateNumber}`, status: 'warning' },
      };
    }

    if (clientFound) {
      actions.push({ id: 'confirm_draft', label: `Créer le brouillon de ${label}`, type: 'action', actionType: isQuote ? 'create_draft_quote' : 'create_draft_invoice', payload: { clientId, clientName }, style: 'primary', icon: 'plus' });
      actions.push({ id: `go_${isQuote ? 'quotes' : 'invoices'}`, label: `Voir les ${label}s`, type: 'redirect', path: `/${isQuote ? 'quotes' : 'invoices'}`, style: 'secondary', icon: 'list' });
    } else {
      actions.push({ id: 'create_client_then', label: `Créer ${clientName} puis le ${label}`, type: 'action', actionType: isQuote ? 'create_client_then_draft_quote' : 'create_client_then_draft_invoice', payload: { clientName }, style: 'primary', icon: 'plus' });
      actions.push({ id: 'create_client_modal', label: 'Créer le client manuellement', type: 'open_modal', style: 'secondary', icon: 'user',
        modal: { type: 'create_client', title: 'Créer le client', confirmedFields: [`Nom détecté : ${clientName}`], missingFields: ['Email', 'Société (optionnel)'],
          payload: { initialValues: { name: clientName }, nextModal: { type: isQuote ? 'create_quote' : 'create_invoice', title: isQuote ? 'Créer un devis' : 'Créer une facture', payload: { initialValues: {} } } }, requiresConfirmation: true } });
    }

    return {
      reply: clientFound
        ? `**${clientName}** est dans vos clients.\n\nJe peux préparer le brouillon immédiatement — vous ajouterez les lignes et le montant sur la page ${label}.`
        : `**${clientName}** n'est pas encore dans vos clients.\n\nJe peux créer le client et préparer le brouillon de ${label} en une seule étape, ou vous pouvez renseigner ses informations complètes manuellement.`,
      intent, entityCard, actions,
      confidence: { score: clientFound ? 0.9 : 0.75, label: clientFound ? 'Élevée' : 'Moyenne' },
      journalEntry: { type: 'crud', label: `${isQuote ? 'Devis' : 'Facture'} — ${clientName} ${clientFound ? 'trouvé' : 'à créer'}`, status: clientFound ? 'ready' : 'info' },
    };
  }

  /* ── find_invoice ─────────────────────────────────────────── */
  if (intent === 'find_invoice') {
    const amounts = searchResult?.amounts || [];
    const invoices = searchResult?.invoices || [];
    if (!amounts.length) {
      return {
        reply: 'Pour retrouver une facture, précisez le montant reçu.\n\nExemple : *J\'ai reçu 4 200 €, retrouve la facture*',
        intent, actions: [{ id: 'go_invoices', label: 'Voir les factures', type: 'redirect', path: '/invoices', style: 'primary', icon: 'list' }],
      };
    }
    const amount = amounts[0];
    if (!invoices.length) {
      return {
        reply: `Aucune facture trouvée pour **${fmt(amount)}** (± 10 %).\n\nVérifiez le montant ou consultez la liste complète.`,
        intent, confidence: { score: 0.1, label: 'Faible' },
        actions: [{ id: 'go_invoices', label: 'Voir toutes les factures', type: 'redirect', path: '/invoices', style: 'primary', icon: 'list' }],
        journalEntry: { type: 'search', label: `Recherche ${fmt(amount)} — aucun résultat`, status: 'warning' },
      };
    }
    const top = invoices[0];
    const clientName = top.clientId?.name || 'Client inconnu';
    const confidence = invoices.length === 1 ? { score: 0.85, label: 'Élevée' } : { score: 0.55, label: 'Moyenne' };
    const objectCards = invoicesToObjectCards(invoices, currency);
    const certain  = invoices.length === 1 ? [`Facture ${top.number} — ${clientName} — ${fmt(top.total)}`] : [];
    const probable = invoices.length > 1  ? invoices.map(i => `Facture ${i.number} — ${i.clientId?.name || '?'} — ${fmt(i.total)}`) : [];
    const missing  = invoices.length > 1  ? ['Confirmation du client ou de la référence exacte'] : ['Source du paiement à confirmer manuellement'];
    const actions = [];
    if (invoices.length === 1) {
      actions.push({ id: 'manual_match', label: 'Rapprocher manuellement', type: 'open_modal', style: 'primary', icon: 'link',
        modal: { type: 'manual_match', title: 'Contrôle de rapprochement',
          description: `Vérifiez si ce paiement de ${fmt(amount)} correspond à cette facture.`,
          confirmedFields: [`Montant reçu : ${fmt(amount)}`], missingFields: ['Confirmation de la source'],
          payload: { payment: { amount: fmt(amount), reference: `Reçu le ${new Date().toLocaleDateString('fr-FR')}` }, invoice: { number: top.number, client: clientName, amount: fmt(top.total) } }, requiresConfirmation: true } });
      actions.push({ id: 'go_invoice', label: 'Voir la facture', type: 'redirect', path: `/invoices/${top._id}`, style: 'secondary', icon: 'list' });
    } else {
      actions.push({ id: 'go_invoices', label: 'Filtrer les factures', type: 'redirect', path: '/invoices', style: 'primary', icon: 'list' });
    }
    return {
      reply: invoices.length === 1
        ? `J'ai trouvé **une facture** correspondant à ${fmt(amount)} :`
        : `J'ai trouvé **${invoices.length} factures** potentielles pour ${fmt(amount)} :`,
      intent, objectCards, sections: { certain, probable, missing }, confidence, actions,
      journalEntry: { type: 'search', label: `Recherche ${fmt(amount)} — ${invoices.length} résultat(s)`, status: 'success' },
    };
  }

  /* ── reconcile_payment ────────────────────────────────────── */
  if (intent === 'reconcile_payment') {
    const amounts = searchResult?.amounts || [];
    const invoices = searchResult?.invoices || [];
    if (amounts.length < 2) {
      return {
        reply: 'Précisez le montant payé et le montant total de la facture.\n\nExemple : *Le client a payé 1 200 € sur 1 800 €*',
        intent, actions: [{ id: 'go_invoices', label: 'Voir les factures', type: 'redirect', path: '/invoices', style: 'primary', icon: 'list' }],
      };
    }
    const [paid, total] = amounts;
    const balance = Math.round((total - paid) * 100) / 100;
    const objectCards = invoicesToObjectCards(invoices, currency);
    const top = invoices[0];
    return {
      reply: `Paiement partiel détecté : **${fmt(paid)}** reçus sur **${fmt(total)}**.\n\nSolde restant : **${fmt(balance)}**.\n\n${invoices.length ? 'Voici la facture candidate :' : 'Aucune facture correspondante trouvée dans Fluxora.'}`,
      intent, objectCards,
      sections: {
        certain: [`Montant reçu : ${fmt(paid)}`, `Solde restant : ${fmt(balance)}`],
        probable: top ? [`Facture ${top.number} — ${top.clientId?.name || '?'} — ${fmt(top.total)}`] : [],
        missing: ['Confirmation que cette facture correspond au paiement', 'Enregistrement manuel du paiement partiel dans Fluxora'],
      },
      confidence: { score: top ? 0.65 : 0.2, label: top ? 'Moyenne' : 'Faible' },
      actions: top
        ? [{ id: 'go_invoice', label: 'Voir la facture candidate', type: 'redirect', path: `/invoices/${top._id}`, style: 'primary', icon: 'list' },
           { id: 'go_invoices', label: 'Toutes les factures', type: 'redirect', path: '/invoices', style: 'secondary', icon: 'list' }]
        : [{ id: 'go_invoices', label: 'Voir les factures', type: 'redirect', path: '/invoices', style: 'primary', icon: 'list' }],
      journalEntry: { type: 'search', label: `Rapprochement partiel ${fmt(paid)}/${fmt(total)}`, status: 'warning' },
    };
  }

  /* ── find_expense / expense_reclass ──────────────────────── */
  if (intent === 'find_expense' || intent === 'expense_reclass') {
    const expenses = searchResult?.expenses || [];
    const vendor   = searchResult?.vendor;
    const amount   = searchResult?.amount;
    if (!expenses.length) {
      return {
        reply: `Aucune dépense trouvée${vendor ? ` chez **${vendor}**` : ''}${amount ? ` pour **${fmt(amount)}**` : ''}.\n\nConsultez la liste des dépenses pour retrouver l'élément manuellement.`,
        intent, actions: [{ id: 'go_expenses', label: 'Voir les dépenses', type: 'redirect', path: '/expenses', style: 'primary', icon: 'chart' }],
      };
    }
    const top = expenses[0];
    const objectCards = expensesToObjectCards(expenses, currency);
    const isPendingReview = top.status === 'pending_review';
    const suggestedCat = vendor?.toLowerCase().includes('stripe') || vendor?.toLowerCase().includes('saas') ? 'software' : top.category;
    const actions = [];
    if (isPendingReview || intent === 'expense_reclass') {
      actions.push({ id: 'reclass_expense', label: 'Corriger la catégorie', type: 'open_modal', style: 'primary', icon: 'edit',
        modal: { type: 'expense_reclass', title: 'Corriger la dépense',
          description: `Vérifiez et corrigez la catégorie de cette dépense ${vendor ? `chez ${vendor}` : ''}.`,
          confirmedFields: [`Dépense : ${top.description || top.vendor || 'Inconnu'} — ${fmt(top.amount)}`],
          missingFields: ['Catégorie correcte', 'Notes éventuelles'],
          payload: { expense: { _id: top._id.toString(), description: top.description, vendor: top.vendor, amount: top.amount, category: top.category, notes: top.notes || '' }, suggestedCategory: suggestedCat },
          requiresConfirmation: true } });
    }
    actions.push({ id: 'go_expenses', label: 'Voir les dépenses', type: 'redirect', path: '/expenses', style: isPendingReview ? 'secondary' : 'primary', icon: 'chart' });

    return {
      reply: isPendingReview
        ? `Cette dépense${vendor ? ` **${vendor}**` : ''} de **${fmt(top.amount)}** est en attente de requalification. Catégorie actuelle : **${top.category || 'non définie'}**.\n\nJe peux vous aider à la corriger.`
        : `Dépense${vendor ? ` **${vendor}**` : ''} de **${fmt(top.amount)}** trouvée — catégorie : **${top.category || 'non définie'}**.\n\n${expenses.length > 1 ? `${expenses.length} dépenses similaires trouvées.` : ''}`,
      intent, objectCards,
      sections: {
        certain: [`Dépense : ${top.description || top.vendor || 'Inconnu'} — ${fmt(top.amount)}`],
        probable: expenses.length > 1 ? expenses.slice(1).map(e => `${e.description || e.vendor} — ${fmt(e.amount)}`) : [],
        missing: isPendingReview ? ['Catégorie correcte à valider'] : [],
      },
      confidence: { score: expenses.length === 1 ? 0.8 : 0.6, label: expenses.length === 1 ? 'Élevée' : 'Moyenne' },
      actions,
      journalEntry: { type: 'search', label: `Dépense${vendor ? ` ${vendor}` : ''} ${fmt(top.amount)} — ${isPendingReview ? 'à requalifier' : 'trouvée'}`, status: isPendingReview ? 'warning' : 'success' },
    };
  }

  /* ── analyze_client ──────────────────────────────────────── */
  if (intent === 'analyze_client') {
    const { client, history } = searchResult || {};
    if (!client) {
      return {
        reply: 'Précisez le nom du client pour afficher son historique.\n\nExemple : *Montre l\'historique de Kevin Tran*',
        intent, actions: [{ id: 'go_clients', label: 'Voir les clients', type: 'redirect', path: '/clients', style: 'primary', icon: 'users' }],
      };
    }
    const invoices = history?.invoices || [];
    const quotes   = history?.quotes   || [];
    const totalInvoiced = invoices.reduce((s, i) => s + (i.total || 0), 0);
    const totalPaid     = invoices.filter(i => i.status === 'paid').reduce((s, i) => s + (i.total || 0), 0);
    const lateInv = invoices.filter(i => i.status === 'late');
    const objectCards = [...invoicesToObjectCards(invoices, currency), ...quotesToObjectCards(quotes, currency)];

    return {
      reply: `Historique de **${client.name}** :\n\n**${invoices.length} facture(s)** émise(s) — ${fmt(totalInvoiced)} total, ${fmt(totalPaid)} encaissé.\n**${quotes.length} devis** émis.${lateInv.length ? `\n\n⚠️ ${lateInv.length} facture(s) en retard.` : ''}`,
      intent, objectCards,
      sections: {
        certain: [`Facturé total : ${fmt(totalInvoiced)}`, `Encaissé : ${fmt(totalPaid)}`],
        probable: lateInv.length ? [`${lateInv.length} facture(s) en retard à relancer`] : [],
        missing: invoices.length === 0 ? ['Aucune facture émise pour ce client'] : [],
      },
      confidence: { score: 0.95, label: 'Élevée' },
      actions: [
        { id: 'go_client', label: 'Fiche client', type: 'redirect', path: `/clients/${client._id}`, style: 'primary', icon: 'users' },
        { id: 'create_invoice', label: 'Créer une facture', type: 'open_modal', style: 'secondary', icon: 'plus',
          modal: { type: 'create_invoice', title: 'Créer une facture', confirmedFields: [`Client : ${client.name}`],
            missingFields: ['Prestations', 'Date d\'échéance'], payload: { initialValues: { clientId: client._id.toString() }, client: { id: client._id.toString(), name: client.name } }, requiresConfirmation: true } },
      ],
      journalEntry: { type: 'info', label: `Historique ${client.name} — ${invoices.length} fact.`, status: 'info' },
    };
  }

  /* ── send_reminder ───────────────────────────────────────── */
  if (intent === 'send_reminder') {
    return {
      reply: late > 0
        ? `Vous avez **${late} facture(s) en retard** à relancer. Accédez à la liste pour envoyer les relances directement depuis chaque facture.`
        : 'Aucune facture en retard. Vos créances sont à jour.',
      intent,
      actions: late > 0
        ? [{ id: 'late_inv', label: `${late} facture(s) en retard`, type: 'redirect', path: '/invoices?filter=late', style: 'warning', icon: 'alert' },
           { id: 'all_inv', label: 'Toutes les factures', type: 'redirect', path: '/invoices', style: 'secondary', icon: 'list' }]
        : [{ id: 'all_inv', label: 'Voir les factures', type: 'redirect', path: '/invoices', style: 'primary', icon: 'list' }],
    };
  }

  /* ── prepare_transfer ────────────────────────────────────── */
  if (intent === 'prepare_transfer') {
    return {
      reply: 'Je peux préparer un virement depuis Fluxora. Rendez-vous dans Virements pour configurer le bénéficiaire, le montant et la date d\'exécution.',
      intent,
      actions: [
        { id: 'go_transfers', label: 'Aller aux virements', type: 'redirect', path: '/transfers', style: 'primary', icon: 'send' },
        { id: 'go_expenses', label: 'Voir les dépenses', type: 'redirect', path: '/expenses', style: 'secondary', icon: 'chart' },
      ],
    };
  }

  /* ── show_clients ────────────────────────────────────────── */
  return {
    reply: 'Voici l\'accès à votre base clients. Vous pouvez rechercher, créer ou modifier vos contacts depuis cette page.',
    intent,
    actions: [
      { id: 'go_clients', label: 'Voir les clients', type: 'redirect', path: '/clients', style: 'primary', icon: 'users' },
      { id: 'new_client', label: 'Créer un client', type: 'open_modal', style: 'secondary', icon: 'plus',
        modal: { type: 'create_client', title: 'Créer un client', missingFields: ['Nom', 'Email'], payload: { initialValues: {} }, requiresConfirmation: true } },
    ],
  };
}

/* ── Suggestions dynamiques ──────────────────────────────────── */
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
  if (lateCount > 0)    list.push({ text: `Relancer mes ${lateCount} facture(s) en retard`, badge: lateCount, badgeStyle: 'warning' });
  if (alertCount > 0)   list.push({ text: `Analyser mes ${alertCount} alerte(s) comptable(s)`, badge: alertCount, badgeStyle: 'danger' });
  if (pendingCount > 0) list.push({ text: `Anticiper mes ${pendingCount} encaissement(s) à venir`, badge: pendingCount, badgeStyle: 'info' });
  if (quoteData > 0)    list.push({ text: `Suivre mes ${quoteData} devis envoyé(s)`, badge: quoteData, badgeStyle: 'info' });
  list.push({ text: 'Anticipe ma trésorerie sur 30 jours' });
  list.push({ text: 'Quel est mon score de santé financière ?' });
  list.push({ text: 'Analyse mes dépenses du mois' });
  list.push({ text: 'Quels fournisseurs me coûtent le plus cher ?' });
  return list.slice(0, 6);
}

/* ── Clients récents pour le sélecteur du hub ───────────────── */
async function getRecentClients(userId) {
  const org = await Organization.findOne({
    $or: [{ clerkOwnerId: userId }, { 'members.clerkUserId': userId }],
  }).lean();
  if (!org) return [];
  return Client.find({ organizationId: org._id }).sort({ updatedAt: -1 }).limit(8).select('name email company').lean();
}

/* ── Point d'entrée CHAT ─────────────────────────────────────── */
async function chat(userId, messages) {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw Object.assign(new Error('Assistant IA non configuré.'), { status: 503, code: 'ASSISTANT_INVALID_KEY' });
  }
  const ctx = await buildContext(userId);
  if (!ctx) throw Object.assign(new Error('Organisation introuvable.'), { status: 404 });

  const lastMsg = messages.filter(m => m.role === 'user').slice(-1)[0]?.content || '';
  const intent  = detectIntent(lastMsg);

  /* ── Phase 1 : résolution d'entité (CRUD) ──────────────── */
  let entityCtx  = null;
  let entityCard = null;
  if (['create_quote', 'create_invoice'].includes(intent)) {
    const name = extractEntityName(lastMsg);
    if (name) {
      const found = await findClientByName(ctx.orgObjectId, name);
      entityCtx = { clientName: name, clientFound: !!found, clientId: found?._id?.toString() };
      entityCard = { entityType: 'client', found: !!found, name, id: found?._id?.toString(), detail: found ? 'Client enregistré dans Fluxora' : null };
      if (found) {
        const type = intent === 'create_quote' ? 'quote' : 'invoice';
        const dup = await checkRecentDraft(ctx.orgObjectId, found._id, type);
        if (dup) { entityCtx.duplicateWarning = true; entityCtx.duplicateId = dup._id.toString(); entityCtx.duplicateNumber = dup.number; }
      }
    }
  }

  /* ── Phase 2 : recherche avancée (nouveaux intents) ──────── */
  let searchResult = null;
  if (intent === 'find_invoice' || intent === 'reconcile_payment') {
    const amounts = extractAllAmounts(lastMsg);
    if (amounts.length) {
      const invoices = await findInvoicesByAmount(ctx.orgObjectId, amounts[0]);
      searchResult = { invoices, amounts };
    }
  } else if (intent === 'find_expense' || intent === 'expense_reclass') {
    const vendor  = extractVendorName(lastMsg);
    const amount  = extractAmount(lastMsg);
    const expenses = await findExpensesByVendorOrAmount(ctx.orgObjectId, vendor, amount);
    searchResult = { expenses, vendor, amount };
  } else if (intent === 'analyze_client') {
    const name = extractEntityName(lastMsg);
    if (name) {
      const client = await findClientByName(ctx.orgObjectId, name);
      if (client) {
        const history = await findClientHistory(ctx.orgObjectId, client._id);
        searchResult = { client, history };
      }
    }
  }

  /* ── Phase 3 : réponse déterministe ─────────────────────── */
  if (DETERMINISTIC_INTENTS.has(intent)) {
    return buildRichResponse(intent, entityCtx, entityCard, searchResult, ctx);
  }

  /* ── Phase 4 : appel Claude (intents analyse) ────────────── */
  const safeMessages = messages
    .filter(m => m.role && m.content && typeof m.content === 'string')
    .slice(-10)
    .map(m => ({ role: m.role, content: m.content.slice(0, 4000) }));

  let reply;
  try {
    const response = await getAI().messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 900,
      system: buildSystemPrompt(ctx),
      messages: safeMessages,
    });
    reply = response.content[0]?.text || 'Réponse vide.';
  } catch (err) {
    _anthropic = null;
    if (err.status === 401)                                           throw Object.assign(new Error('Clé API invalide.'), { status: 503, code: 'ASSISTANT_INVALID_KEY' });
    if (err.status === 400 && err.message?.includes('credit'))        throw Object.assign(new Error('Crédits IA épuisés.'), { status: 402, code: 'ASSISTANT_NO_CREDITS' });
    if (err.status >= 500)                                            throw Object.assign(new Error("L'IA est temporairement indisponible."), { status: 503, code: 'ASSISTANT_UNAVAILABLE' });
    throw Object.assign(new Error('Erreur du provider IA.'), { status: 500, code: 'ASSISTANT_ERROR' });
  }

  /* ── Actions pour intents d'analyse ─────────────────────── */
  const late = ctx.cashflow.lateCount;
  const alertCount = ctx.alerts.count;
  let actions = [];
  if (intent === 'analyze_cashflow') {
    actions = [
      { id: 'pending_inv', label: 'Factures en attente', type: 'redirect', path: '/invoices?filter=sent', style: 'primary', icon: 'list' },
      ...(late > 0 ? [{ id: 'late_inv', label: `${late} retard(s) à relancer`, type: 'redirect', path: '/invoices?filter=late', style: 'warning', icon: 'alert' }] : []),
    ];
  } else if (intent === 'analyze_expenses') {
    actions = [
      { id: 'go_exp', label: 'Analyser les dépenses', type: 'redirect', path: '/expenses', style: 'primary', icon: 'chart' },
      { id: 'go_account', label: 'Tableau comptable', type: 'redirect', path: '/accounting', style: 'secondary', icon: 'book' },
    ];
  } else if (intent === 'health_score') {
    actions = [
      ...(alertCount > 0 ? [{ id: 'go_alerts', label: `${alertCount} alerte(s) à traiter`, type: 'redirect', path: '/accounting', style: 'danger', icon: 'bell' }] : []),
      ...(late > 0 ? [{ id: 'late_inv', label: `Relancer ${late} retard(s)`, type: 'redirect', path: '/invoices?filter=late', style: 'warning', icon: 'alert' }] : []),
      { id: 'dashboard', label: 'Tableau de bord', type: 'redirect', path: '/dashboard', style: 'secondary', icon: 'home' },
    ];
  } else {
    actions = [
      { id: 'dashboard', label: 'Tableau de bord', type: 'redirect', path: '/dashboard', style: 'secondary', icon: 'home' },
    ];
  }

  return { reply, intent, actions };
}

module.exports = { chat, getSuggestions, getRecentClients, buildContext, computeHealthScore, buildSystemPrompt };
