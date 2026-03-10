/**
 * agentOrchestrator.js
 * Orchestrateur multi-agents Fluxora.
 * Utilise l'API tool_use d'Anthropic pour un raisonnement agentique réel.
 *
 * Flux de création :
 *  1. Agent appelle search_clients → client trouvé ou non
 *  2. Agent appelle prepare_workflow → stocke données en mémoire
 *  3. Agent renvoie résumé court + bouton "Confirmer et créer"
 *  4a. Utilisateur clique le bouton → POST /api/assistant/action (confirm_agent_workflow)
 *  4b. Utilisateur tape "oui" / "valide" → runAgent détecte + exécute le workflow directement
 */

const Anthropic    = require('@anthropic-ai/sdk');
const Organization = require('../models/Organization');
const { TOOL_DEFINITIONS, executeTool, summarizeResult } = require('./toolRegistry');
const { getMemory, patchMemory, buildMemoryBlock, getPendingWorkflow, clearPendingWorkflow } = require('./agentMemory');
const { buildContext, buildSystemPrompt, chat: deterministicChat } = require('../services/assistantService');

let _anthropic = null;
const getAI = () => {
  if (!_anthropic) _anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return _anthropic;
};

const MAX_ITERATIONS = 5;

/* ── Détection de message de validation utilisateur ─────────── */
const CONFIRMATION_RE = /^(oui\b|yes\b|ok\b|valide?[sz]?\b|vas-y\b|allez\b|go\b|confirme?[sz]?\b|c['']est\s+bon\b|parfait\b|bonne\s+id[ée]e\b|exactement\b|d['']accord\b|continuer?\b|ex[ée]cute?[sz]?\b|cr[ée][ée][sz]?\b|fais.le\b|allons-y\b|proceed\b|ça\s+marche\b|génial\b|super\b|top\b|impeccable\b|nickel\b)/i;

function isConfirmationMessage(text) {
  return CONFIRMATION_RE.test((text || '').trim());
}

/* ── System prompt agent ─────────────────────────────────────── */
function buildAgentSystemPrompt(ctx, userId) {
  const base     = buildSystemPrompt(ctx);
  const memBlock = buildMemoryBlock(userId);

  return `${base}${memBlock}

RÔLE AGENT :
Tu es un agent IA autonome avec accès à des outils Fluxora en temps réel.
Stratégie : utilise les outils pour collecter des données, puis formule une réponse précise et orientée action.

RÈGLES ABSOLUES :
- TOUJOURS appeler search_clients avant de proposer un devis/facture pour un client nommé
- NE JAMAIS inventer des données ou supposer qu'un client/document existe sans l'avoir cherché
- NE JAMAIS exécuter silencieusement une création — tout passe par validation utilisateur
- Distingue toujours ce qui est CERTAIN (trouvé en DB) de ce qui est PROBABLE (déduit)

RÈGLE CRÉATION DEVIS / FACTURE :
Quand l'utilisateur demande la création d'un document :
1. Appelle search_clients pour vérifier si le client existe (obligatoire)
2. Extrait TOUTES les données disponibles dans le message :
   - nom client, email, téléphone, société
   - description de la prestation, montant HT, taux TVA (défaut 20%)
3. Appelle prepare_workflow avec toutes ces données (même si certains champs optionnels manquent)
4. Termine par une réponse courte (2-3 phrases) qui résume ce qui va être créé
   NE demande PAS de confirmation textuelle — le bouton d'interface gère ça
5. Si des données critiques manquent (montant, description), pose UNE seule question précise
   avant d'appeler prepare_workflow

FORMAT DE RÉPONSE :
- Réponds en français, concis, orienté action
- Structure : résumé (1-2 phrases) → ce que tu as trouvé/déduit → action recommandée
- N'indique PAS que des boutons ou modales ont été préparés dans l'interface`;
}

