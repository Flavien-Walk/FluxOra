'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useInvoices } from '@/hooks/useInvoices';
import { cn } from '@/lib/utils';
import Header from '@/components/layout/Header';
import { Card } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Modal from '@/components/ui/Modal';
import EmptyState from '@/components/ui/EmptyState';
import { SkeletonTable } from '@/components/ui/Skeleton';
import InvoiceForm from '@/components/modules/InvoiceForm';
import OverdueActionModal from '@/components/modules/OverdueActionModal';
import { FilePlus, FileText, ChevronRight, Search, X, AlertTriangle, Wallet, Shield } from 'lucide-react';
import { getNextInvoiceReminder, computeRiskScore } from '@/lib/reminderUtils';

const FILTERS = [
  { label: 'Toutes',     value: '' },
  { label: 'Brouillon', value: 'draft' },
  { label: 'Envoyées',  value: 'sent' },
  { label: 'Payées',    value: 'paid' },
  { label: 'En retard', value: 'late' },
  { label: 'Échues',    value: 'overdue' },
];

/* Statuts non payés pouvant devenir "échue" */
const UNPAID = new Set(['sent', 'email_opened', 'viewed', 'payment_pending', 'late']);

const fmt = (n) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n);
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('fr-FR') : '—');

export default function InvoicesPage() {
  const router = useRouter();
  const [filter, setFilter]               = useState('');
  const [search, setSearch]               = useState('');
  const [modalOpen, setModalOpen]         = useState(false);
  const [overdueModal, setOverdueModal]   = useState(null); // { type, invoice }
  const [localStatuses, setLocalStatuses] = useState({});   // { [_id]: 'financing'|'recovery' }

  /* Quand filtre=overdue, on fetch tout puis on filtre côté client */
  const apiFilter = filter === 'overdue' ? '' : filter;
  const { invoices: allInvoices, isLoading, mutate } = useInvoices(apiFilter);

  /* Enrichissement : overdue detection + overrides locaux + search + filtre */
  const invoices = useMemo(() => {
    const now = Date.now();

    let list = allInvoices.map((inv) => {
      // Override optimiste (après action Financer/Recouvrer)
      if (localStatuses[inv._id]) return { ...inv, status: localStatuses[inv._id] };

      // Détection overdue côté client
      if (UNPAID.has(inv.status) && inv.dueDate) {
        const due = new Date(inv.dueDate).getTime();
        if (due < now) {
          const days = Math.floor((now - due) / 86_400_000);
          return { ...inv, status: 'overdue', _overdueDays: days };
        }
      }
      return inv;
    });

    if (filter === 'overdue') list = list.filter((inv) => inv.status === 'overdue');

    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (inv) =>
          inv.number?.toLowerCase().includes(q) ||
          inv.clientId?.name?.toLowerCase().includes(q) ||
          inv.clientId?.company?.toLowerCase().includes(q),
      );
    }

    return list;
  }, [allInvoices, search, localStatuses, filter]);

  const handleOverdueSuccess = (invoiceId, actionType) => {
    setLocalStatuses((prev) => ({ ...prev, [invoiceId]: actionType }));
    mutate(); // rafraîchit SWR en arrière-plan
  };

  return (
    <>
      <Header
        title="Factures"
        actions={
          <Button size="sm" onClick={() => setModalOpen(true)}>
            <FilePlus size={14} /> Nouvelle facture
          </Button>
        }
      />

      <div className="flex-1 p-6">
        {/* ── Filtres + recherche ── */}
        <div className="flex items-center gap-3 mb-5 flex-wrap">
          <div className="flex gap-1.5 flex-wrap">
            {FILTERS.map(({ label, value }) => (
              <button
                key={value}
                onClick={() => setFilter(value)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-150',
                  filter === value
                    ? 'bg-accent-600 text-white shadow-xs'
                    : 'bg-white border border-[rgba(148,163,184,0.4)] text-slate-600 hover:bg-slate-50 hover:border-slate-300',
                )}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="relative ml-auto">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="N° ou client…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 pr-8 h-9 w-48 bg-white border border-[rgba(148,163,184,0.4)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent placeholder:text-slate-400"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X size={13} />
              </button>
            )}
          </div>
        </div>

        {/* ── Contenu ── */}
        {isLoading ? (
          <Card><SkeletonTable rows={6} cols={6} /></Card>
        ) : allInvoices.length === 0 ? (
          <Card>
            <EmptyState
              icon={FileText}
              title="Aucune facture"
              description={filter ? 'Aucune facture avec ce statut.' : 'Créez votre première facture.'}
              action={!filter ? () => setModalOpen(true) : undefined}
              actionLabel="Nouvelle facture"
            />
          </Card>
        ) : invoices.length === 0 ? (
          <Card>
            <div className="py-12 text-center">
              <p className="text-sm text-slate-400">
                {search
                  ? `Aucun résultat pour « ${search} »`
                  : 'Aucune facture échue pour le moment.'}
              </p>
            </div>
          </Card>
        ) : (
          <Card>
            {/* En-tête tableau */}
            <div className="hidden sm:grid grid-cols-12 gap-4 px-5 py-3 border-b border-slate-100 bg-slate-50/60 text-[11px] font-semibold text-slate-400 uppercase tracking-wide">
              <span className="col-span-2">Numéro</span>
              <span className="col-span-3">Client</span>
              <span className="col-span-2">Statut</span>
              <span className="col-span-2">Échéance</span>
              <span className="col-span-2 text-right">Montant TTC</span>
              <span className="col-span-1" />
            </div>

            {/* Lignes */}
            <div className="divide-y divide-[rgba(148,163,184,0.12)]">
              {invoices.map((inv) => {
                const isOverdue   = inv.status === 'overdue';
                const actionType  = isOverdue
                  ? (inv._overdueDays < 30 ? 'financing' : 'recovery')
                  : null;

                return (
                  <div
                    key={inv._id}
                    onClick={() => router.push(`/invoices/${inv._id}`)}
                    className={cn(
                      'row-accent grid grid-cols-12 gap-4 px-5 py-3.5 items-center transition-colors group cursor-pointer',
                      isOverdue
                        ? 'hover:bg-danger-50/30 border-l-2 border-l-danger-300'
                        : 'hover:bg-slate-50/60',
                    )}
                  >
                    {/* Numéro */}
                    <span className="col-span-2 text-sm font-mono font-semibold text-slate-900">
                      {inv.number}
                    </span>

                    {/* Client */}
                    <span className="col-span-3 text-sm text-slate-700 truncate">
                      {inv.clientId?.name || '—'}
                      {inv.clientId?.company && (
                        <span className="block text-xs text-slate-400 truncate">
                          {inv.clientId.company}
                        </span>
                      )}
                    </span>

                    {/* Statut */}
                    <span className="col-span-2">
                      <Badge status={inv.status} />
                    </span>

                    {/* Échéance + retard */}
                    <span className="col-span-2">
                      <span className="text-xs text-slate-500 block">{fmtDate(inv.dueDate)}</span>
                      {isOverdue ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-danger-600 mt-0.5">
                          <AlertTriangle size={9} />
                          {inv._overdueDays}j de retard
                        </span>
                      ) : (() => {
                        const risk = computeRiskScore(inv);
                        if (risk?.level === 'high')
                          return (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-danger-600 mt-0.5">
                              🔴 Risque élevé
                            </span>
                          );
                        const next = getNextInvoiceReminder(inv);
                        if (!next) return null;
                        return (
                          <span
                            className={cn(
                              'inline-flex items-center gap-1 text-[10px] font-semibold mt-0.5',
                              next.status === 'overdue' ? 'text-danger-600' : 'text-accent-500',
                            )}
                          >
                            {next.status === 'overdue'
                              ? '🔴 Relance requise'
                              : `🔔 ${fmtDate(next.date)}`}
                          </span>
                        );
                      })()}
                    </span>

                    {/* Montant */}
                    <span className="col-span-2 text-sm font-semibold text-slate-900 text-right tabular-nums">
                      {fmt(inv.total)}
                    </span>

                    {/* Action */}
                    <span
                      className="col-span-1 flex justify-end"
                      onClick={(e) => isOverdue && e.stopPropagation()}
                    >
                      {isOverdue ? (
                        <button
                          onClick={() => setOverdueModal({ type: actionType, invoice: inv })}
                          className={cn(
                            'inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold border transition-colors',
                            actionType === 'financing'
                              ? 'bg-accent-50 text-accent-700 hover:bg-accent-100 border-accent-200'
                              : 'bg-danger-50 text-danger-700 hover:bg-danger-100 border-danger-200',
                          )}
                        >
                          {actionType === 'financing' ? (
                            <><Wallet size={10} /> Financer</>
                          ) : (
                            <><Shield size={10} /> Recouvrer</>
                          )}
                        </button>
                      ) : (
                        <ChevronRight
                          size={14}
                          className="text-slate-300 group-hover:text-slate-500 transition-colors"
                        />
                      )}
                    </span>
                  </div>
                );
              })}
            </div>
          </Card>
        )}
      </div>

      {/* Modale nouvelle facture */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Nouvelle facture" size="lg">
        <InvoiceForm
          onSuccess={() => { setModalOpen(false); mutate(); }}
          onCancel={() => setModalOpen(false)}
        />
      </Modal>

      {/* Modale Financement / Recouvrement */}
      <OverdueActionModal
        open={!!overdueModal}
        onClose={() => setOverdueModal(null)}
        type={overdueModal?.type}
        invoice={overdueModal?.invoice}
        onSuccess={(actionType) => {
          if (overdueModal?.invoice?._id) {
            handleOverdueSuccess(overdueModal.invoice._id, actionType);
          }
          setOverdueModal(null);
        }}
      />
    </>
  );
}
