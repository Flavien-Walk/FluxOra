'use client';

import { useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import { toast } from 'sonner';
import {
  TrendingUp, Wallet, ArrowDownLeft,
  Clock, ShieldCheck, Info, Loader2,
  BarChart3, Zap, Lock, AlertTriangle
} from 'lucide-react';
import api from '../../../lib/api';
import { useInvestments, useInvestmentProducts } from '../../../hooks/useInvestments';
import Header from '@/components/layout/Header';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import { cn } from '@/lib/utils';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (n) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n ?? 0);
const fmtPct = (n) => `${(n ?? 0).toFixed(2)} %`;

const RISK_COLORS = {
  1: 'text-success-700 bg-success-50',
  2: 'text-accent-600 bg-accent-50',
  3: 'text-warning-700 bg-warning-50',
};
const LIQUIDITY_ICON = { 'J+1': Zap, 'J+2': Clock, 'J+3': Clock, 'À maturité': Lock };
const STATUS_LABELS = { active: 'Actif', withdrawn: 'Retiré', matured: 'Échu' };
const STATUS_COLORS = {
  active:    'bg-success-50 text-success-700',
  withdrawn: 'bg-slate-100 text-slate-500',
  matured:   'bg-accent-50 text-accent-700',
};

// ─── Composant : carte produit ─────────────────────────────────────────────────
function ProductCard({ product, onInvest, availableTreasury }) {
  const LiqIcon = LIQUIDITY_ICON[product.liquidity] || Clock;
  const canInvest = availableTreasury === null || availableTreasury >= product.minAmount;

  return (
    <Card hover className="flex flex-col overflow-hidden">
      {/* colored top strip — keep inline style color as required */}
      <div className="h-[3px]" style={{ backgroundColor: product.color }} />
      <CardBody className="flex flex-col flex-1 gap-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">
              {product.category}
            </span>
            <h3 className="font-semibold text-slate-900 mt-0.5 leading-tight">{product.name}</h3>
            <p className="text-xs text-slate-400 mt-1">{product.partner}</p>
          </div>
          <div className="text-right shrink-0">
            <div className="text-2xl font-bold text-slate-900">{fmtPct(product.currentRate)}</div>
            <div className="text-xs text-slate-400">annuel</div>
          </div>
        </div>

        <p className="text-sm text-slate-600 leading-relaxed">{product.description}</p>

        <div className="flex flex-wrap gap-2">
          <span className={cn(
            'inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full',
            RISK_COLORS[product.risk] || 'text-slate-600 bg-slate-100'
          )}>
            <ShieldCheck className="w-3 h-3" />
            Risque {product.riskLabel}
          </span>
          <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full text-slate-600 bg-slate-100">
            <LiqIcon className="w-3 h-3" />
            Liquidité {product.liquidity}
          </span>
          <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full text-slate-600 bg-slate-100">
            <Clock className="w-3 h-3" />
            {product.horizon}
          </span>
        </div>

        <div className="text-xs text-slate-400">
          Montant minimum : <span className="font-medium text-slate-600">{fmt(product.minAmount)}</span>
        </div>

        <div className="mt-auto">
          {canInvest ? (
            <button
              onClick={() => onInvest(product)}
              className="w-full py-2.5 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90 active:scale-95"
              style={{ backgroundColor: product.color }}
            >
              Investir maintenant
            </button>
          ) : (
            <div className="w-full py-2.5 rounded-xl text-sm font-medium text-center bg-slate-100 text-slate-400 cursor-not-allowed flex items-center justify-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              Fonds insuffisants
            </div>
          )}
        </div>
      </CardBody>
    </Card>
  );
}

