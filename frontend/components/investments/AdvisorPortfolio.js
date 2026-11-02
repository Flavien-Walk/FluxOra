'use client';

import { useMemo, useState } from 'react';
import useSWR, { useSWRConfig } from 'swr';
import { toast } from 'sonner';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import { Sparkles, ShieldCheck, PieChart, ChevronDown, Info, ShoppingCart } from 'lucide-react';
import api from '@/lib/api';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { cn } from '@/lib/utils';

const fetcher = async (url) => (await api.get(url)).data;
const pct = (n, d = 1) => (n == null ? '—' : `${(n * 100).toLocaleString('fr-FR', { maximumFractionDigits: d })} %`);
const eur = (n) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n || 0);

/**
 * Conseiller : portefeuille d'actions optimisé à partir du Score Fluxora (50 indicateurs).
 */
export default function AdvisorPortfolio({ onInvested }) {
  const { mutate } = useSWRConfig();
  const [size, setSize] = useState(15);
  const [minScore, setMinScore] = useState(55);
  const [amount, setAmount] = useState('20000');
  const [busy, setBusy] = useState(false);
  const [showMethod, setShowMethod] = useState(false);

  const { data, isLoading } = useSWR(`/api/investments/advisor/portfolio?size=${size}&minScore=${minScore}`, fetcher, {
    refreshInterval: (d) => (d && !d.ready ? 15_000 : 0), // réessaie tant que l'univers se calcule
    revalidateOnFocus: false,
  });
  const { data: method } = useSWR(showMethod ? '/api/investments/advisor/methodology' : null, fetcher);

  const chart = useMemo(() => {
    const bt = data?.backtest;
    if (!bt?.portfolio?.length) return [];
    const n = bt.portfolio.length;
    return bt.portfolio.map((v, i) => ({ day: i - n + 1, portefeuille: v, cac: bt.benchmark?.[i - (n - (bt.benchmark?.length || 0))] ?? null }));
  }, [data]);

  const invest = async () => {
    setBusy(true);
    try {
      const { data: res } = await api.post('/api/investments/advisor/portfolio/invest', { amountEur: Number(amount), size, minScore });
      toast.success(`Portefeuille simulé : ${res.bought.length} lignes achetées pour ${eur(res.investedEur)}.`);
      if (res.skipped.length) toast.info(`${res.skipped.length} ligne(s) ignorée(s) (montant trop faible pour une action).`);
      mutate('/api/investments/stocks');
      onInvested?.();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Investissement simulé impossible.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      <Card>
        <CardBody className="space-y-4">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-accent-500 to-accent-700">
              <Sparkles size={16} className="text-white" aria-hidden="true" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Portefeuille optimisé — horizon long terme</h2>
              <p className="text-xs text-slate-600 mt-0.5">
                Les meilleures valeurs selon le Score Fluxora (50 indicateurs), pondérées pour maximiser la qualité du portefeuille
                tout en réduisant son risque : 10 % maximum par action, 25 % maximum par secteur.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <div>
              <label htmlFor="adv-size" className="block text-xs font-medium text-slate-600 mb-1">Nombre de lignes</label>
              <select id="adv-size" value={size} onChange={(e) => setSize(Number(e.target.value))}
                className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent-500">
                {[10, 15, 20].map((n) => <option key={n} value={n}>{n} actions</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="adv-min" className="block text-xs font-medium text-slate-600 mb-1">Score minimum</label>
              <select id="adv-min" value={minScore} onChange={(e) => setMinScore(Number(e.target.value))}
                className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent-500">
                {[50, 55, 60].map((n) => <option key={n} value={n}>{n} %</option>)}
              </select>
            </div>
          </div>
        </CardBody>
      </Card>

      {isLoading ? (
        <p className="text-sm text-slate-500">Optimisation en cours…</p>
      ) : !data?.ready ? (
        <Card><CardBody>
          <p className="text-sm text-slate-700">{data?.message || 'Portefeuille indisponible.'}</p>
          {data?.status?.building && (
            <p className="mt-1 text-xs text-slate-500">Analyse de l’univers : {data.status.progress.done} / {data.status.progress.total} valeurs…</p>
          )}
        </CardBody></Card>
      ) : (
        <>
          {/* Indicateurs clés */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              ['Score moyen pondéré', `${Math.round(data.metrics.averageScore)} %`],
              ['Volatilité estimée', pct(data.metrics.expectedVolatility)],
              ['Gain de diversification', pct(data.metrics.diversificationGain, 0)],
              ['Rétrospective 1 an', `${pct(data.backtest.portfolioReturn)} (CAC 40 : ${pct(data.backtest.benchmarkReturn)})`],
            ].map(([label, value]) => (
              <Card key={label} className="px-4 py-3">
                <p className="text-xs text-slate-500">{label}</p>
                <p className="mt-0.5 text-base font-semibold tabular-nums text-slate-900">{value}</p>
              </Card>
            ))}
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-5 gap-5">
            {/* Composition */}
            <Card className="xl:col-span-3">
              <CardHeader><h3 className="text-sm font-semibold text-slate-800">Composition ({data.holdings.length} lignes)</h3></CardHeader>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th scope="col" className="px-4 py-2 text-left font-semibold">Société</th>
                      <th scope="col" className="px-4 py-2 text-left font-semibold">Secteur</th>
                      <th scope="col" className="px-4 py-2 text-right font-semibold">Score</th>
                      <th scope="col" className="px-4 py-2 text-right font-semibold">Poids</th>
                      <th scope="col" className="px-4 py-2 text-right font-semibold">Montant</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data.holdings.map((h) => (
                      <tr key={h.isin}>
                        <td className="px-4 py-2"><span className="font-medium text-slate-900">{h.name}</span><span className="block text-xs text-slate-500">{h.market}</span></td>
                        <td className="px-4 py-2 text-xs text-slate-600">{h.sector}</td>
                        <td className="px-4 py-2 text-right font-semibold tabular-nums">{Math.round(h.score)} %</td>
                        <td className="px-4 py-2 text-right tabular-nums">{pct(h.weight)}</td>
                        <td className="px-4 py-2 text-right tabular-nums text-slate-700">{eur(Number(amount) * h.weight)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            {/* Secteurs + rétrospective */}
            <div className="xl:col-span-2 space-y-5">
              <Card>
                <CardHeader><h3 className="flex items-center gap-2 text-sm font-semibold text-slate-800"><PieChart size={14} aria-hidden="true" /> Répartition par secteur</h3></CardHeader>
                <CardBody>
                  <ul className="space-y-1.5">
                    {data.sectors.map((s) => (
                      <li key={s.sector} className="grid grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_3rem] items-center gap-2 text-xs">
                        <span className="truncate text-slate-700">{s.sector}</span>
                        <span className="h-2 rounded-full bg-slate-100 overflow-hidden"><span className="block h-full rounded-full bg-accent-600" style={{ width: `${(s.weight / 0.25) * 100}%` }} /></span>
                        <span className="text-right font-semibold tabular-nums">{pct(s.weight, 0)}</span>
                      </li>
                    ))}
                  </ul>
                </CardBody>
              </Card>
              <Card>
                <CardHeader><h3 className="text-sm font-semibold text-slate-800">Rétrospective sur 1 an (base 100)</h3></CardHeader>
                <CardBody>
                  <div className="h-44 -mx-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chart} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                        <CartesianGrid stroke="#E2E8F0" vertical={false} />
                        <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#64748B' }} axisLine={false} tickLine={false} tickFormatter={(d) => `${d} j`} minTickGap={40} />
                        <YAxis width={40} domain={['auto', 'auto']} tick={{ fontSize: 10, fill: '#64748B' }} axisLine={false} tickLine={false} />
                        <Tooltip formatter={(v, n) => [Number(v).toFixed(1), n === 'cac' ? 'CAC 40' : 'Portefeuille']} labelFormatter={(d) => `${d} jours`} />
                        <Legend formatter={(v) => (v === 'cac' ? 'CAC 40' : 'Portefeuille')} wrapperStyle={{ fontSize: 11 }} />
                        <Line type="monotone" dataKey="portefeuille" stroke="#1C6EF2" strokeWidth={2} dot={false} />
                        <Line type="monotone" dataKey="cac" stroke="#64748B" strokeWidth={1.5} strokeDasharray="4 3" dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                  <p className="mt-2 text-[11px] text-slate-500">
                    Perte maximale : portefeuille {pct(data.backtest.portfolioMaxDrawdown)}, CAC 40 {pct(data.backtest.benchmarkMaxDrawdown)}. {data.disclaimer}
                  </p>
                </CardBody>
              </Card>
            </div>
          </div>

          {/* Investir (simulation) */}
          <Card>
            <CardBody className="flex flex-col sm:flex-row sm:items-end gap-3">
              <div className="flex-1">
                <label htmlFor="adv-amount" className="block text-xs font-medium text-slate-600 mb-1">Montant à répartir (€)</label>
                <input id="adv-amount" type="number" min="1000" step="1000" value={amount} onChange={(e) => setAmount(e.target.value)}
                  className="w-full h-10 rounded-lg border border-slate-200 px-3 text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-accent-500" />
              </div>
              <Button onClick={invest} loading={busy} disabled={Number(amount) < 1000}>
                <ShoppingCart size={15} aria-hidden="true" /> Investir ce portefeuille (simulation)
              </Button>
            </CardBody>
          </Card>
        </>
      )}

      {/* Méthode */}
      <Card>
        <button onClick={() => setShowMethod((v) => !v)} aria-expanded={showMethod} className="flex w-full items-center justify-between px-5 py-3 text-left">
          <span className="flex items-center gap-2 text-sm font-semibold text-slate-800"><ShieldCheck size={15} aria-hidden="true" /> Méthode : les 50 indicateurs du Score Fluxora</span>
          <ChevronDown size={16} className={cn('text-slate-500 transition-transform', showMethod && 'rotate-180')} aria-hidden="true" />
        </button>
        {showMethod && (
          <CardBody className="border-t border-slate-100 space-y-4">
            <p className="text-xs text-slate-600">
              Chaque indicateur est noté de 0 à 100 selon sa position parmi ~160 sociétés (Euronext Paris et Growth), puis regroupé
              en 7 familles pondérées. Données : Yahoo Finance et titres de presse (Google Actualités), actualisées chaque nuit.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(method?.families || []).map((f) => (
                <div key={f.key}>
                  <p className="text-sm font-semibold text-slate-900">{f.label} · {Math.round(f.weight * 100)} %</p>
                  <ol className="mt-1 list-decimal pl-5 text-xs text-slate-600 space-y-0.5">
                    {f.variables.map((v) => <li key={v.key}>{v.label} <span className="text-slate-500">({v.better} = mieux{v.notForFinancials ? ', ignoré pour les banques' : ''})</span></li>)}
                  </ol>
                </div>
              ))}
            </div>
          </CardBody>
        )}
      </Card>

      <p className="flex items-start gap-1.5 text-xs text-slate-500">
        <Info size={13} className="mt-0.5 flex-shrink-0" aria-hidden="true" />
        Outil quantitatif et pédagogique. Ce n’est pas un conseil en investissement personnalisé : investir en actions comporte un risque de perte en capital.
      </p>
    </div>
  );
}
