'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { useClients } from '@/hooks/useClients';
import Button from '@/components/ui/Button';
import { Plus, Trash2 } from 'lucide-react';

const EMPTY_LINE = { description: '', quantity: 1, unitPrice: 0, vatRate: 20 };

const calcLine = (l) => {
  const ht = l.quantity * l.unitPrice;
  return { ht, tva: ht * (l.vatRate / 100), ttc: ht * (1 + l.vatRate / 100) };
};

export default function InvoiceForm({ invoice, onSuccess, onCancel }) {
  const { clients } = useClients();
  const isEdit = !!invoice;

  const [clientId, setClientId] = useState(invoice?.clientId?._id || invoice?.clientId || '');
  const [lines, setLines] = useState(invoice?.lines?.length ? invoice.lines : [{ ...EMPTY_LINE }]);
  const [dueDate, setDueDate] = useState(
    invoice?.dueDate ? invoice.dueDate.slice(0, 10) : ''
  );
  const [notes, setNotes] = useState(invoice?.notes || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Totaux calculés côté client (miroir du pre-save Mongoose)
  const totals = lines.reduce(
    (acc, l) => {
      const { ht, tva, ttc } = calcLine(l);
      return { ht: acc.ht + ht, tva: acc.tva + tva, ttc: acc.ttc + ttc };
    },
    { ht: 0, tva: 0, ttc: 0 }
  );

  const setLine = (i, field, value) => {
    setLines((prev) => {
      const next = [...prev];
      next[i] = { ...next[i], [field]: field === 'description' ? value : Number(value) };
      return next;
    });
  };

  const addLine = () => setLines((p) => [...p, { ...EMPTY_LINE }]);

  const removeLine = (i) => {
    if (lines.length === 1) return;
    setLines((p) => p.filter((_, idx) => idx !== i));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!clientId) { setError('Sélectionnez un client.'); return; }
    if (lines.some((l) => !l.description.trim())) {
      setError('Chaque ligne doit avoir une description.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const payload = { clientId, lines, dueDate: dueDate || undefined, notes };
      if (isEdit) {
        await api.put(`/api/invoices/${invoice._id}`, payload);
      } else {
        await api.post('/api/invoices', payload);
      }
      onSuccess?.();
    } catch (err) {
      setError(err.response?.data?.error || 'Erreur lors de la sauvegarde.');
    } finally {
      setLoading(false);
    }
  };

  const fmt = (n) =>
    new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n);

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Client + échéance */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Client *</label>
          <select
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">— Sélectionner un client —</option>
            {clients.map((c) => (
              <option key={c._id} value={c._id}>
                {c.name}{c.company ? ` (${c.company})` : ''}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Date d'échéance
          </label>
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* Lignes de facture */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium text-gray-700">Prestations *</label>
          <button
            type="button"
            onClick={addLine}
            className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 font-medium"
          >
            <Plus size={13} /> Ajouter une ligne
          </button>
        </div>

        {/* En-tête tableau */}
        <div className="hidden sm:grid grid-cols-12 gap-2 text-xs font-medium text-gray-500 uppercase mb-1 px-1">
          <span className="col-span-5">Description</span>
          <span className="col-span-2 text-center">Qté</span>
          <span className="col-span-2 text-center">PU HT (€)</span>
          <span className="col-span-2 text-center">TVA %</span>
          <span className="col-span-1" />
        </div>

        <div className="space-y-2">
          {lines.map((line, i) => (
            <div key={i} className="grid grid-cols-12 gap-2 items-center">
              <input
                className="col-span-5 border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Description de la prestation"
                value={line.description}
                onChange={(e) => setLine(i, 'description', e.target.value)}
              />
              <input
                type="number" min="0.01" step="0.01"
                className="col-span-2 border border-gray-300 rounded-lg px-2 py-1.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={line.quantity}
                onChange={(e) => setLine(i, 'quantity', e.target.value)}
              />
              <input
                type="number" min="0" step="0.01"
                className="col-span-2 border border-gray-300 rounded-lg px-2 py-1.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={line.unitPrice}
                onChange={(e) => setLine(i, 'unitPrice', e.target.value)}
              />
              <select
                className="col-span-2 border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={line.vatRate}
                onChange={(e) => setLine(i, 'vatRate', e.target.value)}
              >
                <option value={0}>0%</option>
                <option value={5.5}>5.5%</option>
                <option value={10}>10%</option>
                <option value={20}>20%</option>
              </select>
              <button
                type="button"
                onClick={() => removeLine(i)}
                disabled={lines.length === 1}
                className="col-span-1 flex justify-center text-gray-400 hover:text-red-500 disabled:opacity-30 transition-colors"
              >
                <Trash2 size={15} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Totaux */}
      <div className="bg-gray-50 rounded-xl p-4 space-y-1 text-sm">
        <div className="flex justify-between text-gray-600">
          <span>Total HT</span><span>{fmt(totals.ht)}</span>
        </div>
        <div className="flex justify-between text-gray-600">
          <span>TVA</span><span>{fmt(totals.tva)}</span>
        </div>
        <div className="flex justify-between font-bold text-gray-900 text-base pt-2 border-t border-gray-200">
          <span>Total TTC</span><span>{fmt(totals.ttc)}</span>
        </div>
      </div>

      {/* Notes */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
        <textarea
          rows={2}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Conditions de paiement, mentions légales..."
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
        />
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
      )}

      <div className="flex justify-end gap-3 pt-1">
        {onCancel && (
          <Button type="button" variant="secondary" onClick={onCancel}>Annuler</Button>
        )}
        <Button type="submit" loading={loading}>
          {isEdit ? 'Enregistrer' : 'Créer la facture'}
        </Button>
      </div>
    </form>
  );
}