/* ── Exécution directe d'un workflow confirmé ───────────────── */
async function executePendingWorkflow(userId, orgId, workflow) {
  const { executeAction } = require('../services/assistantActionService');

  const result = await executeAction(userId, 'confirm_agent_workflow', { workflow });

  const docType  = workflow.type === 'create_invoice' ? 'facture' : 'devis';
  const docNum   = result.number || '';
  const clientMsg = result.clientCreated
    ? `Le client **${workflow.client.name}** a été créé et le ${docType} **${docNum}** est prêt.`
    : `Le ${docType} **${docNum}** a été créé pour **${workflow.client.name}**.`;

  const path = result.redirectTo || (workflow.type === 'create_invoice' ? '/invoices' : '/quotes');

  return {
    reply: clientMsg,
    intent: 'workflow_executed',
    actions: [
      { id: 'open_doc', label: `Ouvrir le ${docType}`, type: 'redirect', path, style: 'primary', icon: 'list' },
    ],
    objectCards: undefined,
    confidence: { score: 1.0, label: 'Élevée' },
    agentLog: [],
    journalEntry: {
      type:   'workflow_executed',
      label:  result.clientCreated ? `Client + ${docType} créé` : `${docType} créé`,
      status: 'success',
      at:     new Date().toISOString(),
    },
    contextPatch: getMemory(userId),
  };
}

/* ── Boucle agentique ────────────────────────────────────────── */
async function runAgentLoop(userId, orgId, messages, systemPrompt) {
  const internalLog = [];
  let loopMessages  = messages
    .filter(m => m.role && m.content && typeof m.content === 'string')
    .slice(-10)
    .map(m => ({ role: m.role, content: m.content.slice(0, 4000) }));

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    const response = await getAI().messages.create({
      model:       'claude-haiku-4-5-20251001',
      max_tokens:  1200,
      system:      systemPrompt,
      tools:       TOOL_DEFINITIONS,
      tool_choice: { type: 'auto' },
      messages:    loopMessages,
    });

    if (response.stop_reason === 'end_turn') {
      const reply = response.content.filter(b => b.type === 'text').map(b => b.text).join('\n').trim();
      return { reply, internalLog };
    }

    if (response.stop_reason === 'tool_use') {
      const toolUseBlocks = response.content.filter(b => b.type === 'tool_use');
      loopMessages.push({ role: 'assistant', content: response.content });

      const toolResults = await Promise.all(
        toolUseBlocks.map(async (block) => {
          const t0 = Date.now();
          let rawResult;
          try {
            rawResult = await executeTool(block.name, block.input, orgId, userId);
          } catch (err) {
            rawResult = { error: err.message };
          }

          internalLog.push({
            tool:       block.name,
            input:      block.input,
            rawResult,
            summary:    summarizeResult(block.name, rawResult),
            durationMs: rawResult._durationMs || (Date.now() - t0),
            iteration:  i + 1,
          });

          return {
            type:        'tool_result',
            tool_use_id: block.id,
            content:     JSON.stringify(rawResult),
          };
        })
      );

      loopMessages.push({ role: 'user', content: toolResults });
      continue;
    }

    break; // stop_reason inattendu
  }

  // Max iterations atteint — forcer une réponse sans tools
  const finalResponse = await getAI().messages.create({
    model:       'claude-haiku-4-5-20251001',
    max_tokens:  600,
    system:      systemPrompt,
    tools:       TOOL_DEFINITIONS,
    tool_choice: { type: 'none' },
    messages:    loopMessages,
  });
  const reply = finalResponse.content.filter(b => b.type === 'text').map(b => b.text).join('\n').trim();
  return { reply, internalLog };
}

/* ── Construction des objectCards depuis le journal ─────────── */
function collectObjectCards(internalLog) {
  const cards = [];
  for (const entry of internalLog) {
    if (entry.rawResult?.objectCards?.length) {
      cards.push(...entry.rawResult.objectCards);
    }
  }
  const seen = new Set();
  return cards.filter(c => { if (seen.has(c.id)) return false; seen.add(c.id); return true; });
}

