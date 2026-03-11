/**
 * agentOrchestrator.js
 * Orchestrateur agentique Fluxora.
 * Utilise l'API tool_use d'Anthropic pour un raisonnement agentique réel.
 *
 * Flux de création :
 *  1. Agent appelle search_clients → client trouvé ou non
 *  2. Agent appelle prepare_workflow → données stockées en mémoire
 *  3. Agent renvoie résumé court + bouton "Confirmer et créer" (via buildSmartActions)
 *  4a. Utilisateur clique le bouton → POST /api/assistant/action (confirm_agent_workflow)
 *  4b. Utilisateur tape "oui" / "valide" → runAgent détecte + exécute le workflow directement
 */

const Anthropic    = require('@anthropic-ai/sdk');
const { TOOL_DEFINITIONS, executeTool, summarizeResult } = require('./toolRegistry');
const {
  getMemory, patchMemory, buildMemoryBlock,
  getPendingWorkflow, clearPendingWorkflow,
} = require('./agentMemory');
const { buildContext, buildSystemPrompt, chat: deterministicChat } = require('../services/assistantService');

let _anthropic = null;
const getAI = () => {
  if (!_anthropic) _anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return _anthropic;
};

const MAX_ITERATIONS = 6;

/* ── Formatage monnaie ───────────────────────────────────────── */
function fmt(n, currency = 'EUR') {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency }).format(n || 0);
}

/* ── Détection de message de validation utilisateur ─────────── */
const CONFIRMATION_RE = /^(oui\b|yes\b|ok\b|valide?[sz]?\b|vas-y\b|allez\b|go\b|confirme?[sz]?\b|c['']est\s+bon\b|parfait\b|bonne\s+id[ée]e\b|exactement\b|d['']accord\b|continuer?\b|ex[ée]cute?[sz]?\b|cr[ée][ée][sz]?\b|fais.le\b|allons-y\b|proceed\b|ça\s+marche\b|génial\b|super\b|top\b|impeccable\b|nickel\b|lance\b|démarre\b|envoie\b)/i;

function isConfirmationMessage(text) {
  return CONFIRMATION_RE.test((text || '').trim());
}

/* ══════════════════════════════════════════════════════════════
   SYSTEM PROMPT AGENT
   ══════════════════════════════════════════════════════════════ */
