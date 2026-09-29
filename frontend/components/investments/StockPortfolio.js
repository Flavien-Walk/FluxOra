'use client';

import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine } from 'recharts';
import { BarChart3, Trash2, Wallet, PlusCircle, RotateCcw, ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { useStockPortfolio, stockSimulationApi } from '@/hooks/useStockSimulation';
import { cn } from '@/lib/utils';

const eur = (n) => (n == null ? '—' : new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n));
const date = (d) => (d ? new Date(d).toLocaleDateString('fr-FR') : '—');
const dateTime = (d) => new Date(d).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });
const pct = (n) => `${n >= 0 ? '+' : ''}${n.toFixed(2).replace('.', ',')} %`;
const ALLOC_COLORS = ['#6366f1', '#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#14b8a6', '#ec4899'];
const TXN = {
  deposit: { label: 'Apport', icon: ArrowDownLeft, cls: 'text-emerald-700 bg-emerald-50' },
  buy: { label: 'Achat', icon: ArrowUpRight, cls: 'text-accent-700 bg-accent-50' },
  sell: { label: 'Vente', icon: ArrowDownLeft, cls: 'text-amber-800 bg-amber-50' },
};

function Pnl({ value, percent }) {
  if (value == null) return <span className="text-slate-500">—</span>;
  const up = value >= 0;
  return (
    <span className={cn('font-semibold tabular-nums', up ? 'text-emerald-700' : 'text-red-700')}>
      {up ? '▲ +' : '▼ '}{eur(value)}{percent != null && <span className="ml-1 text-xs">({pct(percent)})</span>}
    </span>
  );
}

/* ─── Performance : portefeuille vs CAC 40 (base 100) ───────────────────────── */
function PerformanceChart({ history }) {
  const data = useMemo(() => {
    const firstCac = history.find((h) => h.cac)?.cac;
    return history.map((h) => ({
      day: new Date(h.day).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }),
      // Base 100 = capital apporté : les apports ne sont pas comptés comme performance
      portefeuille: Math.round((h.valueEur / h.investedEur) * 10000) / 100,
      cac: firstCac && h.cac ? Math.round((h.cac / firstCac) * 10000) / 100 : null,
    }));
  }, [history]);

  if (data.length < 2) {
    return (
      <p className="px-4 py-8 text-center text-sm text-slate-500">
        La courbe de performance se construit jour après jour : revenez après la prochaine séance.
      </p>
    );
  }
  return (
    <div className="h-56 px-2 pb-2" role="img" aria-label="Évolution du portefeuille virtuel comparée au CAC 40, base 100">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 10, right: 12, left: -12, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
          <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} axisLine={false} minTickGap={24} />
          <YAxis tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} axisLine={false} domain={['auto', 'auto']} />
          <ReferenceLine y={100} stroke="#94a3b8" strokeDasharray="4 4" />
          <Tooltip formatter={(v, n) => [v?.toFixed(2), n === 'cac' ? 'CAC 40' : 'Portefeuille']} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
          <Line type="monotone" dataKey="portefeuille" stroke="#6366f1" strokeWidth={2} dot={false} name="portefeuille" />
          <Line type="monotone" dataKey="cac" stroke="#94a3b8" strokeWidth={1.5} dot={false} connectNulls name="cac" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ─── Apport de capital / remise à zéro ─────────────────────────────────────── */
