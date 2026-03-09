'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuotes } from '@/hooks/useQuotes';
import { cn } from '@/lib/utils';
import Header from '@/components/layout/Header';
import { Card } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Modal from '@/components/ui/Modal';
import EmptyState from '@/components/ui/EmptyState';
import { SkeletonTable } from '@/components/ui/Skeleton';
import QuoteForm from '@/components/modules/QuoteForm';
import { FilePlus, ClipboardList, ChevronRight } from 'lucide-react';

const FILTERS = [
  { label: 'Tous',      value: '' },
  { label: 'Brouillon', value: 'draft' },
  { label: 'Envoyés',   value: 'sent' },
  { label: 'Acceptés',  value: 'accepted' },
  { label: 'Refusés',   value: 'rejected' },
  { label: 'Expirés',   value: 'expired' },
];

const fmt = (n) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n);

const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('fr-FR') : '—');

export default function QuotesPage() {
  const [filter, setFilter]       = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const { quotes, isLoading, mutate } = useQuotes(filter);

  return (
    <>
      <Header
        title="Devis"
        actions={
          <Button size="sm" onClick={() => setModalOpen(true)}>
            <FilePlus size={14} /> Nouveau devis
          </Button>
        }
      />
      <div className="flex-1 p-6">
        {/* Filtres */}
        <div className="flex gap-1 flex-wrap mb-5">
          {FILTERS.map(({ label, value }) => (
            <button
              key={value}
              onClick={() => setFilter(value)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                filter === value
                  ? 'bg-accent-600 text-white'
                  : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Contenu */}
        {isLoading ? (
          <Card><SkeletonTable rows={5} cols={6} /></Card>
        ) : quotes.length === 0 ? (
          <Card>
            <EmptyState
              icon={ClipboardList}
              title="Aucun devis"
              description={filter ? 'Aucun devis avec ce statut.' : 'Créez votre premier devis.'}
              action={!filter ? () => setModalOpen(true) : undefined}
              actionLabel="Nouveau devis"
            />
          </Card>
        ) : (
          <Card>
            <div className="hidden sm:grid grid-cols-12 gap-4 px-5 py-3 border-b border-gray-100 text-[11px] font-semibold text-gray-400 uppercase tracking-wide">
              <span className="col-span-2">Numéro</span>
              <span className="col-span-3">Client</span>
              <span className="col-span-2">Statut</span>
              <span className="col-span-2">Validité</span>
              <span className="col-span-2 text-right">Montant TTC</span>
              <span className="col-span-1" />
            </div>
            <div className="divide-y divide-gray-50">
              {quotes.map((q) => (
                <Link
                  key={q._id}
                  href={`/quotes/${q._id}`}
                  className="grid grid-cols-12 gap-4 px-5 py-3.5 items-center hover:bg-gray-50/70 transition-colors group"
                >
                  <span className="col-span-2 text-sm font-mono font-medium text-gray-900">{q.number}</span>
                  <span className="col-span-3 text-sm text-gray-700 truncate">
                    {q.clientId?.name || '—'}
                    {q.clientId?.company && (
                      <span className="block text-xs text-gray-400 truncate">{q.clientId.company}</span>
                    )}
                  </span>
                  <span className="col-span-2"><Badge status={q.status} /></span>
                  <span className="col-span-2 text-sm text-gray-500">{fmtDate(q.expiryDate)}</span>
                  <span className="col-span-2 text-sm font-semibold text-gray-900 text-right tabular-nums">{fmt(q.total)}</span>
                  <span className="col-span-1 flex justify-end">
                    <ChevronRight size={14} className="text-gray-300 group-hover:text-gray-500 transition-colors" />
                  </span>
                </Link>
              ))}
            </div>
          </Card>
        )}
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Nouveau devis" size="lg">
        <QuoteForm onSuccess={() => { setModalOpen(false); mutate(); }} onCancel={() => setModalOpen(false)} />
      </Modal>
    </>
  );
}