function buildAgentSystemPrompt(ctx, userId) {
  const base     = buildSystemPrompt(ctx);
  const memBlock = buildMemoryBlock(userId);

  return `${base}${memBlock}

════════════════════════════════════════════════
AGENT FLUXORA — COPILOTE MÉTIER AUTONOME
════════════════════════════════════════════════

Tu es un agent IA autonome connecté à l'ensemble du logiciel Fluxora (PME / freelances).
Tu peux lire, analyser, comparer et préparer des actions réelles pour l'utilisateur.
Chaque création ou modification passe par validation explicite de l'utilisateur.
Réponds TOUJOURS en français, de manière concise et orientée action.

OUTILS DISPONIBLES :
• search_clients         — Rechercher un client / vérifier son existence
• search_invoices        — Rechercher des factures par montant (±10%), client ou statut
• search_quotes          — Rechercher des devis par client ou statut
• search_expenses        — Identifier une dépense par fournisseur et/ou montant
• get_client_history     — Historique complet d'un client (factures + devis + totaux)
• check_draft_duplicate  — Vérifier si un brouillon récent existe (anti-doublon)
• list_late_invoices     — Lister les factures en retard de paiement
• list_alerts            — Lister les alertes comptables et financières ouvertes
• get_expense_categories — Répartition des dépenses par catégorie (année en cours)
• prepare_workflow       — Préparer un workflow complet pour confirmation utilisateur

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
RÈGLE N°1 — CRÉATION DE DEVIS OU FACTURE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Dès que l'utilisateur demande la création d'un devis ou d'une facture :
a. Appelle TOUJOURS search_clients en premier (même si tu penses que le client n'existe pas)
b. Extrait TOUTES les données disponibles du message AVANT d'appeler les outils :
   → Nom du client, email, téléphone, société, type (particulier / entreprise)
   → Description de la prestation, montant HT, taux TVA (défaut : 20%), quantité
c. Si le client est trouvé (client_exists=true) → appelle check_draft_duplicate
d. Appelle prepare_workflow avec workflow_type="create_document" et TOUTES les données :
   - client_exists (bool), client_id (si trouvé), client_name, client_email, client_phone
   - lines: [{description, unit_price, quantity, vat_rate}]
e. Rédige UNE réponse courte (2-3 phrases MAX) résumant ce qui va être créé
   → NE demande PAS de confirmation textuelle — le bouton de l'interface gère ça
   → NE dis PAS que des boutons ont été préparés dans l'interface
f. Si ET SEULEMENT SI montant ET description sont TOUS LES DEUX absents → pose UNE seule question précise

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
RÈGLE N°2 — MISE À JOUR D'UN CLIENT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Quand l'utilisateur veut modifier les données d'un client :
a. Appelle search_clients pour localiser le client
b. Appelle prepare_workflow avec workflow_type="update_client", client_id et update_fields
   → Champs supportés : email, phone, company, address, notes
c. Résume la modification en 1-2 phrases, NE demande PAS de confirmation textuelle

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
RÈGLE N°3 — RECHERCHE ET ANALYSE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Devis existants → search_quotes (par client ou statut)
• Facture reçue / paiement → search_invoices avec le montant
• Paiement partiel → search_invoices avec les deux montants
• Dépense inconnue → search_expenses (fournisseur ou montant)
• Historique client → get_client_history (utilise le client trouvé via search_clients)
• Factures impayées → list_late_invoices
• Alertes / anomalies → list_alerts
• Analyse budget → get_expense_categories

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
RÈGLE N°4 — MÉMOIRE ET CONTEXTE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• "ce client" / "pour lui" / "le même" → utilise currentClientId de la mémoire session
• "ce devis" / "la facture" / "l'ouvrir" → utilise lastEntityId / lastCreatedId en mémoire
• Ne repose JAMAIS une question dont la réponse est déjà dans la mémoire ou le message
• Si un workflow est en attente, un message de confirmation déclenche son exécution directe

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
RÈGLE N°5 — QUALITÉ DES RÉPONSES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Jamais de données inventées — uniquement DB ou message utilisateur
• Distingue : CONFIRMÉ (trouvé en DB) vs DÉDUIT (message) vs MANQUANT (champs absents)
• Résultats de recherche → mentionne les éléments trouvés avec montants et noms réels
• Réponse max 4 phrases pour les opérations simples, structure avec puces pour les analyses`;
}

/* ══════════════════════════════════════════════════════════════
   EXÉCUTION DU WORKFLOW CONFIRMÉ
   ══════════════════════════════════════════════════════════════ */
