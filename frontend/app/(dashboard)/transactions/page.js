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
          <div className="bg-success-50 border border-success-100 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-lg bg-success-100 flex items-center justify-center">
                <TrendingUp size={14} className="text-success-600" />
              </div>
              <span className="text-xs font-semibold text-success-700 uppercase tracking-wide">Encaissements</span>
            </div>
            <p className="text-2xl font-bold text-success-700 tabular-nums">{fmt(totalRevenue)}</p>
          </div>
          <div className="bg-danger-50 border border-danger-100 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-lg bg-danger-100 flex items-center justify-center">
                <TrendingDown size={14} className="text-danger-600" />
              </div>
              <span className="text-xs font-semibold text-danger-700 uppercase tracking-wide">Dépenses</span>
            </div>
            <p className="text-2xl font-bold text-danger-700 tabular-nums">{fmt(totalExpenses)}</p>
          </div>
          <div className="bg-accent-50 border border-accent-100 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-lg bg-accent-100 flex items-center justify-center">
                <ArrowUpRight size={14} className="text-accent-600" />
              </div>
              <span className="text-xs font-semibold text-accent-700 uppercase tracking-wide">Virements</span>
            </div>
            <p className="text-2xl font-bold text-accent-700 tabular-nums">{fmt(totalTransfer)}</p>
          </div>
          <div className={cn(
            'border rounded-xl p-4',
            cashflow >= 0 ? 'bg-slate-50 border-slate-200' : 'bg-warning-50 border-warning-100'
          )}>
            <div className="flex items-center gap-2 mb-2">
              <div className={cn(
                'w-7 h-7 rounded-lg flex items-center justify-center',
                cashflow >= 0 ? 'bg-slate-100' : 'bg-warning-100'
              )}>
                <Minus size={14} className={cashflow >= 0 ? 'text-slate-600' : 'text-warning-600'} />
              </div>
              <span className={cn(
                'text-xs font-semibold uppercase tracking-wide',
                cashflow >= 0 ? 'text-slate-600' : 'text-warning-700'
              )}>
                Flux net
              </span>
            </div>
            <p className={cn(
              'text-2xl font-bold tabular-nums',
              cashflow >= 0 ? 'text-slate-800' : 'text-warning-700'
            )}>
              {cashflow >= 0 ? '+' : ''}{fmt(cashflow)}
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
