'use client';

import { useState } from 'react';
import { useCards } from '@/hooks/useCards';
import api from '@/lib/api';
import Header from '@/components/layout/Header';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import InteractiveCard3D from '@/components/ui/InteractiveCard3D';
import { Plus, CreditCard, Lock, Unlock, Trash2, Zap, BarChart3 } from 'lucide-react';

const fmt = (n) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n ?? 0);

const CATEGORIES = [
  { value: 'software',   label: 'Logiciels / SaaS' },
  { value: 'marketing',  label: 'Marketing / Pub' },
  { value: 'suppliers',  label: 'Fournisseurs' },
  { value: 'travel',     label: 'Déplacements' },
  { value: 'office',     label: 'Bureautique' },
  { value: 'other',      label: 'Autre' },
];

const COLORS = [
  { value: 'indigo',   bg: 'from-indigo-500 to-indigo-700' },
  { value: 'violet',   bg: 'from-violet-500 to-violet-700' },
  { value: 'emerald',  bg: 'from-emerald-500 to-emerald-700' },
  { value: 'rose',     bg: 'from-rose-500 to-rose-700' },
  { value: 'amber',    bg: 'from-amber-500 to-amber-600' },
  { value: 'sky',      bg: 'from-sky-500 to-sky-700' },
];

const EMPTY_FORM = {
  name:         '',
  category:     'software',
  monthlyLimit: '500',
  linkedVendor: '',
  color:        'indigo',
};


