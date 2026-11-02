'use client';

import useSWR from 'swr';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine } from 'recharts';
import { Info } from 'lucide-react';
import api from '@/lib/api';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import { cn } from '@/lib/utils';

const fetcher = async (url) => (await api.get(url)).data;
const eur = (n) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n || 0);
const short = (d) => new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });

/**
 * Prévisionnel de trésorerie sur 13 semaines (≈ 90 jours).
 */
export default function ForecastCard() {
  const { data, isLoading } = useSWR('/api/dashboard/forecast', fetcher, { refreshInterval: 300_000 });
  const series = (data?.series || []).map((w) => ({ ...w, label: `S${w.week} · ${short(w.start)}` }));
  const negative = data && data.lowest?.balance < 0;

  return (
    <Card>
      <CardHeader>
        <h2 className="text-sm font-semibold text-slate-800">Prévisionnel de trésorerie</h2>
        <p className="text-xs text-slate-500 mt-0.5">Solde estimé sur 90 jours</p>
      </CardHeader>
      <CardBody className="space-y-4">
        <dl className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {[
            ['Aujourd’hui', data?.startBalance],
            ['À 30 jours', data?.horizons?.d30],
            ['À 60 jours', data?.horizons?.d60],
            ['À 90 jours', data?.horizons?.d90],
          ].map(([label, v]) => (
            <div key={label} className="rounded-lg bg-slate-50 px-3 py-2">
              <dt className="text-[11px] text-slate-500">{label}</dt>
              <dd className={cn('text-sm font-semibold tabular-nums', v < 0 ? 'text-red-700' : 'text-slate-900')}>{isLoading ? '…' : eur(v)}</dd>
            </div>
          ))}
        </dl>

        {negative && (
          <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
            Trésorerie négative prévue la semaine du {short(data.lowest.start)} ({eur(data.lowest.balance)}) : relancez vos impayés ou décalez des dépenses.
          </p>
        )}

        <div className="h-48 -mx-2">
          {series.length > 0 && (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={series} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="fc-fill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#1C6EF2" stopOpacity={0.22} />
                    <stop offset="100%" stopColor="#1C6EF2" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#E2E8F0" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#64748B' }} axisLine={false} tickLine={false} interval={2} />
                <YAxis width={64} tick={{ fontSize: 10, fill: '#64748B' }} axisLine={false} tickLine={false}
                  tickFormatter={(v) => new Intl.NumberFormat('fr-FR', { notation: 'compact' }).format(v)} />
                <ReferenceLine y={0} stroke="#B42318" strokeDasharray="3 3" />
                <Tooltip
                  formatter={(v, name) => [eur(v), { balance: 'Solde', inflow: 'Encaissements', outflow: 'Décaissements' }[name] || name]}
                  labelFormatter={(l) => l} />
                <Area type="monotone" dataKey="balance" stroke="#1C6EF2" strokeWidth={2} fill="url(#fc-fill)" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {data && (
          <p className="flex items-start gap-1.5 text-[11px] text-slate-500">
            <Info size={12} className="mt-0.5 flex-shrink-0" aria-hidden="true" />
            {data.method} Factures à encaisser : {eur(data.receivablesTotal)} · dépenses moyennes : {eur(data.weeklyOutflowAverage)} par semaine.
          </p>
        )}
      </CardBody>
    </Card>
  );
}
