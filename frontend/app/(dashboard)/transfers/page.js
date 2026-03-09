'use client';

import { useState } from 'react';
import { useTransfers, useBeneficiaries } from '@/hooks/useTransfers';
import api from '@/lib/api';
import Header from '@/components/layout/Header';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import { Plus, ArrowUpRight, Users, Trash2, CheckCircle, Clock, XCircle, Send } from 'lucide-react';

const fmt = (n) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n ?? 0);

const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('fr-FR') : '—');
const fmtDateTime = (d) =>
  d ? new Date(d).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' }) : '—';

const STATUS_CONFIG = {
  processing: { label: 'En cours',  color: 'bg-yellow-100 text-yellow-700', Icon: Clock },
  completed:  { label: 'Effectué',  color: 'bg-green-100 text-green-700',   Icon: CheckCircle },
  failed:     { label: 'Échoué',    color: 'bg-red-100 text-red-700',       Icon: XCircle },
  cancelled:  { label: 'Annulé',    color: 'bg-gray-100 text-gray-500',     Icon: XCircle },
};

const EMPTY_TRANSFER = { beneficiaryId: '', amount: '', reference: '' };
const EMPTY_BENEFICIARY = { name: '', iban: '', bic: '', email: '' };

export default function TransfersPage() {
  const { transfers, total, isLoading, mutate }       = useTransfers();
  const { beneficiaries, mutate: mutateBenef }         = useBeneficiaries();
  const [transferModal,    setTransferModal]    = useState(false);
  const [benefModal,       setBenefModal]       = useState(false);
  const [confirmModal,     setConfirmModal]     = useState(false);
  const [pendingTransfer,  setPendingTransfer]  = useState(null);
  const [saving,           setSaving]           = useState(false);
  const [cancelling,       setCancelling]       = useState('');
  const [form,     setForm]     = useState(EMPTY_TRANSFER);
  const [benefForm, setBenefForm] = useState(EMPTY_BENEFICIARY);

  const handleChange      = (e) => setForm((f)      => ({ ...f, [e.target.name]: e.target.value }));
  const handleBenefChange = (e) => setBenefForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const selectedBenef = beneficiaries.find((b) => b._id === form.beneficiaryId);

  const handleTransferSubmit = async (e) => {
    e.preventDefault();
    setPendingTransfer({ ...form, beneficiary: selectedBenef });
    setTransferModal(false);
    setConfirmModal(true);
  };

  const handleConfirm = async () => {
    setSaving(true);
    try {
      await api.post('/api/transfers', {
        beneficiaryId: pendingTransfer.beneficiaryId,
        amount:        parseFloat(pendingTransfer.amount),
        reference:     pendingTransfer.reference,
      });
      mutate();
      setConfirmModal(false);
      setForm(EMPTY_TRANSFER);
      setPendingTransfer(null);
    } catch (err) {
      alert(err.response?.data?.error || 'Erreur lors du virement.');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateBenef = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/api/transfers/beneficiaries', benefForm);
      mutateBenef();
      setBenefModal(false);
      setBenefForm(EMPTY_BENEFICIARY);
    } catch (err) {
      alert(err.response?.data?.error || 'Erreur lors de l\'ajout.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteBenef = async (id) => {
    if (!confirm('Supprimer ce bénéficiaire ?')) return;
    await api.delete(`/api/transfers/beneficiaries/${id}`);
    mutateBenef();
  };

  const handleCancel = async (id) => {
    if (!confirm('Annuler ce virement ?')) return;
    setCancelling(id);
    try {
      await api.patch(`/api/transfers/${id}/cancel`);
      mutate();
    } catch (err) {
      alert(err.response?.data?.error || 'Impossible d\'annuler.');
    } finally {
      setCancelling('');
    }
  };

  const totalCompleted = transfers
    .filter((t) => t.status === 'completed')
    .reduce((s, t) => s + t.amount, 0);

  return (
    <>
      <Header title="Virements" />
      <div className="flex-1 p-6 space-y-6">

        {/* Bannière simulation */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-3 flex items-start gap-3">
          <span className="text-amber-500 text-base mt-0.5">⚡</span>
          <div className="text-sm text-amber-800">
            <span className="font-semibold">Mode simulation</span> — Les virements sont simulés dans ce MVP.
            En production, l'exécution des ordres de paiement sera déléguée à un <span className="font-medium">établissement de paiement agréé</span> (Stripe, Swan ou Treezor).
          </div>
        </div>

        {/* KPI */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <p className="text-xs text-gray-500 uppercase font-medium mb-1">Virements effectués</p>
            <p className="text-2xl font-bold text-gray-900">
              {transfers.filter((t) => t.status === 'completed').length}
            </p>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <p className="text-xs text-gray-500 uppercase font-medium mb-1">Total viré</p>
            <p className="text-2xl font-bold text-gray-900">{fmt(totalCompleted)}</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <p className="text-xs text-gray-500 uppercase font-medium mb-1">Bénéficiaires</p>
            <p className="text-2xl font-bold text-gray-900">{beneficiaries.length}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Bénéficiaires */}
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <h2 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <Users size={14} className="text-gray-400" /> Bénéficiaires
                </h2>
                <Button size="sm" variant="secondary" onClick={() => setBenefModal(true)}>
                  <Plus size={13} /> Ajouter
                </Button>
              </div>
            </CardHeader>
            <CardBody className="p-0">
              {beneficiaries.length === 0 ? (
                <div className="px-4 py-8 text-center">
                  <p className="text-gray-400 text-sm">Aucun bénéficiaire enregistré</p>
                </div>
              ) : (
                <ul className="divide-y divide-gray-100">
                  {beneficiaries.map((b) => (
                    <li key={b._id} className="flex items-center gap-3 px-4 py-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{b.name}</p>
                        <p className="text-xs text-gray-400 font-mono">
                          {b.iban.slice(0, 4)} •••• •••• {b.iban.slice(-4)}
                        </p>
                      </div>
                      <button
                        onClick={() => handleDeleteBenef(b._id)}
                        className="text-gray-300 hover:text-red-500 p-1 flex-shrink-0"
                      >
                        <Trash2 size={13} />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>

          {/* Historique virements */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <h2 className="text-sm font-semibold text-gray-700">Historique des virements</h2>
                  <Button
                    size="sm"
                    onClick={() => setTransferModal(true)}
                    disabled={beneficiaries.length === 0}
                    title={beneficiaries.length === 0 ? 'Ajoutez un bénéficiaire d\'abord' : ''}
                  >
                    <Send size={13} /> Nouveau virement
                  </Button>
                </div>
              </CardHeader>
              <CardBody className="p-0">
                {isLoading ? (
                  <div className="flex justify-center py-12">
                    <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : transfers.length === 0 ? (
                  <div className="flex flex-col items-center py-12 text-center">
                    <ArrowUpRight size={36} className="text-gray-300 mb-2" />
                    <p className="text-gray-500 font-medium">Aucun virement</p>
                    <p className="text-gray-400 text-sm mt-1">
                      {beneficiaries.length === 0
                        ? 'Commencez par ajouter un bénéficiaire'
                        : 'Effectuez votre premier virement'}
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {transfers.map((t) => {
                      const st = STATUS_CONFIG[t.status] || STATUS_CONFIG.processing;
                      return (
                        <div key={t._id} className="flex items-center gap-4 px-4 py-3">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {t.beneficiaryId?.name || 'Bénéficiaire inconnu'}
                            </p>
                            <p className="text-xs text-gray-400">
                              {t.reference} · {fmtDate(t.createdAt)}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-semibold text-red-700">-{fmt(t.amount)}</p>
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${st.color}`}>
                              {st.label}
                            </span>
                          </div>
                          {t.status === 'processing' && (
                            <button
                              onClick={() => handleCancel(t._id)}
                              disabled={cancelling === t._id}
                              className="text-gray-300 hover:text-red-500 p-1"
                              title="Annuler"
                            >
                              <XCircle size={15} />
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardBody>
            </Card>
          </div>
        </div>
      </div>

      {/* Modal nouveau virement */}
      <Modal open={transferModal} onClose={() => setTransferModal(false)} title="Nouveau virement">
        <form onSubmit={handleTransferSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Bénéficiaire</label>
            <select
              name="beneficiaryId"
              value={form.beneficiaryId}
              onChange={handleChange}
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Sélectionner un bénéficiaire</option>
              {beneficiaries.map((b) => (
                <option key={b._id} value={b._id}>
                  {b.name} — {b.iban.slice(0, 4)} •••• {b.iban.slice(-4)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Montant (€)</label>
            <input
              type="number"
              name="amount"
              value={form.amount}
              onChange={handleChange}
              required
              min="0.01"
              step="0.01"
              placeholder="0.00"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Motif / référence</label>
            <input
              type="text"
              name="reference"
              value={form.reference}
              onChange={handleChange}
              placeholder="Ex: Facture #2026-031, Prestation..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setTransferModal(false)}>Annuler</Button>
            <Button type="submit" disabled={!form.beneficiaryId || !form.amount}>
              <Send size={13} /> Continuer
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal confirmation virement */}
      <Modal open={confirmModal} onClose={() => setConfirmModal(false)} title="Confirmer le virement">
        {pendingTransfer && (
          <div className="space-y-4">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm text-yellow-800">
              Ce virement sera irréversible après confirmation.
            </div>
            <div className="space-y-2 text-sm bg-gray-50 rounded-lg p-4">
              <div className="flex justify-between">
                <span className="text-gray-500">Bénéficiaire</span>
                <span className="font-medium">{pendingTransfer.beneficiary?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">IBAN</span>
                <span className="font-mono text-xs">{pendingTransfer.beneficiary?.iban}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Montant</span>
                <span className="font-bold text-red-700 text-base">{fmt(pendingTransfer.amount)}</span>
              </div>
              {pendingTransfer.reference && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Motif</span>
                  <span className="font-medium">{pendingTransfer.reference}</span>
                </div>
              )}
            </div>
            <div className="flex justify-end gap-3">
              <Button type="button" variant="secondary" onClick={() => setConfirmModal(false)}>Annuler</Button>
              <Button onClick={handleConfirm} loading={saving}>
                <CheckCircle size={14} /> Confirmer le virement
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal nouveau bénéficiaire */}
      <Modal open={benefModal} onClose={() => setBenefModal(false)} title="Ajouter un bénéficiaire">
        <form onSubmit={handleCreateBenef} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nom</label>
            <input
              type="text"
              name="name"
              value={benefForm.name}
              onChange={handleBenefChange}
              required
              placeholder="Nom ou raison sociale"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">IBAN</label>
            <input
              type="text"
              name="iban"
              value={benefForm.iban}
              onChange={handleBenefChange}
              required
              placeholder="FR76 3000 6000 0112 3456 7890 189"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">BIC (optionnel)</label>
              <input
                type="text"
                name="bic"
                value={benefForm.bic}
                onChange={handleBenefChange}
                placeholder="BNPAFRPPXXX"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email (optionnel)</label>
              <input
                type="email"
                name="email"
                value={benefForm.email}
                onChange={handleBenefChange}
                placeholder="contact@..."
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setBenefModal(false)}>Annuler</Button>
            <Button type="submit" loading={saving}>Enregistrer</Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