async function executePendingWorkflow(userId, workflow) {
  const { executeAction } = require('../services/assistantActionService');
  const currency = 'EUR';

  /* ── Mise à jour client ────────────────────────────────────── */
  if (workflow.type === 'update_client') {
    const result = await executeAction(userId, 'update_client', {
      clientId: workflow.client?.id,
      fields:   workflow.fields || {},
    });

    patchMemory(userId, {
      lastCreatedId:   result.entityId,
      lastCreatedType: 'client',
      lastCreatedPath: result.redirectTo,
    });

    const fieldsList = Object.keys(workflow.fields || {}).join(', ') || 'informations';
    return {
      reply:   `Les ${fieldsList} de **${workflow.client?.name}** ont été mis à jour avec succès.`,
      intent:  'workflow_executed',
      actions: [
        { id: 'go_client', label: 'Voir la fiche client', type: 'redirect', path: result.redirectTo || '/clients', style: 'primary', icon: 'users' },
        { id: 'go_clients', label: 'Liste des clients', type: 'redirect', path: '/clients', style: 'secondary', icon: 'users' },
      ],
      confidence:   { score: 1.0, label: 'Élevée' },
      agentLog:     [],
      journalEntry: { type: 'workflow_executed', label: `Client mis à jour : ${workflow.client?.name}`, status: 'success', at: new Date().toISOString() },
      contextPatch: getMemory(userId),
    };
  }

  /* ── Création de document (devis / facture) ────────────────── */
  const result  = await executeAction(userId, 'confirm_agent_workflow', { workflow });
  const docType = workflow.type === 'create_invoice' ? 'facture' : 'devis';
  const docNum  = result.number || '';
  const path    = result.redirectTo || (workflow.type === 'create_invoice' ? '/invoices' : '/quotes');

  patchMemory(userId, {
    lastCreatedId:   result.entityId,
    lastCreatedType: result.entityType,
    lastCreatedPath: path,
  });

  const successMsg = result.clientCreated
    ? `Le client **${workflow.client?.name}** a été créé et le ${docType} **${docNum}** est prêt en brouillon.`
    : `Le ${docType} **${docNum}** a été créé pour **${workflow.client?.name}**.`;

  const totals   = workflow.totals || {};
  const amtNote  = totals.subtotal ? ` (${fmt(totals.subtotal, currency)} HT · ${fmt(totals.total, currency)} TTC)` : '';

  return {
    reply:   `${successMsg}${amtNote}`,
    intent:  'workflow_executed',
    actions: [
      { id: 'open_doc', label: `Ouvrir le ${docType}`, type: 'redirect', path, style: 'primary', icon: 'list' },
      { id: 'go_list',  label: `Voir les ${docType}s`, type: 'redirect', path: workflow.type === 'create_invoice' ? '/invoices' : '/quotes', style: 'secondary', icon: 'list' },
    ],
    confidence:   { score: 1.0, label: 'Élevée' },
    agentLog:     [],
    pendingWorkflow: null,
    journalEntry: {
      type:   'workflow_executed',
      label:  result.clientCreated ? `Client + ${docType} créé (${docNum})` : `${docType} créé (${docNum})`,
      status: 'success',
      at:     new Date().toISOString(),
    },
    contextPatch: getMemory(userId),
  };
}

/* ══════════════════════════════════════════════════════════════
   BOUCLE AGENTIQUE
   ══════════════════════════════════════════════════════════════ */
