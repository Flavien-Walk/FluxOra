'use client';

import { useEffect, useMemo, useState } from 'react';
import useSWR from 'swr';
import { Search, Clock, TrendingUp, TrendingDown, ChevronLeft, ChevronRight, Info } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import api from '@/lib/api';
import Modal from '@/components/ui/Modal';
import { cn } from '@/lib/utils';

const fetcher = async (url) => (await api.get(url)).data;

const SORTS = [
  { id: 'change', label: 'Plus fortes hausses' },
  { id: 'changeAsc', label: 'Plus fortes baisses' },
  { id: 'volume', label: 'Plus échangées (montant)' },
  { id: 'marketCap', label: 'Capitalisation' },
  { id: 'name', label: 'Nom (A → Z)' },
];

const RANGES = [
  { id: '5d', label: '5 j' },
  { id: '1mo', label: '1 mois' },
  { id: '6mo', label: '6 mois' },
  { id: '1y', label: '1 an' },
];

const fmtPrice = (n, cur = 'EUR') =>
  n == null ? '—' : new Intl.NumberFormat('fr-FR', { style: 'currency', currency: cur, maximumFractionDigits: n < 1 ? 4 : 2 }).format(n);
const fmtCompact = (n, cur) =>
  n == null ? '—' : new Intl.NumberFormat('fr-FR', { notation: 'compact', maximumFractionDigits: 1, ...(cur ? { style: 'currency', currency: cur } : {}) }).format(n);
