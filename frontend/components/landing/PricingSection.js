'use client';

import { useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, Zap, Star, Building2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const PLANS = [
  {
    name: 'Starter',
    icon: Star,
    price: '0',
    period: '/mois',
    description: 'Pour démarrer et tester Fluxora sans engagement.',
    cta: 'Commencer gratuitement',
    ctaHref: '/sign-up',
    popular: false,
    accentColor: 'emerald',
    features: [
      '3 clients maximum',
      '5 factures par mois',
      '5 devis par mois',
      'Suivi des dépenses',
      'Dashboard basique',
      'Support par email',
    ],
  },
  {
    name: 'Pro',
    icon: Zap,
    price: '29',
    period: '/mois',
    description: 'La solution complète pour les freelances actifs.',
    cta: "Démarrer l'essai gratuit",
    ctaHref: '/sign-up',
    popular: true,
    accentColor: 'indigo',
    features: [
      'Clients illimités',
      'Factures illimitées',
      'Devis illimités',
      'Comptabilité complète',
      'Relances automatiques',
      'Paiements Stripe intégrés',
      'Export comptable',
      'Support prioritaire',
    ],
  },
  {
    name: 'Business',
    icon: Building2,
    price: '79',
    period: '/mois',
    description: 'Pour les équipes et PME avec des besoins avancés.',
    cta: "Contacter l'équipe",
    ctaHref: '/sign-up',
    popular: false,
    accentColor: 'violet',
    features: [
      'Tout du plan Pro',
      'Multi-utilisateurs (5 seats)',
      'Multi-organisations',
      'API access',
      'Rapports avancés',
      'Intégrations comptables',
      'Onboarding dédié',
      'SLA 99.9%',
    ],
  },
];

const ACCENT = {
  emerald: {
    ring:   'ring-emerald-500',
    glow:   '0 0 0 2px #10B981, 0 0 40px rgba(16,185,129,0.25)',
    badge:  'from-emerald-500 to-teal-500',
    cta:    'bg-gradient-to-r from-emerald-500 to-teal-500 text-white hover:from-emerald-400 hover:to-teal-400',
    ctaGlow:'shadow-[0_0_20px_rgba(16,185,129,0.4)] hover:shadow-[0_0_32px_rgba(16,185,129,0.6)]',
    check:  'text-emerald-500',
    icon:   'bg-emerald-50 text-emerald-600',
    bar:    'from-emerald-400 to-teal-400',
  },
  indigo: {
    ring:   'ring-indigo-500',
    glow:   '0 0 0 2px #6366F1, 0 0 50px rgba(99,102,241,0.3)',
    badge:  'from-blue-600 to-indigo-600',
    cta:    'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-500 hover:to-indigo-500',
    ctaGlow:'shadow-[0_0_24px_rgba(79,70,229,0.4)] hover:shadow-[0_0_40px_rgba(79,70,229,0.6)]',
    check:  'text-indigo-500',
    icon:   'bg-indigo-50 text-indigo-600',
    bar:    'from-blue-400 to-indigo-500',
  },
  violet: {
    ring:   'ring-violet-500',
    glow:   '0 0 0 2px #8B5CF6, 0 0 40px rgba(139,92,246,0.25)',
    badge:  'from-violet-500 to-purple-600',
    cta:    'bg-gradient-to-r from-violet-500 to-purple-600 text-white hover:from-violet-400 hover:to-purple-500',
    ctaGlow:'shadow-[0_0_20px_rgba(139,92,246,0.4)] hover:shadow-[0_0_32px_rgba(139,92,246,0.6)]',
    check:  'text-violet-500',
    icon:   'bg-violet-50 text-violet-600',
    bar:    'from-violet-400 to-purple-500',
  },
};

export default function PricingSection({ isConnected }) {
  const [selected, setSelected] = useState('Pro');

  return (
    <section id="pricing" className="bg-white py-24">
      <div className="max-w-7xl mx-auto px-6">

        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 bg-indigo-50 text-indigo-600 text-xs font-semibold px-4 py-1.5 rounded-full mb-6">
            Tarifs transparents
          </div>
          <h2 className="text-4xl font-bold text-slate-900 tracking-tight mb-4">
            Un plan pour chaque étape
          </h2>
          <p className="text-lg text-slate-500 max-w-xl mx-auto">
            Démarrez gratuitement. Évoluez quand vous en avez besoin. Pas de frais cachés.
          </p>
        </div>

        {/* Hint */}
        <p className="text-center text-xs text-slate-400 mb-8 tracking-wide">
          Cliquez sur un plan pour le sélectionner
        </p>

        {/* Plans grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
          {PLANS.map((plan, i) => {
            const isSelected = selected === plan.name;
            const a = ACCENT[plan.accentColor];
            const Icon = plan.icon;

            return (
              <motion.div
                key={plan.name}
                initial={{ opacity: 0, y: 28 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, delay: i * 0.1, ease: [0.22, 1, 0.36, 1] }}
                onClick={() => setSelected(plan.name)}
                role="button"
                aria-pressed={isSelected}
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && setSelected(plan.name)}
                className={`
                  relative flex flex-col rounded-2xl overflow-hidden cursor-pointer select-none
                  transition-all duration-300 ease-out
                  ${isSelected
                    ? `-translate-y-2 scale-[1.03] ring-2 ${a.ring}`
                    : plan.popular
                      ? 'border-2 border-indigo-200 hover:-translate-y-1 hover:shadow-lg'
                      : 'border border-slate-200 hover:border-slate-300 hover:-translate-y-1 hover:shadow-md'
                  }
                `}
                style={isSelected ? { boxShadow: a.glow } : undefined}
              >
                {/* Selected indicator */}
                <AnimatePresence>
                  {isSelected && (
                    <motion.div
                      key="selected-bar"
                      className={`absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r ${a.bar}`}
                      initial={{ scaleX: 0 }}
                      animate={{ scaleX: 1 }}
                      exit={{ scaleX: 0 }}
                      transition={{ duration: 0.3 }}
                      style={{ transformOrigin: 'left' }}
                    />
                  )}
                </AnimatePresence>

                {/* Popular badge */}
                {plan.popular && (
                  <div className="absolute top-0 left-0 right-0 flex justify-center">
                    <div className={`bg-gradient-to-r ${a.badge} text-white text-[11px] font-bold px-4 py-1 rounded-b-xl flex items-center gap-1`}>
                      <Zap size={10} fill="currentColor" />
                      Populaire
                    </div>
                  </div>
                )}

                <div className={`flex flex-col flex-1 p-8 ${plan.popular ? 'pt-10' : ''}`}>

                  {/* Icon + Plan name */}
                  <div className="flex items-center gap-3 mb-4">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${a.icon}`}>
                      <Icon size={16} strokeWidth={2} />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-slate-900">{plan.name}</h3>
                      <p className="text-xs text-slate-400">{plan.description}</p>
                    </div>
                  </div>

                  {/* Price */}
                  <div className="mb-8 mt-2">
                    <div className="flex items-end gap-1">
                      <span className="text-5xl font-bold text-slate-900 tracking-tight">{plan.price}€</span>
                      <span className="text-slate-400 text-sm mb-1.5">{plan.period}</span>
                    </div>
                  </div>

                  {/* Features */}
                  <ul className="space-y-3 flex-1 mb-8">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2.5">
                        <CheckCircle2
                          size={15}
                          className={`flex-shrink-0 mt-0.5 ${a.check}`}
                        />
                        <span className="text-sm text-slate-600">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  {/* CTA */}
                  <Link
                    href={isConnected ? '/dashboard' : plan.ctaHref}
                    onClick={(e) => e.stopPropagation()}
                    className={`
                      block text-center py-3 rounded-xl font-semibold text-sm
                      transition-all duration-200
                      ${a.cta} ${isSelected ? a.ctaGlow : ''}
                    `}
                  >
                    {isConnected ? 'Accéder au dashboard' : plan.cta}
                  </Link>

                  {/* Selected check */}
                  <AnimatePresence>
                    {isSelected && (
                      <motion.p
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className={`text-center text-xs font-medium mt-3 ${a.check}`}
                      >
                        ✓ Plan sélectionné
                      </motion.p>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Bottom note */}
        <p className="text-center text-sm text-slate-400 mt-10">
          Tous les prix sont HT. Annulation à tout moment. Aucune carte bancaire requise pour le plan Starter.
        </p>
      </div>
    </section>
  );
}
