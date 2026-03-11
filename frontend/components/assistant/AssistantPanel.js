'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertCircle,
  ChevronRight,
  Loader2,
  RotateCcw,
  Send,
  Sparkles,
  X,
} from 'lucide-react';
import api from '@/lib/api';
import AssistantActions from './AssistantActions';
import AssistantClientPicker from './AssistantClientPicker';
import AssistantEntityCard from './AssistantEntityCard';
import AssistantHubActions from './AssistantHubActions';
import AssistantJournal from './AssistantJournal';
import AssistantModalHost from './AssistantModalHost';
import AssistantObjectCard from './AssistantObjectCard';
import AssistantSectionReport from './AssistantSectionReport';
import { normalizeAssistantResponse } from '@/lib/assistant/normalizeAssistantResponse';
import AssistantAgentLog from "./AssistantAgentLog";
import AssistantWorkflowCard from "./AssistantWorkflowCard";

const FALLBACK_SUGGESTIONS = [
  { text: 'Anticipe ma tresorerie sur 30 jours' },
  { text: 'Quel est mon score de sante financiere ?' },
  { text: 'Analyse mes depenses du mois' },
  { text: 'Quels fournisseurs me coutent le plus cher ?' },
  { text: 'Propose une meilleure repartition budgetaire' },
  { text: 'Quel est mon bilan du mois ?' },
];

const BADGE_STYLES = {
  warning: 'bg-amber-100 text-amber-700',
  danger: 'bg-red-100 text-red-600',
  info: 'bg-accent-100 text-accent-700',
};