/* ── Construction des actions UI intelligentes ───────────────── */
function buildSmartActions(internalLog, reply, ctx) {
  const actions  = [];
  const text     = (reply || '').toLowerCase();
  const currency = ctx.org.currency || 'EUR';
  const fmt      = (n) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency }).format(n || 0);

  // ── Workflow préparé → bouton unique de confirmation ────────
  const workflowEntry = internalLog.find(e => e.tool === 'prepare_workflow' && e.rawResult?.ok);
  if (workflowEntry) {
    const wf = workflowEntry.rawResult?.workflow;
    if (wf) {
      const docType  = wf.type === 'create_invoice' ? 'facture' : 'devis';
      const totals   = wf.totals || {};
      const amtLabel = totals.subtotal != null ? ` — ${fmt(totals.subtotal)} HT · ${fmt(totals.total)} TTC` : '';
      actions.push({
        id:           'confirm_workflow',
        label:        `Confirmer et créer le ${docType}${amtLabel}`,
        type:         'action',
        actionType:   'confirm_agent_workflow',
        payload:      { workflow: wf },
        style:        'primary',
        icon:         'check',
      });
      // Pas d'autres boutons — une seule action possible
      return actions;
    }
  }

  // Extraire les résultats clés du journal
  const clientSearch      = internalLog.filter(e => e.tool === 'search_clients' && e.rawResult?.found);
  const lastClient        = clientSearch.length ? clientSearch[clientSearch.length - 1].rawResult.clients?.[0] : null;
  const invoiceSearch     = internalLog.filter(e => e.tool === 'search_invoices');
  const lastInvoiceResult = invoiceSearch.length ? invoiceSearch[invoiceSearch.length - 1].rawResult : null;
  const expenseSearch     = internalLog.filter(e => e.tool === 'search_expenses');
  const lastExpenseResult = expenseSearch.length ? expenseSearch[expenseSearch.length - 1].rawResult : null;
  const dupCheck          = internalLog.find(e => e.tool === 'check_draft_duplicate');
  const hasDuplicate      = dupCheck?.rawResult?.hasDuplicate;
  const existingDraft     = dupCheck?.rawResult?.draft;
  const lateList          = internalLog.find(e => e.tool === 'list_late_invoices');

  // ── Actions devis (client existant, pas de workflow préparé) ─
  if (lastClient && (text.includes('devis') || text.includes('quote'))) {
    if (hasDuplicate && existingDraft) {
      actions.push({ id: 'open_existing_draft', label: `Ouvrir ${existingDraft.number}`, type: 'redirect', path: `/quotes/${existingDraft.id}`, style: 'warning', icon: 'list' });
      actions.push({ id: 'create_new_quote', label: 'Créer quand même', type: 'open_modal', style: 'secondary', icon: 'plus',
        modal: { type: 'create_quote', title: 'Créer un devis', confirmedFields: [`Client : ${lastClient.name}`], missingFields: ['Prestations', 'Date de validité'],
          payload: { initialValues: { clientId: lastClient.id }, client: { id: lastClient.id, name: lastClient.name } }, requiresConfirmation: true } });
    } else {
      actions.push({ id: 'create_quote_modal', label: 'Créer le devis', type: 'open_modal', style: 'primary', icon: 'plus',
        modal: { type: 'create_quote', title: 'Créer un devis', confirmedFields: [`Client : ${lastClient.name}`], missingFields: ['Prestations', 'Date de validité'],
          payload: { initialValues: { clientId: lastClient.id }, client: { id: lastClient.id, name: lastClient.name } }, requiresConfirmation: true } });
    }
  }

  // ── Actions facture (client existant, pas de workflow préparé) ─
  if (lastClient && (text.includes('facture') || text.includes('invoice')) && !text.includes('facture trouvée')) {
    if (hasDuplicate && existingDraft) {
      actions.push({ id: 'open_existing_inv', label: `Ouvrir ${existingDraft.number}`, type: 'redirect', path: `/invoices/${existingDraft.id}`, style: 'warning', icon: 'list' });
    } else {
      actions.push({ id: 'create_invoice_modal', label: 'Créer la facture', type: 'open_modal', style: 'primary', icon: 'plus',
        modal: { type: 'create_invoice', title: 'Créer une facture', confirmedFields: [`Client : ${lastClient.name}`], missingFields: ['Prestations', 'Date d\'échéance'],
          payload: { initialValues: { clientId: lastClient.id }, client: { id: lastClient.id, name: lastClient.name } }, requiresConfirmation: true } });
    }
  }

  // ── Facture trouvée (recherche par montant) ─────────────────
  if (lastInvoiceResult?.found) {
    const inv = lastInvoiceResult.invoices?.[0];
    if (lastInvoiceResult.count === 1 && inv) {
      if (text.includes('reçu') || text.includes('paiement') || text.includes('rapproche') || text.includes('virement')) {
        actions.push({ id: 'manual_match', label: 'Rapprocher manuellement', type: 'open_modal', style: 'primary', icon: 'link',
          modal: { type: 'manual_match', title: 'Contrôle de rapprochement',
            confirmedFields: [`Facture : ${inv.number} — ${fmt(inv.total)}`], missingFields: ['Source du paiement à confirmer'],
            payload: { payment: { amount: fmt(inv.total), reference: '' }, invoice: { number: inv.number, client: inv.clientName, amount: fmt(inv.total) } }, requiresConfirmation: true } });
      }
      actions.push({ id: 'go_invoice', label: 'Voir la facture', type: 'redirect', path: `/invoices/${inv.id}`, style: actions.length ? 'secondary' : 'primary', icon: 'list' });
    } else {
      actions.push({ id: 'go_invoices', label: 'Voir les factures', type: 'redirect', path: '/invoices', style: 'primary', icon: 'list' });
    }
  }

  // ── Dépense trouvée ─────────────────────────────────────────
  if (lastExpenseResult?.found) {
    const exp = lastExpenseResult.expenses?.[0];
    if (exp?.status === 'pending_review' || text.includes('requalif') || text.includes('catégorie')) {
      const suggestedCat = (exp?.vendor || '').toLowerCase().includes('stripe') ? 'software' : exp?.category;
      actions.push({ id: 'reclass_expense', label: 'Corriger la catégorie', type: 'open_modal', style: 'primary', icon: 'edit',
        modal: { type: 'expense_reclass', title: 'Corriger la dépense',
          confirmedFields: [`Dépense : ${exp?.description || exp?.vendor} — ${fmt(exp?.amount)}`], missingFields: ['Catégorie correcte'],
          payload: { expense: { _id: exp?.id, description: exp?.description, vendor: exp?.vendor, amount: exp?.amount, category: exp?.category, notes: '' }, suggestedCategory: suggestedCat },
          requiresConfirmation: true } });
    }
    actions.push({ id: 'go_expenses', label: 'Voir les dépenses', type: 'redirect', path: '/expenses', style: actions.find(a => a.id === 'reclass_expense') ? 'secondary' : 'primary', icon: 'chart' });
  }

  // ── Fiche client ────────────────────────────────────────────
  if (lastClient && !actions.find(a => a.id === 'go_client')) {
    actions.push({ id: 'go_client', label: 'Fiche client', type: 'redirect', path: `/clients/${lastClient.id}`, style: actions.length ? 'secondary' : 'primary', icon: 'users' });
  }

  // ── Factures en retard ──────────────────────────────────────
  if (lateList && lateList.rawResult?.count > 0) {
    actions.push({ id: 'go_late', label: `${lateList.rawResult.count} facture(s) en retard`, type: 'redirect', path: '/invoices?filter=late', style: 'warning', icon: 'alert' });
  }

  // ── Fallback ────────────────────────────────────────────────
  if (!actions.length) {
    actions.push({ id: 'dashboard', label: 'Tableau de bord', type: 'redirect', path: '/dashboard', style: 'secondary', icon: 'home' });
  }

  return actions.slice(0, 5);
}

