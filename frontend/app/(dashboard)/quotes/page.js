'use client';

import { useState, useMemo } from 'react';
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
import { FilePlus, ClipboardList, ChevronRight, Search, X } from 'lucide-react';
import { getNextQuoteReminder } from '@/lib/reminderUtils';

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
  const [search, setSearch]       = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const { quotes: allQuotes, isLoading, mutate } = useQuotes(filter);

  /* Recherche client-side */
  const quotes = useMemo(() => {
    if (!search) return allQuotes;
    const q = search.toLowerCase();
    return allQuotes.filter((qt) =>
      qt.number?.toLowerCase().includes(q) ||
      qt.clientId?.name?.toLowerCase().includes(q) ||
      qt.clientId?.company?.toLowerCase().includes(q)
    );
  }, [allQuotes, search]);

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
        {/* Filtres + search intégrés */}
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
                    : 'bg-white border border-[rgba(148,163,184,0.4)] text-slate-600 hover:bg-slate-50'
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
              <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                <X size={13} />
              </button>
            )}
          </div>
        </div>

        {isLoading ? (
          <Card><SkeletonTable rows={5} cols={6} /></Card>
        ) : allQuotes.length === 0 ? (
          <Card>
            <EmptyState
              icon={ClipboardList}
              title="Aucun devis"
              description={filter ? 'Aucun devis avec ce statut.' : 'Créez votre premier devis.'}
              action={!filter ? () => setModalOpen(true) : undefined}
              actionLabel="Nouveau devis"
            />
          </Card>
        ) : quotes.length === 0 ? (
          <Card>
            <div className="py-12 text-center">
              <p className="text-sm text-slate-400">Aucun résultat pour «&nbsp;{search}&nbsp;»</p>
            </div>
          </Card>
        ) : (
          <Card>
            <div className="hidden sm:grid grid-cols-12 gap-4 px-5 py-3 border-b border-slate-100 bg-slate-50/60 text-[11px] font-semibold text-slate-400 uppercase tracking-wide">
              <span className="col-span-2">Numéro</span>
              <span className="col-span-3">Client</span>
              <span className="col-span-2">Statut</span>
              <span className="col-span-2">Validité</span>
              <span className="col-span-2 text-right">Montant TTC</span>
              <span className="col-span-1" />
            </div>
            <div className="divide-y divide-[rgba(148,163,184,0.12)]">
              {quotes.map((q) => (
                <Link
                  key={q._id}
                  href={`/quotes/${q._id}`}
                  className="row-accent grid grid-cols-12 gap-4 px-5 py-3.5 items-center hover:bg-slate-50/60 transition-colors group"
                >
                  <span className="col-span-2 text-sm font-mono font-semibold text-slate-900">{q.number}</span>
                  <span className="col-span-3 text-sm text-slate-700 truncate">
                    {q.clientId?.name || '—'}
                    {q.clientId?.company && (
                      <span className="block text-xs text-slate-400 truncate">{q.clientId.company}</span>
                    )}
                  </span>
                  <span className="col-span-2"><Badge status={q.status} /></span>
                  <span className="col-span-2">
                    <span className="text-xs text-slate-500 block">{fmtDate(q.expiryDate)}</span>
                    {(() => {
                      const next = getNextQuoteReminder(q);
                      if (!next) return null;
                      const isOverdue = next.status === 'overdue';
                      return (
                        <span className={cn(
                          'inline-flex items-center gap-1 text-[10px] font-semibold mt-0.5',
                          isOverdue ? 'text-danger-600' : 'text-accent-500'
                        )}>
                          <span>{isOverdue ? '🔴' : '🔔'}</span>
                          {isOverdue ? 'Relance en retard' : `Relance ${fmtDate(next.date)}`}
                        </span>
                      );
                    })()}
                  </span>
                  <span className="col-span-2 text-sm font-semibold text-slate-900 text-right tabular-nums">{fmt(q.total)}</span>
                  <span className="col-span-1 flex justify-end">
                    <ChevronRight size={14} className="text-slate-300 group-hover:text-slate-500 transition-colors" />
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
