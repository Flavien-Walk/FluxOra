'use client';

import useSWR from 'swr';
import Link from 'next/link';
import api from '@/lib/api';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';

const fetcher = async (url) => (await api.get(url)).data;
const eur = (n) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n || 0);

// Teintes de la plus récente (neutre) à la plus ancienne (critique) — la couleur double le libellé, jamais seule
const TONE = { notDue: '#94A3B8', d30: '#F2B84B', d60: '#EC835A', d90: '#D9604B', d90plus: '#B42318' };

/**
 * Balance âgée : impayés par ancienneté de retard, et principaux débiteurs.
 */
export default function AgingCard() {
  const { data, isLoading } = useSWR('/api/dashboard/aging', fetcher, { refreshInterval: 120_000 });
  const total = data?.total || 0;

  return (
    <Card>
      <CardHeader className="flex items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-slate-800">Balance âgée des impayés</h2>
          <p className="text-xs text-slate-500 mt-0.5">Factures non réglées par ancienneté de retard (TTC)</p>
        </div>
        <span className="text-sm font-semibold tabular-nums text-slate-900">{isLoading ? '…' : eur(total)}</span>
      </CardHeader>
      <CardBody className="space-y-4">
        {!isLoading && total === 0 ? (
          <p className="text-sm text-slate-500">Aucune facture impayée.</p>
        ) : (
          <>
            <div className="flex h-3 w-full overflow-hidden rounded-full bg-slate-100 gap-0.5" role="img"
              aria-label={(data?.buckets || []).map((b) => `${b.label} : ${eur(b.total)}`).join(', ')}>
              {(data?.buckets || []).filter((b) => b.total > 0).map((b) => (
                <span key={b.key} style={{ width: `${(b.total / total) * 100}%`, background: TONE[b.key] }} />
              ))}
            </div>
            <ul className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {(data?.buckets || []).map((b) => (
                <li key={b.key} className="rounded-lg bg-slate-50 px-3 py-2">
                  <p className="flex items-center gap-1.5 text-[11px] text-slate-600">
                    <span className="h-2 w-2 rounded-sm" style={{ background: TONE[b.key] }} aria-hidden="true" />{b.label}
                  </p>
                  <p className="text-sm font-semibold tabular-nums text-slate-900">{eur(b.total)}</p>
                  <p className="text-[11px] text-slate-500">{b.count} facture{b.count > 1 ? 's' : ''}</p>
                </li>
              ))}
            </ul>
            {data?.debtors?.length > 0 && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1.5">Principaux débiteurs</p>
                <ul className="divide-y divide-slate-100">
                  {data.debtors.slice(0, 5).map((d) => (
                    <li key={String(d.clientId)} className="flex items-center justify-between gap-3 py-2 text-sm">
                      {d.clientId ? (
                        <Link href={`/clients/${d.clientId}`} className="min-w-0 truncate font-medium text-slate-800 hover:text-accent-700">{d.name}</Link>
                      ) : <span className="font-medium text-slate-800">{d.name}</span>}
                      <span className="flex-shrink-0 text-right">
                        <span className="font-semibold tabular-nums text-red-700">{eur(d.overdue)}</span>
                        <span className="ml-2 text-xs text-slate-500">jusqu’à {d.maxDaysLate} j de retard</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
      </CardBody>
    </Card>
  );
}
