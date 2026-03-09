'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useAccounting } from '@/hooks/useAccounting';
import api from '@/lib/api';
import Header from '@/components/layout/Header';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import EmptyState from '@/components/ui/EmptyState';
import { SkeletonTable } from '@/components/ui/Skeleton';
import { Plus, TrendingUp, TrendingDown, BookOpen, X, Search, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';

const fmt = (n) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n ?? 0);
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('fr-FR') : '—');
const fmtDateTime = (d) => (d ? new Date(d).toLocaleString('fr-FR') : '—');

const SOURCE_LABELS = { invoice: 'Facture', expense: 'Dépense', payment: 'Paiement', manual: 'Manuel' };

const CATEGORIES = [
  { value: 'revenue',   label: 'Revenus' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'software',  label: 'Logiciels' },
  { value: 'salaries',  label: 'Salaires' },
  { value: 'suppliers', label: 'Fournisseurs' },
  { value: 'taxes',     label: 'Taxes & impôts' },
  { value: 'banking',   label: 'Frais bancaires' },
  { value: 'other',     label: 'Autres' },
];
const CATEGORY_LABELS = Object.fromEntries(CATEGORIES.map((c) => [c.value, c.label]));

const SOURCE_THEMES = {
  invoice: { bg: 'bg-accent-50',   text: 'text-accent-700',   dot: 'bg-accent-500'   },
  expense: { bg: 'bg-danger-50',   text: 'text-danger-700',   dot: 'bg-danger-500'   },
  payment: { bg: 'bg-success-50',  text: 'text-success-700',  dot: 'bg-success-500'  },
  manual:  { bg: 'bg-slate-100',   text: 'text-slate-600',    dot: 'bg-slate-400'    },
};

/* Badge source avec lien optionnel */
function SourceBadge({ source, reference }) {
  const t = SOURCE_THEMES[source] ?? SOURCE_THEMES.manual;
  const label = SOURCE_LABELS[source] ?? source;

  /* Si source = invoice/payment et référence existe → lien cliquable */
  const isLinkable = (source === 'invoice' || source === 'payment') && reference;

  const inner = (
    <span className={cn(
      'inline-flex items-center gap-1.5 text-[11px] font-semibold px-2 py-0.5 rounded-full',
      t.bg, t.text,
      isLinkable && 'hover:brightness-95 transition-all'
    )}>
      <span className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', t.dot)} />
      {label}
      {isLinkable && <ExternalLink size={10} className="opacity-60" />}
    </span>
  );

  if (isLinkable) {
    return (
      <Link href={`/invoices`} onClick={(e) => e.stopPropagation()} title={`Voir facture ${reference}`}>
        {inner}
      </Link>
    );
  }
  return inner;
}

