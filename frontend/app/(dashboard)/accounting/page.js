'use client';

import { useState } from 'react';
import { useAccounting } from '@/hooks/useAccounting';
import api from '@/lib/api';
import Header from '@/components/layout/Header';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import { Plus, TrendingUp, TrendingDown, BookOpen } from 'lucide-react';

const fmt = (n) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n ?? 0);

const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('fr-FR') : '—');

const SOURCE_LABELS = { invoice: 'Facture', expense: 'Dépense', payment: 'Paiement', manual: 'Manuel' };

// Catégories correspondant exactement à l'enum du modèle AccountingEntry
const CATEGORIES = [
  { value: 'revenue',   label: 'Revenus' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'software',  label: 'Logiciels' },
  { value: 'salaries',  label: 'Salaires' },
  { value: 'suppliers', label: 'Fournisseurs' },
  { value: 'taxes',     label: 'Taxes & impôts' },
  { value: 'banking',   label: 'Frais bancaires' },
  { value: 'other',     label: 'Autres' },
];
const CATEGORY_LABELS = Object.fromEntries(CATEGORIES.map((c) => [c.value, c.label]));

export default function AccountingPage() {
  const { entries, summary, isLoading, mutate } = useAccounting();
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    date: new Date().toISOString().split('T')[0],
    description: '',
    category: 'revenue',
    type: 'credit',
    amount: '',
  });

  const handleChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/api/accounting', { ...form, amount: parseFloat(form.amount) });
      mutate();
      setModalOpen(false);
      setForm({ date: new Date().toISOString().split('T')[0], description: '', category: 'revenue', type: 'credit', amount: '' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Supprimer cette écriture manuelle ?')) return;
    await api.delete(`/api/accounting/${id}`);
    mutate();
  };

  const balance = (summary?.totalCredits ?? 0) - (summary?.totalDebits ?? 0);

  return (
    <>
      <Header title="Comptabilité" />
      <div className="flex-1 p-6 space-y-6">

        {/* Résumé solde */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-green-50 border border-green-100 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp size={16} className="text-green-600" />
              <span className="text-xs font-medium text-green-700 uppercase">Entrées (crédits)</span>
            </div>
            <p className="text-2xl font-bold text-green-700">{fmt(summary?.totalCredits)}</p>
          </div>
          <div className="bg-red-50 border border-red-100 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <TrendingDown size={16} className="text-red-600" />
              <span className="text-xs font-medium text-red-700 uppercase">Sorties (débits)</span>
            </div>
            <p className="text-2xl font-bold text-red-700">{fmt(summary?.totalDebits)}</p>
          </div>
          <div className={`${balance >= 0 ? 'bg-indigo-50 border-indigo-100' : 'bg-orange-50 border-orange-100'} border rounded-xl p-4`}>
            <div className="flex items-center gap-2 mb-1">
              <BookOpen size={16} className={balance >= 0 ? 'text-indigo-600' : 'text-orange-600'} />
              <span className={`text-xs font-medium uppercase ${balance >= 0 ? 'text-indigo-700' : 'text-orange-700'}`}>Solde net</span>
            </div>
            <p className={`text-2xl font-bold ${balance >= 0 ? 'text-indigo-700' : 'text-orange-700'}`}>{fmt(balance)}</p>
          </div>
        </div>

        {/* Journal */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <h2 className="text-sm font-semibold text-gray-700">Journal des écritures</h2>
              <Button size="sm" onClick={() => setModalOpen(true)}>
                <Plus size={14} /> Écriture manuelle
              </Button>
            </div>
          </CardHeader>
          <CardBody className="p-0">
            {isLoading ? (
              <div className="flex justify-center py-12">
                <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : entries.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <BookOpen size={40} className="text-gray-300 mb-3" />
                <p className="text-gray-500 font-medium">Journal vide</p>
                <p className="text-gray-400 text-sm mt-1">
                  Les écritures apparaîtront automatiquement lors des paiements et dépenses
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Date</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Description</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Catégorie</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Source</th>
                      <th className="text-right px-4 py-3 text-xs font-medium text-green-600 uppercase">Crédit</th>
                      <th className="text-right px-4 py-3 text-xs font-medium text-red-600 uppercase">Débit</th>
                      <th className="px-4 py-3" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {entries.map((entry) => (
                      <tr key={entry._id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{fmtDate(entry.date)}</td>
                        <td className="px-4 py-3 text-gray-900">{entry.description}</td>
                        <td className="px-4 py-3 text-gray-500">{CATEGORY_LABELS[entry.category] || entry.category}</td>
                        <td className="px-4 py-3">
                          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                            {SOURCE_LABELS[entry.source] || entry.source}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-green-700">
                          {entry.type === 'credit' ? fmt(entry.amount) : ''}
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-red-700">
                          {entry.type === 'debit' ? fmt(entry.amount) : ''}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {entry.source === 'manual' && (
                            <button
                              onClick={() => handleDelete(entry._id)}
                              className="text-gray-400 hover:text-red-500 text-xs"
                            >
                              Suppr.
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardBody>
        </Card>
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Nouvelle écriture manuelle">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
              <input
                type="date"
                name="date"
                value={form.date}
                onChange={handleChange}
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
              <select
                name="type"
                value={form.type}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="credit">Crédit (entrée)</option>
                <option value="debit">Débit (sortie)</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <input
              type="text"
              name="description"
              value={form.description}
              onChange={handleChange}
              required
              placeholder="Ex: Virement client, Achat matériel..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Catégorie</label>
              <select
                name="category"
                value={form.category}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
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
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>Annuler</Button>
            <Button type="submit" loading={saving}>Enregistrer</Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