function WalletActions({ onDone }) {
  const [mode, setMode] = useState(null); // 'deposit' | 'reset'
  const [amount, setAmount] = useState('');
  const [busy, setBusy] = useState(false);

  const open = (m) => { setMode(m); setAmount(m === 'reset' ? '100000' : '10000'); };
  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === 'deposit') {
        await stockSimulationApi.deposit(Number(amount));
        toast.success(`${eur(Number(amount))} ajoutés au portefeuille virtuel.`);
      } else {
        await stockSimulationApi.reset(Number(amount));
        toast.success(`Nouveau portefeuille de ${eur(Number(amount))}.`);
      }
      setMode(null);
      onDone();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Opération impossible.');
    } finally {
      setBusy(false);
    }
  };

  if (!mode) {
    return (
      <div className="flex gap-2">
        <Button size="sm" variant="secondary" onClick={() => open('deposit')}><PlusCircle size={14} aria-hidden="true" /> Ajouter du capital</Button>
        <Button size="sm" variant="ghost" onClick={() => open('reset')}><RotateCcw size={14} aria-hidden="true" /> Recommencer</Button>
      </div>
    );
  }
  return (
    <form onSubmit={submit} className="flex flex-wrap items-end gap-2 rounded-lg border border-slate-200 bg-white p-3">
      <div>
        <label htmlFor="wallet-amount" className="block text-xs font-medium text-slate-600 mb-1">
          {mode === 'deposit' ? 'Montant à ajouter (€)' : 'Nouveau capital de départ (€)'}
        </label>
        <input id="wallet-amount" type="number" min="1000" max="10000000" step="1000" required value={amount} onChange={(e) => setAmount(e.target.value)}
          className="h-8 w-40 rounded-md border border-slate-200 px-2 text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-accent-500" />
      </div>
      {mode === 'reset' && <p className="basis-full text-xs text-red-700 order-last">Toutes les positions, ventes et opérations seront effacées.</p>}
      <Button size="sm" variant="secondary" type="button" onClick={() => setMode(null)}>Annuler</Button>
      <Button size="sm" type="submit" variant={mode === 'reset' ? 'danger' : 'primary'} loading={busy}>
        {mode === 'deposit' ? 'Ajouter' : 'Tout effacer et recommencer'}
      </Button>
    </form>
  );
}