export default function AccountingPage() {
  const { entries, summary, isLoading, mutate } = useAccounting();
  const [modalOpen,     setModalOpen]     = useState(false);
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [saving,        setSaving]        = useState(false);
  const [search,        setSearch]        = useState('');
  const [sourceFilter,  setSourceFilter]  = useState('');

  const [form, setForm] = useState({
    date:        new Date().toISOString().split('T')[0],
    description: '',
    category:    'revenue',
    type:        'credit',
    amount:      '',
  });

  const handleChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/api/accounting', { ...form, amount: parseFloat(form.amount) });
      mutate();
      setModalOpen(false);
      setForm({ date: new Date().toISOString().split('T')[0], description: '', category: 'revenue', type: 'credit', amount: '' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Supprimer cette écriture manuelle ?')) return;
    await api.delete(`/api/accounting/${id}`);
    mutate();
    setSelectedEntry(null);
  };

  /* Filtrage client-side */
  const filtered = useMemo(() => {
    let list = entries;
    if (sourceFilter) list = list.filter((e) => e.source === sourceFilter);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((e) =>
        e.description?.toLowerCase().includes(q) ||
        e.reference?.toLowerCase().includes(q) ||
        CATEGORY_LABELS[e.category]?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [entries, search, sourceFilter]);

  const balance = (summary?.totalCredits ?? 0) - (summary?.totalDebits ?? 0);

  return (
    <>
      <Header title="Comptabilité" />
      <div className="flex-1 p-6 space-y-6">

        {/* KPI solde */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white border border-[rgba(148,163,184,0.3)] rounded-xl shadow-card overflow-hidden">
            <div className="h-[3px] bg-success-500" />
            <div className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-7 h-7 rounded-lg bg-success-50 flex items-center justify-center">
                  <TrendingUp size={14} className="text-success-600" />
                </div>
                <span className="text-xs font-semibold text-success-700 uppercase tracking-wide">Entrées (crédits)</span>
              </div>
              <p className="text-2xl font-bold text-success-700 tabular-nums">{fmt(summary?.totalCredits)}</p>
            </div>
          </div>

          <div className="bg-white border border-[rgba(148,163,184,0.3)] rounded-xl shadow-card overflow-hidden">
            <div className="h-[3px] bg-danger-500" />
            <div className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-7 h-7 rounded-lg bg-danger-50 flex items-center justify-center">
                  <TrendingDown size={14} className="text-danger-600" />
                </div>
                <span className="text-xs font-semibold text-danger-700 uppercase tracking-wide">Sorties (débits)</span>
              </div>
              <p className="text-2xl font-bold text-danger-700 tabular-nums">{fmt(summary?.totalDebits)}</p>
            </div>
          </div>

          <div className={cn(
            'bg-white border rounded-xl shadow-card overflow-hidden',
            balance >= 0 ? 'border-accent-100' : 'border-warning-100'
          )}>
            <div className={cn('h-[3px]', balance >= 0 ? 'bg-accent-500' : 'bg-warning-500')} />
            <div className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className={cn(
                  'w-7 h-7 rounded-lg flex items-center justify-center',
                  balance >= 0 ? 'bg-accent-50' : 'bg-warning-50'
                )}>
                  <BookOpen size={14} className={balance >= 0 ? 'text-accent-600' : 'text-warning-600'} />
                </div>
                <span className={cn('text-xs font-semibold uppercase tracking-wide', balance >= 0 ? 'text-accent-700' : 'text-warning-700')}>
                  Solde net
                </span>
              </div>
              <p className={cn('text-2xl font-bold tabular-nums', balance >= 0 ? 'text-accent-700' : 'text-warning-700')}>
                {balance >= 0 ? '+' : ''}{fmt(balance)}
              </p>
            </div>
          </div>
        </div>

        {/* Journal */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-3 flex-wrap flex-1">
                {/* Filtres source */}
                <div className="flex gap-1 bg-slate-100 rounded-lg p-1">
                  {[
                    { id: '',        label: 'Tout' },
                    { id: 'invoice', label: 'Factures' },
                    { id: 'expense', label: 'Dépenses' },
                    { id: 'payment', label: 'Paiements' },
                    { id: 'manual',  label: 'Manuels' },
                  ].map(({ id, label }) => (
                    <button
                      key={id}
                      onClick={() => setSourceFilter(id)}
                      className={cn(
                        'px-2.5 py-1 text-xs font-medium rounded-md transition-all duration-150',
                        sourceFilter === id
                          ? 'bg-white shadow-xs text-accent-700'
                          : 'text-slate-500 hover:text-slate-700'
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                {/* Search */}
                <div className="relative">
                  <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Description, référence…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-8 pr-3 h-8 w-52 border border-slate-200 bg-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent placeholder:text-slate-400"
                  />
                </div>
              </div>

              <Button size="sm" onClick={() => setModalOpen(true)}>
                <Plus size={14} /> Écriture manuelle
              </Button>
            </div>
          </CardHeader>

          <CardBody className="p-0">
            {isLoading ? (
              <SkeletonTable rows={5} cols={6} />
            ) : entries.length === 0 ? (
              <EmptyState
                icon={BookOpen}
                title="Journal vide"
                description="Les écritures apparaîtront automatiquement lors des paiements et dépenses."
              />
            ) : filtered.length === 0 ? (
              <div className="py-12 text-center">
                <p className="text-sm text-slate-400">Aucun résultat pour cette recherche.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50/80 border-b border-slate-100">
                    <tr>
                      <th className="text-left px-5 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Date</th>
                      <th className="text-left px-5 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Description</th>
                      <th className="text-left px-5 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Référence</th>
                      <th className="text-left px-5 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Catégorie</th>
                      <th className="text-left px-5 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Source</th>
                      <th className="text-right px-5 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Montant</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {filtered.map((entry) => (
                      <tr
                        key={entry._id}
                        onClick={() => setSelectedEntry(entry)}
                        className="row-accent hover:bg-slate-50/60 cursor-pointer transition-colors"
                      >
                        <td className="px-5 py-3.5 text-slate-500 text-xs whitespace-nowrap">{fmtDate(entry.date)}</td>
                        <td className="px-5 py-3.5 text-slate-900 font-medium max-w-[200px] truncate">{entry.description}</td>
                        <td className="px-5 py-3.5">
                          {entry.reference ? (
                            <span className="text-xs font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                              {entry.reference}
                            </span>
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </td>
                        <td className="px-5 py-3.5 text-slate-500 text-xs">{CATEGORY_LABELS[entry.category] || entry.category}</td>
                        <td className="px-5 py-3.5">
                          <SourceBadge source={entry.source} reference={entry.reference} />
                        </td>
                        {/* Colonne montant unifiée avec badge Crédit/Débit */}
                        <td className="px-5 py-3.5 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <span className={cn(
                              'text-[10px] font-semibold px-1.5 py-0.5 rounded-full leading-none',
                              entry.type === 'credit'
                                ? 'bg-success-50 text-success-700'
                                : 'bg-danger-50 text-danger-700'
                            )}>
                              {entry.type === 'credit' ? 'Crédit' : 'Débit'}
                            </span>
                            <span className={cn(
                              'font-semibold tabular-nums text-sm',
                              entry.type === 'credit' ? 'text-success-700' : 'text-danger-700'
                            )}>
                              {entry.type === 'credit' ? '+' : '-'}{fmt(entry.amount)}
                            </span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardBody>
        </Card>
      </div>

      {/* Modal nouvelle écriture */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Nouvelle écriture manuelle">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Date</label>
              <input
                type="date" name="date" value={form.date} onChange={handleChange} required
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-accent-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Type</label>
              <select
                name="type" value={form.type} onChange={handleChange}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-accent-500"
              >
                <option value="credit">Crédit (entrée)</option>
                <option value="debit">Débit (sortie)</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
            <input
              type="text" name="description" value={form.description} onChange={handleChange} required
              placeholder="Ex: Virement client, Achat matériel..."
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-accent-500"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Catégorie</label>
              <select
                name="category" value={form.category} onChange={handleChange}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-accent-500"
              >
                {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Montant (€)</label>
              <input
                type="number" name="amount" value={form.amount} onChange={handleChange}
                required min="0.01" step="0.01" placeholder="0.00"
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-accent-500"
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>Annuler</Button>
            <Button type="submit" loading={saving}>Enregistrer</Button>
          </div>
        </form>
      </Modal>

      {/* Panneau détail écriture */}
      {selectedEntry && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4" onClick={() => setSelectedEntry(null)}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" />
          <div
            className="relative bg-white rounded-2xl shadow-lg w-full max-w-md z-10"
            onClick={(e) => e.stopPropagation()}
          >
            <div className={cn(
              'rounded-t-2xl px-6 py-5 border-b',
              selectedEntry.type === 'credit'
                ? 'bg-success-50 border-success-100'
                : 'bg-danger-50 border-danger-100'
            )}>
              <div className="flex items-start justify-between">
                <div>
                  <span className={cn(
                    'text-xs font-semibold uppercase tracking-wide',
                    selectedEntry.type === 'credit' ? 'text-success-600' : 'text-danger-600'
                  )}>
                    {selectedEntry.type === 'credit' ? 'Entrée (crédit)' : 'Sortie (débit)'}
                  </span>
                  <p className="text-2xl font-bold text-slate-900 mt-1 tabular-nums">
                    {selectedEntry.type === 'credit' ? '+' : '-'}{fmt(selectedEntry.amount)}
                  </p>
                </div>
                <button onClick={() => setSelectedEntry(null)} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg">
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="px-6 py-5 space-y-4">
              <div>
                <p className="text-[11px] text-slate-400 uppercase font-semibold tracking-wide mb-0.5">Description</p>
                <p className="text-sm font-semibold text-slate-900">{selectedEntry.description}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[11px] text-slate-400 uppercase font-semibold tracking-wide mb-0.5">Date</p>
                  <p className="text-sm text-slate-700">{fmtDate(selectedEntry.date)}</p>
                </div>
                <div>
                  <p className="text-[11px] text-slate-400 uppercase font-semibold tracking-wide mb-0.5">Catégorie</p>
                  <p className="text-sm text-slate-700">{CATEGORY_LABELS[selectedEntry.category] || selectedEntry.category}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[11px] text-slate-400 uppercase font-semibold tracking-wide mb-1">Source</p>
                  <SourceBadge source={selectedEntry.source} reference={selectedEntry.reference} />
                </div>
                {selectedEntry.reference && (
                  <div>
                    <p className="text-[11px] text-slate-400 uppercase font-semibold tracking-wide mb-0.5">Référence</p>
                    <p className="text-sm text-slate-700 font-mono bg-slate-50 px-2 py-0.5 rounded inline-block">{selectedEntry.reference}</p>
                  </div>
                )}
              </div>
              {selectedEntry.notes && (
                <div>
                  <p className="text-[11px] text-slate-400 uppercase font-semibold tracking-wide mb-0.5">Notes</p>
                  <p className="text-sm text-slate-600">{selectedEntry.notes}</p>
                </div>
              )}
              <div>
                <p className="text-[11px] text-slate-400 uppercase font-semibold tracking-wide mb-0.5">Créé le</p>
                <p className="text-sm text-slate-500">{fmtDateTime(selectedEntry.createdAt)}</p>
              </div>
            </div>

            <div className="px-6 pb-5 flex justify-between items-center border-t border-slate-100 pt-4">
              {selectedEntry.source === 'manual' ? (
                <button onClick={() => handleDelete(selectedEntry._id)} className="text-sm text-danger-500 hover:text-danger-700 font-medium">
                  Supprimer
                </button>
              ) : (
                <p className="text-xs text-slate-400">Écriture générée automatiquement</p>
              )}
              <Button size="sm" variant="secondary" onClick={() => setSelectedEntry(null)}>Fermer</Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
