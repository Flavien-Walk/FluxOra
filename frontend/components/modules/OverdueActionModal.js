'use client';

import { useState } from 'react';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import { Wallet, Shield, ArrowRight } from 'lucide-react';

const fmt = (n) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n);

/* ─── Modale Financement (simulation Defacto) ─────────── */
function FinancingContent({ invoice, onConfirm, onCancel, loading }) {
  const max = invoice.total;
  const [amount, setAmount] = useState(max);
  const fees      = +(amount * 0.01).toFixed(2);
  const netAmount = +(amount - fees).toFixed(2);

  return (
    <div className="space-y-5">
      {/* En-tête partenaire */}
      <div className="flex items-start gap-3 p-3 bg-accent-50 rounded-xl border border-accent-100">
        <Wallet size={16} className="text-accent-600 mt-0.5 flex-shrink-0" />
        <div>
          <p className="text-sm font-semibold text-accent-800">Financement Defacto</p>
          <p className="text-xs text-accent-600 mt-0.5">
            Obtenez un avancement de trésorerie immédiat sur cette facture en attente.
          </p>
        </div>
      </div>

      {/* Slider montant */}
      <div>
        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
          Montant à débloquer
        </label>
        <input
          type="range"
          min={Math.round(max * 0.1)}
          max={max}
          step={10}
          value={amount}
          onChange={(e) => setAmount(Number(e.target.value))}
          className="w-full accent-accent-600 cursor-pointer"
        />
        <div className="flex justify-between text-xs text-slate-400 mt-1.5">
          <span>{fmt(max * 0.1)}</span>
          <span className="font-bold text-slate-700 text-sm">{fmt(amount)}</span>
          <span>{fmt(max)}</span>
        </div>
      </div>

      {/* Récapitulatif */}
      <div className="bg-slate-50 rounded-xl p-4 space-y-2.5 border border-slate-100">
        <div className="flex justify-between text-sm">
          <span className="text-slate-500">Montant demandé</span>
          <span className="font-semibold text-slate-800">{fmt(amount)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-slate-500">Frais de service (1%)</span>
          <span className="text-danger-600 font-medium">− {fmt(fees)}</span>
        </div>
        <div className="border-t border-slate-200 pt-2.5 flex justify-between">
          <span className="text-sm font-semibold text-slate-700">Montant net crédité</span>
          <span className="text-base font-bold text-success-700">{fmt(netAmount)}</span>
        </div>
      </div>

      <p className="text-xs text-slate-400 leading-relaxed">
        * Simulation. Le virement sera effectué sous 24 h ouvrées après validation par Defacto.
        Sans engagement.
      </p>

      <div className="flex gap-2 justify-end pt-1">
        <Button variant="secondary" size="sm" onClick={onCancel} disabled={loading}>
          Annuler
        </Button>
        <Button size="sm" loading={loading} onClick={() => onConfirm(amount)}>
          <Wallet size={13} /> Confirmer le financement
        </Button>
      </div>
    </div>
  );
}

/* ─── Modale Recouvrement (simulation Rubypayeur) ─────── */
const RECOVERY_STEPS = [
  {
    icon: '📞',
    label: 'Relance amiable',
    desc: 'Contact téléphonique + email de mise en demeure officielle',
  },
  {
    icon: '⚠️',
    label: 'Liste noire',
    desc: 'Inscription dans le fichier des mauvais payeurs Rubypayeur (visible par +12 000 entreprises)',
  },
  {
    icon: '⚖️',
    label: 'Injonction de payer',
    desc: 'Procédure juridique simplifiée auprès du tribunal compétent',
  },
];

function RecoveryContent({ invoice, onConfirm, onCancel, loading }) {
  return (
    <div className="space-y-5">
      {/* En-tête partenaire */}
      <div className="flex items-start gap-3 p-3 bg-purple-50 rounded-xl border border-purple-100">
        <Shield size={16} className="text-purple-600 mt-0.5 flex-shrink-0" />
        <div>
          <p className="text-sm font-semibold text-purple-800">Recouvrement Rubypayeur</p>
          <p className="text-xs text-purple-600 mt-0.5">
            Procédure progressive pour récupérer votre créance de{' '}
            <strong>{fmt(invoice.total)}</strong>.
          </p>
        </div>
      </div>

      {/* Étapes */}
      <div>
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">
          Procédure en 3 étapes
        </p>
        <div className="space-y-2">
          {RECOVERY_STEPS.map((step, i) => (
            <div
              key={i}
              className="flex items-start gap-3 p-3 bg-white border border-slate-100 rounded-xl"
            >
              <span className="text-lg leading-none mt-0.5">{step.icon}</span>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                    Étape {i + 1}
                  </span>
                  {i < RECOVERY_STEPS.length - 1 && (
                    <ArrowRight size={9} className="text-slate-300" />
                  )}
                </div>
                <p className="text-sm font-semibold text-slate-800">{step.label}</p>
                <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Commission */}
      <div className="flex items-center justify-between bg-purple-50 border border-purple-100 rounded-xl px-4 py-3">
        <div>
          <p className="text-sm font-semibold text-purple-800">Commission au succès</p>
          <p className="text-xs text-purple-500 mt-0.5">Aucun frais si non-recouvrement</p>
        </div>
        <span className="text-2xl font-black text-purple-700">10%</span>
      </div>

      <div className="flex gap-2 justify-end pt-1">
        <Button variant="secondary" size="sm" onClick={onCancel} disabled={loading}>
          Annuler
        </Button>
        <Button variant="danger" size="sm" loading={loading} onClick={onConfirm}>
          <Shield size={13} /> Lancer la procédure
        </Button>
      </div>
    </div>
  );
}

/* ─── Export principal ─────────────────────────────────── */
export default function OverdueActionModal({ open, onClose, type, invoice, onSuccess }) {
  const [loading, setLoading] = useState(false);

  if (!invoice) return null;

  const handleFinancing = async (amount) => {
    setLoading(true);
    try {
      // Simulation appel API — en production: api.post(`/api/invoices/${invoice._id}/financing`, { amount })
      await new Promise((r) => setTimeout(r, 900));
      onSuccess('financing');
    } finally {
      setLoading(false);
      onClose();
    }
  };

  const handleRecovery = async () => {
    setLoading(true);
    try {
      // Simulation appel API — en production: api.post(`/api/invoices/${invoice._id}/recovery`)
      await new Promise((r) => setTimeout(r, 900));
      onSuccess('recovery');
    } finally {
      setLoading(false);
      onClose();
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={type === 'financing' ? 'Financement instantané' : 'Recouvrement amiable'}
      size="sm"
    >
      {type === 'financing' ? (
        <FinancingContent
          invoice={invoice}
          onConfirm={handleFinancing}
          onCancel={onClose}
          loading={loading}
        />
      ) : (
        <RecoveryContent
          invoice={invoice}
          onConfirm={handleRecovery}
          onCancel={onClose}
          loading={loading}
        />
      )}
    </Modal>
  );
}