/* ── Score de confiance global ───────────────────────────────── */
function computeOverallConfidence(internalLog) {
  const scores = internalLog
    .map(e => e.rawResult?.confidence)
    .filter(c => typeof c === 'number');
  if (!scores.length) return null;
  const min = Math.min(...scores);
  return { score: Math.round(min * 100) / 100, label: min >= 0.8 ? 'Élevée' : min >= 0.5 ? 'Moyenne' : 'Faible' };
}

/* ── Mise à jour mémoire depuis le journal ───────────────────── */
function updateMemoryFromLog(userId, internalLog, reply) {
  const patch = { toolCallCount: internalLog.length };
  const clientSearch = internalLog.find(e => e.tool === 'search_clients' && e.rawResult?.found);
  if (clientSearch) {
    const client = clientSearch.rawResult.clients?.[0];
    if (client) { patch.clientName = client.name; patch.lastEntityId = client.id; patch.lastEntityType = 'client'; }
  }
  const invoiceSearch = internalLog.find(e => e.tool === 'search_invoices' && e.rawResult?.found);
  if (invoiceSearch) {
    const inv = invoiceSearch.rawResult.invoices?.[0];
    if (inv) { patch.lastEntityId = inv.id; patch.lastEntityType = 'invoice'; }
  }
  patchMemory(userId, patch);
}

