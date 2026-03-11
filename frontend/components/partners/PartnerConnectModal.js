'use client';

import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { X, Zap, CheckCircle2, ArrowRight } from 'lucide-react';

const STEPS = [
  'Vérification des identifiants...',
  'Établissement de la connexion sécurisée...',
  'Synchronisation des données...',
  'Configuration des flux automatiques...',
];

export default function PartnerConnectModal({ partner, open, onClose, onConnected }) {
  const [phase, setPhase] = useState('idle'); // idle | connecting | done
  const [stepIdx, setStepIdx] = useState(0);

  // Reset on open
  useEffect(() => {
    if (open) { setPhase('idle'); setStepIdx(0); }
  }, [open]);

  const handleConnect = () => {
    setPhase('connecting');
    setStepIdx(0);

    let idx = 0;
    const interval = setInterval(() => {
      idx++;
      if (idx < STEPS.length) {
        setStepIdx(idx);
      } else {
        clearInterval(interval);
        setTimeout(() => {
          setPhase('done');
          onConnected?.(partner.id);
        }, 400);
      }
    }, 600);
  };

  if (!open || !partner) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={phase === 'idle' ? onClose : undefined}
      />

      {/* Modal */}
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-lg overflow-hidden animate-fade-up">

        {/* Top banner */}
        <div className={cn('h-20 bg-gradient-to-br flex items-center justify-center', partner.gradient)}>
          <span className="text-white text-lg font-bold drop-shadow-sm">{partner.name}</span>
        </div>

        {/* Close */}
        {phase !== 'connecting' && (
          <button
            onClick={onClose}
            className="absolute top-3 right-3 w-7 h-7 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
          >
            <X size={14} className="text-white" />
          </button>
        )}

        <div className="p-6">
          {/* — IDLE — */}
          {phase === 'idle' && (
            <>
              <h2 className="text-base font-semibold text-slate-800 mb-1">
                Connecter {partner.name} à Fluxora
              </h2>
              <p className="text-sm text-slate-500 mb-5 leading-relaxed">
                {partner.integration.description}
              </p>

              {/* Actions preview */}
              {partner.integration.actions.length > 0 && (
                <div className="bg-slate-50 rounded-xl p-4 mb-5 space-y-2">
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400 mb-2">Ce qui sera automatisé</p>
                  {partner.integration.actions.map((action) => (
                    <div key={action} className="flex items-center gap-2 text-sm text-slate-600">
                      <Zap size={12} className="text-accent-500 flex-shrink-0" />
                      <span>{ACTION_LABELS[action] || action}</span>
                    </div>
                  ))}
                </div>
              )}

              <button
                onClick={handleConnect}
                className="w-full flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-700 text-white text-sm font-semibold py-2.5 rounded-xl transition-colors"
              >
                Connecter <ArrowRight size={14} />
              </button>
              <p className="text-center text-xs text-slate-400 mt-3">
                Simulation MVP — aucune donnée réelle n'est échangée
              </p>
            </>
          )}

          {/* — CONNECTING — */}
          {phase === 'connecting' && (
            <div className="text-center py-2">
              <div className="w-10 h-10 border-2 border-accent-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-sm font-medium text-slate-800 mb-4">Connexion en cours...</p>
              <div className="space-y-2 text-left">
                {STEPS.map((step, i) => (
                  <div key={i} className={cn(
                    'flex items-center gap-2.5 text-xs transition-all duration-300',
                    i < stepIdx  ? 'text-success-600' :
                    i === stepIdx ? 'text-slate-700 font-medium' :
                    'text-slate-300',
                  )}>
                    <span className={cn(
                      'w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 border',
                      i < stepIdx   ? 'bg-success-500 border-success-500 text-white' :
                      i === stepIdx ? 'border-accent-500 animate-pulse' :
                      'border-slate-200',
                    )}>
                      {i < stepIdx && <span>✓</span>}
                    </span>
                    {step}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* — DONE — */}
          {phase === 'done' && (
            <div className="text-center py-2">
              <div className="w-12 h-12 bg-success-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 size={24} className="text-success-500" />
              </div>
              <h3 className="text-base font-semibold text-slate-800 mb-1">Service connecté !</h3>
              <p className="text-sm text-slate-500 mb-5">
                {partner.name} est maintenant intégré à Fluxora.
                {partner.integration.actions.length > 0 && ' La synchronisation automatique est active.'}
              </p>
              <button
                onClick={onClose}
                className="w-full flex items-center justify-center gap-2 bg-accent-600 hover:bg-accent-700 text-white text-sm font-semibold py-2.5 rounded-xl transition-colors"
              >
                Parfait <Zap size={13} fill="currentColor" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const ACTION_LABELS = {
  sync_transactions:    'Synchronisation des transactions',
  generate_invoice:     'Création automatique de factures',
  track_refunds:        'Suivi des remboursements',
  sync_bank_statements: 'Import des relevés bancaires',
  auto_categorize:      'Catégorisation automatique',
  export_accounting:    'Export comptable',
  sync_payments:        'Synchronisation des paiements',
  import_orders:        'Import des commandes',
};
