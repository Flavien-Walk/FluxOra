'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { useExpenses } from '@/hooks/useExpenses';
import { useAlerts } from '@/hooks/useAlerts';
import api from '@/lib/api';
import Header from '@/components/layout/Header';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import { Plus, Receipt, Trash2, Pencil, AlertTriangle, Camera, FileUp, Loader2 } from 'lucide-react';

const fmt = (n) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n ?? 0);

const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('fr-FR') : '—');

const fetcher = (url) => api.get(url).then((r) => r.data);

const CATEGORIES = [
  { value: 'software',   label: 'Logiciels / SaaS' },
  { value: 'marketing',  label: 'Marketing / Pub' },
  { value: 'suppliers',  label: 'Fournisseurs' },
  { value: 'travel',     label: 'Déplacements' },
  { value: 'office',     label: 'Bureautique' },
  { value: 'salaries',   label: 'Salaires' },
  { value: 'taxes',      label: 'Taxes / Impôts' },
  { value: 'banking',    label: 'Frais bancaires' },
  { value: 'other',      label: 'Autre' },
];

const VAT_RATES = [
  { value: 0,   label: '0%' },
  { value: 5.5, label: '5,5%' },
  { value: 10,  label: '10%' },
  { value: 20,  label: '20%' },
];

const NON_DEDUCTIBLE = new Set(['salaries', 'taxes', 'banking']);

const STATUS_CONFIG = {
  validated:      { label: 'Validée',      color: 'bg-green-100 text-green-700' },
  pending_review: { label: 'A vérifier',   color: 'bg-yellow-100 text-yellow-700' },
  non_eligible:   { label: 'Non éligible', color: 'bg-gray-100 text-gray-500' },
};

const ALERT_TYPE_LABELS = {
  missing_vat:     'TVA manquante',
  missing_receipt: 'Justificatif manquant',
  manual:          'Vérification manuelle',
};

const EMPTY_FORM = {
  date:        new Date().toISOString().split('T')[0],
  description: '',
  vendor:      '',
  category:    'software',
  amountHT:    '',
  vatRate:     '20',
  notes:       '',
};

