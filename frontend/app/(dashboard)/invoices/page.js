'use client';

import { useState } from 'react';
import Link from 'next/link';
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
import { FilePlus, FileText, ChevronRight } from 'lucide-react';

const FILTERS = [
  { label: 'Toutes',     value: '' },
  { label: 'Brouillon', value: 'draft' },
  { label: 'Envoyées',  value: 'sent' },
  { label: 'Payées',    value: 'paid' },
  { label: 'En retard', value: 'late' },
];

const fmt = (n) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n);

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('fr-FR') : '—';

export default function InvoicesPage() {
  const [filter, setFilter]       = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const { invoices, isLoading, mutate } = useInvoices(filter);

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
        {/* Filtres */}
        <div className="flex gap-1.5 flex-wrap mb-5">
          {FILTERS.map(({ label, value }) => (
            <button
              key={value}
              onClick={() => setFilter(value)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-150',
                filter === value
                  ? 'bg-accent-600 text-white shadow-xs'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300'
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Contenu */}
        {isLoading ? (
          <Card><SkeletonTable rows={6} cols={6} /></Card>
        ) : invoices.length === 0 ? (
          <Card>
            <EmptyState
              icon={FileText}
              title="Aucune facture"
              description={filter ? 'Aucune facture avec ce statut.' : 'Créez votre première facture.'}
              action={!filter ? () => setModalOpen(true) : undefined}
              actionLabel="Nouvelle facture"
            />
          </Card>
        ) : (
          <Card>
            {/* En-tête tableau */}
            <div className="hidden sm:grid grid-cols-12 gap-4 px-5 py-3 border-b border-slate-100 text-[11px] font-semibold text-slate-400 uppercase tracking-wide bg-slate-50/60">
              <span className="col-span-2">Numéro</span>
              <span className="col-span-3">Client</span>
              <span className="col-span-2">Statut</span>
              <span className="col-span-2">Échéance</span>
              <span className="col-span-2 text-right">Montant TTC</span>
              <span className="col-span-1" />
            </div>
            <div className="divide-y divide-slate-50">
              {invoices.map((inv) => (
                <Link
                  key={inv._id}
                  href={`/invoices/${inv._id}`}
                  className="grid grid-cols-12 gap-4 px-5 py-3.5 items-center hover:bg-slate-50/80 transition-colors group"
                >
                  <span className="col-span-2 text-sm font-mono font-semibold text-slate-900">
                    {inv.number}
                  </span>
                  <span className="col-span-3 text-sm text-slate-700 truncate">
                    {inv.clientId?.name || '—'}
                    {inv.clientId?.company && (
                      <span className="block text-xs text-slate-400 truncate">{inv.clientId.company}</span>
                    )}
                  </span>
                  <span className="col-span-2">
                    <Badge status={inv.status} />
                  </span>
                  <span className="col-span-2 text-sm text-slate-500">{fmtDate(inv.dueDate)}</span>
                  <span className="col-span-2 text-sm font-semibold text-slate-900 text-right tabular-nums">
                    {fmt(inv.total)}
                  </span>
                  <span className="col-span-1 flex justify-end">
                    <ChevronRight size={14} className="text-slate-300 group-hover:text-slate-500 transition-colors" />
                  </span>
                </Link>
              ))}
            </div>
          </Card>
        )}
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Nouvelle facture" size="lg">
        <InvoiceForm onSuccess={() => { setModalOpen(false); mutate(); }} onCancel={() => setModalOpen(false)} />
      </Modal>
    </>
  );
}
