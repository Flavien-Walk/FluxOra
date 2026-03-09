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
    label:  'Encaissement',
    color:  'text-green-700',
    bg:     'bg-green-100',
    sign:   '+',
    Icon:   ArrowDownLeft,
  },
  expense: {
    label:  'Dépense',
    color:  'text-red-700',
    bg:     'bg-red-100',
    sign:   '-',
    Icon:   TrendingDown,
  },
  transfer: {
    label:  'Virement',
    color:  'text-accent-700',
    bg:     'bg-indigo-100',
    sign:   '-',
    Icon:   ArrowUpRight,
  },
};

const CAT_LABELS = {
  software: 'Logiciels', marketing: 'Marketing', suppliers: 'Fournisseurs',
  travel: 'Déplacements', office: 'Bureautique', salaries: 'Salaires',
  taxes: 'Taxes', banking: 'Frais bancaires', other: 'Autre',
};

export default function TransactionsPage() {
  const [filter, setFilter] = useState('all'); // all | revenue | expense | transfer

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
          <div className="bg-green-50 border border-green-100 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp size={15} className="text-green-600" />
              <span className="text-xs font-medium text-green-700 uppercase">Encaissements</span>
            </div>
            <p className="text-2xl font-bold text-green-700">{fmt(totalRevenue)}</p>
          </div>
          <div className="bg-red-50 border border-red-100 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <TrendingDown size={15} className="text-red-600" />
              <span className="text-xs font-medium text-red-700 uppercase">Dépenses</span>
            </div>
            <p className="text-2xl font-bold text-red-700">{fmt(totalExpenses)}</p>
          </div>
          <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <ArrowUpRight size={15} className="text-accent-600" />
              <span className="text-xs font-medium text-accent-700 uppercase">Virements</span>
            </div>
            <p className="text-2xl font-bold text-accent-700">{fmt(totalTransfer)}</p>
          </div>
          <div className={`border rounded-xl p-4 ${cashflow >= 0 ? 'bg-gray-50 border-gray-200' : 'bg-orange-50 border-orange-200'}`}>
            <div className="flex items-center gap-2 mb-1">
              <Minus size={15} className={cashflow >= 0 ? 'text-gray-600' : 'text-orange-600'} />
              <span className={`text-xs font-medium uppercase ${cashflow >= 0 ? 'text-gray-600' : 'text-orange-700'}`}>Flux net</span>
            </div>
            <p className={`text-2xl font-bold ${cashflow >= 0 ? 'text-gray-800' : 'text-orange-700'}`}>
              {cashflow >= 0 ? '+' : ''}{fmt(cashflow)}
            </p>
          </div>
        </div>

        {/* Filtres */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-3">
              <h2 className="text-sm font-semibold text-gray-700">
                Journal des transactions
                {data?.total != null && (
                  <span className="ml-2 text-xs font-normal text-gray-400">({data.total} mouvements)</span>
                )}
              </h2>
              <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
                {[
                  { id: 'all',      label: 'Tout' },
                  { id: 'revenue',  label: 'Encaissements' },
                  { id: 'expense',  label: 'Dépenses' },
                  { id: 'transfer', label: 'Virements' },
                ].map(({ id, label }) => (
                  <button
                    key={id}
                    onClick={() => setFilter(id)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                      filter === id
                        ? 'bg-white shadow-sm text-accent-700'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
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
                <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : transactions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <RefreshCw size={36} className="text-gray-200 mb-3" />
                <p className="text-gray-500 font-medium">Aucune transaction</p>
                <p className="text-gray-400 text-sm mt-1">
                  Les mouvements financiers apparaîtront ici automatiquement
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th className="text-left px-5 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Date</th>
                      <th className="text-left px-5 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Type</th>
                      <th className="text-left px-5 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Description</th>
                      <th className="text-left px-5 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Tiers</th>
                      <th className="text-left px-5 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Référence</th>
                      <th className="text-right px-5 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Montant</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {transactions.map((tx) => {
                      const cfg = TYPE_CONFIG[tx.type] || TYPE_CONFIG.expense;
                      return (
                        <tr key={`${tx.source}-${tx._id}`} className="hover:bg-gray-50/70 transition-colors">
                          <td className="px-5 py-3 text-gray-500 whitespace-nowrap text-xs">{fmtDate(tx.date)}</td>
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-2">
                              <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full ${cfg.bg}`}>
                                <cfg.Icon size={12} className={cfg.color} />
                              </span>
                              <span className={`text-xs font-medium ${cfg.color}`}>{cfg.label}</span>
                            </div>
                          </td>
                          <td className="px-5 py-3 text-gray-900 font-medium max-w-[180px] truncate">
                            {tx.label}
                            {tx.category && (
                              <span className="ml-1.5 text-xs text-gray-400 font-normal">
                                {CAT_LABELS[tx.category] || tx.category}
                              </span>
                            )}
                          </td>
                          <td className="px-5 py-3 text-gray-500 text-xs truncate max-w-[120px]">{tx.party}</td>
                          <td className="px-5 py-3 text-gray-400 text-xs font-mono">{tx.reference || '—'}</td>
                          <td className="px-5 py-3 text-right">
                            <span className={`font-semibold ${cfg.color}`}>
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