// ─── Modal : nouveau placement ────────────────────────────────────────────────
function InvestModal({ product, availableTreasury, onClose, onSuccess }) {
  const { getToken } = useAuth();
  const [amount, setAmount] = useState(Math.min(product.minAmount, availableTreasury ?? product.minAmount));
  const [months, setMonths] = useState(12);
  const [loading, setLoading] = useState(false);

  const maturityDate = product.liquidity === 'À maturité'
    ? new Date(Date.now() + months * 30 * 24 * 60 * 60 * 1000).toISOString()
    : null;

  const isOverBudget = availableTreasury !== null && amount > availableTreasury;

  const handleSubmit = async () => {
    if (amount < product.minAmount) return toast.error(`Montant minimum : ${fmt(product.minAmount)}`);
    if (isOverBudget) return toast.error(`Fonds insuffisants. Trésorerie disponible : ${fmt(availableTreasury)}`);
    setLoading(true);
    try {
      const token = await getToken();
      await api.post('/api/investments', {
        productId: product.id, productName: product.name,
        amount, expectedRate: product.currentRate, maturityDate
      }, { headers: { Authorization: `Bearer ${token}` } });
      toast.success('Placement créé avec succès !');
      onSuccess();
      onClose();
    } catch (e) {
      toast.error(e?.response?.data?.error || 'Erreur lors du placement');
    } finally {
      setLoading(false);
    }
  };

  const gain = parseFloat(((amount * product.currentRate / 100) * (months / 12)).toFixed(2));

  return (
    <Modal open={true} onClose={onClose} title={product.name} size="sm">
      {/* colored strip inside modal body */}
      <div className="-mt-5 -mx-6 mb-5 h-[3px]" style={{ backgroundColor: product.color }} />

      <div className="space-y-5">
        {/* Tréso disponible */}
        {availableTreasury !== null && (
          <div className={cn(
            'flex items-center justify-between p-3 rounded-xl border',
            availableTreasury < product.minAmount
              ? 'bg-danger-50 border-danger-100'
              : 'bg-success-50 border-success-100'
          )}>
            <div className="flex items-center gap-2">
              <Wallet className={cn(
                'w-4 h-4',
                availableTreasury < product.minAmount ? 'text-danger-500' : 'text-success-600'
              )} />
              <span className="text-sm text-slate-600">Trésorerie disponible</span>
            </div>
            <span className={cn(
              'font-bold text-sm',
              availableTreasury < product.minAmount ? 'text-danger-700' : 'text-success-700'
            )}>
              {fmt(availableTreasury)}
            </span>
          </div>
        )}

        {/* Taux */}
        <div className="flex items-center gap-3 p-4 rounded-xl bg-slate-50">
          <TrendingUp className="w-8 h-8" style={{ color: product.color }} />
          <div>
            <div className="text-sm text-slate-500">Rendement annuel estimé</div>
            <div className="text-2xl font-bold" style={{ color: product.color }}>{fmtPct(product.currentRate)}</div>
          </div>
        </div>

        {/* Montant */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            Montant à placer <span className="text-slate-400 font-normal">(min. {fmt(product.minAmount)})</span>
          </label>
          <div className="relative">
            <input
              type="number" value={amount} min={product.minAmount} step={1000}
              onChange={e => setAmount(parseFloat(e.target.value) || 0)}
              className={cn(
                'w-full border rounded-xl px-4 py-3 pr-12 text-base outline-none focus:ring-2',
                isOverBudget
                  ? 'border-danger-300 focus:ring-danger-400 bg-danger-50'
                  : 'border-slate-200 focus:ring-accent-500'
              )}
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-medium">€</span>
          </div>
          {isOverBudget && (
            <p className="text-xs text-danger-600 mt-1.5 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" />
              Dépasse la trésorerie disponible de {fmt(amount - availableTreasury)}
            </p>
          )}
        </div>

        {/* Durée (uniquement pour CAT) */}
        {product.liquidity === 'À maturité' && (
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Durée</label>
            <select
              value={months}
              onChange={e => setMonths(parseInt(e.target.value))}
              className="w-full border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-accent-500 outline-none"
            >
              {[3, 6, 12].map(m => <option key={m} value={m}>{m} mois</option>)}
            </select>
          </div>
        )}

        {/* Résumé gain */}
        <div className="flex justify-between items-center p-4 bg-slate-50 rounded-xl">
          <div className="text-sm text-slate-500">
            Gain estimé sur {product.liquidity === 'À maturité' ? `${months} mois` : '12 mois'}
          </div>
          <div className="font-bold text-success-700 text-lg">+{fmt(gain)}</div>
        </div>

        <div className="flex gap-2 p-3 bg-warning-50 rounded-xl text-xs text-warning-700">
          <Info className="w-4 h-4 shrink-0 mt-0.5" />
          <span>Les performances passées ne préjugent pas des performances futures. Ce placement est simulé à des fins de démonstration.</span>
        </div>
      </div>

      <div className="flex gap-3 mt-6">
        <Button variant="secondary" onClick={onClose} className="flex-1 h-11">
          Annuler
        </Button>
        <button
          onClick={handleSubmit}
          disabled={loading || isOverBudget}
          className="flex-1 h-11 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity hover:opacity-90"
          style={{ backgroundColor: isOverBudget ? '#94a3b8' : product.color }}
        >
          {loading && <Loader2 className="w-4 h-4 animate-spin" />}
          Confirmer le placement
        </button>
      </div>
    </Modal>
  );
}

// ─── Page principale ──────────────────────────────────────────────────────────
export default function InvestissementsPage() {
  const { getToken } = useAuth();
  const { investments, totalInvested, totalGain, availableTreasury, isLoading: loadingPortfolio, mutate } = useInvestments();
  const { products, isLoading: loadingProducts } = useInvestmentProducts();

  const [selectedProduct, setSelectedProduct] = useState(null);
  const [withdrawing, setWithdrawing] = useState(null);
  const [tab, setTab] = useState('catalogue');

  const activeInvestments = investments.filter(i => i.status === 'active');

  const handleWithdraw = async (inv) => {
    if (!confirm(`Retirer le placement "${inv.productName}" de ${fmt(inv.amount)} ?`)) return;
    setWithdrawing(inv._id);
    try {
      const token = await getToken();
      const { data } = await api.post(`/api/investments/${inv._id}/withdraw`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success(`Placement retiré — gain réalisé : +${fmt(data.gain)}`);
      mutate();
    } catch (e) {
      toast.error(e?.response?.data?.error || 'Erreur lors du retrait');
    } finally {
      setWithdrawing(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Header
        title="Investissements"
        subtitle="Faites travailler votre trésorerie dormante"
      />

      <div className="flex-1 p-6 max-w-5xl mx-auto w-full space-y-6">

        {/* ── KPI cards ──────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Tréso disponible */}
          <Card>
            <CardBody className="py-4">
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest mb-1">
                Tréso disponible
              </p>
              <p className={cn(
                'text-xl font-bold',
                availableTreasury !== null && availableTreasury < 0 ? 'text-danger-600' : 'text-slate-900'
              )}>
                {availableTreasury !== null ? fmt(availableTreasury) : '—'}
              </p>
              <p className="text-xs text-slate-400 mt-1">solde comptable net</p>
            </CardBody>
          </Card>

          {/* Total placé */}
          <Card>
            <CardBody className="py-4">
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest mb-1">
                Total placé
              </p>
              <p className="text-xl font-bold text-slate-900">{fmt(totalInvested)}</p>
              <p className="text-xs text-slate-400 mt-1">
                {activeInvestments.length} placement{activeInvestments.length > 1 ? 's' : ''} actif{activeInvestments.length > 1 ? 's' : ''}
              </p>
            </CardBody>
          </Card>

          {/* Gain accumulé */}
          <Card>
            <CardBody className="py-4">
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest mb-1">
                Gain accumulé
              </p>
              <p className="text-xl font-bold text-success-700">+{fmt(totalGain)}</p>
              <p className="text-xs text-slate-400 mt-1">depuis le 1er placement</p>
            </CardBody>
          </Card>

          {/* Valeur totale */}
          <Card>
            <CardBody className="py-4">
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest mb-1">
                Valeur totale
              </p>
              <p className="text-xl font-bold text-slate-900">{fmt(totalInvested + totalGain)}</p>
              {totalInvested > 0 && (
                <p className="text-xs text-success-600 mt-1">
                  +{((totalGain / totalInvested) * 100).toFixed(2)} % rendement
                </p>
              )}
            </CardBody>
          </Card>
        </div>

        {/* Alerte tréso insuffisante */}
        {availableTreasury !== null && availableTreasury < 1000 && (
          <div className="flex items-center gap-2 p-3 bg-warning-50 border border-warning-200 rounded-xl text-warning-700 text-sm">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            Trésorerie disponible insuffisante pour un nouveau placement. Attendez des rentrées ou retirez un placement existant.
          </div>
        )}

        {/* ── Tabs ───────────────────────────────────────────────────────────── */}
        <div className="flex gap-1 bg-slate-100 rounded-xl p-1 w-fit">
          {[
            { key: 'catalogue', label: 'Catalogue', icon: BarChart3 },
            { key: 'portfolio', label: 'Mon portefeuille', icon: Wallet },
          ].map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={cn(
                'flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all',
                tab === key
                  ? 'bg-accent-600 text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              )}
            >
              <Icon className="w-4 h-4" />
              {label}
              {key === 'portfolio' && activeInvestments.length > 0 && (
                <span className="bg-white/20 text-white text-xs rounded-full px-1.5 py-0.5 min-w-[1.25rem] text-center">
                  {activeInvestments.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ── CATALOGUE ──────────────────────────────────────────────────────── */}
        {tab === 'catalogue' && (
          <div className="space-y-5">
            {/* Refresh indicator */}
            {products.length > 0 && !products[0]?.isFallback && (
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <div className="w-2 h-2 bg-success-500 rounded-full animate-pulse" />
                Taux mis à jour le {products[0].ratesDate} via BCE &amp; Yahoo Finance
              </div>
            )}

            {loadingProducts ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="h-72 bg-slate-200 rounded-xl animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {products.map(p => (
                  <ProductCard
                    key={p.id}
                    product={p}
                    onInvest={setSelectedProduct}
                    availableTreasury={availableTreasury}
                  />
                ))}
              </div>
            )}

            {/* Info disclaimer */}
            <Card>
              <CardBody className="flex gap-3">
                <Info className="w-5 h-5 text-accent-500 shrink-0 mt-0.5" />
                <p className="text-sm text-slate-600">
                  Les rendements affichés sont basés sur les données de la Banque Centrale Européenne (€STR, courbe AAA)
                  et les ETFs cotés en bourse. Ce service est à titre indicatif — les placements réels sont effectués
                  via les partenaires financiers réglementés. Les performances passées ne garantissent pas les résultats futurs.
                </p>
              </CardBody>
            </Card>
          </div>
        )}

        {/* ── PORTEFEUILLE ───────────────────────────────────────────────────── */}
        {tab === 'portfolio' && (
          <div>
            {loadingPortfolio ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-20 bg-slate-200 rounded-xl animate-pulse" />
                ))}
              </div>
            ) : investments.length === 0 ? (
              /* Empty state */
              <div className="text-center py-16">
                <div className="w-16 h-16 bg-slate-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <TrendingUp className="w-8 h-8 text-slate-300" />
                </div>
                <p className="text-slate-500 font-medium mb-2">Aucun placement actif</p>
                <p className="text-slate-400 text-sm mb-5">
                  Explorez le catalogue pour démarrer votre premier placement.
                </p>
                <Button onClick={() => setTab('catalogue')} size="md">
                  Voir le catalogue
                </Button>
              </div>
            ) : (
              /* Portfolio table */
              <Card>
                {/* Header row */}
                <div className="grid grid-cols-12 gap-4 px-5 py-3.5 items-center bg-slate-50/60 border-b border-slate-100">
                  <div className="col-span-4 text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Placement</div>
                  <div className="col-span-2 text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Statut</div>
                  <div className="col-span-2 text-[11px] font-semibold text-slate-400 uppercase tracking-wide text-right">Investi</div>
                  <div className="col-span-2 text-[11px] font-semibold text-slate-400 uppercase tracking-wide text-right">Gain</div>
                  <div className="col-span-2 text-[11px] font-semibold text-slate-400 uppercase tracking-wide text-right">Actions</div>
                </div>

                <div className="divide-y divide-[rgba(148,163,184,0.12)]">
                  {investments.map(inv => {
                    const gainPct = inv.amount > 0 ? ((inv.currentGain / inv.amount) * 100).toFixed(3) : '0.000';
                    return (
                      <div key={inv._id} className="grid grid-cols-12 gap-4 px-5 py-4 items-center hover:bg-slate-50/50 transition-colors">
                        {/* Placement info */}
                        <div className="col-span-4 flex items-center gap-3 min-w-0">
                          <div className="w-9 h-9 rounded-xl bg-accent-50 flex items-center justify-center shrink-0">
                            <TrendingUp className="w-4 h-4 text-accent-600" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-slate-900 text-sm truncate">{inv.productName}</p>
                            <p className="text-xs text-slate-400 mt-0.5">
                              {new Date(inv.investedAt).toLocaleDateString('fr-FR')} · {fmtPct(inv.expectedRate)} /an
                              {inv.maturityDate && ` · Éch. ${new Date(inv.maturityDate).toLocaleDateString('fr-FR')}`}
                            </p>
                          </div>
                        </div>

                        {/* Statut */}
                        <div className="col-span-2">
                          <span className={cn(
                            'text-xs px-2 py-0.5 rounded-full font-medium',
                            STATUS_COLORS[inv.status]
                          )}>
                            {STATUS_LABELS[inv.status]}
                          </span>
                        </div>

                        {/* Investi */}
                        <div className="col-span-2 text-right">
                          <span className="font-semibold text-slate-900 text-sm">{fmt(inv.amount)}</span>
                        </div>

                        {/* Gain / Montant reçu */}
                        <div className="col-span-2 text-right">
                          {inv.status === 'active' && (
                            <div>
                              <span className="font-semibold text-success-700 text-sm">+{fmt(inv.currentGain)}</span>
                              <div className="text-xs text-success-600">+{gainPct} %</div>
                            </div>
                          )}
                          {inv.status === 'withdrawn' && (
                            <span className="font-semibold text-slate-900 text-sm">{fmt(inv.withdrawnAmount)}</span>
                          )}
                          {inv.status === 'matured' && (
                            <span className="text-slate-400 text-sm">—</span>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="col-span-2 flex justify-end">
                          {inv.status === 'active' && (
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => handleWithdraw(inv)}
                              disabled={withdrawing === inv._id}
                              loading={withdrawing === inv._id}
                            >
                              {withdrawing !== inv._id && <ArrowDownLeft className="w-3.5 h-3.5" />}
                              Retirer
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>
            )}
          </div>
        )}
      </div>

      {/* Modal nouveau placement */}
      {selectedProduct && (
        <InvestModal
          product={selectedProduct}
          availableTreasury={availableTreasury}
          onClose={() => setSelectedProduct(null)}
          onSuccess={mutate}
        />
      )}
    </div>
  );
}
