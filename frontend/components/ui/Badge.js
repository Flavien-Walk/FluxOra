import { cn } from '@/lib/utils';

/* ─── Variants ─────────────────────────────────────────── */
const variants = {
  default:  { bg: 'bg-slate-100',   text: 'text-slate-600',   dot: 'bg-slate-400'   },
  success:  { bg: 'bg-success-50',  text: 'text-success-700', dot: 'bg-success-500' },
  warning:  { bg: 'bg-warning-50',  text: 'text-warning-700', dot: 'bg-warning-500' },
  danger:   { bg: 'bg-danger-50',   text: 'text-danger-700',  dot: 'bg-danger-500'  },
  info:     { bg: 'bg-accent-50',   text: 'text-accent-600',  dot: 'bg-accent-500'  },
  indigo:   { bg: 'bg-accent-50',   text: 'text-accent-700',  dot: 'bg-accent-500'  },
  purple:   { bg: 'bg-purple-50',   text: 'text-purple-700',  dot: 'bg-purple-500'  },
  orange:   { bg: 'bg-orange-50',   text: 'text-orange-700',  dot: 'bg-orange-500'  },
};

/* ─── Status → variant mapping ─────────────────────────── */
const STATUS_VARIANT = {
  // Invoice
  draft:           'default',
  sent:            'info',
  email_opened:    'indigo',
  viewed:          'indigo',
  payment_pending: 'purple',
  paid:            'success',
  late:            'danger',
  overdue:         'danger',
  financing:       'orange',
  recovery:        'purple',
  cancelled:       'default',
  // Quote
  accepted:        'success',
  refused:         'danger',
  rejected:        'danger',
  expired:         'warning',
  // Expense
  validated:       'success',
  pending_review:  'warning',
  non_eligible:    'default',
  // Transfer
  processing:      'warning',
  completed:       'success',
  failed:          'danger',
};

const STATUS_LABEL = {
  draft:           'Brouillon',
  sent:            'Envoyé(e)',
  email_opened:    'Email ouvert',
  viewed:          'Consulté(e)',
  payment_pending: 'Paiement en cours',
  paid:            'Payée',
  late:            'En retard',
  overdue:         'Échue',
  financing:       'Financée',
  recovery:        'En recouvrement',
  cancelled:       'Annulée',
  accepted:        'Accepté',
  refused:         'Refusé',
  rejected:        'Refusé',
  expired:         'Expiré',
  validated:       'Validée',
  pending_review:  'À vérifier',
  non_eligible:    'Non éligible',
  processing:      'En cours',
  completed:       'Effectué',
  failed:          'Échoué',
};

/* ─── Statuts avec dot pulsé (actifs) ──────────────────── */
const PULSING = new Set(['processing', 'payment_pending', 'sent', 'email_opened']);

export default function Badge({ children, variant, status, dot = true, className }) {
  const resolvedVariant = status
    ? (STATUS_VARIANT[status] ?? 'default')
    : (variant ?? 'default');
  const label = status ? (STATUS_LABEL[status] ?? status) : children;
  const c = variants[resolvedVariant] ?? variants.default;
  const pulse = status && PULSING.has(status);

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium',
        c.bg, c.text,
        className
      )}
    >
      {dot && (
        <span className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', c.dot, pulse && 'animate-pulse')} />
      )}
      {label}
    </span>
  );
}