async function runAgentLoop(userId, orgId, messages, systemPrompt) {
  const internalLog = [];
  let loopMessages  = messages
    .filter(m => m.role && m.content && typeof m.content === 'string')
    .slice(-12)
    .map(m => ({ role: m.role, content: m.content.slice(0, 4000) }));

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    const response = await getAI().messages.create({
      model:       'claude-haiku-4-5-20251001',
      max_tokens:  1400,
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

  // Max iterations atteint — forcer réponse sans tools
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

/* ══════════════════════════════════════════════════════════════
   CONSTRUCTION DES ACTIONS UI
   ══════════════════════════════════════════════════════════════ */
function buildSmartActions(internalLog, reply, ctx) {
  const actions  = [];
  const text     = (reply || '').toLowerCase();
  const currency = ctx.org?.currency || 'EUR';
  const fmtC     = (n) => fmt(n, currency);

  /* ── 1. Workflow préparé → bouton unique de confirmation ────── */
  const workflowEntry = internalLog.find(e => e.tool === 'prepare_workflow' && e.rawResult?.ok);
  if (workflowEntry) {
    const wf = workflowEntry.rawResult?.workflow;
    if (wf) {
      if (wf.type === 'update_client') {
        const fieldsList = Object.keys(wf.fields || {}).join(', ') || 'informations';
        actions.push({
          id:         'confirm_update_client',
          label:      `Confirmer la mise à jour de ${wf.client?.name || 'ce client'} (${fieldsList})`,
          type:       'action',
          actionType: 'confirm_agent_workflow',
          payload:    { workflow: wf },
          style:      'primary',
          icon:       'check',
        });
      } else {
        const docType  = wf.type === 'create_invoice' ? 'facture' : 'devis';
        const totals   = wf.totals || {};
        const amtLabel = totals.subtotal != null ? ` — ${fmtC(totals.subtotal)} HT · ${fmtC(totals.total)} TTC` : '';
        actions.push({
          id:         'confirm_workflow',
          label:      `Confirmer et créer le ${docType}${amtLabel}`,
          type:       'action',
          actionType: 'confirm_agent_workflow',
          payload:    { workflow: wf },
          style:      'confirm',
          icon:       'check',
        });
      }
      return actions; // Une seule action possible quand un workflow est prêt
    }
  }

  /* ── Extraire les résultats clés du journal ─────────────────── */
  const clientSearch      = internalLog.filter(e => e.tool === 'search_clients' && e.rawResult?.found);
  const lastClient        = clientSearch.length ? clientSearch[clientSearch.length - 1].rawResult?.clients?.[0] : null;
  const invoiceSearch     = internalLog.filter(e => e.tool === 'search_invoices');
  const lastInvoiceResult = invoiceSearch.length ? invoiceSearch[invoiceSearch.length - 1].rawResult : null;
  const quoteSearch       = internalLog.filter(e => e.tool === 'search_quotes');
  const lastQuoteResult   = quoteSearch.length ? quoteSearch[quoteSearch.length - 1].rawResult : null;
  const expenseSearch     = internalLog.filter(e => e.tool === 'search_expenses');
  const lastExpenseResult = expenseSearch.length ? expenseSearch[expenseSearch.length - 1].rawResult : null;
  const dupCheck          = internalLog.find(e => e.tool === 'check_draft_duplicate');
  const hasDuplicate      = dupCheck?.rawResult?.hasDuplicate;
  const existingDraft     = dupCheck?.rawResult?.draft;
  const lateList          = internalLog.find(e => e.tool === 'list_late_invoices');
  const alertsList        = internalLog.find(e => e.tool === 'list_alerts');
  const historyEntry      = internalLog.find(e => e.tool === 'get_client_history' && e.rawResult?.found);

  /* ── 2. Historique client ───────────────────────────────────── */
  if (historyEntry) {
    const client  = historyEntry.rawResult.client;
    const summary = historyEntry.rawResult.summary || {};
    if (client) {
      actions.push({ id: 'go_client_history', label: `Fiche ${client.name}`, type: 'redirect', path: `/clients/${client.id}`, style: 'primary', icon: 'users' });
      if (summary.lateCount > 0) {
        actions.push({ id: 'late_client', label: `${summary.lateCount} facture(s) en retard`, type: 'redirect', path: '/invoices?filter=late', style: 'warning', icon: 'alert' });
      }
      actions.push({ id: 'create_invoice_for_client', label: 'Créer une facture', type: 'open_modal', style: 'secondary', icon: 'plus',
        modal: { type: 'create_invoice', title: 'Créer une facture', confirmedFields: [`Client : ${client.name}`], missingFields: ['Prestations', 'Date d\'échéance'],
          payload: { initialValues: { clientId: client.id }, client: { id: client.id, name: client.name } }, requiresConfirmation: true } });
    }
  }

  /* ── 3. Devis trouvés ───────────────────────────────────────── */
  if (lastQuoteResult?.found && !historyEntry) {
    const q = lastQuoteResult.quotes?.[0];
    if (lastQuoteResult.count === 1 && q) {
      actions.push({ id: 'go_quote', label: `Voir ${q.number || 'le devis'}`, type: 'redirect', path: `/quotes/${q.id}`, style: 'primary', icon: 'list' });
    } else {
      actions.push({ id: 'go_quotes', label: `${lastQuoteResult.count} devis trouvé(s)`, type: 'redirect', path: '/quotes', style: 'primary', icon: 'list' });
    }
  }

  /* ── 4. Actions devis si client trouvé ─────────────────────── */
  if (lastClient && !historyEntry && (text.includes('devis') || text.includes('quote'))) {
    if (hasDuplicate && existingDraft) {
      actions.push({ id: 'open_existing_draft', label: `Ouvrir ${existingDraft.number}`, type: 'redirect', path: `/quotes/${existingDraft.id}`, style: 'warning', icon: 'list' });
      actions.push({ id: 'create_new_quote', label: 'Créer quand même', type: 'open_modal', style: 'secondary', icon: 'plus',
        modal: { type: 'create_quote', title: 'Créer un devis', confirmedFields: [`Client : ${lastClient.name}`], missingFields: ['Prestations', 'Date de validité'],
          payload: { initialValues: { clientId: lastClient.id }, client: { id: lastClient.id, name: lastClient.name } }, requiresConfirmation: true } });
    } else if (!actions.length) {
      actions.push({ id: 'create_quote_modal', label: 'Créer le devis', type: 'open_modal', style: 'primary', icon: 'plus',
        modal: { type: 'create_quote', title: 'Créer un devis', confirmedFields: [`Client : ${lastClient.name}`], missingFields: ['Prestations', 'Date de validité'],
          payload: { initialValues: { clientId: lastClient.id }, client: { id: lastClient.id, name: lastClient.name } }, requiresConfirmation: true } });
    }
  }

  /* ── 5. Actions facture si client trouvé ────────────────────── */
  if (lastClient && !historyEntry && (text.includes('facture') || text.includes('invoice')) && !text.includes('facture trouvée')) {
    if (hasDuplicate && existingDraft && !actions.length) {
      actions.push({ id: 'open_existing_inv', label: `Ouvrir ${existingDraft.number}`, type: 'redirect', path: `/invoices/${existingDraft.id}`, style: 'warning', icon: 'list' });
    } else if (!actions.length) {
      actions.push({ id: 'create_invoice_modal', label: 'Créer la facture', type: 'open_modal', style: 'primary', icon: 'plus',
        modal: { type: 'create_invoice', title: 'Créer une facture', confirmedFields: [`Client : ${lastClient.name}`], missingFields: ['Prestations', 'Date d\'échéance'],
          payload: { initialValues: { clientId: lastClient.id }, client: { id: lastClient.id, name: lastClient.name } }, requiresConfirmation: true } });
    }
  }

  /* ── 6. Facture trouvée (par montant ou client) ─────────────── */
  if (lastInvoiceResult?.found && !historyEntry) {
    const inv = lastInvoiceResult.invoices?.[0];
    if (lastInvoiceResult.count === 1 && inv) {
      const isPaymentContext = text.includes('reçu') || text.includes('paiement') || text.includes('rapproche') || text.includes('virement');
      if (isPaymentContext) {
        actions.push({ id: 'manual_match', label: 'Rapprocher manuellement', type: 'open_modal', style: 'primary', icon: 'link',
          modal: { type: 'manual_match', title: 'Contrôle de rapprochement',
            confirmedFields: [`Facture : ${inv.number} — ${fmtC(inv.total)}`], missingFields: ['Source du paiement à confirmer'],
            payload: { payment: { amount: fmtC(inv.total), reference: '' }, invoice: { number: inv.number, client: inv.clientName, amount: fmtC(inv.total) } },
            requiresConfirmation: true } });
      }
      actions.push({ id: 'go_invoice', label: `Voir ${inv.number || 'la facture'}`, type: 'redirect', path: `/invoices/${inv.id}`, style: actions.length ? 'secondary' : 'primary', icon: 'list' });
    } else if (lastInvoiceResult.count > 1) {
      actions.push({ id: 'go_invoices', label: `${lastInvoiceResult.count} factures trouvées`, type: 'redirect', path: '/invoices', style: 'primary', icon: 'list' });
    }
  }

  /* ── 7. Dépense trouvée ─────────────────────────────────────── */
  if (lastExpenseResult?.found) {
    const exp = lastExpenseResult.expenses?.[0];
    const needsReclass = exp?.status === 'pending_review' || text.includes('requalif') || text.includes('catégorie') || text.includes('correct');
    if (needsReclass) {
      const suggestedCat = (exp?.vendor || '').toLowerCase().includes('stripe') ? 'software' : exp?.category;
      actions.push({ id: 'reclass_expense', label: 'Corriger la catégorie', type: 'open_modal', style: 'primary', icon: 'edit',
        modal: { type: 'expense_reclass', title: 'Corriger la dépense',
          confirmedFields: [`Dépense : ${exp?.description || exp?.vendor || 'Inconnue'} — ${fmtC(exp?.amount)}`], missingFields: ['Catégorie correcte'],
          payload: { expense: { _id: exp?.id, description: exp?.description, vendor: exp?.vendor, amount: exp?.amount, category: exp?.category, notes: '' }, suggestedCategory: suggestedCat },
          requiresConfirmation: true } });
    }
    actions.push({ id: 'go_expenses', label: 'Voir les dépenses', type: 'redirect', path: '/expenses', style: needsReclass ? 'secondary' : 'primary', icon: 'chart' });
  }

  /* ── 8. Alertes trouvées ────────────────────────────────────── */
  if (alertsList && alertsList.rawResult?.count > 0) {
    const count = alertsList.rawResult.count;
    const critical = alertsList.rawResult.alerts?.some(a => a.severity === 'critical' || a.severity === 'high');
    actions.push({ id: 'go_alerts', label: `${count} alerte(s) ouverte(s)`, type: 'redirect', path: '/accounting', style: critical ? 'danger' : 'warning', icon: 'bell' });
  }

  /* ── 9. Fiche client ────────────────────────────────────────── */
  if (lastClient && !actions.find(a => a.id?.startsWith('go_client'))) {
    actions.push({ id: 'go_client', label: 'Fiche client', type: 'redirect', path: `/clients/${lastClient.id}`, style: actions.length ? 'secondary' : 'primary', icon: 'users' });
  }

  /* ── 10. Factures en retard ─────────────────────────────────── */
  if (lateList && lateList.rawResult?.count > 0 && !actions.find(a => a.id === 'go_late')) {
    actions.push({ id: 'go_late', label: `${lateList.rawResult.count} facture(s) en retard`, type: 'redirect', path: '/invoices?filter=late', style: 'warning', icon: 'alert' });
  }

  /* ── 11. Fallback ───────────────────────────────────────────── */
  if (!actions.length) {
    if (text.includes('facture')) {
      actions.push({ id: 'go_invoices', label: 'Voir les factures', type: 'redirect', path: '/invoices', style: 'primary', icon: 'list' });
    } else if (text.includes('devis')) {
      actions.push({ id: 'go_quotes', label: 'Voir les devis', type: 'redirect', path: '/quotes', style: 'primary', icon: 'list' });
    } else if (text.includes('client')) {
      actions.push({ id: 'go_clients', label: 'Voir les clients', type: 'redirect', path: '/clients', style: 'primary', icon: 'users' });
    } else if (text.includes('dépense') || text.includes('expense')) {
      actions.push({ id: 'go_expenses', label: 'Voir les dépenses', type: 'redirect', path: '/expenses', style: 'primary', icon: 'chart' });
    } else {
      actions.push({ id: 'dashboard', label: 'Tableau de bord', type: 'redirect', path: '/dashboard', style: 'secondary', icon: 'home' });
    }
  }

  return actions.slice(0, 5);
}

/* ══════════════════════════════════════════════════════════════
   COLLECTE DES OBJECT CARDS
   ══════════════════════════════════════════════════════════════ */
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

/* ══════════════════════════════════════════════════════════════
   SCORE DE CONFIANCE
   ══════════════════════════════════════════════════════════════ */
function computeOverallConfidence(internalLog) {
  const scores = internalLog
    .filter(e => e.tool !== 'prepare_workflow')
    .map(e => e.rawResult?.confidence)
    .filter(c => typeof c === 'number');
  if (!scores.length) return null;
  const min = Math.min(...scores);
  return { score: Math.round(min * 100) / 100, label: min >= 0.8 ? 'Élevée' : min >= 0.5 ? 'Moyenne' : 'Faible' };
}

/* ══════════════════════════════════════════════════════════════
   MISE À JOUR MÉMOIRE
   ══════════════════════════════════════════════════════════════ */
function updateMemoryFromLog(userId, internalLog) {
  const patch = { toolCallCount: internalLog.length };

  // Client trouvé via search_clients
  const clientSearch = internalLog.find(e => e.tool === 'search_clients' && e.rawResult?.found);
  if (clientSearch) {
    const client = clientSearch.rawResult.clients?.[0];
    if (client) {
      patch.clientName      = client.name;
      patch.currentClientId = client.id;
      patch.lastEntityId    = client.id;
      patch.lastEntityType  = 'client';
    }
  }

  // Client via get_client_history
  const histEntry = internalLog.find(e => e.tool === 'get_client_history' && e.rawResult?.found);
  if (histEntry) {
    const client = histEntry.rawResult.client;
    if (client) {
      patch.clientName      = client.name;
      patch.currentClientId = client.id;
      patch.lastEntityId    = client.id;
      patch.lastEntityType  = 'client';
    }
  }

  // Facture trouvée
  const invoiceSearch = internalLog.find(e => e.tool === 'search_invoices' && e.rawResult?.found);
  if (invoiceSearch) {
    const inv = invoiceSearch.rawResult.invoices?.[0];
    if (inv) { patch.lastEntityId = inv.id; patch.lastEntityType = 'invoice'; }
  }

  // Devis trouvé
  const quoteSearch = internalLog.find(e => e.tool === 'search_quotes' && e.rawResult?.found);
  if (quoteSearch) {
    const q = quoteSearch.rawResult.quotes?.[0];
    if (q) { patch.lastEntityId = q.id; patch.lastEntityType = 'quote'; }
  }

  patchMemory(userId, patch);
}

/* ══════════════════════════════════════════════════════════════
   POINT D'ENTRÉE PUBLIC
   ══════════════════════════════════════════════════════════════ */
async function runAgent(userId, messages) {
  // Fallback si pas de clé API
  if (!process.env.ANTHROPIC_API_KEY) {
    const result = await deterministicChat(userId, messages);
    return { ...result, agentLog: [], pendingWorkflow: null };
  }

  let ctx;
  try {
    ctx = await buildContext(userId);
    if (!ctx) throw Object.assign(new Error('Organisation introuvable.'), { status: 404 });
  } catch (err) {
    throw err;
  }

  const lastMsg = (messages[messages.length - 1] || {});

  /* ── Détection de confirmation + workflow en attente ─────────── */
  if (lastMsg.role === 'user' && isConfirmationMessage(lastMsg.content)) {
    const pendingWorkflow = getPendingWorkflow(userId);
    if (pendingWorkflow) {
      clearPendingWorkflow(userId);
      try {
        return await executePendingWorkflow(userId, pendingWorkflow);
      } catch (err) {
        const docType = pendingWorkflow.type === 'update_client' ? 'la mise à jour'
          : pendingWorkflow.type === 'create_invoice' ? 'la facture' : 'le devis';
        return {
          reply:        `Impossible de créer ${docType} : ${err.message}`,
          intent:       'workflow_error',
          pendingWorkflow: null,
          actions:      [{ id: 'dashboard', label: 'Tableau de bord', type: 'redirect', path: '/dashboard', style: 'secondary', icon: 'home' }],
          agentLog:     [],
          journalEntry: { type: 'workflow_error', label: `Erreur workflow : ${err.message}`, status: 'error', at: new Date().toISOString() },
          contextPatch: getMemory(userId),
        };
      }
    }
  }

  /* ── Boucle agentique ─────────────────────────────────────────── */
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

  updateMemoryFromLog(userId, internalLog);

  // Journal frontend (sans rawResult ni données sensibles)
  const agentLog = internalLog.map(e => ({
    tool:          e.tool,
    success:       !e.rawResult?.error,
    resultSummary: e.summary,
    durationMs:    e.durationMs,
    iteration:     e.iteration,
  }));

  const totalMs   = agentLog.reduce((s, e) => s + e.durationMs, 0);
  const journalEntry = agentLog.length > 0 ? {
    type:   'agent_run',
    label:  `Agent — ${agentLog.length} outil(s) — ${totalMs}ms`,
    status: agentLog.every(e => e.success) ? 'success' : 'warning',
    at:     new Date().toISOString(),
  } : null;

  // Extraire le workflow préparé s'il existe (pour le frontend)
  const wfEntry        = internalLog.find(e => e.tool === 'prepare_workflow' && e.rawResult?.ok);
  const pendingWorkflow = wfEntry?.rawResult?.workflow || null;

  return {
    reply:        reply || 'Réponse non disponible. Réessayez.',
    intent:       'agent',
    actions,
    objectCards:  objectCards.length ? objectCards : undefined,
    confidence,
    agentLog,
    journalEntry,
    pendingWorkflow,
    contextPatch: getMemory(userId),
  };
}

module.exports = { runAgent };
