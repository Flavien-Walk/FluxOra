'use client';

import { useMemo, useState } from 'react';
import useSWR from 'swr';
import { toast } from 'sonner';
import { useSWRConfig } from 'swr';
import { ShoppingCart, History } from 'lucide-react';
import api from '@/lib/api';
import Button from '@/components/ui/Button';
import { stockSimulationApi } from '@/hooks/useStockSimulation';
import { cn } from '@/lib/utils';

const fetcher = async (url) => (await api.get(url)).data;
const eur = (n) => (n == null ? '—' : new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n));
const QUICK = [500, 1000, 5000, 10000];
// Frais simulés, identiques au serveur : 0,1 % min 1 €
const fees = (x) => Math.round(Math.max(x * 0.001, 1) * 100) / 100;

/**
 * Simulateur d'achat : montant → nombre d'actions, frais, et performance passée (« si vous aviez investi… »).
 */
export default function StockInvestPanel({ stock, onInvested }) {
  const { mutate } = useSWRConfig();
  const [amount, setAmount] = useState('1000');
  const [busy, setBusy] = useState(false);
  const priceEur = stock.priceEur;

  // Historique 1 an pour la simulation rétrospective
  const { data: hist } = useSWR(`/api/investments/market/equities/${stock.isin}?range=1y`, fetcher);

  const amountEur = Number(String(amount).replace(',', '.')) || 0;
  const quantity = priceEur ? Math.max(Math.floor((amountEur - fees(amountEur)) / priceEur), 0) : 0;
  const gross = quantity * (priceEur || 0);
  const total = quantity ? gross + fees(gross) : 0;

  // Valeur aujourd'hui du même montant investi il y a 1 mois / 6 mois / 1 an (cours de la devise de cotation)
  const backtest = useMemo(() => {
    const h = hist?.stock?.history || [];
    const last = stock.price;
    if (h.length < 2 || !last || !amountEur) return [];
    const at = (days) => {
      const target = Date.now() - days * 86400_000;
      return h.find((p) => new Date(p.date).getTime() >= target)?.close;
    };
    return [['1 mois', 30], ['6 mois', 182], ['1 an', 365]].map(([label, days]) => {
      const past = at(days);
      if (!past) return { label, value: null, pct: null };
      const pct = ((last - past) / past) * 100;
      return { label, pct, value: amountEur * (1 + pct / 100) };
    });
  }, [hist, stock.price, amountEur]);

  const invest = async () => {
    setBusy(true);
    try {
      const pos = await stockSimulationApi.buy({ isin: stock.isin, amountEur });
      toast.success(`Simulation : ${pos.quantity} action${pos.quantity > 1 ? 's' : ''} ${stock.name} ajoutée${pos.quantity > 1 ? 's' : ''} à votre portefeuille.`);
      mutate('/api/investments/stocks');
      onInvested?.();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Simulation impossible.');
    } finally {
      setBusy(false);
    }
  };

  if (!priceEur) {
    return <p className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">Cours indisponible : la simulation d’achat n’est pas possible pour cette valeur.</p>;
  }

  return (
    <section className="rounded-xl border border-accent-100 bg-accent-50/40 p-4 space-y-4" aria-labelledby="invest-title">
      <div className="flex items-center justify-between gap-2">
        <h3 id="invest-title" className="text-sm font-semibold text-slate-900">Simuler un investissement</h3>
        <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-900">Simulation · aucun ordre réel</span>
      </div>

      <div>
        <label htmlFor="invest-amount" className="block text-xs font-medium text-slate-600 mb-1">Montant à investir (€)</label>
        <input id="invest-amount" type="number" min="1" step="100" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)}
          className="w-full h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-accent-500" />
        <div className="mt-2 flex flex-wrap gap-1.5">
          {QUICK.map((q) => (
            <button key={q} type="button" onClick={() => setAmount(String(q))}
              className={cn('rounded-full border px-2.5 py-1 text-xs', Number(amount) === q ? 'border-accent-500 bg-white text-accent-700' : 'border-slate-200 bg-white text-slate-600')}>
              {q.toLocaleString('fr-FR')} €
            </button>
          ))}
        </div>
      </div>

      <dl className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
        {[
          ['Cours', eur(priceEur)],
          ['Actions', quantity.toLocaleString('fr-FR')],
          ['Frais simulés', quantity ? eur(fees(gross)) : '—'],
          ['Total investi', quantity ? eur(total) : '—'],
        ].map(([label, value]) => (
          <div key={label} className="rounded-lg bg-white px-3 py-2">
            <dt className="text-xs text-slate-500">{label}</dt>
            <dd className="font-semibold tabular-nums text-slate-900">{value}</dd>
          </div>
        ))}
      </dl>

      {backtest.length > 0 && (
        <div>
          <p className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-slate-600">
            <History size={13} aria-hidden="true" /> Si vous aviez investi {eur(amountEur)} il y a…
          </p>
          <div className="grid grid-cols-3 gap-2">
            {backtest.map((b) => (
              <div key={b.label} className="rounded-lg bg-white px-3 py-2 text-sm">
                <p className="text-xs text-slate-500">{b.label}</p>
                <p className="font-semibold tabular-nums text-slate-900">{eur(b.value)}</p>
                {b.pct != null && (
                  <p className={cn('text-xs font-semibold tabular-nums', b.pct >= 0 ? 'text-emerald-700' : 'text-red-700')}>
                    {b.pct >= 0 ? '▲ +' : '▼ '}{b.pct.toFixed(1)} %
                  </p>
                )}
              </div>
            ))}
          </div>
          <p className="mt-1 text-[11px] text-slate-500">Les performances passées ne préjugent pas des performances futures (hors frais et dividendes).</p>
        </div>
      )}

      <Button onClick={invest} loading={busy} disabled={!quantity} className="w-full">
        <ShoppingCart size={15} aria-hidden="true" /> {quantity ? `Investir ${eur(total)} (simulation)` : 'Montant insuffisant pour une action'}
      </Button>
    </section>
  );
}
