'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { toast } from 'sonner';
import { Download, Scale, CheckCircle2, AlertTriangle } from 'lucide-react';
import api from '@/lib/api';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { cn } from '@/lib/utils';

const fetcher = async (url) => (await api.get(url)).data;
const eur = (n) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n || 0);

/**
 * Comptabilité en partie double (PCG) : balance des comptes et export FEC pour l'expert-comptable.
 */
export default function LedgerSection() {
  const thisYear = new Date().getFullYear();
  const [year, setYear] = useState(thisYear);
  const [downloading, setDownloading] = useState(false);
  const { data, isLoading } = useSWR(`/api/accounting/balance?year=${year}`, fetcher);

  const downloadFec = async () => {
    setDownloading(true);
    try {
      const res = await api.get(`/api/accounting/fec?year=${year}`, { responseType: 'blob' });
      const name = /filename="([^"]+)"/.exec(res.headers['content-disposition'] || '')?.[1] || `FEC-${year}.txt`;
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url; a.download = name; a.click();
      URL.revokeObjectURL(url);
      toast.success(`FEC ${year} téléchargé.`);
    } catch {
      toast.error('Export FEC impossible.');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900"><Scale size={15} aria-hidden="true" /> Balance des comptes</h2>
          <p className="text-xs text-slate-500 mt-0.5">Écritures en partie double (plan comptable général) générées à partir de vos factures, avoirs, encaissements et dépenses</p>
        </div>
        <div className="flex items-center gap-2">
          <label htmlFor="ledger-year" className="sr-only">Exercice</label>
          <select id="ledger-year" value={year} onChange={(e) => setYear(Number(e.target.value))}
            className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent-500">
            {[thisYear, thisYear - 1, thisYear - 2].map((y) => <option key={y} value={y}>Exercice {y}</option>)}
          </select>
          <Button size="sm" onClick={downloadFec} loading={downloading}><Download size={14} /> Export FEC</Button>
        </div>
      </CardHeader>
      <CardBody className="p-0">
        {isLoading ? (
          <p className="px-5 py-6 text-sm text-slate-500">Calcul de la balance…</p>
        ) : !data?.accounts?.length ? (
          <p className="px-5 py-6 text-sm text-slate-500">Aucune écriture sur l’exercice {year}.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th scope="col" className="px-5 py-2.5 text-left font-semibold">Compte</th>
                  <th scope="col" className="px-5 py-2.5 text-left font-semibold">Intitulé</th>
                  <th scope="col" className="px-5 py-2.5 text-right font-semibold">Débit</th>
                  <th scope="col" className="px-5 py-2.5 text-right font-semibold">Crédit</th>
                  <th scope="col" className="px-5 py-2.5 text-right font-semibold">Solde</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.accounts.map((a) => (
                  <tr key={a.account}>
                    <td className="px-5 py-2 font-mono text-slate-700">{a.account}</td>
                    <td className="px-5 py-2 text-slate-700">{a.label}</td>
                    <td className="px-5 py-2 text-right tabular-nums">{eur(a.debit)}</td>
                    <td className="px-5 py-2 text-right tabular-nums">{eur(a.credit)}</td>
                    <td className={cn('px-5 py-2 text-right font-semibold tabular-nums', a.balance < 0 ? 'text-slate-900' : 'text-slate-900')}>
                      {eur(Math.abs(a.balance))} <span className="text-xs font-normal text-slate-500">{a.balance >= 0 ? 'D' : 'C'}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-50 font-semibold">
                <tr>
                  <td className="px-5 py-2.5" colSpan={2}>
                    <span className={cn('inline-flex items-center gap-1.5 text-xs', data.balanced ? 'text-emerald-700' : 'text-red-700')}>
                      {data.balanced ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />}
                      {data.balanced ? 'Balance équilibrée' : 'Balance déséquilibrée'} · {data.entriesCount} écritures
                    </span>
                  </td>
                  <td className="px-5 py-2.5 text-right tabular-nums">{eur(data.totals.debit)}</td>
                  <td className="px-5 py-2.5 text-right tabular-nums">{eur(data.totals.credit)}</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
        <p className="border-t border-slate-100 px-5 py-3 text-xs text-slate-500">
          Hypothèses à valider avec votre expert-comptable : prestations en compte 706, dépenses réglées à leur date, TVA non récupérable intégrée à la charge.
          Les virements, cartes et placements simulés sont exclus.
        </p>
      </CardBody>
    </Card>
  );
}
