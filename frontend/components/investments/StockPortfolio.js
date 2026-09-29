'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { BarChart3, Trash2 } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { useStockPortfolio, stockSimulationApi } from '@/hooks/useStockSimulation';
import { cn } from '@/lib/utils';

const eur = (n) => (n == null ? '—' : new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n));
const date = (d) => (d ? new Date(d).toLocaleDateString('fr-FR') : '—');

function Pnl({ value, percent }) {
  if (value == null) return <span className="text-slate-500">—</span>;
  const up = value >= 0;
  return (
    <span className={cn('font-semibold tabular-nums', up ? 'text-emerald-700' : 'text-red-700')}>
      {up ? '▲ +' : '▼ '}{eur(value)}{percent != null && <span className="ml-1 text-xs">({up ? '+' : ''}{percent.toFixed(2)} %)</span>}
    </span>
  );
}

/**
 * Portefeuille d'actions simulé : positions ouvertes (valorisées en direct) et ventes passées.
 */
export default function StockPortfolio({ onBrowse }) {
  const { positions, totals, isLoading, mutate } = useStockPortfolio();
  const [busy, setBusy] = useState(null);
  const [confirmSell, setConfirmSell] = useState(null);

  const open = positions.filter((p) => p.status === 'open');
  const sold = positions.filter((p) => p.status === 'sold');

  const sell = async (p) => {
    setBusy(p._id);
    try {
      const pos = await stockSimulationApi.sell(p._id);
      toast.success(`Vente simulée : ${eur(pos.proceedsEur)} (plus-value ${eur(pos.realizedPnlEur)}).`);
      setConfirmSell(null);
      mutate();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Vente impossible.');
    } finally {
      setBusy(null);
    }
  };

  const remove = async (p) => {
    setBusy(p._id);
    try { await stockSimulationApi.remove(p._id); mutate(); } catch (err) { toast.error(err.response?.data?.error || 'Suppression impossible.'); } finally { setBusy(null); }
  };

  if (isLoading) return <div className="h-24 rounded-xl bg-slate-200 animate-pulse" />;

  if (!positions.length) {
    return (
      <Card className="p-6 text-center">
        <p className="font-medium text-slate-700">Aucune action dans votre portefeuille simulé</p>
        <p className="mt-1 text-sm text-slate-500">Choisissez une entreprise dans « Marchés actions » et cliquez sur « Investir ».</p>
        {onBrowse && <Button size="sm" className="mt-4" onClick={onBrowse}><BarChart3 size={14} /> Voir les marchés</Button>}
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-slate-900">Actions — portefeuille simulé</h2>
        <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-900">Simulation · aucun ordre réel</span>
      </div>

      {totals && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            ['Investi', eur(totals.investedEur)],
            ['Valeur actuelle', eur(totals.valueEur)],
            ['Plus-value latente', <Pnl key="u" value={totals.unrealizedPnlEur} percent={totals.unrealizedPnlPercent} />],
            ['Plus-values réalisées', <Pnl key="r" value={totals.realizedPnlEur} />],
          ].map(([label, value]) => (
            <Card key={label} className="px-4 py-3">
              <p className="text-xs text-slate-500">{label}</p>
              <p className="mt-0.5 text-lg font-semibold tabular-nums text-slate-900">{value}</p>
            </Card>
          ))}
        </div>
      )}

      {open.length > 0 && (
        <Card>
          <ul className="divide-y divide-slate-100">
            {open.map((p) => (
              <li key={p._id} className="px-4 py-3">
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
                <div className="mt-2 flex justify-end gap-2">
                  {confirmSell === p._id ? (
                    <>
                      <span className="self-center text-xs text-slate-600">Vendre les {p.quantity} actions au cours actuel ?</span>
                      <Button size="sm" variant="secondary" onClick={() => setConfirmSell(null)}>Annuler</Button>
                      <Button size="sm" onClick={() => sell(p)} loading={busy === p._id}>Confirmer la vente</Button>
                    </>
                  ) : (
                    <Button size="sm" variant="secondary" onClick={() => setConfirmSell(p._id)}>Vendre</Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
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

      <p className="text-xs text-slate-500">
        Portefeuille fictif valorisé au cours différé de 15 minutes, frais simulés de 0,1 % (minimum 1 €), hors dividendes et fiscalité.
        Aucun ordre n’est transmis et aucune somme n’est débitée. Ceci n’est pas un conseil en investissement.
      </p>
    </div>
  );
}
