'use client';

import { useState, useMemo } from 'react';
import useSWR from 'swr';
import { useExpenses } from '@/hooks/useExpenses';
import { useAlerts } from '@/hooks/useAlerts';
import api from '@/lib/api';
import Header from '@/components/layout/Header';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import { cn } from '@/lib/utils';
import EmptyState from '@/components/ui/EmptyState';
import { SkeletonTable } from '@/components/ui/Skeleton';
import { Plus, Receipt, Trash2, Pencil, AlertTriangle, Camera, FileUp, Loader2, Search, X } from 'lucide-react';

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
  non_eligible:   { label: 'Non éligible', color: 'bg-slate-100 text-slate-500' },
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

  const totalHT        = expenses.reduce((s, e) => s + (e.amountHT       || 0), 0);
  const vatRecoverable = expenses.reduce((s, e) => s + (e.vatRecoverable || 0), 0);

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
  const [search,         setSearch]         = useState('');

  const filteredExpenses = useMemo(() => {
    if (!search) return expenses;
    const q = search.toLowerCase();
    return expenses.filter((e) =>
      e.description?.toLowerCase().includes(q) ||
      e.vendor?.toLowerCase().includes(q) ||
      e.category?.toLowerCase().includes(q)
    );
  }, [expenses, search]);

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
          <div className="bg-white border border-[rgba(148,163,184,0.3)] rounded-xl shadow-card p-4">
            <p className="text-[11px] text-slate-400 uppercase font-semibold tracking-wide mb-1.5">Total TTC</p>
            <p className="text-2xl font-bold text-slate-900 tabular-nums">
              {fmt(expenses.reduce((s, e) => s + (e.amount || 0), 0))}
            </p>
          </div>
          <div className="bg-white border border-[rgba(148,163,184,0.3)] rounded-xl shadow-card p-4">
            <p className="text-[11px] text-slate-400 uppercase font-semibold tracking-wide mb-1.5">Total HT</p>
            <p className="text-2xl font-bold text-slate-900 tabular-nums">{fmt(totalHT)}</p>
          </div>
          <div className="bg-accent-50 border border-accent-100 rounded-xl shadow-card p-4">
            <p className="text-[11px] text-accent-600 uppercase font-semibold tracking-wide mb-1.5">TVA récupérable</p>
            <p className="text-2xl font-bold text-accent-700 tabular-nums">{fmt(vatRecoverable)}</p>
          </div>
          <button
            onClick={() => setAlertsOpen(true)}
            className={cn(
              'rounded-xl p-4 text-left border shadow-card transition-all duration-150',
              openCount > 0
                ? 'bg-warning-50 border-warning-200 hover:bg-warning-100'
                : 'bg-white border-[rgba(148,163,184,0.3)] hover:bg-slate-50'
            )}
          >
            <p className={cn('text-[11px] uppercase font-semibold tracking-wide mb-1.5', openCount > 0 ? 'text-warning-600' : 'text-slate-400')}>
              Alertes ouvertes
            </p>
            <div className="flex items-center gap-2">
              <p className={cn('text-2xl font-bold tabular-nums', openCount > 0 ? 'text-warning-700' : 'text-slate-300')}>
                {openCount}
              </p>
              {openCount > 0 && <AlertTriangle size={18} className="text-warning-500" />}
            </div>
          </button>
        </div>

        {/* Détail TVA par taux */}
        {vatRecoverable > 0 && (
          <div className="bg-accent-50 border border-accent-100 rounded-xl p-4">
            <p className="text-[11px] text-accent-700 font-semibold uppercase tracking-wide mb-3">Détail TVA récupérable par taux</p>
            <div className="flex flex-wrap gap-3">
              {Object.entries(vatSummary.byRate || {}).filter(([, v]) => v > 0).map(([rate, amount]) => (
                <div key={rate} className="bg-white rounded-lg px-4 py-2.5 border border-accent-100 shadow-xs">
                  <p className="text-[11px] text-accent-500 font-semibold">TVA {rate}%</p>
                  <p className="text-base font-bold text-accent-700 tabular-nums">{fmt(amount)}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Liste */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="text-sm font-semibold text-slate-800 flex-shrink-0">Liste des dépenses</h2>
              <div className="relative">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Description, fournisseur…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8 pr-8 h-8 w-52 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent placeholder:text-slate-400"
                />
                {search && (
                  <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    <X size={12} />
                  </button>
                )}
              </div>
              <Button size="sm" onClick={() => setModalOpen(true)} className="ml-auto">
                <Plus size={14} /> Nouvelle dépense
              </Button>
            </div>
          </CardHeader>
          <CardBody className="p-0">
            {isLoading ? (
              <SkeletonTable rows={5} cols={7} />
            ) : expenses.length === 0 ? (
              <EmptyState
                icon={Receipt}
                title="Aucune dépense enregistrée"
                description="Ajoutez vos dépenses pour suivre la TVA récupérable."
                action={() => setModalOpen(true)}
                actionLabel="Ajouter une dépense"
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50/80 border-b border-slate-100">
                    <tr>
                      <th className="text-left px-4 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Date</th>
                      <th className="text-left px-4 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Description</th>
                      <th className="text-left px-4 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Catégorie</th>
                      <th className="text-right px-4 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wide">HT</th>
                      <th className="text-right px-4 py-3 text-[11px] font-semibold text-accent-600 uppercase tracking-wide">TVA récup.</th>
                      <th className="text-right px-4 py-3 text-[11px] font-semibold text-danger-600 uppercase tracking-wide">TTC</th>
                      <th className="px-4 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Statut</th>
                      <th className="px-4 py-3" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredExpenses.map((exp) => {
                      const cat = CATEGORIES.find((c) => c.value === exp.category);
                      const st  = STATUS_CONFIG[exp.status] || STATUS_CONFIG.validated;
                      return (
                        <tr
                          key={exp._id}
                          onClick={() => openEdit(exp)}
                          className="row-accent hover:bg-slate-50/60 transition-colors cursor-pointer"
                        >
                          <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">{fmtDate(exp.date)}</td>
                          <td className="px-4 py-3 text-slate-900 font-medium">
                            <div>{exp.description}</div>
                            {exp.vendor && <div className="text-xs text-slate-400 mt-0.5">{exp.vendor}</div>}
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                              {cat?.label || exp.category}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right text-slate-600 tabular-nums">{fmt(exp.amountHT)}</td>
                          <td className="px-4 py-3 text-right font-semibold text-accent-600 tabular-nums">
                            {exp.vatRecoverable > 0
                              ? fmt(exp.vatRecoverable)
                              : <span className="text-slate-300">—</span>}
                          </td>
                          <td className="px-4 py-3 text-right font-semibold text-danger-700 tabular-nums">{fmt(exp.amount)}</td>
                          <td className="px-4 py-3">
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${st.color}`}>
                              {st.label}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={(e) => { e.stopPropagation(); openEdit(exp); }}
                                className="text-slate-400 hover:text-accent-500 p-1 rounded transition-colors"
                                title="Modifier"
                              >
                                <Pencil size={14} />
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); handleDelete(exp._id); }}
                                disabled={deleting === exp._id}
                                className="text-slate-400 hover:text-danger-500 p-1 rounded transition-colors"
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
