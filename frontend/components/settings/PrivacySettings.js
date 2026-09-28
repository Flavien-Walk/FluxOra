'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { ShieldCheck, Download, Trash2 } from 'lucide-react';
import api from '@/lib/api';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { cn } from '@/lib/utils';

function Toggle({ id, checked, onChange, disabled, label, description }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <label htmlFor={id} className="text-sm font-medium text-slate-800">{label}</label>
        <p id={`${id}-desc`} className="text-xs text-slate-500 mt-0.5">{description}</p>
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-describedby={`${id}-desc`}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors disabled:opacity-50',
          checked ? 'bg-accent-600' : 'bg-slate-300'
        )}
      >
        <span className={cn('inline-block h-5 w-5 rounded-full bg-white shadow transition-transform', checked ? 'translate-x-5' : 'translate-x-0.5')} />
      </button>
    </div>
  );
}

/**
 * Paramètres de confidentialité : suivi des emails, IA, export (art. 20) et suppression (art. 17).
 */
export default function PrivacySettings({ org, isOwner, onChange }) {
  const [saving, setSaving] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [confirmName, setConfirmName] = useState('');
  const [deleting, setDeleting] = useState(false);

  const update = async (field, value) => {
    setSaving(field);
    try {
      await api.put(`/api/organizations/${org._id}`, { [field]: value });
      await onChange();
      toast.success('Préférence enregistrée.');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Enregistrement impossible.');
    } finally {
      setSaving(null);
    }
  };

  const exportData = async () => {
    setExporting(true);
    try {
      const { data } = await api.get('/api/organizations/me/export');
      const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `fluxora-export-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Export téléchargé.');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Export impossible.');
    } finally {
      setExporting(false);
    }
  };

  const deleteOrg = async () => {
    setDeleting(true);
    try {
      await api.delete('/api/organizations/me', { data: { confirm: confirmName } });
      toast.success('Organisation supprimée.');
      window.location.href = '/onboarding';
    } catch (err) {
      toast.error(err.response?.data?.error || 'Suppression impossible.');
      setDeleting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <ShieldCheck size={16} className="text-slate-500" />
          <h2 className="text-sm font-semibold text-slate-900">Confidentialité & données</h2>
        </div>
      </CardHeader>
      <CardBody className="space-y-6">
        <Toggle
          id="privacy-email-tracking"
          checked={Boolean(org.emailTrackingEnabled)}
          disabled={saving === 'emailTrackingEnabled'}
          onChange={(v) => update('emailTrackingEnabled', v)}
          label="Suivi d’ouverture des emails"
          description="Ajoute un pixel invisible aux devis et factures envoyés pour savoir s’ils ont été ouverts. Si vous l’activez, informez-en vos clients."
        />
        <Toggle
          id="privacy-ai"
          checked={org.aiEnabled !== false}
          disabled={saving === 'aiEnabled'}
          onChange={(v) => update('aiEnabled', v)}
          label="Assistant IA"
          description="Lorsqu’il est activé, vos questions et les données utiles (clients, factures) sont envoyées au modèle Claude d’Anthropic (États-Unis) pour préparer les réponses."
        />

        <div className="border-t border-slate-100 pt-5 space-y-2">
          <p className="text-sm font-medium text-slate-800">Exporter mes données</p>
          <p className="text-xs text-slate-500">Toutes les données de l’organisation au format JSON (portabilité, art. 20 RGPD).</p>
          <Button variant="secondary" size="sm" onClick={exportData} loading={exporting}>
            <Download size={14} /> Télécharger l’export
          </Button>
        </div>

        {isOwner && (
          <div className="border-t border-slate-100 pt-5 space-y-2">
            <p className="text-sm font-medium text-danger-600">Supprimer l’organisation</p>
            <p className="text-xs text-slate-500">
              Suppression définitive de toutes les données (clients, factures, dépenses…). Exportez d’abord vos pièces
              comptables : la loi impose de les conserver 10 ans.
            </p>
            <label htmlFor="privacy-delete-confirm" className="block text-xs text-slate-600">
              Pour confirmer, saisissez le nom de l’organisation : <strong>{org.name}</strong>
            </label>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                id="privacy-delete-confirm"
                value={confirmName}
                onChange={(e) => setConfirmName(e.target.value)}
                autoComplete="off"
                className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-danger-500"
              />
              <Button variant="danger" size="sm" onClick={deleteOrg} loading={deleting} disabled={confirmName.trim() !== org.name}>
                <Trash2 size={14} /> Supprimer définitivement
              </Button>
            </div>
          </div>
        )}
      </CardBody>
    </Card>
  );
}
