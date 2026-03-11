'use client';

import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronRight, CheckCircle2, XCircle, Bot } from 'lucide-react';

const TOOL_LABELS = {
  search_clients:        'Recherche client',
  search_invoices:       'Recherche factures',
  search_quotes:         'Recherche devis',
  search_expenses:       'Recherche dépenses',
  get_client_history:    'Historique client',
  check_draft_duplicate: 'Vérif. doublons',
  list_late_invoices:    'Factures en retard',
  list_alerts:           'Alertes comptables',
  get_expense_categories:'Catégories dépenses',
  prepare_workflow:      'Préparation workflow',
};

export default function AssistantAgentLog({ entries }) {
  const [expanded, setExpanded] = useState(false);

  if (!entries?.length) return null;

  const totalMs = entries.reduce((s, e) => s + (e.durationMs || 0), 0);
  const allSuccess = entries.every((e) => e.success);

  return (
    <div className="mt-2">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-[10px] text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
      >
        <Bot size={11} />
        <span>{entries.length} outil{entries.length > 1 ? 's' : ''} · {totalMs}ms</span>
        <ChevronRight
          size={10}
          className={`transition-transform duration-150 ${expanded ? 'rotate-90' : ''}`}
        />
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            key="agent-log"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden"
          >
            <div className="mt-1.5 space-y-1">
              {entries.map((entry, index) => (
                <div
                  key={index}
                  className="flex items-start gap-2 rounded-lg border border-slate-100 bg-slate-50 px-2.5 py-2"
                >
                  {entry.success ? (
                    <CheckCircle2 size={11} className="mt-0.5 shrink-0 text-emerald-500" />
                  ) : (
                    <XCircle size={11} className="mt-0.5 shrink-0 text-red-400" />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-[10px] font-semibold text-slate-600">
                        {TOOL_LABELS[entry.tool] || entry.tool}
                      </span>
                      <span className="shrink-0 text-[10px] text-slate-400">{entry.durationMs}ms</span>
                    </div>
                    <p className="mt-0.5 text-[10px] leading-relaxed text-slate-500 truncate">
                      {entry.resultSummary}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
