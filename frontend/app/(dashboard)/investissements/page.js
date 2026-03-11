'use client';

import { useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import { toast } from 'sonner';
import {
  TrendingUp, Wallet, ArrowDownLeft,
  Clock, ShieldCheck, Info, X, Loader2,
  BarChart3, Zap, Lock, AlertTriangle
} from 'lucide-react';
import api from '../../../lib/api';
import { useInvestments, useInvestmentProducts } from '../../../hooks/useInvestments';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (n) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n ?? 0);
const fmtPct = (n) => `${(n ?? 0).toFixed(2)} %`;

const RISK_COLORS = { 1: 'text-emerald-600 bg-emerald-50', 2: 'text-blue-600 bg-blue-50', 3: 'text-amber-600 bg-amber-50' };
const LIQUIDITY_ICON = { 'J+1': Zap, 'J+2': Clock, 'J+3': Clock, 'À maturité': Lock };
const STATUS_LABELS = { active: 'Actif', withdrawn: 'Retiré', matured: 'Échu' };
const STATUS_COLORS = { active: 'bg-emerald-100 text-emerald-700', withdrawn: 'bg-gray-100 text-gray-600', matured: 'bg-blue-100 text-blue-700' };

// ─── Composant : carte produit ─────────────────────────────────────────────────
function ProductCard({ product, onInvest, availableTreasury }) {
  const LiqIcon = LIQUIDITY_ICON[product.liquidity] || Clock;
  const canInvest = availableTreasury === null || availableTreasury >= product.minAmount;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden flex flex-col">
      <div className="h-2" style={{ backgroundColor: product.color }} />
      <div className="p-5 flex flex-col flex-1 gap-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">{product.category}</span>
            <h3 className="font-semibold text-gray-900 mt-0.5 leading-tight">{product.name}</h3>
            <p className="text-xs text-gray-500 mt-1">{product.partner}</p>
          </div>
          <div className="text-right shrink-0">
            <div className="text-2xl font-bold text-gray-900">{fmtPct(product.currentRate)}</div>
            <div className="text-xs text-gray-400">annuel</div>
          </div>
        </div>

        <p className="text-sm text-gray-600 leading-relaxed">{product.description}</p>

        <div className="flex flex-wrap gap-2">
          <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${RISK_COLORS[product.risk] || 'text-gray-600 bg-gray-100'}`}>
            <ShieldCheck className="w-3 h-3" />
            Risque {product.riskLabel}
          </span>
          <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full text-gray-600 bg-gray-100">
            <LiqIcon className="w-3 h-3" />
            Liquidité {product.liquidity}
          </span>
          <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full text-gray-600 bg-gray-100">
            <Clock className="w-3 h-3" />
            {product.horizon}
          </span>
        </div>

        <div className="text-xs text-gray-400">
          Montant minimum : <span className="font-medium text-gray-600">{fmt(product.minAmount)}</span>
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
            <div className="w-full py-2.5 rounded-xl text-sm font-medium text-center bg-gray-100 text-gray-400 cursor-not-allowed flex items-center justify-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              Fonds insuffisants
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Composant : simulateur de rendement ─────────────────────────────────────
function ReturnSimulator({ product }) {
  const [amount, setAmount] = useState(product.minAmount);
  const [months, setMonths] = useState(12);
  const gain = parseFloat(((amount * product.currentRate / 100) * (months / 12)).toFixed(2));
  const total = amount + gain;

  return (
    <div className="bg-gray-50 rounded-xl p-4 space-y-4">
      <div className="text-sm font-semibold text-gray-700">Simulateur de rendement</div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Montant (€)</label>
          <input
            type="number" value={amount} min={product.minAmount} step={1000}
            onChange={e => setAmount(parseFloat(e.target.value) || 0)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Durée (mois)</label>
          <select value={months} onChange={e => setMonths(parseInt(e.target.value))}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none">
            {[1, 3, 6, 12, 24, 36].map(m => <option key={m} value={m}>{m} mois</option>)}
          </select>
        </div>
      </div>
      <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-100">
        <div>
          <div className="text-xs text-gray-500">Gain estimé</div>
          <div className="text-lg font-bold text-emerald-600">+{fmt(gain)}</div>
        </div>
        <div>
          <div className="text-xs text-gray-500">Valeur finale</div>
          <div className="text-lg font-bold text-gray-900">{fmt(total)}</div>
        </div>
        <div>
          <div className="text-xs text-gray-500">Taux</div>
          <div className="text-lg font-bold" style={{ color: product.color }}>{fmtPct(product.currentRate)}</div>
        </div>
      </div>
    </div>
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
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="h-2" style={{ backgroundColor: product.color }} />
        <div className="p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-semibold text-gray-900">{product.name}</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
          </div>

          <div className="space-y-5">
            {/* Tréso disponible */}
            {availableTreasury !== null && (
              <div className={`flex items-center justify-between p-3 rounded-xl border ${availableTreasury < product.minAmount ? 'bg-red-50 border-red-100' : 'bg-emerald-50 border-emerald-100'}`}>
                <div className="flex items-center gap-2">
                  <Wallet className={`w-4 h-4 ${availableTreasury < product.minAmount ? 'text-red-500' : 'text-emerald-600'}`} />
                  <span className="text-sm text-gray-600">Trésorerie disponible</span>
                </div>
                <span className={`font-bold text-sm ${availableTreasury < product.minAmount ? 'text-red-600' : 'text-emerald-700'}`}>
                  {fmt(availableTreasury)}
                </span>
              </div>
            )}

            {/* Taux */}
            <div className="flex items-center gap-3 p-4 rounded-xl" style={{ backgroundColor: product.color + '15' }}>
              <TrendingUp className="w-8 h-8" style={{ color: product.color }} />
              <div>
                <div className="text-sm text-gray-600">Rendement annuel estimé</div>
                <div className="text-2xl font-bold" style={{ color: product.color }}>{fmtPct(product.currentRate)}</div>
              </div>
            </div>

            {/* Montant */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Montant à placer <span className="text-gray-400 font-normal">(min. {fmt(product.minAmount)})</span>
              </label>
              <div className="relative">
                <input
                  type="number" value={amount} min={product.minAmount} step={1000}
                  onChange={e => setAmount(parseFloat(e.target.value) || 0)}
                  className={`w-full border rounded-xl px-4 py-3 pr-12 text-base outline-none focus:ring-2 ${isOverBudget ? 'border-red-300 focus:ring-red-400 bg-red-50' : 'border-gray-200 focus:ring-blue-500'}`}
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium">€</span>
              </div>
              {isOverBudget && (
                <p className="text-xs text-red-600 mt-1.5 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  Dépasse la trésorerie disponible de {fmt(amount - availableTreasury)}
                </p>
              )}
            </div>

            {/* Durée (uniquement pour CAT) */}
            {product.liquidity === 'À maturité' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Durée</label>
                <select value={months} onChange={e => setMonths(parseInt(e.target.value))}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none">
                  {[3, 6, 12].map(m => <option key={m} value={m}>{m} mois</option>)}
                </select>
              </div>
            )}

            {/* Résumé gain */}
            <div className="flex justify-between items-center p-4 bg-gray-50 rounded-xl">
              <div className="text-sm text-gray-500">Gain estimé sur {product.liquidity === 'À maturité' ? `${months} mois` : '12 mois'}</div>
              <div className="font-bold text-emerald-600 text-lg">+{fmt(gain)}</div>
            </div>

            <div className="flex gap-2 p-3 bg-amber-50 rounded-xl text-xs text-amber-700">
              <Info className="w-4 h-4 shrink-0 mt-0.5" />
              <span>Les performances passées ne préjugent pas des performances futures. Ce placement est simulé à des fins de démonstration.</span>
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <button onClick={onClose} className="flex-1 py-3 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50">
              Annuler
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading || isOverBudget}
              className="flex-1 py-3 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ backgroundColor: isOverBudget ? '#9CA3AF' : product.color }}
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              Confirmer le placement
            </button>
          </div>
        </div>
      </div>
    </div>
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
    <div className="min-h-screen bg-gray-50">
      {/* Hero header */}
      <div className="bg-gradient-to-br from-[#0f172a] via-[#1e3a5f] to-[#1e40af] px-6 pt-8 pb-10">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-white/10 rounded-xl">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
            <span className="text-blue-200 text-sm font-medium uppercase tracking-wide">Trésorerie Dormante</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">Faites travailler votre tréso</h1>
          <p className="text-blue-200 text-sm max-w-xl">
            Placez vos excédents de liquidités dans des produits sécurisés et obtenez un rendement sur votre trésorerie dormante.
          </p>

          {/* KPI cards — 4 colonnes */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
            <div className="bg-white/10 backdrop-blur rounded-xl p-4">
              <div className="text-blue-200 text-xs mb-1">Tréso disponible</div>
              <div className={`text-xl font-bold ${availableTreasury !== null && availableTreasury < 0 ? 'text-red-300' : 'text-white'}`}>
                {availableTreasury !== null ? fmt(availableTreasury) : '—'}
              </div>
              <div className="text-blue-300 text-xs mt-1">solde comptable net</div>
            </div>
            <div className="bg-white/10 backdrop-blur rounded-xl p-4">
              <div className="text-blue-200 text-xs mb-1">Total placé</div>
              <div className="text-white text-xl font-bold">{fmt(totalInvested)}</div>
              <div className="text-blue-300 text-xs mt-1">{activeInvestments.length} placement{activeInvestments.length > 1 ? 's' : ''} actif{activeInvestments.length > 1 ? 's' : ''}</div>
            </div>
            <div className="bg-white/10 backdrop-blur rounded-xl p-4">
              <div className="text-blue-200 text-xs mb-1">Gain accumulé</div>
              <div className="text-emerald-300 text-xl font-bold">+{fmt(totalGain)}</div>
              <div className="text-blue-300 text-xs mt-1">depuis le 1er placement</div>
            </div>
            <div className="bg-white/10 backdrop-blur rounded-xl p-4">
              <div className="text-blue-200 text-xs mb-1">Valeur totale</div>
              <div className="text-white text-xl font-bold">{fmt(totalInvested + totalGain)}</div>
              {totalInvested > 0 && (
                <div className="text-emerald-300 text-xs mt-1">+{((totalGain / totalInvested) * 100).toFixed(2)} % rendement</div>
              )}
            </div>
          </div>

          {/* Alerte tréso insuffisante */}
          {availableTreasury !== null && availableTreasury < 1000 && (
            <div className="mt-4 flex items-center gap-2 p-3 bg-amber-500/20 border border-amber-400/30 rounded-xl text-amber-200 text-sm">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              Trésorerie disponible insuffisante pour un nouveau placement. Attendez des rentrées ou retirez un placement existant.
            </div>
          )}
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8">
        {/* Tabs */}
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-8 w-fit">
          {[
            { key: 'catalogue', label: 'Catalogue', icon: BarChart3 },
            { key: 'portfolio', label: 'Mon portefeuille', icon: Wallet }
          ].map(({ key, label, icon: Icon }) => (
            <button key={key} onClick={() => setTab(key)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${tab === key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
              <Icon className="w-4 h-4" />
              {label}
              {key === 'portfolio' && activeInvestments.length > 0 && (
                <span className="bg-blue-600 text-white text-xs rounded-full px-1.5 py-0.5 min-w-[1.25rem] text-center">
                  {activeInvestments.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ── CATALOGUE ─────────────────────────────────────────────────────── */}
        {tab === 'catalogue' && (
          <div>
            {products.length > 0 && !products[0]?.isFallback && (
              <div className="flex items-center gap-2 mb-5 text-xs text-gray-500">
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                Taux mis à jour le {products[0].ratesDate} via BCE & Yahoo Finance
              </div>
            )}

            {loadingProducts ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {[1, 2, 3, 4].map(i => <div key={i} className="h-72 bg-gray-200 rounded-2xl animate-pulse" />)}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {products.map(p => (
                  <ProductCard key={p.id} product={p} onInvest={setSelectedProduct} availableTreasury={availableTreasury} />
                ))}
              </div>
            )}

            <div className="mt-8 p-4 bg-blue-50 border border-blue-100 rounded-xl flex gap-3">
              <Info className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
              <p className="text-sm text-blue-700">
                Les rendements affichés sont basés sur les données de la Banque Centrale Européenne (€STR, courbe AAA)
                et les ETFs cotés en bourse. Ce service est à titre indicatif — les placements réels sont effectués
                via les partenaires financiers réglementés. Les performances passées ne garantissent pas les résultats futurs.
              </p>
            </div>
          </div>
        )}

        {/* ── PORTEFEUILLE ──────────────────────────────────────────────────── */}
        {tab === 'portfolio' && (
          <div>
            {loadingPortfolio ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => <div key={i} className="h-20 bg-gray-200 rounded-xl animate-pulse" />)}
              </div>
            ) : investments.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <TrendingUp className="w-8 h-8 text-gray-300" />
                </div>
                <p className="text-gray-500 font-medium mb-2">Aucun placement actif</p>
                <p className="text-gray-400 text-sm mb-5">Explorez le catalogue pour démarrer votre premier placement.</p>
                <button onClick={() => setTab('catalogue')}
                  className="px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700">
                  Voir le catalogue
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {investments.map(inv => {
                  const gainPct = inv.amount > 0 ? ((inv.currentGain / inv.amount) * 100).toFixed(3) : '0.000';
                  return (
                    <div key={inv._id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                      <div className="flex items-center justify-between gap-4 flex-wrap">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                            <TrendingUp className="w-5 h-5 text-blue-600" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-gray-900">{inv.productName}</span>
                              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[inv.status]}`}>
                                {STATUS_LABELS[inv.status]}
                              </span>
                            </div>
                            <div className="text-sm text-gray-500 mt-0.5">
                              Placé le {new Date(inv.investedAt).toLocaleDateString('fr-FR')} · {fmtPct(inv.expectedRate)} annuel
                              {inv.maturityDate && ` · Échéance ${new Date(inv.maturityDate).toLocaleDateString('fr-FR')}`}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-6">
                          <div className="text-right">
                            <div className="text-xs text-gray-400">Investi</div>
                            <div className="font-semibold text-gray-900">{fmt(inv.amount)}</div>
                          </div>
                          {inv.status === 'active' && (
                            <>
                              <div className="text-right">
                                <div className="text-xs text-gray-400">Gain</div>
                                <div className="font-semibold text-emerald-600">+{fmt(inv.currentGain)}</div>
                                <div className="text-xs text-emerald-500">+{gainPct} %</div>
                              </div>
                              <div className="text-right">
                                <div className="text-xs text-gray-400">Valeur actuelle</div>
                                <div className="font-bold text-gray-900">{fmt(inv.currentValue)}</div>
                              </div>
                            </>
                          )}
                          {inv.status === 'withdrawn' && (
                            <div className="text-right">
                              <div className="text-xs text-gray-400">Montant reçu</div>
                              <div className="font-bold text-gray-900">{fmt(inv.withdrawnAmount)}</div>
                            </div>
                          )}
                          {inv.status === 'active' && (
                            <button onClick={() => handleWithdraw(inv)} disabled={withdrawing === inv._id}
                              className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50">
                              {withdrawing === inv._id
                                ? <Loader2 className="w-4 h-4 animate-spin" />
                                : <ArrowDownLeft className="w-4 h-4" />}
                              Retirer
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
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
