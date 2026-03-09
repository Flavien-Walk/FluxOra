import { cn } from '@/lib/utils';

/* ─── Variants ─────────────────────────────────────────── */
const variants = {
  default:  { bg: 'bg-gray-100',   text: 'text-gray-600',   dot: 'bg-gray-400'   },
  success:  { bg: 'bg-green-50',   text: 'text-green-700',  dot: 'bg-green-500'  },
  warning:  { bg: 'bg-amber-50',   text: 'text-amber-700',  dot: 'bg-amber-400'  },
  danger:   { bg: 'bg-red-50',     text: 'text-red-700',    dot: 'bg-red-500'    },
  info:     { bg: 'bg-blue-50',    text: 'text-blue-700',   dot: 'bg-blue-500'   },
  indigo:   { bg: 'bg-indigo-50',  text: 'text-indigo-700', dot: 'bg-indigo-500' },
  purple:   { bg: 'bg-purple-50',  text: 'text-purple-700', dot: 'bg-purple-500' },
  orange:   { bg: 'bg-orange-50',  text: 'text-orange-700', dot: 'bg-orange-500' },
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
