'use client';

import { FileText, Receipt, BookOpen, UserPlus, Send, BarChart2 } from 'lucide-react';

const HUB = [
  {
    id:    'hub_quote',
    label: 'Créer un devis',
    icon:  FileText,
    color: 'from-accent-50 to-accent-100 border-accent-100 text-accent-700 hover:border-accent-300',
    flow:  'create_quote',
  },
  {
    id:    'hub_invoice',
    label: 'Créer une facture',
    icon:  Receipt,
    color: 'from-violet-50 to-violet-100 border-violet-100 text-violet-700 hover:border-violet-300',
    flow:  'create_invoice',
  },
  {
    id:    'hub_accounting',
    label: 'Écriture comptable',
    icon:  BookOpen,
    color: 'from-emerald-50 to-emerald-100 border-emerald-100 text-emerald-700 hover:border-emerald-300',
    path:  '/accounting',
  },
  {
    id:    'hub_client',
    label: 'Créer un client',
    icon:  UserPlus,
    color: 'from-amber-50 to-amber-100 border-amber-100 text-amber-700 hover:border-amber-300',
    path:  '/clients',
  },
  {
    id:    'hub_transfer',
    label: 'Virement',
    icon:  Send,
    color: 'from-sky-50 to-sky-100 border-sky-100 text-sky-700 hover:border-sky-300',
    path:  '/transfers',
  },
  {
    id:    'hub_expenses',
    label: 'Dépenses',
    icon:  BarChart2,
    color: 'from-slate-50 to-slate-100 border-slate-200 text-slate-600 hover:border-slate-300',
    path:  '/expenses',
  },
];

export default function AssistantHubActions({ onAction }) {
  return (
    <div className="w-full">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 mb-2.5">Actions rapides</p>
      <div className="grid grid-cols-3 gap-2">
        {HUB.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => onAction(item)}
              className={`flex flex-col items-center gap-2 rounded-xl border bg-gradient-to-b p-3.5 text-center transition-all hover:shadow-sm active:scale-95 ${item.color}`}
            >
              <Icon size={17} />
              <span className="text-[11px] font-semibold leading-tight">{item.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
