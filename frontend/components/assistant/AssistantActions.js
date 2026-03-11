'use client';

import {
  Plus,
  AlertTriangle,
  BarChart2,
  Send,
  Home,
  Users,
  List,
  BookOpen,
  Bell,
  ArrowRight,
  Loader2,
  ShieldCheck,
  PencilLine,
  CheckCircle2,
} from 'lucide-react';

const ICON_MAP = {
  plus: Plus,
  alert: AlertTriangle,
  chart: BarChart2,
  send: Send,
  home: Home,
  users: Users,
  list: List,
  book: BookOpen,
  bell: Bell,
  shield: ShieldCheck,
  edit: PencilLine,
  check: CheckCircle2,
};

const STYLE_MAP = {
  primary:   'bg-accent-600 text-white hover:bg-accent-700 border-transparent',
  confirm:   'bg-violet-600 text-white hover:bg-violet-700 border-transparent shadow-sm',
  secondary: 'bg-slate-50 text-slate-700 hover:bg-slate-100 border-slate-200',
  warning:   'bg-amber-50 text-amber-700 hover:bg-amber-100 border-amber-200',
  danger:    'bg-red-50 text-red-700 hover:bg-red-100 border-red-200',
};

export default function AssistantActions({ actions, onAction, executingActionId }) {
  if (!actions || actions.length === 0) return null;

  return (
    <div className="mt-2.5 flex flex-col gap-1.5">
      {actions.map((action) => {
        const Icon = ICON_MAP[action.icon] || ArrowRight;
        const style = STYLE_MAP[action.style] || STYLE_MAP.secondary;
        const isRunning = executingActionId === action.id;
        const isDisabled = !!executingActionId;

        return (
          <button
            key={action.id}
            onClick={() => !isDisabled && onAction(action)}
            disabled={isDisabled}
            className={`group flex w-full items-center justify-between rounded-xl border px-3.5 py-2.5 text-left text-[12.5px] font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${style}`}
          >
            <div className="flex min-w-0 items-center gap-2">
              {isRunning ? (
                <Loader2 size={13} className="shrink-0 animate-spin" />
              ) : (
                <Icon size={13} className="shrink-0" />
              )}

              <div className="min-w-0">
                <span className="block truncate">{isRunning ? 'En cours...' : action.label}</span>
                {action.requiresConfirmation && !isRunning && (
                  <span className="block text-[10px] font-semibold uppercase tracking-wide opacity-75">
                    Validation requise
                  </span>
                )}
              </div>
            </div>

            {!isRunning && (
              <ArrowRight size={12} className="shrink-0 opacity-40 transition-all group-hover:translate-x-0.5 group-hover:opacity-70" />
            )}
          </button>
        );
      })}
    </div>
  );
}