/* ─── Ligne d'une position ouverte, avec vente totale ou partielle ──────────── */
function PositionRow({ p, onSold }) {
  const [selling, setSelling] = useState(false);
  const [qty, setQty] = useState(String(p.quantity));
  const [busy, setBusy] = useState(false);
  const q = Number.parseInt(qty, 10);
  const valid = Number.isInteger(q) && q >= 1 && q <= p.quantity;

  const sell = async () => {
    setBusy(true);
    try {
      const pos = await stockSimulationApi.sell(p._id, q);
      toast.success(`Vente simulée de ${pos.quantity} action${pos.quantity > 1 ? 's' : ''} : ${eur(pos.proceedsEur)} crédités (plus-value ${eur(pos.realizedPnlEur)}).`);
      setSelling(false);
      onSold();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Vente impossible.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <li className="px-4 py-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-medium text-slate-900">{p.name} <span className="text-xs text-slate-500">({p.symbol} · {p.market})</span></p>
          <p className="text-xs text-slate-500 tabular-nums">
            {p.quantity} action{p.quantity > 1 ? 's' : ''} · prix de revient {eur(p.buyPriceEur)} · cours {eur(p.currentPriceEur)} · achat le {date(p.boughtAt)}
          </p>
        </div>
        <div className="text-right">
          <p className="font-semibold tabular-nums text-slate-900">{eur(p.valueEur)}</p>
          <Pnl value={p.pnlEur} percent={p.pnlPercent} />
        </div>
      </div>
      <div className="mt-2 flex flex-wrap items-center justify-end gap-2">
        {selling ? (
          <>
            <label htmlFor={`sell-${p._id}`} className="text-xs text-slate-600">Quantité à vendre</label>
            <input id={`sell-${p._id}`} type="number" min="1" max={p.quantity} step="1" value={qty} onChange={(e) => setQty(e.target.value)}
              className="h-8 w-24 rounded-md border border-slate-200 px-2 text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-accent-500" />
            <span className="text-xs text-slate-500 tabular-nums">≈ {valid && p.currentPriceEur ? eur(q * p.currentPriceEur) : '—'}</span>
            <Button size="sm" variant="secondary" onClick={() => setSelling(false)}>Annuler</Button>
            <Button size="sm" onClick={sell} loading={busy} disabled={!valid}>Confirmer la vente</Button>
          </>
        ) : (
          <Button size="sm" variant="secondary" onClick={() => { setQty(String(p.quantity)); setSelling(true); }}>Vendre</Button>
        )}
      </div>
    </li>
  );
}

/**
 * Portefeuille virtuel : capital fictif, espèces, positions valorisées, performance vs CAC 40 et journal des opérations.
 */
export default function StockPortfolio({ onBrowse }) {
  const { positions, totals, wallet, transactions, isLoading, mutate } = useStockPortfolio();
  const [busy, setBusy] = useState(null);

  const open = positions.filter((p) => p.status === 'open');
  const sold = positions.filter((p) => p.status === 'sold');

  const remove = async (p) => {
    setBusy(p._id);
    try { await stockSimulationApi.remove(p._id); mutate(); } catch (err) { toast.error(err.response?.data?.error || 'Suppression impossible.'); } finally { setBusy(null); }
  };

  if (isLoading || !wallet) return <div className="h-24 rounded-xl bg-slate-200 animate-pulse" />;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <Wallet size={16} className="text-accent-600" aria-hidden="true" /> Portefeuille virtuel
            <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-900">Argent fictif</span>
          </h2>
          <p className="text-xs text-slate-500">Démarré le {date(wallet.startedAt)} avec {eur(wallet.initialCapital)} de capital apporté.</p>
        </div>
        <WalletActions onDone={mutate} />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="px-4 py-3">
          <p className="text-xs text-slate-500">Valeur totale</p>
          <p className="mt-0.5 text-lg font-semibold tabular-nums text-slate-900">{eur(wallet.totalValueEur)}</p>
          <Pnl value={wallet.performanceEur} percent={wallet.performancePercent} />
        </Card>
        <Card className="px-4 py-3">
          <p className="text-xs text-slate-500">Espèces disponibles</p>
          <p className="mt-0.5 text-lg font-semibold tabular-nums text-slate-900">{eur(wallet.cashEur)}</p>
          <p className="text-xs text-slate-500">à investir</p>
        </Card>
        <Card className="px-4 py-3">
          <p className="text-xs text-slate-500">Actions ({open.length} ligne{open.length > 1 ? 's' : ''})</p>
          <p className="mt-0.5 text-lg font-semibold tabular-nums text-slate-900">{eur(totals?.valueEur)}</p>
          <Pnl value={totals?.unrealizedPnlEur} percent={totals?.unrealizedPnlPercent} />
        </Card>
        <Card className="px-4 py-3">
          <p className="text-xs text-slate-500">Plus-values réalisées</p>
          <p className="mt-0.5 text-lg font-semibold tabular-nums"><Pnl value={totals?.realizedPnlEur} /></p>
          <p className="text-xs text-slate-500">{sold.length} vente{sold.length > 1 ? 's' : ''}</p>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-2 px-4 pt-3">
            <h3 className="text-sm font-semibold text-slate-900">Performance</h3>
            <span className="flex items-center gap-3 text-xs text-slate-500">
              <span className="flex items-center gap-1"><span className="h-0.5 w-4 bg-accent-500" aria-hidden="true" /> Portefeuille</span>
              <span className="flex items-center gap-1"><span className="h-0.5 w-4 bg-slate-400" aria-hidden="true" /> CAC 40</span>
              <span>base 100</span>
            </span>
          </div>
          <PerformanceChart history={wallet.history || []} />
        </Card>

        <Card className="px-4 py-3">
          <h3 className="text-sm font-semibold text-slate-900">Répartition</h3>
          <div className="mt-3 flex h-3 overflow-hidden rounded-full bg-slate-100" aria-hidden="true">
            {wallet.allocation.map((a, i) => (
              <span key={a.isin || 'cash'} style={{ width: `${a.weight}%`, background: a.isin ? ALLOC_COLORS[i % ALLOC_COLORS.length] : '#cbd5e1' }} />
            ))}
          </div>
          <ul className="mt-3 space-y-1.5 text-sm">
            {wallet.allocation.slice(0, 8).map((a, i) => (
              <li key={a.isin || 'cash'} className="flex items-center justify-between gap-2">
                <span className="flex min-w-0 items-center gap-2">
                  <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: a.isin ? ALLOC_COLORS[i % ALLOC_COLORS.length] : '#cbd5e1' }} aria-hidden="true" />
                  <span className="truncate text-slate-700">{a.name}</span>
                </span>
                <span className="tabular-nums text-slate-900">{a.weight.toFixed(1).replace('.', ',')} %</span>
              </li>
            ))}
            {wallet.allocation.length > 8 && <li className="text-xs text-slate-500">+ {wallet.allocation.length - 8} autres lignes</li>}
          </ul>
        </Card>
      </div>

      {open.length > 0 ? (
        <Card>
          <h3 className="px-4 pt-3 text-sm font-semibold text-slate-900">Positions</h3>
          <ul className="divide-y divide-slate-100">
            {open.map((p) => <PositionRow key={p._id} p={p} onSold={mutate} />)}
          </ul>
        </Card>
      ) : (
        <Card className="p-6 text-center">
          <p className="font-medium text-slate-700">Aucune action pour le moment : {eur(wallet.cashEur)} à investir</p>
          <p className="mt-1 text-sm text-slate-500">Choisissez une entreprise dans « Marchés actions » ou laissez le « Conseiller » composer un portefeuille.</p>
          {onBrowse && <Button size="sm" className="mt-4" onClick={onBrowse}><BarChart3 size={14} /> Voir les marchés</Button>}
        </Card>
      )}

      {sold.length > 0 && (
        <details className="rounded-xl border border-slate-200 bg-white">
          <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-slate-700">Ventes passées ({sold.length})</summary>
          <ul className="divide-y divide-slate-100 border-t border-slate-100">
            {sold.map((p) => (
              <li key={p._id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 text-sm">
                <span className="min-w-0">
                  <span className="font-medium text-slate-900">{p.name}</span>
                  <span className="block text-xs text-slate-500">{p.quantity} actions · vendues le {date(p.soldAt)} à {eur(p.sellPriceEur)}</span>
                </span>
                <span className="flex items-center gap-2">
                  <Pnl value={p.realizedPnlEur} percent={p.pnlPercent} />
                  <button aria-label={`Retirer ${p.name} de l’historique`} onClick={() => remove(p)} disabled={busy === p._id}
                    className="h-8 w-8 flex items-center justify-center rounded-lg text-slate-500 hover:text-danger-600 hover:bg-danger-50"><Trash2 size={14} /></button>
                </span>
              </li>
            ))}
          </ul>
        </details>
      )}

      {transactions.length > 0 && (
        <details className="rounded-xl border border-slate-200 bg-white">
          <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-slate-700">Journal des opérations ({transactions.length})</summary>
          <div className="overflow-x-auto border-t border-slate-100">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-xs text-slate-500">
                <tr>
                  <th scope="col" className="px-4 py-2 text-left font-semibold">Date</th>
                  <th scope="col" className="px-4 py-2 text-left font-semibold">Opération</th>
                  <th scope="col" className="px-4 py-2 text-right font-semibold">Montant</th>
                  <th scope="col" className="px-4 py-2 text-right font-semibold">Espèces après</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {transactions.map((t) => {
                  const kind = TXN[t.type] || TXN.deposit;
                  const Icon = kind.icon;
                  return (
                    <tr key={t._id}>
                      <td className="px-4 py-2 whitespace-nowrap text-slate-500 tabular-nums">{dateTime(t.at)}</td>
                      <td className="px-4 py-2">
                        <span className={cn('mr-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold', kind.cls)}>
                          <Icon size={11} aria-hidden="true" /> {kind.label}
                        </span>
                        <span className="text-slate-900">{t.name}</span>
                        {t.quantity != null && <span className="text-xs text-slate-500"> · {t.quantity} × {eur(t.priceEur)}{t.feesEur ? ` · frais ${eur(t.feesEur)}` : ''}</span>}
                        {t.pnlEur != null && <span className="ml-1 text-xs"><Pnl value={t.pnlEur} /></span>}
                      </td>
                      <td className={cn('px-4 py-2 text-right tabular-nums font-medium', t.amountEur >= 0 ? 'text-emerald-700' : 'text-slate-900')}>
                        {t.amountEur >= 0 ? '+' : ''}{eur(t.amountEur)}
                      </td>
                      <td className="px-4 py-2 text-right tabular-nums text-slate-700">{eur(t.cashAfter)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </details>
      )}

      <p className="text-xs text-slate-500">
        Portefeuille fictif valorisé au cours différé de 15 minutes, frais simulés de 0,1 % (minimum 1 €), hors dividendes et fiscalité.
        Aucun ordre n’est transmis et aucune somme réelle n’est engagée. Ceci n’est pas un conseil en investissement.
      </p>
    </div>
  );
}