export default function CardsPage() {
  const { cards, isLoading, mutate } = useCards();
  const [selected,   setSelected]   = useState(0);
  const [modalOpen,  setModalOpen]  = useState(false);
  const [saving,     setSaving]     = useState(false);
  const [loading,    setLoading]    = useState('');
  const [form, setForm] = useState(EMPTY_FORM);

  const handleChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const handleCreate = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/api/cards', { ...form, monthlyLimit: parseFloat(form.monthlyLimit) });
      mutate();
      setModalOpen(false);
      setForm(EMPTY_FORM);
      setSelected(0);
    } catch (err) {
      alert(err.response?.data?.error || 'Erreur lors de la création.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleBlock = async (card) => {
    setLoading(card._id);
    try {
      await api.patch(`/api/cards/${card._id}/status`, {
        status: card.status === 'blocked' ? 'active' : 'blocked',
      });
      mutate();
    } finally {
      setLoading('');
    }
  };

  const handleDelete = async (card) => {
    if (!confirm(`Supprimer la carte "${card.name}" ?`)) return;
    setLoading(card._id + '-del');
    try {
      await api.delete(`/api/cards/${card._id}`);
      setSelected(0);
      mutate();
    } finally {
      setLoading('');
    }
  };

  const activeCard = cards[selected];

  const totalBudget = cards.reduce((s, c) => s + (c.monthlyLimit || 0), 0);
  const totalSpend  = cards.reduce((s, c) => s + (c.currentMonthSpend || 0), 0);

  return (
    <>
      <Header title="Cartes virtuelles" />
      <div className="flex-1 p-6 space-y-6">

        {/* Bannière simulation */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-3 flex items-start gap-3">
          <span className="text-amber-500 text-base mt-0.5">⚡</span>
          <div className="text-sm text-amber-800">
            <span className="font-semibold">Mode simulation</span> — Les cartes virtuelles sont simulées dans ce MVP.
            En production, cette fonctionnalité sera assurée par <span className="font-medium">Stripe Issuing</span> ou <span className="font-medium">Swan</span>, opérateurs de paiement agréés.
          </div>
        </div>

        {/* KPI */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white border border-slate-100 rounded-xl p-5 shadow-card group transition-all duration-200 hover:shadow-card-hover hover:-translate-y-0.5 relative">
            <div className="flex items-start justify-between mb-4">
              <div
                className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent-500 to-accent-700 text-white flex items-center justify-center transition-transform duration-300 group-hover:scale-110"
                style={{ boxShadow: '0 4px 14px rgba(28,110,242,0.5)' }}
              >
                <CreditCard size={18} strokeWidth={1.75} />
              </div>
            </div>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400 mb-1">Cartes actives</p>
            <p className="text-2xl font-bold text-slate-900 tabular-nums">
              {cards.filter((c) => c.status === 'active').length}
            </p>
          </div>
          <div className="bg-white border border-slate-100 rounded-xl p-5 shadow-card group transition-all duration-200 hover:shadow-card-hover hover:-translate-y-0.5 relative">
            <div className="flex items-start justify-between mb-4">
              <div
                className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 text-white flex items-center justify-center transition-transform duration-300 group-hover:scale-110"
                style={{ boxShadow: '0 4px 14px rgba(16,185,129,0.5)' }}
              >
                <BarChart3 size={18} strokeWidth={1.75} />
              </div>
            </div>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400 mb-1">Budget total / mois</p>
            <p className="text-2xl font-bold text-slate-900 tabular-nums">{fmt(totalBudget)}</p>
          </div>
          <div className="bg-white border border-slate-100 rounded-xl p-5 shadow-card group transition-all duration-200 hover:shadow-card-hover hover:-translate-y-0.5 relative">
            <div className="flex items-start justify-between mb-4">
              <div
                className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-500 to-rose-700 text-white flex items-center justify-center transition-transform duration-300 group-hover:scale-110"
                style={{ boxShadow: '0 4px 14px rgba(244,63,94,0.5)' }}
              >
                <Zap size={18} strokeWidth={1.75} fill="currentColor" />
              </div>
            </div>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400 mb-1">Dépensé ce mois</p>
            <p className="text-2xl font-bold text-slate-900 tabular-nums">{fmt(totalSpend)}</p>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16">
            <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : cards.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-2xl bg-slate-900 text-slate-400 flex items-center justify-center mb-4" style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.2)' }}>
              <CreditCard size={28} strokeWidth={1.5} />
            </div>
            <p className="text-slate-700 font-semibold text-base mb-1">Aucune carte virtuelle</p>
            <p className="text-slate-400 text-sm mt-1 mb-5 max-w-xs">
              Créez des cartes dédiées par poste de dépense pour mieux contrôler votre budget
            </p>
            <Button onClick={() => setModalOpen(true)}>
              <Plus size={14} /> Créer une carte
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Carrousel */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-slate-800">Vos cartes</h2>
                <Button size="sm" onClick={() => setModalOpen(true)}>
                  <Plus size={14} /> Nouvelle carte
                </Button>
              </div>

              {/* Cards scroll */}
              <div className="flex gap-4 overflow-x-auto pb-6 snap-x">
                {cards.map((card, i) => (
                  <InteractiveCard3D key={card._id} card={card} isSelected={i === selected} onClick={() => setSelected(i)} />
                ))}
              </div>

              {/* Navigation dots */}
              {cards.length > 1 && (
                <div className="flex justify-center gap-1.5 mt-3">
                  {cards.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setSelected(i)}
                      className={`w-2 h-2 rounded-full transition-colors ${
                        i === selected ? 'bg-accent-600' : 'bg-slate-200'
                      }`}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Détail carte sélectionnée */}
            {activeCard && (
              <Card>
                <CardHeader>
                  <h3 className="text-sm font-semibold text-slate-800">{activeCard.name}</h3>
                </CardHeader>
                <CardBody className="space-y-4">
                  {/* Budget */}
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-slate-500">Budget mensuel</span>
                      <span className="font-medium tabular-nums">
                        {fmt(activeCard.currentMonthSpend)} / {fmt(activeCard.monthlyLimit)}
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all ${
                          (activeCard.currentMonthSpend / activeCard.monthlyLimit) > 0.8
                            ? 'bg-danger-500'
                            : 'bg-accent-500'
                        }`}
                        style={{
                          width: `${Math.min(100, (activeCard.currentMonthSpend / activeCard.monthlyLimit) * 100)}%`,
                        }}
                      />
                    </div>
                    <p className="text-xs text-slate-400 mt-1 tabular-nums">
                      {fmt(activeCard.monthlyLimit - activeCard.currentMonthSpend)} restants ce mois
                    </p>
                  </div>

                  {/* Infos */}
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Catégorie</span>
                      <span className="font-medium text-slate-800">
                        {CATEGORIES.find((c) => c.value === activeCard.category)?.label || activeCard.category}
                      </span>
                    </div>
                    {activeCard.linkedVendor && (
                      <div className="flex justify-between">
                        <span className="text-slate-500">Fournisseur lié</span>
                        <span className="font-medium text-slate-800">{activeCard.linkedVendor}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-slate-500">Numéro</span>
                      <span className="font-mono text-slate-700">•••• {activeCard.last4}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Expiration</span>
                      <span className="font-mono text-slate-700">
                        {String(activeCard.expiryMonth).padStart(2, '0')}/{activeCard.expiryYear}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-2 border-t border-slate-100">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => handleToggleBlock(activeCard)}
                      loading={loading === activeCard._id}
                      className="flex-1"
                    >
                      {activeCard.status === 'blocked'
                        ? <><Unlock size={13} /> Débloquer</>
                        : <><Lock size={13} /> Bloquer</>
                      }
                    </Button>
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => handleDelete(activeCard)}
                      loading={loading === activeCard._id + '-del'}
                    >
                      <Trash2 size={13} /> Supprimer
                    </Button>
                  </div>
                </CardBody>
              </Card>
            )}
          </div>
        )}
      </div>

      {/* Modal création */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Nouvelle carte virtuelle">
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Nom de la carte</label>
            <input
              type="text"
              name="name"
              value={form.name}
              onChange={handleChange}
              required
              placeholder="Ex: Abonnements SaaS, Publicité..."
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent-500 text-slate-900 placeholder:text-slate-400"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Catégorie</label>
              <select
                name="category"
                value={form.category}
                onChange={handleChange}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent-500 text-slate-900 placeholder:text-slate-400"
              >
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Plafond mensuel (€)</label>
              <input
                type="number"
                name="monthlyLimit"
                value={form.monthlyLimit}
                onChange={handleChange}
                required
                min="1"
                step="1"
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent-500 text-slate-900 placeholder:text-slate-400"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Fournisseur associé (optionnel)</label>
            <input
              type="text"
              name="linkedVendor"
              value={form.linkedVendor}
              onChange={handleChange}
              placeholder="Ex: AWS, Google Ads..."
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent-500 text-slate-900 placeholder:text-slate-400"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Couleur</label>
            <div className="flex gap-2">
              {COLORS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, color: c.value }))}
                  className={`w-8 h-8 rounded-full bg-gradient-to-br ${c.bg} transition-transform ${
                    form.color === c.value ? 'scale-125 ring-2 ring-offset-2 ring-slate-400' : 'hover:scale-110'
                  }`}
                />
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>Annuler</Button>
            <Button type="submit" loading={saving}>Créer la carte</Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
