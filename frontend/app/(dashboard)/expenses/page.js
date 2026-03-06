'use client';

import { useState } from 'react';
import { useExpenses } from '@/hooks/useExpenses';
import api from '@/lib/api';
import Header from '@/components/layout/Header';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import { Plus, Receipt, Trash2 } from 'lucide-react';

const fmt = (n) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n ?? 0);

const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('fr-FR') : '—');

const CATEGORIES = [
  { value: 'software', label: 'Logiciels / SaaS' },
  { value: 'hardware', label: 'Matériel' },
  { value: 'travel', label: 'Déplacements' },
  { value: 'meals', label: 'Repas / Restauration' },
  { value: 'marketing', label: 'Marketing / Pub' },
  { value: 'office', label: 'Bureautique / Fournitures' },
  { value: 'salary', label: 'Salaires / Prestataires' },
  { value: 'tax', label: 'Taxes / Impôts' },
  { value: 'other', label: 'Autre' },
];

const EMPTY_FORM = {
  date: new Date().toISOString().split('T')[0],
  description: '',
  vendor: '',
  category: 'other',
  amount: '',
  notes: '',
};

export default function ExpensesPage() {
  const { expenses, total, isLoading, mutate } = useExpenses();
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState('');
  const [form, setForm] = useState(EMPTY_FORM);

  const handleChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/api/expenses', { ...form, amount: parseFloat(form.amount) });
      mutate();
      setModalOpen(false);
      setForm(EMPTY_FORM);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Supprimer cette dépense ?')) return;
    setDeleting(id);
    try {
      await api.delete(`/api/expenses/${id}`);
      mutate();
    } finally {
      setDeleting('');
    }
  };

  const totalAmount = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);

  return (
    <>
      <Header title="Dépenses" />
      <div className="flex-1 p-6 space-y-6">

        {/* Résumé */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <p className="text-xs text-gray-500 uppercase font-medium mb-1">Total dépenses affichées</p>
            <p className="text-2xl font-bold text-gray-900">{fmt(totalAmount)}</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <p className="text-xs text-gray-500 uppercase font-medium mb-1">Nombre de dépenses</p>
            <p className="text-2xl font-bold text-gray-900">{total}</p>
          </div>
        </div>

        {/* Liste */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <h2 className="text-sm font-semibold text-gray-700">Liste des dépenses</h2>
              <Button size="sm" onClick={() => setModalOpen(true)}>
                <Plus size={14} /> Nouvelle dépense
              </Button>
            </div>
          </CardHeader>
          <CardBody className="p-0">
            {isLoading ? (
              <div className="flex justify-center py-12">
                <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : expenses.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <Receipt size={40} className="text-gray-300 mb-3" />
                <p className="text-gray-500 font-medium">Aucune dépense enregistrée</p>
                <p className="text-gray-400 text-sm mt-1">Ajoutez vos dépenses pour les suivre et les catégoriser</p>
                <Button size="sm" className="mt-4" onClick={() => setModalOpen(true)}>
                  <Plus size={14} /> Ajouter une dépense
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Date</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Description</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Fournisseur</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Catégorie</th>
                      <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Montant</th>
                      <th className="px-4 py-3" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {expenses.map((exp) => {
                      const cat = CATEGORIES.find((c) => c.value === exp.category);
                      return (
                        <tr key={exp._id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{fmtDate(exp.date)}</td>
                          <td className="px-4 py-3 text-gray-900">{exp.description}</td>
                          <td className="px-4 py-3 text-gray-500">{exp.vendor || '—'}</td>
                          <td className="px-4 py-3">
                            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                              {cat?.label || exp.category}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right font-semibold text-red-700">{fmt(exp.amount)}</td>
                          <td className="px-4 py-3 text-right">
                            <button
                              onClick={() => handleDelete(exp._id)}
                              disabled={deleting === exp._id}
                              className="text-gray-400 hover:text-red-500 p-1 rounded"
                            >
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardBody>
        </Card>
      </div>

      {/* Modal nouvelle dépense */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Nouvelle dépense">
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
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <input
              type="text"
              name="description"
              value={form.description}
              onChange={handleChange}
              required
              placeholder="Ex: Abonnement Notion, Achat clavier..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fournisseur</label>
              <input
                type="text"
                name="vendor"
                value={form.vendor}
                onChange={handleChange}
                placeholder="Ex: Amazon, Notion..."
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
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
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optionnel)</label>
            <textarea
              name="notes"
              value={form.notes}
              onChange={handleChange}
              rows={2}
              placeholder="Informations complémentaires..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
            />
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
