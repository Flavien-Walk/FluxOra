'use client';

import Link from 'next/link';
import { CheckCircle2, Zap } from 'lucide-react';

const PLANS = [
  {
    name: 'Starter',
    price: '0',
    period: '/mois',
    description: 'Pour démarrer et tester Fluxora sans engagement.',
    cta: 'Commencer gratuitement',
    ctaHref: '/sign-up',
    popular: false,
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
    price: '29',
    period: '/mois',
    description: 'La solution complète pour les freelances actifs.',
    cta: 'Démarrer l\'essai gratuit',
    ctaHref: '/sign-up',
    popular: true,
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
    price: '79',
    period: '/mois',
    description: 'Pour les équipes et PME avec des besoins avancés.',
    cta: 'Contacter l\'équipe',
    ctaHref: '/sign-up',
    popular: false,
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

export default function PricingSection({ isConnected }) {
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

        {/* Plans grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
          {PLANS.map((plan) => (
            <div
              key={plan.name}
              className={`relative flex flex-col rounded-2xl overflow-hidden transition-all duration-200 ${
                plan.popular
                  ? 'border-2 border-indigo-500 shadow-[0_0_40px_rgba(99,102,241,0.18)] scale-[1.02]'
                  : 'border border-slate-200 hover:border-slate-300 hover:shadow-md'
              }`}
            >
              {/* Popular badge */}
              {plan.popular && (
                <div className="absolute top-0 left-0 right-0 flex justify-center">
                  <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-[11px] font-bold px-4 py-1 rounded-b-xl flex items-center gap-1">
                    <Zap size={10} />
                    Populaire
                  </div>
                </div>
              )}

              <div className={`flex flex-col flex-1 p-8 ${plan.popular ? 'pt-10' : ''}`}>
                {/* Plan name */}
                <div className="mb-6">
                  <h3 className={`text-lg font-bold mb-1 ${plan.popular ? 'text-indigo-600' : 'text-slate-900'}`}>
                    {plan.name}
                  </h3>
                  <p className="text-sm text-slate-500">{plan.description}</p>
                </div>

                {/* Price */}
                <div className="mb-8">
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
                        className={`flex-shrink-0 mt-0.5 ${plan.popular ? 'text-indigo-500' : 'text-emerald-500'}`}
                      />
                      <span className="text-sm text-slate-600">{feature}</span>
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                <Link
                  href={isConnected ? '/dashboard' : plan.ctaHref}
                  className={`block text-center py-3 rounded-xl font-semibold text-sm transition-all duration-200 ${
                    plan.popular
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-500 hover:to-indigo-500 shadow-[0_0_20px_rgba(79,70,229,0.3)] hover:shadow-[0_0_30px_rgba(79,70,229,0.5)]'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {isConnected ? 'Accéder au dashboard' : plan.cta}
                </Link>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom note */}
        <p className="text-center text-sm text-slate-400 mt-10">
          Tous les prix sont HT. Annulation à tout moment. Aucune carte bancaire requise pour le plan Starter.
        </p>
      </div>
    </section>
  );
}
