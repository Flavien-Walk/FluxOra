'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, X, Send, RotateCcw, AlertCircle, Loader2, ChevronRight } from 'lucide-react';
import api from '@/lib/api';
import AssistantActions from './AssistantActions';
import AssistantEntityCard from './AssistantEntityCard';

/* ── Suggestions statiques fallback ─────────────────────────── */
const FALLBACK_SUGGESTIONS = [
  { text: 'Anticipe ma trésorerie sur 30 jours' },
  { text: 'Quel est mon score de santé financière ?' },
  { text: 'Analyse mes dépenses du mois' },
  { text: 'Quels fournisseurs me coûtent le plus cher ?' },
  { text: 'Propose une meilleure répartition budgétaire' },
  { text: 'Créer une nouvelle facture' },
];

const BADGE_STYLES = {
  warning: 'bg-amber-100 text-amber-700',
  danger:  'bg-red-100 text-red-600',
  info:    'bg-accent-100 text-accent-700',
};

/* ── Rendu texte assistant ───────────────────────────────────── */
function MsgText({ text }) {
  return (
    <div className="space-y-2">
      {text.split('\n\n').filter(Boolean).map((block, i) => {
        if (block.startsWith('## ') || (block.startsWith('**') && block.endsWith('**'))) {
          return (
            <p key={i} className="text-[11px] font-bold uppercase tracking-widest text-slate-500 mt-3 first:mt-0">
              {block.replace(/^##\s*/, '').replace(/^\*\*|\*\*$/g, '')}
            </p>
          );
        }
        const lines = block.split('\n').filter(Boolean);
        if (lines.some(l => l.startsWith('- ') || l.startsWith('• '))) {
          return (
            <ul key={i} className="space-y-1.5">
              {lines.map((line, j) => (
                <li key={j} className="flex gap-2 text-[13px] text-slate-700 leading-relaxed">
                  <span className="mt-2 w-1.5 h-1.5 rounded-full bg-accent-400 shrink-0" />
                  <span>{line.replace(/^[-•]\s*/, '')}</span>
                </li>
              ))}
            </ul>
          );
        }
        return <p key={i} className="text-[13px] text-slate-700 leading-relaxed">{block}</p>;
      })}
    </div>
  );
}

/* ── Composant principal ────────────────────────────────────── */
export default function AssistantPanel({ open, onClose }) {
  const router = useRouter();
  const [messages,    setMessages]    = useState([]);
  const [input,       setInput]       = useState('');
  const [loading,     setLoading]     = useState(false);
  const [suggestions,      setSuggestions]      = useState([]);
  const [loadingSugg,      setLoadingSugg]      = useState(false);
  const [executingAction,  setExecutingAction]  = useState(null);
  const bottomRef = useRef(null);
  const inputRef  = useRef(null);

  /* Focus à l'ouverture */
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 320);
  }, [open]);

  /* Charger suggestions dynamiques à chaque première ouverture */
  useEffect(() => {
    if (!open || suggestions.length > 0) return;
    setLoadingSugg(true);
    api.get('/api/assistant/suggestions')
      .then(({ data }) => setSuggestions(data.suggestions?.length ? data.suggestions : FALLBACK_SUGGESTIONS))
      .catch(() => setSuggestions(FALLBACK_SUGGESTIONS))
      .finally(() => setLoadingSugg(false));
  }, [open]);

  /* Scroll to bottom */
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  /* Exécution / navigation depuis une action ─────────────────── */
  const handleAction = useCallback(async (action) => {
    if (action.type === 'redirect' && action.path) {
      onClose();
      router.push(action.path);
    } else if (action.type === 'action') {
      setExecutingAction(action.id);
      try {
        const { data } = await api.post('/api/assistant/action', {
          type:    action.actionType,
          payload: action.payload || {},
        });
        if (data.redirectTo) { onClose(); router.push(data.redirectTo); }
      } catch (err) {
        const errMsg = err.response?.data?.error || "Impossible d'exécuter cette action.";
        setMessages(prev => [...prev, { role: 'assistant', content: null, error: errMsg }]);
      } finally {
        setExecutingAction(null);
      }
    }
  }, [onClose, router]);

  const send = useCallback(async (text) => {
    const msg = (text || input).trim();
    if (!msg || loading) return;
    setInput('');

    const userMsg = { role: 'user', content: msg };
    const next    = [...messages, userMsg];
    setMessages(next);
    setLoading(true);

    try {
      const { data } = await api.post('/api/assistant/chat', {
        messages: next.map(m => ({ role: m.role, content: m.content })),
      });
      setMessages(prev => [...prev, {
        role:       'assistant',
        content:    data.reply,
        actions:    data.actions    || [],
        entityCard: data.entityCard || null,
      }]);
    } catch (err) {
      const code   = err.response?.data?.code;
      const errMsg = code === 'ASSISTANT_NO_CREDITS'
        ? "Crédits IA épuisés — l'assistant est temporairement indisponible."
        : code === 'ASSISTANT_INVALID_KEY'
          ? 'Assistant IA non configuré. Contactez l\'administrateur.'
          : code === 'ASSISTANT_UNAVAILABLE'
            ? 'Assistant temporairement indisponible. Réessayez dans quelques instants.'
            : err.response?.data?.error || "Erreur de connexion à l'assistant.";
      setMessages(prev => [...prev, { role: 'assistant', content: null, error: errMsg }]);
    } finally {
      setLoading(false);
    }
  }, [input, messages, loading]);

  const clear = () => { setMessages([]); setInput(''); };

  const onKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.16 }}
            className="fixed inset-0 z-40 bg-slate-900/20 backdrop-blur-[2px]"
            onClick={onClose}
          />

          {/* Drawer */}
          <motion.aside
            key="drawer"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 340, damping: 36 }}
            className="fixed top-0 right-0 bottom-0 z-50 flex flex-col bg-white border-l border-slate-200 shadow-2xl"
            style={{ width: 'min(440px, 100vw)' }}
            onClick={e => e.stopPropagation()}
          >

            {/* ── Header ─────────────────────────────────── */}
            <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100 shrink-0">
              <div
                className="w-9 h-9 rounded-xl bg-gradient-to-br from-accent-500 to-accent-700 flex items-center justify-center"
                style={{ boxShadow: '0 4px 12px rgba(28,110,242,0.35)' }}
              >
                <Sparkles size={16} strokeWidth={1.75} className="text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[14px] font-semibold text-slate-900">Assistant Fluxora</p>
                <p className="text-[11px] text-slate-400">Copilote financier IA</p>
              </div>
              {messages.length > 0 && (
                <button
                  onClick={clear}
                  title="Nouvelle conversation"
                  className="p-2 rounded-lg hover:bg-slate-100 transition-colors text-slate-400 hover:text-slate-600"
                >
                  <RotateCcw size={14} />
                </button>
              )}
              <button
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-slate-100 transition-colors text-slate-400 hover:text-slate-600"
              >
                <X size={16} />
              </button>
            </div>

            {/* ── Messages ───────────────────────────────── */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {messages.length === 0 ? (

                /* État vide — suggestions dynamiques */
                <div className="h-full flex flex-col items-center justify-center text-center px-4">
                  <div
                    className="w-16 h-16 rounded-2xl bg-gradient-to-br from-accent-50 to-accent-100 flex items-center justify-center mb-4"
                    style={{ boxShadow: '0 4px 20px rgba(28,110,242,0.12)' }}
                  >
                    <Sparkles size={26} className="text-accent-600" strokeWidth={1.5} />
                  </div>
                  <p className="text-sm font-semibold text-slate-800 mb-1.5">Comment puis-je vous aider ?</p>
                  <p className="text-xs text-slate-400 mb-6 max-w-[270px] leading-relaxed">
                    Analysez vos finances, anticipez votre trésorerie et lancez des actions directement depuis ici.
                  </p>

                  {loadingSugg ? (
                    <div className="flex items-center gap-2 text-slate-400 text-xs">
                      <Loader2 size={13} className="animate-spin" />
                      <span>Chargement des suggestions…</span>
                    </div>
                  ) : (
                    <div className="w-full space-y-2">
                      {(suggestions.length ? suggestions : FALLBACK_SUGGESTIONS).map((s, i) => (
                        <button
                          key={i}
                          onClick={() => send(s.text)}
                          className="w-full flex items-center justify-between text-left text-[12.5px] font-medium text-slate-600 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl px-4 py-2.5 transition-colors group"
                        >
                          <span>{s.text}</span>
                          <div className="flex items-center gap-1.5 shrink-0 ml-2">
                            {s.badge && (
                              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${BADGE_STYLES[s.badgeStyle] || BADGE_STYLES.info}`}>
                                {s.badge}
                              </span>
                            )}
                            <ChevronRight size={13} className="text-slate-300 group-hover:text-slate-500 transition-colors" />
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

              ) : (

                /* Messages du chat */
                <>
                  {messages.map((msg, i) => (
                    <div key={i} className={`flex gap-2.5 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                      {msg.role === 'assistant' && (
                        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-accent-500 to-accent-700 flex items-center justify-center shrink-0 mt-0.5">
                          <Sparkles size={12} strokeWidth={1.75} className="text-white" />
                        </div>
                      )}

                      <div className="max-w-[86%] flex flex-col">
                        <div className={`${
                          msg.role === 'user'
                            ? 'bg-accent-600 text-white rounded-2xl rounded-tr-md px-4 py-2.5'
                            : msg.error
                              ? 'bg-red-50 border border-red-100 rounded-2xl rounded-tl-md px-4 py-3'
                              : 'bg-slate-50 border border-slate-100 rounded-2xl rounded-tl-md px-4 py-3'
                        }`}>
                          {msg.role === 'user' ? (
                            <p className="text-[13px] leading-relaxed">{msg.content}</p>
                          ) : msg.error ? (
                            <div className="flex items-center gap-2 text-red-600 text-[13px]">
                              <AlertCircle size={14} className="shrink-0" />
                              <p>{msg.error}</p>
                            </div>
                          ) : (
                            <MsgText text={msg.content} />
                          )}
                        </div>

                        {/* Carte entité — client trouvé / introuvable */}
                        {msg.role === 'assistant' && !msg.error && msg.entityCard && (
                          <AssistantEntityCard entityCard={msg.entityCard} />
                        )}

                        {/* Actions suggérées — s'affichent sous la bulle */}
                        {msg.role === 'assistant' && !msg.error && msg.actions?.length > 0 && (
                          <AssistantActions
                            actions={msg.actions}
                            onAction={handleAction}
                            executingActionId={executingAction}
                          />
                        )}
                      </div>
                    </div>
                  ))}

                  {loading && (
                    <div className="flex gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-accent-500 to-accent-700 flex items-center justify-center shrink-0">
                        <Sparkles size={12} strokeWidth={1.75} className="text-white" />
                      </div>
                      <div className="bg-slate-50 border border-slate-100 rounded-2xl rounded-tl-md px-4 py-3 flex items-center gap-2">
                        <Loader2 size={13} className="animate-spin text-slate-400" />
                        <span className="text-[13px] text-slate-400">Analyse en cours…</span>
                      </div>
                    </div>
                  )}

                  <div ref={bottomRef} />
                </>
              )}
            </div>

            {/* ── Input ──────────────────────────────────── */}
            <div className="border-t border-slate-100 p-4 shrink-0">
              <div className="flex gap-2 bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2.5 focus-within:border-accent-300 focus-within:ring-2 focus-within:ring-accent-100 transition-all">
                <textarea
                  ref={inputRef}
                  rows={1}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={onKey}
                  placeholder="Posez votre question financière…"
                  disabled={loading}
                  className="flex-1 bg-transparent text-[13px] text-slate-800 placeholder:text-slate-400 resize-none outline-none leading-relaxed"
                  style={{ maxHeight: '88px' }}
                />
                <button
                  onClick={() => send()}
                  disabled={!input.trim() || loading}
                  className="self-end w-8 h-8 rounded-xl bg-accent-600 hover:bg-accent-700 disabled:bg-slate-200 text-white disabled:text-slate-400 flex items-center justify-center transition-colors shrink-0"
                >
                  <Send size={13} strokeWidth={2} />
                </button>
              </div>
              <p className="text-[10px] text-slate-400 text-center mt-2">
                Données en temps réel · Les actions vous redirigent dans Fluxora
              </p>
            </div>

          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
