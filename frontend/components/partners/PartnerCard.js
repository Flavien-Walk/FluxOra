'use client';

import Link from 'next/link';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { Check, ArrowRight, Plug, Zap } from 'lucide-react';

const OFFER_BADGE = {
  reduction:     'bg-white text-slate-900',
  mois_offerts:  'bg-white text-slate-900',
  gratuit:       'bg-emerald-400 text-white',
  tarif_negocie: 'bg-amber-400 text-amber-900',
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

/* Solid brand colors per partner for gradient banners */
const BANNER_GRADIENTS = {
  'from-blue-600 to-indigo-700':   'linear-gradient(135deg, #2563eb, #4338ca)',
  'from-teal-500 to-emerald-600':  'linear-gradient(135deg, #14b8a6, #059669)',
  'from-pink-500 to-purple-600':   'linear-gradient(135deg, #ec4899, #9333ea)',
  'from-violet-500 to-purple-700': 'linear-gradient(135deg, #8b5cf6, #7e22ce)',
  'from-blue-400 to-cyan-500':     'linear-gradient(135deg, #60a5fa, #06b6d4)',
  'from-orange-500 to-amber-500':  'linear-gradient(135deg, #f97316, #f59e0b)',
  'from-red-500 to-rose-600':      'linear-gradient(135deg, #ef4444, #e11d48)',
  'from-amber-400 to-orange-500':  'linear-gradient(135deg, #fbbf24, #f97316)',
};

export default function PartnerCard({ partner, isConnected, onConnect }) {
  const canConnect = partner.integration.status === 'mock';
  const comingSoon = partner.integration.status === 'coming_soon';
  const bannerStyle = BANNER_GRADIENTS[partner.gradient] || 'linear-gradient(135deg, #334155, #1e293b)';

  return (
    <div className={cn(
      'bg-white rounded-2xl border overflow-hidden flex flex-col',
      'transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg',
      isConnected
        ? 'border-accent-200 shadow-[0_0_0_2px_rgba(28,110,242,0.12),0_4px_16px_rgba(0,0,0,0.08)]'
        : 'border-slate-100 shadow-[0_2px_8px_rgba(0,0,0,0.06)] hover:border-slate-200',
    )}>

      {/* Banner */}
      <div className="relative h-28 overflow-hidden flex items-center justify-center"
        style={{ background: bannerStyle }}>

        {/* Subtle noise overlay for depth */}
        <div className="absolute inset-0 opacity-[0.06]"
          style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\'/%3E%3C/svg%3E")' }}
        />

        {partner.imageType === 'logo' ? (
          <Image
            src={partner.image}
            alt={partner.name}
            width={160}
            height={56}
            className="object-contain max-h-12 relative z-10 drop-shadow-md"
          />
        ) : (
          <span className="relative z-10 text-white text-2xl font-bold tracking-tight drop-shadow-sm select-none">
            {partner.name}
          </span>
        )}

        {/* Offer badge */}
        <span className={cn(
          'absolute bottom-3 right-3 z-10 text-[10px] font-bold px-2.5 py-1 rounded-full shadow-sm',
          OFFER_BADGE[partner.offerType] || OFFER_BADGE.reduction,
        )}>
          {partner.offer}
        </span>

        {/* Connected indicator */}
        {isConnected && (
          <span className="absolute top-3 right-3 z-10 flex items-center gap-1 bg-white/95 text-accent-700 text-[10px] font-semibold px-2 py-0.5 rounded-full shadow-sm">
            <Zap size={9} fill="currentColor" /> Connecté
          </span>
        )}
      </div>

      {/* Body */}
      <div className="flex flex-col flex-1 p-4 gap-3">

        <div>
          <h3 className="text-[13px] font-semibold text-slate-800 leading-snug mb-1">
            {partner.tagline}
          </h3>
          <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
            {CAT_LABELS[partner.category] || partner.category}
          </span>
        </div>

        <p className="text-[12px] text-slate-500 leading-relaxed line-clamp-2">{partner.description}</p>

        <ul className="space-y-1.5 flex-1">
          {partner.features.slice(0, 3).map((f) => (
            <li key={f} className="flex items-start gap-2 text-[12px] text-slate-600">
              <Check size={11} className="text-emerald-500 flex-shrink-0 mt-[2px]" strokeWidth={2.5} />
              <span className="leading-tight">{f}</span>
            </li>
          ))}
        </ul>

        <div className="flex gap-2 pt-1">
          <Link
            href={`/partenariats/${partner.slug}`}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 text-[12px] font-medium text-slate-600 hover:border-slate-300 hover:text-slate-800 transition-colors"
          >
            Détails <ArrowRight size={11} />
          </Link>

          {comingSoon ? (
            <span className="flex-1 flex items-center justify-center px-3 py-2 rounded-xl bg-slate-50 text-[12px] font-medium text-slate-400 cursor-default">
              Bientôt
            </span>
          ) : isConnected ? (
            <span className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-accent-50 text-[12px] font-semibold text-accent-700">
              <Check size={11} strokeWidth={2.5} /> Connecté
            </span>
          ) : (
            <button
              onClick={() => onConnect(partner)}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 text-white text-[12px] font-semibold hover:bg-slate-700 transition-colors"
            >
              <Plug size={11} /> Connecter
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
