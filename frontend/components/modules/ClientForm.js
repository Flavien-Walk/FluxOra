'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import Button from '@/components/ui/Button';

const EMPTY = {
  name: '', email: '', phone: '', company: '',
  address: '', city: '', country: 'France', vatNumber: '', notes: '',
};

export default function ClientForm({ client, initialValues, onSuccess, onCancel }) {
  const [form, setForm] = useState(EMPTY);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const isEdit = !!client;

  useEffect(() => {
    if (client) {
      setForm({ ...EMPTY, ...client });
      return;
    }
    if (initialValues) {
      setForm({ ...EMPTY, ...initialValues });
      return;
    }
    setForm(EMPTY);
  }, [client, initialValues]);

  const set = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      let response;
      if (isEdit) {
        response = await api.put(`/api/clients/${client._id}`, form);
      } else {
        response = await api.post('/api/clients', form);
      }
      onSuccess?.(response?.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Erreur lors de la sauvegarde.');
    } finally {
      setLoading(false);
    }
  };

  const field = (name, label, type = 'text', placeholder = '') => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input
        name={name}
        type={type}
        value={form[name]}
        onChange={set}
        placeholder={placeholder}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
      />
    </div>
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Nom complet *
          </label>
          <input
            name="name"
            required
            value={form.name}
            onChange={set}
            placeholder="Jean Dupont"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        {field('company', 'Entreprise', 'text', 'Acme SAS')}
        {field('email', 'Email', 'email', 'jean@acme.fr')}
        {field('phone', 'Téléphone', 'tel', '+33 6 00 00 00 00')}
      </div>

      {field('address', 'Adresse', 'text', '12 rue de la Paix')}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {field('city', 'Ville', 'text', 'Paris')}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Pays</label>
          <select
            name="country"
            value={form.country}
            onChange={set}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="France">France</option>
            <option value="Belgique">Belgique</option>
            <option value="Suisse">Suisse</option>
            <option value="Luxembourg">Luxembourg</option>
            <option value="Canada">Canada</option>
          </select>
        </div>
      </div>

      {field('vatNumber', 'N° TVA intracommunautaire', 'text', 'FR12345678901')}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
        <textarea
          name="notes"
          value={form.notes}
          onChange={set}
          rows={3}
          placeholder="Informations complémentaires..."
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
        />
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
      )}

      <div className="flex justify-end gap-3 pt-2">
        {onCancel && (
          <Button type="button" variant="secondary" onClick={onCancel}>
            Annuler
          </Button>
        )}
        <Button type="submit" loading={loading}>
          {isEdit ? 'Enregistrer' : 'Créer le client'}
        </Button>
      </div>
    </form>
  );
}
