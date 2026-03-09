'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import useSWR from 'swr';
import api from '@/lib/api';
import Header from '@/components/layout/Header';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { Building2, User, CheckCircle, AlertCircle } from 'lucide-react';

const fetcher = (url) => api.get(url).then((r) => r.data);

const PLAN_LABELS = { free: 'Gratuit', pro: 'Pro', enterprise: 'Enterprise' };
const PLAN_COLORS = {
  free:       'bg-gray-100 text-gray-600',
  pro:        'bg-indigo-100 text-indigo-700',
  enterprise: 'bg-purple-100 text-purple-700',
};

const inputCls = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500';

export default function SettingsPage() {
  const { user } = useUser();
  const { data: org, mutate } = useSWR('/api/organizations/me', fetcher);

  const [form, setForm] = useState({
    name:      '',
    email:     '',
    phone:     '',
    address:   '',
    vatNumber: '',
    siret:     '',
    currency:  'EUR',
  });
  const [saving,   setSaving]   = useState(false);
  const [saved,    setSaved]    = useState(false);
  const [error,    setError]    = useState('');

  // Pré-remplit le formulaire dès que l'org est chargée
  useEffect(() => {
    if (org) {
      setForm({
        name:      org.name      || '',
        email:     org.email     || '',
        phone:     org.phone     || '',
        address:   org.address   || '',
        vatNumber: org.vatNumber || '',
        siret:     org.siret     || '',
        currency:  org.currency  || 'EUR',
      });
    }
  }, [org]);

  const handleChange = (e) =>
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSaved(false);
    try {
      await api.put(`/api/organizations/${org._id}`, form);
      await mutate();
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Erreur lors de la sauvegarde.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Header title="Paramètres" />
      <div className="flex-1 p-6 max-w-2xl space-y-6">

        {/* Profil utilisateur (Clerk) */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <User size={16} className="text-gray-500" />
              <h2 className="text-sm font-semibold text-gray-700">Profil utilisateur</h2>
            </div>
          </CardHeader>
          <CardBody>
            {user ? (
              <div className="flex items-center gap-4">
                {user.imageUrl && (
                  <img
                    src={user.imageUrl}
                    alt="Avatar"
                    className="w-12 h-12 rounded-full border border-gray-200"
                  />
                )}
                <div>
                  <p className="text-sm font-semibold text-gray-900">
                    {user.fullName || user.firstName || '—'}
                  </p>
                  <p className="text-sm text-gray-500">
                    {user.primaryEmailAddress?.emailAddress || '—'}
                  </p>
                </div>
                <div className="ml-auto">
                  <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium">
                    Compte actif
                  </span>
                </div>
              </div>
            ) : (
              <div className="h-12 bg-gray-100 rounded-lg animate-pulse" />
            )}
          </CardBody>
        </Card>

        {/* Organisation */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Building2 size={16} className="text-gray-500" />
                <h2 className="text-sm font-semibold text-gray-700">Organisation</h2>
              </div>
              {org && (
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${PLAN_COLORS[org.plan] || PLAN_COLORS.free}`}>
                  Plan {PLAN_LABELS[org.plan] || org.plan}
                </span>
              )}
            </div>
          </CardHeader>
          <CardBody>
            {!org ? (
              <div className="space-y-3">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-10 bg-gray-100 rounded-lg animate-pulse" />
                ))}
              </div>
            ) : (
              <form onSubmit={handleSave} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nom de l'organisation <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={form.name}
                    onChange={handleChange}
                    required
                    placeholder="Ex: Fluxora SAS"
                    className={inputCls}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email de contact</label>
                    <input
                      type="email"
                      name="email"
                      value={form.email}
                      onChange={handleChange}
                      placeholder="contact@monentreprise.fr"
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Téléphone</label>
                    <input
                      type="tel"
                      name="phone"
                      value={form.phone}
                      onChange={handleChange}
                      placeholder="+33 6 00 00 00 00"
                      className={inputCls}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Adresse</label>
                  <input
                    type="text"
                    name="address"
                    value={form.address}
                    onChange={handleChange}
                    placeholder="12 rue de la Paix, 75001 Paris"
                    className={inputCls}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">N° TVA intracommunautaire</label>
                    <input
                      type="text"
                      name="vatNumber"
                      value={form.vatNumber}
                      onChange={handleChange}
                      placeholder="FR 00 000000000"
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">SIRET</label>
                    <input
                      type="text"
                      name="siret"
                      value={form.siret}
                      onChange={handleChange}
                      placeholder="000 000 000 00000"
                      className={inputCls}
                    />
                  </div>
                </div>

                <div className="w-40">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Devise</label>
                  <select
                    name="currency"
                    value={form.currency}
                    onChange={handleChange}
                    className={inputCls}
                  >
                    <option value="EUR">EUR — Euro</option>
                    <option value="USD">USD — Dollar</option>
                    <option value="GBP">GBP — Livre sterling</option>
                    <option value="CHF">CHF — Franc suisse</option>
                  </select>
                </div>

                {/* Feedback */}
                {saved && (
                  <div className="flex items-center gap-2 text-green-700 bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-sm">
                    <CheckCircle size={16} />
                    Modifications enregistrées avec succès.
                  </div>
                )}
                {error && (
                  <div className="flex items-center gap-2 text-red-700 bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm">
                    <AlertCircle size={16} />
                    {error}
                  </div>
                )}

                <div className="flex justify-end pt-2">
                  <Button type="submit" loading={saving}>
                    Enregistrer les modifications
                  </Button>
                </div>
              </form>
            )}
          </CardBody>
        </Card>

        {/* Membres */}
        {org?.members?.length > 0 && (
          <Card>
            <CardHeader>
              <h2 className="text-sm font-semibold text-gray-700">Membres de l'organisation</h2>
            </CardHeader>
            <CardBody className="p-0">
              <ul className="divide-y divide-gray-100">
                {org.members.map((m) => (
                  <li key={m.clerkUserId} className="flex items-center justify-between px-6 py-3">
                    <p className="text-xs text-gray-700 font-mono">{m.clerkUserId}</p>
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full capitalize">
                      {m.role}
                    </span>
                  </li>
                ))}
              </ul>
            </CardBody>
          </Card>
        )}
      </div>
    </>
  );
}
