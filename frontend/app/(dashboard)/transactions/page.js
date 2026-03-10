'use client';

import { useState } from 'react';
import useSWR from 'swr';
import api from '@/lib/api';
import Header from '@/components/layout/Header';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { cn } from '@/lib/utils';
import EmptyState from '@/components/ui/EmptyState';
import { SkeletonTable } from '@/components/ui/Skeleton';
import { ArrowDownLeft, ArrowUpRight, RefreshCw, TrendingUp, TrendingDown, Minus } from 'lucide-react';

const fetcher = (url) => api.get(url).then((r) => r.data);

const fmt = (n) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n ?? 0);

const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('fr-FR') : '—');

const TYPE_CONFIG = {
  revenue: {
    label: 'Encaissement',
    color: 'text-success-700',
    bg:    'bg-success-100',
    sign:  '+',
    Icon:  ArrowDownLeft,
  },
  expense: {
    label: 'Dépense',
    color: 'text-danger-700',
    bg:    'bg-danger-100',
    sign:  '-',
    Icon:  TrendingDown,
  },
  transfer: {
    label: 'Virement',
    color: 'text-accent-700',
    bg:    'bg-accent-100',
    sign:  '-',
    Icon:  ArrowUpRight,
  },
};

const CAT_LABELS = {
  software: 'Logiciels', marketing: 'Marketing', suppliers: 'Fournisseurs',
  travel: 'Déplacements', office: 'Bureautique', salaries: 'Salaires',
  taxes: 'Taxes', banking: 'Frais bancaires', other: 'Autre',
};

