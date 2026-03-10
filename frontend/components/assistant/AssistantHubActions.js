'use client';

import {
  BarChart2,
  BookOpen,
  FileText,
  Receipt,
  Search,
  Send,
  UserPlus,
} from 'lucide-react';

const HUB = [
  {
    id: 'hub_quote',
    label: 'Créer un devis',
    icon: FileText,
    color: 'bg-accent-50 text-accent-600 hover:bg-accent-100',
    flow: 'create_quote',
  },
  {
    id: 'hub_invoice',
    label: 'Créer une facture',
    icon: Receipt,
    color: 'bg-violet-50 text-violet-600 hover:bg-violet-100',
    flow: 'create_invoice',
  },
  {
    id: 'hub_find',
    label: 'Retrouver une facture',
    icon: Search,
    color: 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100',
    prompt: "J'ai reçu un paiement, retrouve la facture correspondante.",
  },
  {
    id: 'hub_client',
    label: 'Créer un client',
    icon: UserPlus,
    color: 'bg-amber-50 text-amber-600 hover:bg-amber-100',
    modal: {
      type: 'create_client',
      title: 'Créer un client',
      description: 'Ajoutez un nouveau client à votre base Fluxora.',
      missingFields: ['Nom', 'Email', 'Société (optionnel)'],
      payload: { initialValues: {} },
      requiresConfirmation: false,
    },
  },
  {
    id: 'hub_transfer',
    label: 'Virement',
    icon: Send,
    color: 'bg-sky-50 text-sky-600 hover:bg-sky-100',
    path: '/transfers',
  },
  {
    id: 'hub_expenses',
    label: 'Dépenses',
    icon: BarChart2,
    color: 'bg-slate-50 text-slate-600 hover:bg-slate-100',
    path: '/expenses',
  },
  {
    id: 'hub_accounting',
    label: 'Comptabilité',
    icon: BookOpen,
    color: 'bg-rose-50 text-rose-600 hover:bg-rose-100',
    path: '/accounting',
  },
];

export default function AssistantHubActions({ onAction }) {
  return (
    <div>
      <p className="mb-2.5 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
        Actions rapides
      </p>
      <div className="grid grid-cols-3 gap-2">
        {HUB.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => onAction(item)}
              className={`flex flex-col items-center gap-1.5 rounded-xl px-2 py-3 text-center transition-colors ${item.color}`}
            >
              <Icon size={18} strokeWidth={1.75} />
              <span className="text-[11px] font-medium leading-tight">{item.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