const fmtTime = (d) => (d ? new Date(d).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—');

// Variation : signe + flèche + couleur (jamais la couleur seule)
function Change({ value, className }) {
  if (value == null) return <span className={cn('text-slate-500', className)}>—</span>;
  const up = value > 0; const down = value < 0;
  return (
    <span className={cn('inline-flex items-center gap-1 font-semibold tabular-nums', up && 'text-emerald-700', down && 'text-red-700', !up && !down && 'text-slate-600', className)}>
      {up ? <TrendingUp size={13} aria-hidden="true" /> : down ? <TrendingDown size={13} aria-hidden="true" /> : null}
      {up ? '+' : ''}{value.toFixed(2)} %
    </span>
  );
}

function useDebounced(value, delay = 300) {
  const [v, setV] = useState(value);
  useEffect(() => { const t = setTimeout(() => setV(value), delay); return () => clearTimeout(t); }, [value, delay]);
  return v;
}

/* ─── Fiche valeur ─────────────────────────────────────────────────────────── */
function StockDetail({ isin, onClose }) {
  const [range, setRange] = useState('1mo');
  const { data, error, isLoading } = useSWR(isin ? `/api/investments/market/euronext-growth/${isin}?range=${range}` : null, fetcher);
  const s = data?.stock;
  const first = s?.history?.[0]?.close;
  const last = s?.history?.at(-1)?.close;
  const perf = first && last ? ((last - first) / first) * 100 : null;

  return (
    <Modal open={!!isin} onClose={onClose} title={s ? `${s.name} (${s.symbol})` : 'Valeur'} size="lg">
      {error && <p className="text-sm text-red-700">{error.response?.data?.error || 'Impossible de charger la valeur.'}</p>}
      {isLoading && !s && <p className="text-sm text-slate-500">Chargement…</p>}
      {s && (
        <div className="space-y-5">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-3xl font-bold text-slate-900 tabular-nums">{fmtPrice(s.price, s.currency)}</p>
              <div className="mt-1 flex items-center gap-3 text-sm">
                <Change value={s.changePercent} />
                <span className="text-slate-500">Euronext Growth {s.market} · {s.isin}</span>
              </div>
            </div>
            <div className="flex gap-1 rounded-lg bg-slate-100 p-1" role="group" aria-label="Période du graphique">
              {RANGES.map((r) => (
                <button key={r.id} onClick={() => setRange(r.id)} aria-pressed={range === r.id}
                  className={cn('rounded-md px-2.5 py-1 text-xs font-medium', range === r.id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600')}>
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          <div className="h-56 -mx-2">
            {s.history?.length > 1 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={s.history} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="eg-fill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#1C6EF2" stopOpacity={0.25} />
                      <stop offset="100%" stopColor="#1C6EF2" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="#E2E8F0" vertical={false} />
                  <XAxis dataKey="date" tickFormatter={(d) => new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}
                    tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} minTickGap={24} />
                  <YAxis domain={['auto', 'auto']} width={56} tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false}
                    tickFormatter={(v) => v.toLocaleString('fr-FR', { maximumFractionDigits: v < 1 ? 3 : 2 })} />
                  <Tooltip formatter={(v) => [fmtPrice(v, s.currency), 'Clôture']} labelFormatter={(d) => new Date(d).toLocaleString('fr-FR')} />
                  <Area type="monotone" dataKey="close" stroke="#1C6EF2" strokeWidth={2} fill="url(#eg-fill)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <p className="flex h-full items-center justify-center text-sm text-slate-500">Historique indisponible pour cette valeur.</p>
            )}
          </div>

          <dl className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
            {[
              ['Performance période', <Change key="p" value={perf} />],
              ['Volume', fmtCompact(s.volume)],
              ['Capitalisation', fmtCompact(s.marketCap, s.currency)],
              ['Plus haut / bas jour', s.dayHigh != null ? `${fmtPrice(s.dayHigh, s.currency)} / ${fmtPrice(s.dayLow, s.currency)}` : '—'],
            ].map(([label, value]) => (
              <div key={label} className="rounded-lg bg-slate-50 px-3 py-2">
                <dt className="text-xs text-slate-500">{label}</dt>
                <dd className="font-semibold text-slate-900">{value}</dd>
              </div>
            ))}
          </dl>

          <p className="text-xs text-slate-500">
            Dernier cours : {fmtTime(s.time)} · {s.source === 'yahoo' ? `différé de ${s.delayMinutes ?? 15} min (Yahoo Finance)` : 'clôture de la dernière séance (Euronext)'}.
            Informations fournies à titre indicatif : ceci n&apos;est pas un conseil en investissement.
          </p>
        </div>
      )}
    </Modal>
  );
}

/* ─── Liste du marché ──────────────────────────────────────────────────────── */
export default function EuronextGrowthMarket() {
  const [q, setQ] = useState('');
  const [market, setMarket] = useState('');
  const [sort, setSort] = useState('change');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState(null);
  const query = useDebounced(q);

  useEffect(() => { setPage(1); }, [query, market, sort]);

  const url = useMemo(() => {
    const p = new URLSearchParams({ sort, page: String(page), limit: '25' });
    if (query) p.set('q', query);
    if (market) p.set('market', market);
    return `/api/investments/market/euronext-growth?${p}`;
  }, [query, market, sort, page]);

  // Rafraîchissement automatique toutes les 60 s (cours différés de 15 min)
  const { data, error, isLoading } = useSWR(url, fetcher, { refreshInterval: 60_000, keepPreviousData: true });
  const summary = data?.summary;

  return (
    <div className="space-y-4">
      {/* Bandeau source */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-900">
          <Clock size={12} aria-hidden="true" /> Cours différés de 15 min
        </span>
        {summary && (
          <>
            <span className="text-slate-700"><b className="tabular-nums">{summary.total}</b> sociétés Euronext Growth</span>
            <span className="text-emerald-700 tabular-nums">▲ {summary.up} en hausse</span>
            <span className="text-red-700 tabular-nums">▼ {summary.down} en baisse</span>
          </>
        )}
        <span className="text-xs text-slate-500 sm:ml-auto">
          Mis à jour {data?.quotesUpdatedAt ? new Date(data.quotesUpdatedAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '…'} · actualisation automatique
        </span>
      </div>

      {/* Filtres */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" aria-hidden="true" />
          <label htmlFor="eg-search" className="sr-only">Rechercher une société</label>
          <input id="eg-search" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Nom, code ou ISIN…"
            className="w-full h-10 pl-9 pr-3 rounded-lg border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-accent-500" />
        </div>
        <label htmlFor="eg-market" className="sr-only">Marché</label>
        <select id="eg-market" value={market} onChange={(e) => setMarket(e.target.value)}
          className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent-500">
          <option value="">Tous les marchés</option>
          {summary?.markets?.map((m) => <option key={m.mic} value={m.mic}>{m.label} ({m.count})</option>)}
        </select>
        <label htmlFor="eg-sort" className="sr-only">Trier par</label>
        <select id="eg-sort" value={sort} onChange={(e) => setSort(e.target.value)}
          className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent-500">
          {SORTS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
        </select>
      </div>

      {error && (
        <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error.response?.data?.error || 'Impossible de charger le marché.'}
        </p>
      )}

      {/* Tableau (ordinateur) / cartes (mobile) */}
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        {isLoading && !data ? (
          <p className="px-4 py-10 text-center text-sm text-slate-500">Chargement des cotations… (jusqu&apos;à 10 s au premier affichage)</p>
        ) : data?.stocks?.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-slate-500">Aucune société ne correspond à cette recherche.</p>
        ) : (
          <>
            <table className="hidden md:table w-full text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th scope="col" className="px-4 py-2.5 text-left font-semibold">Société</th>
                  <th scope="col" className="px-4 py-2.5 text-right font-semibold">Cours</th>
                  <th scope="col" className="px-4 py-2.5 text-right font-semibold">Variation</th>
                  <th scope="col" className="px-4 py-2.5 text-right font-semibold">Volume</th>
                  <th scope="col" className="px-4 py-2.5 text-right font-semibold">Capitalisation</th>
                  <th scope="col" className="px-4 py-2.5 text-right font-semibold">Heure</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data?.stocks?.map((s) => (
                  <tr key={`${s.isin}-${s.mic}`} className="hover:bg-slate-50">
                    <td className="px-4 py-2.5">
                      <button onClick={() => setSelected(s.isin)} className="text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 rounded">
                        <span className="block font-medium text-slate-900">{s.name}</span>
                        <span className="text-xs text-slate-500">{s.symbol} · {s.market}</span>
                      </button>
                    </td>
                    <td className="px-4 py-2.5 text-right font-semibold tabular-nums text-slate-900">{fmtPrice(s.price, s.currency)}</td>
                    <td className="px-4 py-2.5 text-right"><Change value={s.changePercent} /></td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-slate-700">{fmtCompact(s.volume)}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-slate-700">{fmtCompact(s.marketCap, s.currency)}</td>
                    <td className="px-4 py-2.5 text-right text-xs text-slate-500">{fmtTime(s.time)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <ul className="md:hidden divide-y divide-slate-100">
              {data?.stocks?.map((s) => (
                <li key={`${s.isin}-${s.mic}`}>
                  <button onClick={() => setSelected(s.isin)} className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left active:bg-slate-50">
                    <span className="min-w-0">
                      <span className="block truncate font-medium text-slate-900">{s.name}</span>
                      <span className="text-xs text-slate-500">{s.symbol} · {s.market}</span>
                    </span>
                    <span className="text-right">
                      <span className="block font-semibold tabular-nums text-slate-900">{fmtPrice(s.price, s.currency)}</span>
                      <Change value={s.changePercent} className="text-xs" />
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}

        {data && data.pages > 1 && (
          <div className="flex items-center justify-between border-t border-slate-100 px-4 py-2.5 text-sm">
            <span className="text-slate-500 tabular-nums">{data.count} résultats · page {data.page}/{data.pages}</span>
            <div className="flex gap-1">
              <button aria-label="Page précédente" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}
                className="h-8 w-8 flex items-center justify-center rounded-lg border border-slate-200 disabled:opacity-40"><ChevronLeft size={15} /></button>
              <button aria-label="Page suivante" disabled={page >= data.pages} onClick={() => setPage((p) => p + 1)}
                className="h-8 w-8 flex items-center justify-center rounded-lg border border-slate-200 disabled:opacity-40"><ChevronRight size={15} /></button>
            </div>
          </div>
        )}
      </div>

      <p className="flex items-start gap-2 text-xs text-slate-500">
        <Info size={13} className="mt-0.5 flex-shrink-0" aria-hidden="true" />
        Sources : liste officielle Euronext (live.euronext.com) et cotations Yahoo Finance, différées de 15 minutes ;
        à défaut, cours de clôture de la dernière séance. Informations à titre indicatif, sans valeur de conseil en investissement.
      </p>

      <StockDetail isin={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