export default function TransactionsPage() {
  const [filter, setFilter] = useState('all');

  const key = filter === 'all' ? '/api/transactions' : `/api/transactions?type=${filter}`;
  const { data, isLoading } = useSWR(key, fetcher, { revalidateOnFocus: false });

  const transactions  = data?.transactions  || [];
  const totalRevenue  = data?.totalRevenue  || 0;
  const totalExpenses = data?.totalExpenses || 0;
  const totalTransfer = data?.totalTransfer || 0;
  const cashflow      = totalRevenue - totalExpenses - totalTransfer;

  return (
    <>
      <Header title="Transactions" />
      <div className="flex-1 p-6 space-y-6">

        {/* KPI */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Encaissements */}
          <div className="bg-white rounded-xl border border-slate-100 shadow-card p-5 relative group transition-all duration-200 hover:shadow-card-hover hover:-translate-y-0.5">
            <div className="flex items-start justify-between mb-4">
              <div
                className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 text-white flex items-center justify-center flex-shrink-0 transition-transform duration-300 group-hover:scale-110"
                style={{ boxShadow: '0 4px 14px rgba(16,185,129,0.5)' }}
              >
                <ArrowDownLeft size={18} strokeWidth={2} />
              </div>
            </div>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400 mb-1">Encaissements</p>
            <p className="text-2xl font-bold text-slate-900 tabular-nums">{fmt(totalRevenue)}</p>
            <p className="text-xs text-success-600 font-medium mt-1.5">Recettes reçues</p>
          </div>

          {/* Dépenses */}
          <div className="bg-white rounded-xl border border-slate-100 shadow-card p-5 relative group transition-all duration-200 hover:shadow-card-hover hover:-translate-y-0.5">
            <div className="flex items-start justify-between mb-4">
              <div
                className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-500 to-rose-700 text-white flex items-center justify-center flex-shrink-0 transition-transform duration-300 group-hover:scale-110"
                style={{ boxShadow: '0 4px 14px rgba(244,63,94,0.5)' }}
              >
                <TrendingDown size={18} strokeWidth={2} />
              </div>
            </div>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400 mb-1">Dépenses</p>
            <p className="text-2xl font-bold text-slate-900 tabular-nums">{fmt(totalExpenses)}</p>
            <p className="text-xs text-danger-600 font-medium mt-1.5">Charges enregistrées</p>
          </div>

          {/* Virements */}
          <div className="bg-white rounded-xl border border-slate-100 shadow-card p-5 relative group transition-all duration-200 hover:shadow-card-hover hover:-translate-y-0.5">
            <div className="flex items-start justify-between mb-4">
              <div
                className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent-500 to-accent-700 text-white flex items-center justify-center flex-shrink-0 transition-transform duration-300 group-hover:scale-110"
                style={{ boxShadow: '0 4px 14px rgba(28,110,242,0.5)' }}
              >
                <ArrowUpRight size={18} strokeWidth={2} />
              </div>
            </div>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400 mb-1">Virements</p>
            <p className="text-2xl font-bold text-slate-900 tabular-nums">{fmt(totalTransfer)}</p>
            <p className="text-xs text-accent-600 font-medium mt-1.5">Sorties bancaires</p>
          </div>

          {/* Flux net */}
          <div className="bg-white rounded-xl border border-slate-100 shadow-card p-5 relative group transition-all duration-200 hover:shadow-card-hover hover:-translate-y-0.5">
            <div className="flex items-start justify-between mb-4">
              <div
                className={`w-10 h-10 rounded-xl text-white flex items-center justify-center flex-shrink-0 transition-transform duration-300 group-hover:scale-110 bg-gradient-to-br ${
                  cashflow >= 0 ? 'from-emerald-400 to-teal-600' : 'from-amber-400 to-orange-600'
                }`}
                style={{
                  boxShadow: cashflow >= 0
                    ? '0 4px 14px rgba(16,185,129,0.5)'
                    : '0 4px 14px rgba(245,158,11,0.5)',
                }}
              >
                {cashflow >= 0
                  ? <TrendingUp size={18} strokeWidth={2} />
                  : <Minus size={18} strokeWidth={2} />}
              </div>
            </div>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400 mb-1">Flux net</p>
            <p className={`text-2xl font-bold tabular-nums ${cashflow >= 0 ? 'text-success-700' : 'text-warning-700'}`}>
              {cashflow >= 0 ? '+' : ''}{fmt(cashflow)}
            </p>
            <p className={`text-xs font-medium mt-1.5 ${cashflow >= 0 ? 'text-success-600' : 'text-warning-600'}`}>
              {cashflow >= 0 ? 'Position positive ✓' : 'Attention au solde'}
            </p>
          </div>
        </div>

        {/* Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <h2 className="text-sm font-semibold text-slate-800">Journal des transactions</h2>
                {data?.total != null && (
                  <p className="text-xs text-slate-400 mt-0.5">{data.total} mouvements</p>
                )}
              </div>
              <div className="flex gap-0.5 bg-slate-100 rounded-lg p-1">
                {[
                  { id: 'all',      label: 'Tout' },
                  { id: 'revenue',  label: 'Encaissements' },
                  { id: 'expense',  label: 'Dépenses' },
                  { id: 'transfer', label: 'Virements' },
                ].map(({ id, label }) => (
                  <button
                    key={id}
                    onClick={() => setFilter(id)}
                    className={cn(
                      'px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-150',
                      filter === id
                        ? 'bg-white shadow-xs text-accent-700'
                        : 'text-slate-500 hover:text-slate-700'
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardBody className="p-0">
            {isLoading ? (
              <div className="flex justify-center py-16">
                <div className="w-6 h-6 border-2 border-accent-600 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : transactions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <RefreshCw size={36} className="text-slate-200 mb-3" />
                <p className="text-slate-500 font-medium">Aucune transaction</p>
                <p className="text-slate-400 text-sm mt-1">
                  Les mouvements financiers apparaîtront ici automatiquement
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50/60 border-b border-slate-100">
                    <tr>
                      <th className="text-left px-5 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Date</th>
                      <th className="text-left px-5 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Type</th>
                      <th className="text-left px-5 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Description</th>
                      <th className="text-left px-5 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Tiers</th>
                      <th className="text-left px-5 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Référence</th>
                      <th className="text-right px-5 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Montant</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {transactions.map((tx) => {
                      const cfg = TYPE_CONFIG[tx.type] || TYPE_CONFIG.expense;
                      return (
                        <tr key={`${tx.source}-${tx._id}`} className="hover:bg-slate-50/70 transition-colors">
                          <td className="px-5 py-3 text-slate-500 whitespace-nowrap text-xs">{fmtDate(tx.date)}</td>
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-2">
                              <span className={cn('inline-flex items-center justify-center w-6 h-6 rounded-lg', cfg.bg)}>
                                <cfg.Icon size={12} className={cfg.color} />
                              </span>
                              <span className={cn('text-xs font-medium', cfg.color)}>{cfg.label}</span>
                            </div>
                          </td>
                          <td className="px-5 py-3 text-slate-900 font-medium max-w-[180px] truncate">
                            {tx.label}
                            {tx.category && (
                              <span className="ml-1.5 text-xs text-slate-400 font-normal">
                                {CAT_LABELS[tx.category] || tx.category}
                              </span>
                            )}
                          </td>
                          <td className="px-5 py-3 text-slate-500 text-xs truncate max-w-[120px]">{tx.party}</td>
                          <td className="px-5 py-3 text-slate-400 text-xs font-mono">{tx.reference || '—'}</td>
                          <td className="px-5 py-3 text-right">
                            <span className={cn('font-semibold tabular-nums', cfg.color)}>
                              {cfg.sign}{fmt(tx.amount)}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardBody>
        </Card>
      </div>
    </>
  );
}
