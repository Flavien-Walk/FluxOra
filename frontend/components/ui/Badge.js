const variants = {
  default: 'bg-gray-100 text-gray-700',
  success: 'bg-green-100 text-green-700',
  warning: 'bg-yellow-100 text-yellow-700',
  danger: 'bg-red-100 text-red-700',
  info: 'bg-blue-100 text-blue-700',
  indigo: 'bg-indigo-100 text-indigo-700',
  purple: 'bg-purple-100 text-purple-700',
};

// Mapping automatique pour les statuts de facture + devis
const statusVariant = {
  // Facture
  draft: 'default',
  sent: 'info',
  email_opened: 'indigo',
  viewed: 'indigo',
  payment_pending: 'purple',
  paid: 'success',
  late: 'danger',
  cancelled: 'warning',
  // Devis
  accepted: 'success',
  refused: 'danger',
  rejected: 'danger',
  expired: 'warning',
};

const statusLabel = {
  // Facture
  draft: 'Brouillon',
  sent: 'Envoyé(e)',
  email_opened: 'Email ouvert',
  viewed: 'Consulté(e)',
  payment_pending: 'Paiement en cours',
  paid: 'Payée',
  late: 'En retard',
  cancelled: 'Annulée',
  // Devis
  accepted: 'Accepté',
  refused: 'Refusé',
  rejected: 'Refusé',
  expired: 'Expiré',
};

export default function Badge({ children, variant = 'default', status }) {
  const resolvedVariant = status ? statusVariant[status] || 'default' : variant;
  const label = status ? statusLabel[status] || status : children;

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${variants[resolvedVariant]}`}
    >
      {label}
    </span>
  );
}
