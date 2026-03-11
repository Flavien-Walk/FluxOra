'use client';

import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Check, ArrowRight, Plug, Zap } from 'lucide-react';

const OFFER_STYLES = {
  reduction:      'bg-white/20 text-white backdrop-blur-sm',
  mois_offerts:   'bg-white/20 text-white backdrop-blur-sm',
  gratuit:        'bg-emerald-500/80 text-white',
  tarif_negocie:  'bg-amber-400/80 text-amber-900',
};

const CAT_LABELS = {
  paiement:      'Paiement',
  banque:        'Banque',
  assurance:     'Assurance',
  communication: 'Communication',
  informatique:  'Informatique',
  comptabilite:  'Comptabilité',
  formation:     'Formation',
  domiciliation: 'Domiciliation',
  automobile:    'Automobile',
};

export default function PartnerCard({ partner, isConnected, onConnect }) {
  const canConnect  = partner.integration.status === 'mock';
  const comingSoon  = partner.integration.status === 'coming_soon';

  return (
    <div className={cn(
      'bg-white rounded-xl border overflow-hidden flex flex-col',
      'transition-all duration-200 hover:-translate-y-0.5',
      isConnected ? 'border-accent-200 shadow-[0_0_0_2px_rgba(28,110,242,0.12),0_4px_14px_rgba(0,0,0,0.06)]' : 'border-slate-100 shadow-card hover:border-slate-200',
    )}>

      {/* Banner */}
      <div className={cn('relative h-24 bg-gradient-to-br flex items-center justify-center', partner.gradient)}>
        <span className="text-white text-xl font-bold tracking-tight drop-shadow-sm select-none">
          {partner.name}
        </span>

        {/* Offer badge */}
        <span className={cn(
          'absolute bottom-2.5 right-3 text-[11px] font-bold px-2.5 py-1 rounded-full',
          OFFER_STYLES[partner.offerType] || OFFER_STYLES.reduction,
        )}>
          {partner.offer}
        </span>

        {/* Connected indicator */}
        {isConnected && (
          <span className="absolute top-2.5 right-3 flex items-center gap-1 bg-white/90 text-accent-700 text-[10px] font-semibold px-2 py-0.5 rounded-full">
            <Zap size={9} fill="currentColor" /> Connecté
          </span>
        )}
      </div>

      {/* Body */}
      <div className="flex flex-col flex-1 p-4 gap-3">

        {/* Title + category */}
        <div>
          <div className="flex items-start justify-between gap-2 mb-1">
            <h3 className="text-sm font-semibold text-slate-800 leading-tight">{partner.tagline}</h3>
          </div>
          <span className="inline-block text-[10px] font-semibold uppercase tracking-widest text-slate-400">
            {CAT_LABELS[partner.category] || partner.category}
          </span>
        </div>

        {/* Description */}
        <p className="text-xs text-slate-500 leading-relaxed line-clamp-2">{partner.description}</p>

        {/* Features */}
        <ul className="space-y-1.5 flex-1">
          {partner.features.slice(0, 3).map((f) => (
            <li key={f} className="flex items-start gap-2 text-xs text-slate-600">
              <Check size={11} className="text-success-500 flex-shrink-0 mt-0.5" strokeWidth={2.5} />
              <span className="leading-tight">{f}</span>
            </li>
          ))}
        </ul>

        {/* Actions */}
        <div className="flex gap-2 pt-1">
          <Link
            href={`/partenariats/${partner.slug}`}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 text-xs font-medium text-slate-600 hover:border-slate-300 hover:text-slate-800 transition-colors"
          >
            Détails <ArrowRight size={11} />
          </Link>

          {comingSoon ? (
            <span className="flex-1 flex items-center justify-center px-3 py-2 rounded-lg bg-slate-50 text-xs font-medium text-slate-400 cursor-default">
              Bientôt
            </span>
          ) : isConnected ? (
            <span className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-accent-50 text-xs font-semibold text-accent-700">
              <Check size={11} strokeWidth={2.5} /> Connecté
            </span>
          ) : (
            <button
              onClick={() => onConnect(partner)}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-slate-900 text-white text-xs font-semibold hover:bg-slate-700 transition-colors"
            >
              <Plug size={11} /> Connecter
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
