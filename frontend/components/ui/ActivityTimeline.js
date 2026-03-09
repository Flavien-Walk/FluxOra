'use client';

import { cn } from '@/lib/utils';
import {
  FileText, ClipboardList, CheckCircle2,
  CreditCard, Receipt, ArrowUpRight,
} from 'lucide-react';

/* ─── Event config ───────────────────────────────────── */
const EVENT_CONFIG = {
  invoice_created: {
    icon:  FileText,
    color: 'bg-accent-50 text-accent-600',
    dot:   'bg-accent-500',
    label: 'Facture créée',
  },
  invoice_sent: {
    icon:  ArrowUpRight,
    color: 'bg-blue-50 text-blue-600',
    dot:   'bg-blue-500',
    label: 'Facture envoyée',
  },
  invoice_paid: {
    icon:  CheckCircle2,
    color: 'bg-success-50 text-success-600',
    dot:   'bg-success-500',
    label: 'Paiement reçu',
  },
  quote_created: {
    icon:  ClipboardList,
    color: 'bg-purple-50 text-purple-600',
    dot:   'bg-purple-500',
    label: 'Devis créé',
  },
  quote_accepted: {
    icon:  CheckCircle2,
    color: 'bg-success-50 text-success-600',
    dot:   'bg-success-500',
    label: 'Devis accepté',
  },
  expense_added: {
    icon:  Receipt,
    color: 'bg-warning-50 text-warning-600',
    dot:   'bg-warning-500',
    label: 'Dépense ajoutée',
  },
  payment_received: {
    icon:  CreditCard,
    color: 'bg-success-50 text-success-600',
    dot:   'bg-success-500',
    label: 'Paiement reçu',
  },
};

function fmtRelative(dateStr) {
  if (!dateStr) return '—';
  const date = new Date(dateStr);
  const now  = new Date();
  const diff = now - date;
  const mins = Math.floor(diff / 60000);
  const hrs  = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 60)  return `il y a ${mins}min`;
  if (hrs  < 24)  return `il y a ${hrs}h`;
  if (days === 1) return 'hier';
  if (days < 7)   return `il y a ${days}j`;
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

const fmt = (n) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n ?? 0);

/* ─── Build events from dashboard summary ─────────────── */
export function buildActivityEvents(summary) {
  const events = [];

  (summary?.recentInvoices || []).forEach((inv) => {
    if (inv.status === 'paid' && inv.paidAt) {
      events.push({
        id:    `inv-paid-${inv._id}`,
        type:  'invoice_paid',
        title: inv.number,
        sub:   `${inv.clientId?.name || '—'} · ${fmt(inv.total)}`,
        date:  inv.paidAt,
        href:  `/invoices/${inv._id}`,
      });
    } else if (inv.sentAt) {
      events.push({
        id:    `inv-sent-${inv._id}`,
        type:  'invoice_sent',
        title: inv.number,
        sub:   `${inv.clientId?.name || '—'} · ${fmt(inv.total)}`,
        date:  inv.sentAt,
        href:  `/invoices/${inv._id}`,
      });
    } else {
      events.push({
        id:    `inv-created-${inv._id}`,
        type:  'invoice_created',
        title: inv.number,
        sub:   `${inv.clientId?.name || '—'} · ${fmt(inv.total)}`,
        date:  inv.createdAt || inv.issueDate,
        href:  `/invoices/${inv._id}`,
      });
    }
  });

  (summary?.recentQuotes || []).forEach((q) => {
    events.push({
      id:    `q-${q._id}`,
      type:  q.status === 'accepted' ? 'quote_accepted' : 'quote_created',
      title: q.number,
      sub:   `${q.clientId?.name || '—'} · ${fmt(q.total)}`,
      date:  q.createdAt || q.issueDate,
      href:  `/quotes/${q._id}`,
    });
  });

  return events
    .filter((e) => e.date)
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 7);
}

/* ─── TimelineItem ───────────────────────────────────── */
function TimelineItem({ event, isLast }) {
  const cfg = EVENT_CONFIG[event.type] ?? EVENT_CONFIG.invoice_created;
  const Icon = cfg.icon;

  return (
    <div className="flex gap-3 relative">
      {/* Vertical line */}
      {!isLast && (
        <div className="absolute left-[15px] top-8 bottom-0 w-px bg-slate-100" />
      )}

      {/* Icon */}
      <div className={cn(
        'w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 z-10',
        cfg.color
      )}>
        <Icon size={14} strokeWidth={1.75} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 pb-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-sm font-medium text-slate-800 truncate">{event.title}</p>
            <p className="text-xs text-slate-400 truncate mt-0.5">{event.sub}</p>
          </div>
          <span className="text-[11px] text-slate-400 whitespace-nowrap flex-shrink-0 mt-0.5">
            {fmtRelative(event.date)}
          </span>
        </div>
        <span className={cn(
          'inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide mt-1.5',
          'px-1.5 py-0.5 rounded',
          cfg.color
        )}>
          <span className={cn('w-1.5 h-1.5 rounded-full', cfg.dot)} />
          {cfg.label}
        </span>
      </div>
    </div>
  );
}

/* ─── ActivityTimeline ───────────────────────────────── */
export default function ActivityTimeline({ events = [], isLoading = false }) {
  if (isLoading) {
    return (
      <div className="space-y-4 p-1">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex gap-3">
            <div className="w-8 h-8 rounded-lg bg-slate-100 animate-pulse flex-shrink-0" />
            <div className="flex-1 space-y-2 pt-1">
              <div className="h-3 bg-slate-100 rounded animate-pulse w-3/4" />
              <div className="h-2.5 bg-slate-100 rounded animate-pulse w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="py-8 text-center">
        <p className="text-sm text-slate-400">Aucune activité récente</p>
      </div>
    );
  }

  return (
    <div className="space-y-0">
      {events.map((event, idx) => (
        <TimelineItem
          key={event.id}
          event={event}
          isLast={idx === events.length - 1}
        />
      ))}
    </div>
  );
}