/* ══════════════════════════════════════════════════════════════
   POINT D'ENTRÉE PUBLIC
   ══════════════════════════════════════════════════════════════ */
async function runAgent(userId, messages, context = {}) {
  // Fallback si pas de clé API
  if (!process.env.ANTHROPIC_API_KEY) {
    const result = await deterministicChat(userId, messages);
    return { ...result, agentLog: [] };
  }

  let ctx;
  try {
    ctx = await buildContext(userId);
    if (!ctx) throw Object.assign(new Error('Organisation introuvable.'), { status: 404 });
  } catch (err) {
    throw err;
  }

  // ── Détection de confirmation + workflow en attente ─────────
  const lastMsg = messages[messages.length - 1];
  if (isConfirmationMessage(lastMsg?.content)) {
    const pendingWorkflow = getPendingWorkflow(userId);
    if (pendingWorkflow) {
      try {
        clearPendingWorkflow(userId);
        return await executePendingWorkflow(userId, ctx.orgObjectId, pendingWorkflow);
      } catch (err) {
        // En cas d'erreur d'exécution, on informe l'utilisateur sans crasher
        return {
          reply:       `Impossible de créer le ${pendingWorkflow.type === 'create_invoice' ? 'la facture' : 'le devis'} : ${err.message}`,
          intent:      'workflow_error',
          actions:     [{ id: 'dashboard', label: 'Tableau de bord', type: 'redirect', path: '/dashboard', style: 'secondary', icon: 'home' }],
          agentLog:    [],
          journalEntry: { type: 'workflow_error', label: 'Erreur workflow', status: 'error', at: new Date().toISOString() },
          contextPatch: getMemory(userId),
        };
      }
    }
  }

  const systemPrompt = buildAgentSystemPrompt(ctx, userId);
  let reply, internalLog;

  try {
    ({ reply, internalLog } = await runAgentLoop(userId, ctx.orgObjectId, messages, systemPrompt));
  } catch (err) {
    _anthropic = null;
    if (err.status === 401)                                throw Object.assign(new Error('Clé API invalide.'), { status: 503, code: 'ASSISTANT_INVALID_KEY' });
    if (err.status === 400 && err.message?.includes('credit')) throw Object.assign(new Error('Crédits IA épuisés.'), { status: 402, code: 'ASSISTANT_NO_CREDITS' });
    if (err.status >= 500)                                 throw Object.assign(new Error('L\'IA est temporairement indisponible.'), { status: 503, code: 'ASSISTANT_UNAVAILABLE' });
    throw Object.assign(new Error('Erreur du provider IA.'), { status: 500, code: 'ASSISTANT_ERROR' });
  }

  const objectCards = collectObjectCards(internalLog);
  const actions     = buildSmartActions(internalLog, reply, ctx);
  const confidence  = computeOverallConfidence(internalLog);

  updateMemoryFromLog(userId, internalLog, reply);

  // Journal frontend (sans rawResult)
  const agentLog = internalLog.map(e => ({
    tool:          e.tool,
    input:         e.input,
    success:       !e.rawResult?.error,
    resultSummary: e.summary,
    durationMs:    e.durationMs,
    iteration:     e.iteration,
  }));

  const journalEntry = agentLog.length > 0 ? {
    type:   'agent_run',
    label:  `Agent — ${agentLog.length} outil(s) — ${agentLog.reduce((s, e) => s + e.durationMs, 0)}ms`,
    status: agentLog.every(e => e.success) ? 'success' : 'warning',
    at:     new Date().toISOString(),
  } : null;

  return {
    reply:       reply || 'Réponse non disponible. Réessayez.',
    intent:      'agent',
    actions,
    objectCards: objectCards.length ? objectCards : undefined,
    confidence,
    agentLog,
    journalEntry,
    contextPatch: getMemory(userId),
  };
}

module.exports = { runAgent };
