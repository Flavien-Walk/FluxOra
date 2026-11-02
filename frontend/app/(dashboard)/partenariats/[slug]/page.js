'use client';

import { use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { usePartnerConnections } from '@/hooks/usePartnerConnections';
import { getPartnerBySlug } from '@/data/partners';
import PartnerConnectModal from '@/components/partners/PartnerConnectModal';
import Header from '@/components/layout/Header';
import { useState } from 'react';
import {
  ArrowLeft, Check, Zap, Plug, CheckCircle2, Clock, ExternalLink
} from 'lucide-react';

const ACTION_LABELS = {
  sync_transactions:    'Synchronisation des transactions',
  generate_invoice:     'Création automatique de factures',
  track_refunds:        'Suivi des remboursements',
  sync_bank_statements: 'Import des relevés bancaires',
  auto_categorize:      'Catégorisation automatique des dépenses',
  export_accounting:    'Export comptable en un clic',
  sync_payments:        'Synchronisation des paiements',
  import_orders:        'Import des commandes',
};

const MODULE_LABELS = {
  sync_transactions:    'Transactions',
  generate_invoice:     'Factures',
  track_refunds:        'Transactions',
  sync_bank_statements: 'Comptabilité',
  auto_categorize:      'Dépenses',
  export_accounting:    'Comptabilité',
  sync_payments:        'Transactions',
  import_orders:        'Factures',
};

export default function PartnerDetailPage({ params }) {
  const { slug } = use(params);
  const router   = useRouter();
  const partner  = getPartnerBySlug(slug);

  const { isConnected, connect }    = usePartnerConnections();
  const [modalOpen, setModalOpen]   = useState(false);

  if (!partner) {
    return (
      <>
        <Header title="Partenaire introuvable" />
        <div className="flex-1 p-6 flex flex-col items-center justify-center gap-4">
          <p className="text-slate-500">Ce partenaire n'existe pas.</p>
          <Link href="/partenariats" className="text-sm text-accent-600 hover:underline">
            ← Retour aux partenariats
          </Link>
        </div>
      </>
    );
  }

  const connected  = isConnected(partner.id);
  const canConnect = partner.integration.status === 'mock';
  const comingSoon = partner.integration.status === 'coming_soon';

  const handleConnected = (id) => {
    connect(id);
    setTimeout(() => setModalOpen(false), 1800);
  };

  return (
    <>
      <Header title={partner.name} />

      <div className="flex-1 p-6 max-w-3xl space-y-6">

        {/* Back */}
        <Link
          href="/partenariats"
          className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-600 transition-colors"
        >
          <ArrowLeft size={13} /> Retour aux partenariats
        </Link>

        {/* Header card */}
        <div className="bg-white border border-slate-100 rounded-xl overflow-hidden shadow-card">
          <div className={cn('h-32 bg-gradient-to-br flex items-center justify-center', partner.gradient)}>
            <span className="text-white text-2xl font-bold drop-shadow-sm">{partner.name}</span>
          </div>
          <div className="p-5 flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-base font-semibold text-slate-800 mb-1">{partner.tagline}</h1>
              <p className="text-sm text-slate-500 leading-relaxed max-w-md">{partner.longDescription}</p>
            </div>
            <div className="flex items-center gap-3 flex-shrink-0">
              <span className="text-sm font-bold text-accent-700 bg-accent-50 px-3 py-1.5 rounded-lg border border-accent-100">
                {partner.offer}
              </span>
              {connected ? (
                <span className="flex items-center gap-1.5 bg-success-50 border border-success-200 text-success-700 text-xs font-semibold px-3 py-1.5 rounded-lg">
                  <CheckCircle2 size={13} /> Connecté
                </span>
              ) : canConnect ? (
                <button
                  onClick={() => setModalOpen(true)}
                  className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-700 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors"
                >
                  <Plug size={13} /> Connecter ce service
                </button>
              ) : (
                <span className="flex items-center gap-1.5 bg-amber-50 border border-amber-200 text-amber-700 text-xs font-semibold px-3 py-1.5 rounded-lg">
                  <Clock size={12} /> Bientôt disponible
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Two columns */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          {/* Features */}
          <div className="bg-white border border-slate-100 rounded-xl p-5 shadow-card">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400 mb-4">
              Fonctionnalités
            </p>
            <ul className="space-y-3">
              {partner.features.map((f) => (
                <li key={f} className="flex items-start gap-2.5 text-sm text-slate-600">
                  <Check size={13} className="text-success-500 flex-shrink-0 mt-0.5" strokeWidth={2.5} />
                  <span className="leading-snug">{f}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Integration */}
          <div className="bg-white border border-slate-100 rounded-xl p-5 shadow-card">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400 mb-4">
              Intégration Fluxora
            </p>

            {comingSoon ? (
              <div className="flex flex-col items-center justify-center py-6 text-center">
                <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center mb-3">
                  <Clock size={18} className="text-amber-500" />
                </div>
                <p className="text-sm font-medium text-slate-700">Intégration à venir</p>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed max-w-xs">
                  {partner.integration.description}
                </p>
              </div>
            ) : (
              <>
                <p className="text-xs text-slate-500 mb-4 leading-relaxed">
                  {partner.integration.description}
                </p>
                {partner.integration.actions.length > 0 && (
                  <ul className="space-y-2.5">
                    {partner.integration.actions.map((action) => (
                      <li key={action} className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                          <Zap size={12} className="text-accent-500 flex-shrink-0" />
                          <span>{ACTION_LABELS[action] || action}</span>
                        </div>
                        <span className="text-[10px] font-semibold text-slate-400 bg-slate-50 border border-slate-100 px-2 py-0.5 rounded-full">
                          {MODULE_LABELS[action]}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}
          </div>
        </div>

        {/* How it works */}
        {canConnect && (
          <div className="bg-slate-50 border border-slate-100 rounded-xl p-5">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400 mb-4">
              Comment ça marche
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { step: '1', title: 'Connectez', desc: 'Autorisez Fluxora à accéder à votre compte ' + partner.name },
                { step: '2', title: 'Synchronisez', desc: 'Vos données remontent automatiquement dans Fluxora' },
                { step: '3', title: 'Automatisez', desc: 'Factures, transactions et rapports se génèrent seuls' },
              ].map(({ step, title, desc }) => (
                <div key={step} className="text-center">
                  <div className="w-8 h-8 rounded-full bg-slate-900 text-white text-sm font-bold flex items-center justify-center mx-auto mb-2">
                    {step}
                  </div>
                  <p className="text-sm font-semibold text-slate-700 mb-1">{title}</p>
                  <p className="text-xs text-slate-400 leading-relaxed">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* CTA */}
        {!connected && (
          <div className={cn(
            'rounded-xl p-5 flex items-center justify-between gap-4 flex-wrap',
            canConnect ? 'bg-slate-900' : 'bg-slate-100 border border-slate-200',
          )}>
            <div>
              <p className={cn('text-sm font-semibold mb-0.5', canConnect ? 'text-white' : 'text-slate-600')}>
                {canConnect ? `Prêt à connecter ${partner.name} ?` : 'Intégration à venir'}
              </p>
              <p className={cn('text-xs', canConnect ? 'text-slate-400' : 'text-slate-400')}>
                {canConnect
                  ? 'La synchronisation sera immédiatement active après connexion.'
                  : 'Cette intégration sera disponible prochainement.'}
              </p>
            </div>
            {canConnect ? (
              <button
                onClick={() => setModalOpen(true)}
                className="flex items-center gap-2 bg-white hover:bg-slate-100 text-slate-900 text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors flex-shrink-0"
              >
                <Plug size={14} /> Connecter maintenant
              </button>
            ) : (
              <span className="flex items-center gap-2 bg-white text-amber-600 text-sm font-semibold px-5 py-2.5 rounded-xl border border-amber-200 flex-shrink-0">
                <Clock size={14} /> Prochainement
              </span>
            )}
          </div>
        )}

        {connected && (
          <div className="bg-success-50 border border-success-200 rounded-xl p-5 flex items-center gap-3">
            <CheckCircle2 size={20} className="text-success-500 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-success-800">{partner.name} est connecté</p>
              <p className="text-xs text-success-600 mt-0.5">
                La synchronisation automatique est active. Vos données remontent dans Fluxora.
              </p>
            </div>
          </div>
        )}
      </div>

      <PartnerConnectModal
        partner={partner}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onConnected={handleConnected}
      />
    </>
  );
}
