'use client';

import { useState } from 'react';
import useSWR from 'swr';
import api from '@/lib/api';
import Header from '@/components/layout/Header';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { FileText, Printer, Download, CheckCircle, AlertTriangle } from 'lucide-react';

const fmt = (n) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n ?? 0);
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('fr-FR') : '—');

const fetcher = (url) => api.get(url).then((r) => r.data);

const QUARTERS = [
  { label: 'T1 2026', from: '2026-01-01', to: '2026-03-31' },
  { label: 'T4 2025', from: '2025-10-01', to: '2025-12-31' },
  { label: 'T3 2025', from: '2025-07-01', to: '2025-09-30' },
  { label: 'T2 2025', from: '2025-04-01', to: '2025-06-30' },
  { label: 'T1 2025', from: '2025-01-01', to: '2025-03-31' },
];

const CATEGORY_LABELS = {
  software: 'Logiciels / SaaS', marketing: 'Marketing / Pub',
  suppliers: 'Fournisseurs', travel: 'Déplacements', office: 'Bureautique',
  salaries: 'Salaires', taxes: 'Taxes', banking: 'Frais bancaires', other: 'Autre',
};

export default function VatPage() {
  const [period, setPeriod] = useState(QUARTERS[0]);
  const [custom, setCustom] = useState({ from: '', to: '' });
  const [useCustom, setUseCustom] = useState(false);

  const from = useCustom ? custom.from : period.from;
  const to   = useCustom ? custom.to   : period.to;

  const params = new URLSearchParams({ from, to }).toString();

  const { data: summary } = useSWR(
    from && to ? `/api/expenses/vat-summary?${params}` : null,
    fetcher,
    { revalidateOnFocus: false }
  );

  const { data: expensesData } = useSWR(
    from && to ? `/api/expenses?from=${from}&to=${to}&limit=200` : null,
    fetcher,
    { revalidateOnFocus: false }
  );

  const expenses    = expensesData?.expenses || [];
  const eligible    = expenses.filter((e) => e.status !== 'non_eligible' && e.vatRecoverable > 0);
  const excluded    = expenses.filter((e) => e.status === 'non_eligible' || e.status === 'pending_review');

  const handlePrint = () => window.print();

  const handleExportCSV = () => {
    const rows = [
      ['Date', 'Description', 'Fournisseur', 'Catégorie', 'HT', 'TVA %', 'TVA montant', 'TVA récupérable', 'TTC', 'Statut'],
      ...eligible.map((e) => [
        fmtDate(e.date),
        e.description,
        e.vendor || '',
        CATEGORY_LABELS[e.category] || e.category,
        e.amountHT,
        e.vatRate,
        e.vatAmount,
        e.vatRecoverable,
        e.amount,
        e.status,
      ]),
    ];
    const csv   = rows.map((r) => r.join(';')).join('\n');
    const blob  = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url   = URL.createObjectURL(blob);
    const link  = document.createElement('a');
    link.href   = url;
    link.download = `tva-${from}-${to}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <Header title="Récupération TVA" />
      <div className="flex-1 p-6 space-y-6">

        {/* Sélection période */}
        <Card>
          <CardBody>
            <div className="flex flex-wrap items-end gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase mb-2">Période</label>
                <div className="flex flex-wrap gap-2">
                  {QUARTERS.map((q) => (
                    <button
                      key={q.label}
                      onClick={() => { setPeriod(q); setUseCustom(false); }}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                        !useCustom && period.label === q.label
                          ? 'bg-indigo-600 text-white border-indigo-600'
                          : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300'
                      }`}
                    >
                      {q.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex items-end gap-2">
                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Du</label>
                  <input
                    type="date"
                    value={custom.from}
                    onChange={(e) => { setCustom((c) => ({ ...c, from: e.target.value })); setUseCustom(true); }}
                    className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Au</label>
                  <input
                    type="date"
                    value={custom.to}
                    onChange={(e) => { setCustom((c) => ({ ...c, to: e.target.value })); setUseCustom(true); }}
                    className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
              <div className="flex gap-2 ml-auto print:hidden">
                <Button size="sm" variant="secondary" onClick={handleExportCSV}>
                  <Download size={14} /> CSV
                </Button>
                <Button size="sm" variant="secondary" onClick={handlePrint}>
                  <Printer size={14} /> Imprimer / PDF
                </Button>
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Résumé TVA */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <p className="text-xs text-gray-500 uppercase font-medium mb-1">Dépenses HT</p>
            <p className="text-2xl font-bold text-gray-900">{fmt(summary?.totalHT)}</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <p className="text-xs text-gray-500 uppercase font-medium mb-1">Dépenses TTC</p>
            <p className="text-2xl font-bold text-gray-900">{fmt(summary?.totalTTC)}</p>
          </div>
          <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4">
            <p className="text-xs text-indigo-600 uppercase font-medium mb-1">TVA récupérable</p>
            <p className="text-2xl font-bold text-indigo-700">{fmt(summary?.vatRecoverable)}</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <p className="text-xs text-gray-500 uppercase font-medium mb-1">Dépenses incluses</p>
            <p className="text-2xl font-bold text-gray-900">{eligible.length}</p>
          </div>
        </div>

        {/* Détail par taux */}
        {summary?.vatRecoverable > 0 && (
          <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4">
            <p className="text-xs text-indigo-700 font-semibold uppercase mb-3">Détail par taux de TVA</p>
            <div className="flex flex-wrap gap-4">
              {Object.entries(summary.byRate || {}).filter(([, v]) => v > 0).map(([rate, amount]) => (
                <div key={rate} className="bg-white rounded-lg px-5 py-3 border border-indigo-100 text-center">
                  <p className="text-xs text-indigo-500 font-medium mb-1">TVA {rate}%</p>
                  <p className="text-xl font-bold text-indigo-700">{fmt(amount)}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Dépenses éligibles */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <CheckCircle size={14} className="text-green-500" />
              <h2 className="text-sm font-semibold text-gray-700">
                Dépenses éligibles ({eligible.length})
              </h2>
            </div>
          </CardHeader>
          <CardBody className="p-0">
            {eligible.length === 0 ? (
              <p className="px-4 py-6 text-center text-gray-400 text-sm">
                Aucune dépense éligible sur cette période.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th className="text-left px-4 py-2 text-xs font-medium text-gray-500">Date</th>
                      <th className="text-left px-4 py-2 text-xs font-medium text-gray-500">Description</th>
                      <th className="text-left px-4 py-2 text-xs font-medium text-gray-500">Catégorie</th>
                      <th className="text-right px-4 py-2 text-xs font-medium text-gray-500">HT</th>
                      <th className="text-center px-4 py-2 text-xs font-medium text-gray-500">TVA</th>
                      <th className="text-right px-4 py-2 text-xs font-medium text-gray-500">TVA récup.</th>
                      <th className="text-right px-4 py-2 text-xs font-medium text-gray-500">TTC</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {eligible.map((e) => (
                      <tr key={e._id}>
                        <td className="px-4 py-2 text-gray-500 whitespace-nowrap">{fmtDate(e.date)}</td>
                        <td className="px-4 py-2 text-gray-900">
                          <div>{e.description}</div>
                          {e.vendor && <div className="text-xs text-gray-400">{e.vendor}</div>}
                        </td>
                        <td className="px-4 py-2 text-gray-500 text-xs">
                          {CATEGORY_LABELS[e.category] || e.category}
                        </td>
                        <td className="px-4 py-2 text-right text-gray-600">{fmt(e.amountHT)}</td>
                        <td className="px-4 py-2 text-center text-gray-400">{e.vatRate}%</td>
                        <td className="px-4 py-2 text-right font-semibold text-indigo-600">{fmt(e.vatRecoverable)}</td>
                        <td className="px-4 py-2 text-right text-gray-700">{fmt(e.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-gray-50 border-t border-gray-200">
                    <tr>
                      <td colSpan={3} className="px-4 py-2 text-sm font-semibold text-gray-700">Total</td>
                      <td className="px-4 py-2 text-right text-sm font-semibold">{fmt(summary?.totalHT)}</td>
                      <td />
                      <td className="px-4 py-2 text-right text-sm font-bold text-indigo-700">{fmt(summary?.vatRecoverable)}</td>
                      <td className="px-4 py-2 text-right text-sm font-semibold">{fmt(summary?.totalTTC)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </CardBody>
        </Card>

        {/* Dépenses exclues */}
        {excluded.length > 0 && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <AlertTriangle size={14} className="text-yellow-500" />
                <h2 className="text-sm font-semibold text-gray-700">
                  Dépenses exclues ({excluded.length})
                </h2>
              </div>
            </CardHeader>
            <CardBody className="p-0">
              <div className="divide-y divide-gray-100">
                {excluded.map((e) => (
                  <div key={e._id} className="flex items-center justify-between px-4 py-3">
                    <div>
                      <p className="text-sm text-gray-800">{e.description}</p>
                      <p className="text-xs text-gray-400">{fmtDate(e.date)} · {CATEGORY_LABELS[e.category] || e.category}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        e.status === 'pending_review' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-500'
                      }`}>
                        {e.status === 'pending_review' ? 'A vérifier' : 'Non éligible'}
                      </span>
                      <span className="text-sm font-semibold text-gray-700">{fmt(e.amount)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardBody>
          </Card>
        )}
      </div>
    </>
  );
}