function MsgText({ text }) {
  if (!text) return null;

  return (
    <div className="space-y-2">
      {text.split('\n\n').filter(Boolean).map((block, index) => {
        if (block.startsWith('# ') || block.startsWith('## ')) {
          return (
            <p
              key={index}
              className="mt-3 text-[11px] font-bold uppercase tracking-widest text-slate-500 first:mt-0"
            >
              {block.replace(/^##?\s*/, '')}
            </p>
          );
        }

        if (block.startsWith('**') && block.endsWith('**')) {
          return (
            <p
              key={index}
              className="mt-3 text-[11px] font-bold uppercase tracking-widest text-slate-500 first:mt-0"
            >
              {block.replace(/^\*\*|\*\*$/g, '')}
            </p>
          );
        }

        const lines = block.split('\n').filter(Boolean);
        if (lines.some((line) => line.startsWith('- ') || line.startsWith('* '))) {
          return (
            <ul key={index} className="space-y-1.5">
              {lines.map((line, lineIndex) => (
                <li key={lineIndex} className="flex gap-2 text-[13px] leading-relaxed text-slate-700">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-accent-400" />
                  <span>{line.replace(/^[-*]\s*/, '')}</span>
                </li>
              ))}
            </ul>
          );
        }

        const parts = block.split(/(\*\*[^*]+\*\*)/g);
        return (
          <p key={index} className="text-[13px] leading-relaxed text-slate-700">
            {parts.map((part, partIndex) => (
              part.startsWith('**') && part.endsWith('**')
                ? <strong key={partIndex}>{part.slice(2, -2)}</strong>
                : <span key={partIndex}>{part}</span>
            ))}
          </p>
        );
      })}
    </div>
  );
}

function buildInlineModal(action) {
  if (!action) return null;
  if (action.modal && typeof action.modal === 'object') return action.modal;
  if (!action.modalType) return null;

  return {
    type: action.modalType,
    title: action.modalTitle || '',
    description: action.description || '',
    confirmedFields: action.confirmedFields || [],
    missingFields: action.missingFields || [],
    payload: action.payload || {},
    submitLabel: action.submitLabel || '',
    requiresConfirmation: !!action.requiresConfirmation,
  };
}

function buildLocalAssistantMessage(message) {
  return normalizeAssistantResponse({
    reply: message.content,
    error: message.error,
    actions: message.actions,
    entityCard: message.entityCard,
    objectCards: message.objectCards,
    sections: message.sections,
    modal: message.modal,
    requiresConfirmation: message.requiresConfirmation,
    confidence: message.confidence,
    journalEntry: message.journalEntry,
    guided: message.guided,
    mode: message.mode,
  });
}

export default function AssistantPanel({ open, onClose }) {
  const router = useRouter();
  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const sendRef = useRef(null);

  const [messages, setMessages] = useState([]);
  const [journal, setJournal] = useState([]);
  const [assistantContext, setAssistantContext] = useState({});
  const [pendingModal, setPendingModal] = useState(null);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingSugg, setLoadingSugg] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [executingAction, setExecutingAction] = useState(null);

  useEffect(() => {
    if (open) {
      window.setTimeout(() => inputRef.current?.focus(), 320);
    }
  }, [open]);

  useEffect(() => {
    if (!open || suggestions.length > 0) return;

    setLoadingSugg(true);
    api.get('/api/assistant/suggestions')
      .then(({ data }) => setSuggestions(data.suggestions?.length ? data.suggestions : FALLBACK_SUGGESTIONS))
      .catch(() => setSuggestions(FALLBACK_SUGGESTIONS))
      .finally(() => setLoadingSugg(false));
  }, [open, suggestions.length]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading, pendingModal]);

  const pushJournalEntry = useCallback((entry) => {
    if (!entry) return;
    setJournal((current) => [
      ...current,
      {
        status: entry.status || 'info',
        type: entry.type || 'event',
        label: entry.label || entry.type || 'Evenement',
        at: entry.at || new Date().toISOString(),
      },
    ]);
  }, []);

  const appendAssistantMessage = useCallback((payload) => {
    const normalized = buildLocalAssistantMessage(payload);
    setMessages((current) => [...current, normalized]);
    if (normalized.contextPatch) {
      setAssistantContext((current) => ({ ...current, ...normalized.contextPatch }));
    }
    pushJournalEntry(normalized.journalEntry);
  }, [pushJournalEntry]);

  const openAssistantModal = useCallback((modal) => {
    if (!modal?.type) return;
    setPendingModal(modal);
  }, []);

  const executeAssistantAction = useCallback(async (type, payload) => {
    const { data } = await api.post('/api/assistant/action', {
      type,
      payload: payload || {},
    });
    return data;
  }, []);

  const handleAction = useCallback(async (action) => {
    if (!action) return;

    if (action.type === 'redirect' && action.path) {
      onClose();
      router.push(action.path);
      return;
    }

    if (action.type === 'open_modal') {
      openAssistantModal(buildInlineModal(action));
      return;
    }

    if (action.type === 'fill_prompt') {
      setInput(action.prompt || action.value || '');
      inputRef.current?.focus();
      return;
    }

    if (action.type === 'send_message') {
      await sendRef.current?.(action.prompt || action.message || '');
      return;
    }

    if (action.type !== 'action') return;

    setExecutingAction(action.id);
    try {
      const data = await executeAssistantAction(action.actionType, action.payload || {});

      if (data.redirectTo) {
        onClose();
        router.push(data.redirectTo);
      }

      if (data.message) {
        appendAssistantMessage(data.message);
      } else if (data.redirectTo) {
        appendAssistantMessage({
          content: 'Action executee. Vous pouvez verifier le resultat dans Fluxora.',
          journalEntry: {
            type: 'assistant_action',
            label: action.label || 'Action executee',
            status: 'success',
          },
        });
      }
    } catch (err) {
      appendAssistantMessage({
        content: '',
        error: err.response?.data?.error || "Impossible d'executer cette action.",
      });
    } finally {
      setExecutingAction(null);
    }
  }, [appendAssistantMessage, executeAssistantAction, onClose, openAssistantModal, router]);

  const handleSelectClient = useCallback(async (clientId, clientName, flow) => {
    const modalType = flow === 'create_quote' ? 'create_quote' : 'create_invoice';
    openAssistantModal({
      type: modalType,
      title: flow === 'create_quote' ? 'Creer un devis' : 'Creer une facture',
      confirmedFields: [`Client confirme : ${clientName}`],
      missingFields: flow === 'create_quote' ? ['Prestations', 'Date de validite'] : ['Prestations', 'Date d echeance'],
      payload: {
        initialValues: { clientId },
        client: { id: clientId, name: clientName },
      },
      requiresConfirmation: true,
    });
  }, [openAssistantModal]);

  const handleHubAction = useCallback(async (item) => {
    if (item.path) {
      onClose();
      router.push(item.path);
      return;
    }

    if (item.prompt) {
      await sendRef.current?.(item.prompt);
      return;
    }

    if (item.modal) {
      openAssistantModal(item.modal);
      return;
    }

    if (item.flow === 'create_quote') {
      openAssistantModal({
        type: 'create_quote',
        title: 'Creer un devis',
        description: 'Preparez un devis dans le chat, puis validez manuellement avant envoi.',
        missingFields: ['Client', 'Prestations', 'Date de validite'],
        payload: { initialValues: {} },
        requiresConfirmation: true,
      });
      return;
    }

    if (item.flow === 'create_invoice') {
      openAssistantModal({
        type: 'create_invoice',
        title: 'Creer une facture',
        description: 'Preparez une facture depuis le chat sans modifier automatiquement de statut.',
        missingFields: ['Client', 'Prestations', 'Date d echeance'],
        payload: { initialValues: {} },
        requiresConfirmation: true,
      });
    }
  }, [onClose, openAssistantModal, router]);

  const send = useCallback(async (text) => {
    const msg = (text || input).trim();
    if (!msg || loading) return;

    setInput('');
    setPendingModal(null);

    const userMessage = { role: 'user', content: msg };
    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setLoading(true);

    try {
      const { data } = await api.post('/api/assistant/agent', {
        messages: nextMessages.map((message) => ({ role: message.role, content: message.content })),
        context: assistantContext,
      });

      const normalized = normalizeAssistantResponse(data);
      setMessages((current) => [...current, normalized]);

      if (normalized.contextPatch) {
        setAssistantContext((current) => ({ ...current, ...normalized.contextPatch }));
      }

      pushJournalEntry(normalized.journalEntry);

      if (normalized.modal && normalized.modal.payload?.autoOpen !== false) {
        setPendingModal(normalized.modal);
      }
    } catch (err) {
      const code = err.response?.data?.code;
      const errorMessage = code === 'ASSISTANT_NO_CREDITS'
        ? "Credits IA epuises, l'assistant est temporairement indisponible."
        : code === 'ASSISTANT_INVALID_KEY'
          ? "Assistant IA non configure. Contactez l'administrateur."
          : code === 'ASSISTANT_UNAVAILABLE'
            ? "Assistant temporairement indisponible. Reessayez dans quelques instants."
            : err.response?.data?.error || "Erreur de connexion a l'assistant.";

      setMessages((current) => [...current, { role: 'assistant', content: '', error: errorMessage }]);
      pushJournalEntry({
        type: 'assistant_error',
        label: 'Erreur assistant',
        status: 'error',
      });
    } finally {
      setLoading(false);
    }
  }, [assistantContext, input, loading, messages, pushJournalEntry]);

  useEffect(() => {
    sendRef.current = send;
  }, [send]);

  const clearConversation = () => {
    setMessages([]);
    setJournal([]);
    setAssistantContext({});
    setPendingModal(null);
    setInput('');
    api.post('/api/assistant/reset-context').catch(() => {});
  };

  const onKeyDown = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      send();
    }
  };

  const displaySuggestions = suggestions.length ? suggestions : FALLBACK_SUGGESTIONS;

  return (
    <>
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              key="assistant-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.16 }}
              className="fixed inset-0 z-40 bg-slate-900/20 backdrop-blur-[2px]"
              onClick={onClose}
            />

            <motion.aside
              key="assistant-drawer"
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', stiffness: 340, damping: 36 }}
              className="fixed bottom-0 right-0 top-0 z-50 flex flex-col border-l border-slate-200 bg-white shadow-2xl"
              style={{ width: 'min(460px, 100vw)' }}
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-4 shrink-0">
                <div
                  className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-accent-500 to-accent-700"
                  style={{ boxShadow: '0 4px 12px rgba(28,110,242,0.35)' }}
                >
                  <Sparkles size={16} strokeWidth={1.75} className="text-white" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[14px] font-semibold text-slate-900">Assistant Fluxora</p>
                  <p className="text-[11px] text-slate-400">Agent metier interactif</p>
                </div>
                {messages.length > 0 && (
                  <button
                    onClick={clearConversation}
                    title="Nouvelle conversation"
                    className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
                  >
                    <RotateCcw size={14} />
                  </button>
                )}
                <button
                  onClick={onClose}
                  className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto">
                {messages.length === 0 ? (
                  <div className="space-y-5 px-5 py-6">
                    <div className="flex flex-col items-center text-center">
                      <div
                        className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-accent-50 to-accent-100"
                        style={{ boxShadow: '0 4px 16px rgba(28,110,242,0.10)' }}
                      >
                        <Sparkles size={22} className="text-accent-600" strokeWidth={1.5} />
                      </div>
                      <p className="mb-1 text-[14px] font-semibold text-slate-900">Comment puis-je vous aider ?</p>
                      <p className="max-w-[260px] text-[11px] leading-relaxed text-slate-400">
                        Analyse, brouillons, controles manuels et actions confirmees
                      </p>
                    </div>

                    <AssistantHubActions onAction={handleHubAction} />

                    <div className="flex items-center gap-3">
                      <div className="h-px flex-1 bg-slate-100" />
                      <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-300">
                        Suggestions
                      </span>
                      <div className="h-px flex-1 bg-slate-100" />
                    </div>

                    {loadingSugg ? (
                      <div className="flex items-center gap-2 py-2 text-xs text-slate-400">
                        <Loader2 size={12} className="animate-spin" />
                        <span>Chargement...</span>
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                        {displaySuggestions.map((suggestion, index) => (
                          <button
                            key={index}
                            onClick={() => send(suggestion.text)}
                            className="group flex w-full items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-left text-[12.5px] font-medium text-slate-600 transition-colors hover:bg-slate-100"
                          >
                            <span>{suggestion.text}</span>
                            <div className="ml-2 flex shrink-0 items-center gap-1.5">
                              {suggestion.badge && (
                                <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${BADGE_STYLES[suggestion.badgeStyle] || BADGE_STYLES.info}`}>
                                  {suggestion.badge}
                                </span>
                              )}
                              <ChevronRight size={13} className="text-slate-300 transition-colors group-hover:text-slate-500" />
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4 p-5">
                    {messages.map((message, index) => (
                      <div key={index} className={`flex gap-2.5 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}>
                        {message.role === 'assistant' && (
                          <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-accent-500 to-accent-700">
                            <Sparkles size={12} strokeWidth={1.75} className="text-white" />
                          </div>
                        )}

                        <div className="flex max-w-[88%] flex-col">
                          {(message.content || message.error) && (
                            <div
                              className={
                                message.role === 'user'
                                  ? 'rounded-2xl rounded-tr-md bg-accent-600 px-4 py-2.5 text-white'
                                  : message.error
                                    ? 'rounded-2xl rounded-tl-md border border-red-100 bg-red-50 px-4 py-3'
                                    : 'rounded-2xl rounded-tl-md border border-slate-100 bg-slate-50 px-4 py-3'
                              }
                            >
                              {message.role === 'user' ? (
                                <p className="text-[13px] leading-relaxed">{message.content}</p>
                              ) : message.error ? (
                                <div className="flex items-center gap-2 text-[13px] text-red-600">
                                  <AlertCircle size={14} className="shrink-0" />
                                  <p>{message.error}</p>
                                </div>
                              ) : (
                                <div className="space-y-2">
                                  <MsgText text={message.content} />
                                  {(message.confidence?.label || message.requiresConfirmation) && (
                                    <div className="flex flex-wrap gap-1.5">
                                      {message.confidence?.label && (
                                        <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold text-slate-500">
                                          Confiance {message.confidence.label.toLowerCase()}
                                        </span>
                                      )}
                                      {message.requiresConfirmation && (
                                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                                          Validation requise
                                        </span>
                                      )}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          )}

                          {message.role === 'assistant' && !message.error && message.guided?.type === 'select_client' && (
                            <AssistantClientPicker
                              flow={message.guided.flow}
                              onSelectClient={(clientId, clientName) => handleSelectClient(clientId, clientName, message.guided.flow)}
                              onNewClient={() => openAssistantModal({
                                type: 'create_client',
                                title: 'Creer un client',
                                missingFields: ['Nom du client'],
                                payload: {
                                  initialValues: {},
                                  nextModal: {
                                    type: message.guided.flow === 'create_quote' ? 'create_quote' : 'create_invoice',
                                    title: message.guided.flow === 'create_quote' ? 'Creer un devis' : 'Creer une facture',
                                    payload: { initialValues: {} },
                                  },
                                },
                              })}
                            />
                          )}

                          {message.role === 'assistant' && !message.error && message.entityCard && (
                            <AssistantEntityCard entityCard={message.entityCard} />
                          )}

                          {message.role === 'assistant' && !message.error && message.sections && (
                            <AssistantSectionReport sections={message.sections} />
                          )}

                          {message.role === 'assistant' && !message.error && message.objectCards?.length > 0 && (
                            <div className="mt-2">
                              {message.objectCards.map((card) => (
                                <AssistantObjectCard key={card.id} card={card} />
                              ))}
                            </div>
                          )}

                          {message.role === 'assistant' && !message.error && message.agentLog?.length > 0 && (
                            <AssistantAgentLog entries={message.agentLog} />
                          )}

                          {message.role === 'assistant' && !message.error && message.pendingWorkflow && (
                            <AssistantWorkflowCard workflow={message.pendingWorkflow} />
                          )}

                          {message.role === 'assistant' && !message.error && message.actions?.length > 0 && (
                            <AssistantActions
                              actions={message.actions}
                              onAction={handleAction}
                              executingActionId={executingAction}
                            />
                          )}
                        </div>
                      </div>
                    ))}

                    {loading && (
                      <div className="flex gap-2.5">
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-accent-500 to-accent-700">
                          <Sparkles size={12} strokeWidth={1.75} className="text-white" />
                        </div>
                        <div className="flex items-center gap-2 rounded-2xl rounded-tl-md border border-slate-100 bg-slate-50 px-4 py-3">
                          <Loader2 size={13} className="animate-spin text-slate-400" />
                          <span className="text-[13px] text-slate-400">Analyse en cours...</span>
                        </div>
                      </div>
                    )}

                    <div ref={bottomRef} />
                  </div>
                )}
              </div>

              <AssistantJournal entries={journal} />

              <div className="border-t border-slate-100 p-4 shrink-0">
                <div className="flex gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 transition-all focus-within:border-accent-300 focus-within:ring-2 focus-within:ring-accent-100">
                  <textarea
                    ref={inputRef}
                    rows={1}
                    value={input}
                    onChange={(event) => setInput(event.target.value)}
                    onKeyDown={onKeyDown}
                    placeholder="Posez votre question financiere..."
                    disabled={loading}
                    className="flex-1 resize-none bg-transparent text-[13px] leading-relaxed text-slate-800 outline-none placeholder:text-slate-400"
                    style={{ maxHeight: '88px' }}
                  />
                  <button
                    onClick={() => send()}
                    disabled={!input.trim() || loading}
                    className="self-end flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-accent-600 text-white transition-colors hover:bg-accent-700 disabled:bg-slate-200 disabled:text-slate-400"
                  >
                    <Send size={13} strokeWidth={2} />
                  </button>
                </div>
                <p className="mt-2 text-center text-[10px] text-slate-400">
                  Lecture, analyse, brouillons et actions confirmees uniquement
                </p>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <AssistantModalHost
        key={pendingModal ? `${pendingModal.type}-${pendingModal.title || ''}` : 'assistant-modal'}
        open={!!pendingModal}
        modal={pendingModal}
        onClose={() => setPendingModal(null)}
        onAppendAssistantMessage={appendAssistantMessage}
        onSendFollowUp={send}
        onOpenModal={openAssistantModal}
        onExecuteAssistantAction={executeAssistantAction}
      />
    </>
  );
}