export default function ExpensesPage() {
  const { expenses, isLoading, mutate } = useExpenses();
  const { alerts, openCount, mutate: mutateAlerts } = useAlerts('open');
  const { data: vatSummary } = useSWR('/api/expenses/vat-summary', fetcher, { revalidateOnFocus: false });

  const [modalOpen,      setModalOpen]      = useState(false);
  const [alertsOpen,     setAlertsOpen]     = useState(false);
  const [saving,         setSaving]         = useState(false);
  const [deleting,       setDeleting]       = useState('');
  const [resolving,      setResolving]      = useState('');
  const [form,           setForm]           = useState(EMPTY_FORM);
  const [editingExpense, setEditingExpense] = useState(null);
  const [modalTab,       setModalTab]       = useState('manual');
  const [scanning,       setScanning]       = useState(false);
  const [scanError,      setScanError]      = useState('');

  const closeModal = () => {
    setModalOpen(false);
    setModalTab('manual');
    setScanError('');
    setEditingExpense(null);
    setForm(EMPTY_FORM);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => {
      const next = { ...f, [name]: value };
      if (name === 'category' && NON_DEDUCTIBLE.has(value)) next.vatRate = '0';
      return next;
    });
  };

  const openEdit = (exp) => {
    setForm({
      date:        exp.date ? new Date(exp.date).toISOString().split('T')[0] : EMPTY_FORM.date,
      description: exp.description || '',
      vendor:      exp.vendor || '',
      category:    exp.category || 'software',
      amountHT:    String(exp.amountHT ?? ''),
      vatRate:     String(exp.vatRate ?? '20'),
      notes:       exp.notes || '',
    });
    setEditingExpense(exp);
    setModalTab('manual');
    setModalOpen(true);
  };

  const amountHTNum = parseFloat(form.amountHT) || 0;
  const vatRateNum  = parseFloat(form.vatRate)  || 0;
  const vatPreview  = Math.round(amountHTNum * vatRateNum) / 100;
  const ttcPreview  = Math.round((amountHTNum + vatPreview) * 100) / 100;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...form,
        amountHT: parseFloat(form.amountHT),
        vatRate:  parseFloat(form.vatRate),
        amount:   ttcPreview,
      };
      if (editingExpense) {
        await api.put(`/api/expenses/${editingExpense._id}`, payload);
      } else {
        await api.post('/api/expenses', payload);
      }
      mutate();
      mutateAlerts();
      closeModal();
    } catch (err) {
      alert(err.response?.data?.error || 'Erreur lors de l\'enregistrement.');
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
      mutateAlerts();
    } finally {
      setDeleting('');
    }
  };

  const handleScan = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setScanning(true);
    setScanError('');
    try {
      const reader = new FileReader();
      reader.onload = async (ev) => {
        const base64 = ev.target.result.split(',')[1];
        try {
          const { data } = await api.post('/api/expenses/scan', {
            image: base64,
            mimeType: file.type,
          });
          setForm((f) => ({
            ...f,
            description: data.supplier   || f.description,
            vendor:      data.supplier   || f.vendor,
            date:        data.date       || f.date,
            amountHT:    data.amountHT   != null ? String(data.amountHT) : f.amountHT,
            vatRate:     data.vatRate    != null ? String(data.vatRate)  : f.vatRate,
          }));
          setModalTab('manual');
        } catch {
          setScanError('OCR non disponible. Renseignez MINDEE_API_KEY sur le backend ou saisissez manuellement.');
        } finally {
          setScanning(false);
        }
      };
      reader.readAsDataURL(file);
    } catch {
      setScanning(false);
      setScanError('Impossible de lire le fichier.');
    }
  };

  const handleResolveAlert = async (alertId) => {
    setResolving(alertId);
    try {
      await api.patch(`/api/alerts/${alertId}/resolve`);
      mutateAlerts();
    } finally {
      setResolving('');
    }
  };

  return (
    <>
      <Header title="Dépenses" />
      <div className="flex-1 p-6 space-y-6">

        {/* KPI */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <p className="text-xs text-gray-500 uppercase font-medium mb-1">Total TTC</p>
            <p className="text-2xl font-bold text-gray-900">
              {fmt(expenses.reduce((s, e) => s + (e.amount || 0), 0))}
            </p>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <p className="text-xs text-gray-500 uppercase font-medium mb-1">Total HT</p>
            <p className="text-2xl font-bold text-gray-900">{fmt(vatSummary?.totalHT)}</p>
          </div>
          <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4">
            <p className="text-xs text-indigo-600 uppercase font-medium mb-1">TVA récupérable</p>
            <p className="text-2xl font-bold text-indigo-700">{fmt(vatSummary?.vatRecoverable)}</p>
          </div>
          <button
            onClick={() => setAlertsOpen(true)}
            className={`rounded-xl p-4 text-left border transition-colors ${
              openCount > 0
                ? 'bg-yellow-50 border-yellow-200 hover:bg-yellow-100'
                : 'bg-white border-gray-200'
            }`}
          >
            <p className={`text-xs uppercase font-medium mb-1 ${openCount > 0 ? 'text-yellow-600' : 'text-gray-500'}`}>
              Alertes ouvertes
            </p>
            <div className="flex items-center gap-2">
              <p className={`text-2xl font-bold ${openCount > 0 ? 'text-yellow-700' : 'text-gray-400'}`}>
                {openCount}
              </p>
              {openCount > 0 && <AlertTriangle size={18} className="text-yellow-500" />}
            </div>
          </button>
        </div>

        {/* Détail TVA par taux */}
        {vatSummary?.vatRecoverable > 0 && (
          <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4">
            <p className="text-xs text-indigo-700 font-semibold uppercase mb-3">Détail TVA récupérable</p>
            <div className="flex flex-wrap gap-4">
              {Object.entries(vatSummary.byRate || {}).filter(([, v]) => v > 0).map(([rate, amount]) => (
                <div key={rate} className="bg-white rounded-lg px-4 py-2 border border-indigo-100">
                  <p className="text-xs text-indigo-500 font-medium">TVA {rate}%</p>
                  <p className="text-base font-bold text-indigo-700">{fmt(amount)}</p>
                </div>
              ))}
            </div>
          </div>
        )}

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
                <p className="text-gray-400 text-sm mt-1">Ajoutez vos dépenses pour suivre la TVA récupérable</p>
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
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Catégorie</th>
                      <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">HT</th>
                      <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">TVA récup.</th>
                      <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">TTC</th>
                      <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">Statut</th>
                      <th className="px-4 py-3" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {expenses.map((exp) => {
                      const cat = CATEGORIES.find((c) => c.value === exp.category);
                      const st  = STATUS_CONFIG[exp.status] || STATUS_CONFIG.validated;
                      return (
                        <tr key={exp._id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{fmtDate(exp.date)}</td>
                          <td className="px-4 py-3 text-gray-900">
                            <div>{exp.description}</div>
                            {exp.vendor && <div className="text-xs text-gray-400">{exp.vendor}</div>}
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                              {cat?.label || exp.category}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right text-gray-600">{fmt(exp.amountHT)}</td>
                          <td className="px-4 py-3 text-right font-medium text-indigo-600">
                            {exp.vatRecoverable > 0
                              ? fmt(exp.vatRecoverable)
                              : <span className="text-gray-300">—</span>}
                          </td>
                          <td className="px-4 py-3 text-right font-semibold text-red-700">{fmt(exp.amount)}</td>
                          <td className="px-4 py-3">
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${st.color}`}>
                              {st.label}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => openEdit(exp)}
                                className="text-gray-400 hover:text-indigo-500 p-1 rounded transition-colors"
                                title="Modifier"
                              >
                                <Pencil size={14} />
                              </button>
                              <button
                                onClick={() => handleDelete(exp._id)}
                                disabled={deleting === exp._id}
                                className="text-gray-400 hover:text-red-500 p-1 rounded transition-colors"
                                title="Supprimer"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
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

      {/* Modal dépense (création ou édition) */}
      <Modal
        open={modalOpen}
        onClose={closeModal}
        title={editingExpense ? 'Modifier la dépense' : 'Nouvelle dépense'}
      >
        {/* Onglets (masqués en mode édition) */}
        {!editingExpense && (
          <div className="flex border-b border-gray-200 mb-4 -mx-1">
            {[{ id: 'manual', label: 'Saisie manuelle', Icon: Receipt }, { id: 'scan', label: 'Scanner un ticket', Icon: Camera }].map(({ id, label, Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => setModalTab(id)}
                className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  modalTab === id
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <Icon size={14} /> {label}
              </button>
            ))}
          </div>
        )}

        {/* Onglet Scanner */}
        {!editingExpense && modalTab === 'scan' && (
          <div className="space-y-4">
            <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center">
              {scanning ? (
                <div className="flex flex-col items-center gap-3">
                  <Loader2 size={32} className="text-indigo-500 animate-spin" />
                  <p className="text-sm text-gray-600">Analyse du ticket en cours...</p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3">
                  <FileUp size={32} className="text-gray-400" />
                  <p className="text-sm font-medium text-gray-700">Importez une photo de ticket ou facture</p>
                  <p className="text-xs text-gray-400">JPG, PNG, PDF — Max 5 Mo</p>
                  <label className="cursor-pointer">
                    <span className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors">
                      <Camera size={14} /> Choisir un fichier
                    </span>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,application/pdf"
                      onChange={handleScan}
                      className="hidden"
                    />
                  </label>
                </div>
              )}
            </div>
            {scanError && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-3 text-sm text-yellow-800">
                {scanError}
                <button
                  type="button"
                  onClick={() => { setScanError(''); setModalTab('manual'); }}
                  className="ml-2 underline"
                >
                  Saisir manuellement
                </button>
              </div>
            )}
          </div>
        )}

        {/* Formulaire (manuel ou édition) */}
        <form onSubmit={handleSubmit} className={`space-y-4 ${!editingExpense && modalTab === 'scan' ? 'hidden' : ''}`}>
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
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <input
              type="text"
              name="description"
              value={form.description}
              onChange={handleChange}
              required
              placeholder="Ex: Abonnement Notion, Achat bureau..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Fournisseur</label>
            <input
              type="text"
              name="vendor"
              value={form.vendor}
              onChange={handleChange}
              placeholder="Ex: Amazon, Notion, SNCF..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Montant HT (€)</label>
              <input
                type="number"
                name="amountHT"
                value={form.amountHT}
                onChange={handleChange}
                required
                min="0.01"
                step="0.01"
                placeholder="0.00"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Taux TVA</label>
              <select
                name="vatRate"
                value={form.vatRate}
                onChange={handleChange}
                disabled={NON_DEDUCTIBLE.has(form.category)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-100 disabled:text-gray-400"
              >
                {VAT_RATES.map((r) => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Preview TVA */}
          {amountHTNum > 0 && (
            <div className="bg-gray-50 rounded-lg px-4 py-3 text-sm space-y-1 border border-gray-100">
              <div className="flex justify-between text-gray-500">
                <span>TVA ({form.vatRate}%)</span>
                <span>{fmt(vatPreview)}</span>
              </div>
              <div className="flex justify-between font-semibold text-gray-800">
                <span>Total TTC</span>
                <span>{fmt(ttcPreview)}</span>
              </div>
              {!NON_DEDUCTIBLE.has(form.category) && vatPreview > 0 && (
                <div className="flex justify-between text-indigo-600 font-medium">
                  <span>TVA récupérable</span>
                  <span>{fmt(vatPreview)}</span>
                </div>
              )}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              name="notes"
              value={form.notes}
              onChange={handleChange}
              rows={2}
              placeholder="Informations complémentaires..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={closeModal}>Annuler</Button>
            <Button type="submit" loading={saving}>
              {editingExpense ? 'Enregistrer les modifications' : 'Ajouter la dépense'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Panel alertes */}
      <Modal open={alertsOpen} onClose={() => setAlertsOpen(false)} title="Alertes TVA & justificatifs">
        {alerts.length === 0 ? (
          <div className="flex flex-col items-center py-10 text-center">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-3">
              <AlertTriangle size={20} className="text-green-600" />
            </div>
            <p className="text-gray-500 font-medium">Aucune alerte ouverte</p>
            <p className="text-gray-400 text-sm mt-1">Toutes vos dépenses sont conformes.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {alerts.map((alert) => (
              <div key={alert._id} className="flex items-start gap-3 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <AlertTriangle size={16} className="text-yellow-500 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-yellow-700 uppercase mb-0.5">
                    {ALERT_TYPE_LABELS[alert.type] || alert.type}
                  </p>
                  <p className="text-sm text-yellow-800">{alert.message}</p>
                </div>
                <button
                  onClick={() => handleResolveAlert(alert._id)}
                  disabled={resolving === alert._id}
                  className="flex-shrink-0 text-xs font-medium text-yellow-700 hover:text-green-700 underline whitespace-nowrap"
                >
                  {resolving === alert._id ? '...' : 'Résoudre'}
                </button>
              </div>
            ))}
          </div>
        )}
      </Modal>
    </>
  );
}
