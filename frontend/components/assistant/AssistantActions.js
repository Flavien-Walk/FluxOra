'use client';

import { Plus, AlertTriangle, BarChart2, Send, Home, Users, List, BookOpen, Bell, ArrowRight } from 'lucide-react';

const ICON_MAP = {
  plus:  Plus,
  alert: AlertTriangle,
  chart: BarChart2,
  send:  Send,
  home:  Home,
  users: Users,
  list:  List,
  book:  BookOpen,
  bell:  Bell,
};

const STYLE_MAP = {
  primary:   'bg-accent-600 text-white hover:bg-accent-700 border-transparent',
  secondary: 'bg-slate-50 text-slate-700 hover:bg-slate-100 border-slate-200',
  warning:   'bg-amber-50 text-amber-700 hover:bg-amber-100 border-amber-200',
  danger:    'bg-red-50 text-red-700 hover:bg-red-100 border-red-200',
};

export default function AssistantActions({ actions, onAction }) {
  if (!actions || actions.length === 0) return null;

  return (
    <div className="flex flex-col gap-1.5 mt-2.5">
      {actions.map((action) => {
        const Icon  = ICON_MAP[action.icon] || ArrowRight;
        const style = STYLE_MAP[action.style] || STYLE_MAP.secondary;
        return (
          <button
            key={action.id}
            onClick={() => onAction(action)}
            className={`flex items-center justify-between w-full rounded-xl px-3.5 py-2.5 text-[12.5px] font-medium border transition-colors text-left group ${style}`}
          >
            <div className="flex items-center gap-2">
              <Icon size={13} className="shrink-0" />
              <span>{action.label}</span>
            </div>
            <ArrowRight size={12} className="shrink-0 opacity-40 group-hover:opacity-70 group-hover:translate-x-0.5 transition-all" />
          </button>
        );
      })}
    </div>
  );
}
