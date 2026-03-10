'use client';

import { UserPlus, Settings2, TrendingUp } from 'lucide-react';
import { motion } from 'framer-motion';

const STEPS = [
  {
    step: '01',
    icon: UserPlus,
    iconBg: 'bg-blue-500/10',
    iconColor: 'text-blue-400',
    glow: 'hover:shadow-[0_0_40px_rgba(59,130,246,0.15)]',
    bar: 'from-blue-400 to-cyan-400',
    title: 'Créez votre espace',
    desc: "Inscrivez-vous en 30 secondes. Configurez votre organisation, renseignez vos informations légales et importez vos premiers clients.",
  },
  {
    step: '02',
    icon: Settings2,
    iconBg: 'bg-indigo-500/10',
    iconColor: 'text-indigo-400',
    glow: 'hover:shadow-[0_0_40px_rgba(99,102,241,0.15)]',
    bar: 'from-indigo-400 to-violet-400',
    title: 'Configurez votre activité',
    desc: "Ajoutez vos clients, créez vos devis et vos factures. Connectez votre compte Stripe pour accepter les paiements en ligne.",
  },
  {
    step: '03',
    icon: TrendingUp,
    iconBg: 'bg-emerald-500/10',
    iconColor: 'text-emerald-400',
    glow: 'hover:shadow-[0_0_40px_rgba(16,185,129,0.15)]',
    bar: 'from-emerald-400 to-teal-400',
    title: 'Pilotez votre croissance',
    desc: "Suivez votre chiffre d'affaires, votre cashflow et vos indicateurs clés depuis votre dashboard. Prenez de meilleures décisions.",
  },
];

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="bg-slate-50 py-24">
      <div className="max-w-7xl mx-auto px-6">

        {/* Header */}
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="inline-flex items-center gap-2 bg-indigo-50 text-indigo-600 text-xs font-semibold px-4 py-1.5 rounded-full mb-6">
            Simple &amp; rapide
          </div>
          <h2 className="text-4xl font-bold text-slate-900 tracking-tight mb-4">
            Opérationnel en moins de 5 minutes
          </h2>
          <p className="text-lg text-slate-500 max-w-xl mx-auto">
            Pas de formation requise. Fluxora est conçu pour être intuitif dès le premier jour.
          </p>
        </motion.div>

        {/* Steps */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">

          {/* Connector line desktop */}
          <div className="hidden md:block absolute top-10 left-1/3 right-1/3 h-px bg-gradient-to-r from-blue-200 via-indigo-200 to-emerald-200" />

          {STEPS.map((s, i) => {
            const Icon = s.icon;
            return (
              <motion.div
                key={s.step}
                initial={{ opacity: 0, y: 32 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ duration: 0.5, delay: i * 0.15, ease: [0.22, 1, 0.36, 1] }}
                className={`relative flex flex-col items-center text-center group cursor-default`}
              >
                {/* Icon container */}
                <div className="relative mb-6">
                  <div className={`
                    w-20 h-20 rounded-2xl flex items-center justify-center
                    ${s.iconBg} border border-white shadow-md
                    transition-all duration-300 ${s.glow}
                    group-hover:-translate-y-1.5 group-hover:scale-105
                  `}>
                    {/* Gradient top line on hover */}
                    <div className={`absolute top-0 left-4 right-4 h-[2px] bg-gradient-to-r ${s.bar} opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-full`} />
                    <Icon size={28} className={`${s.iconColor} transition-transform duration-300 group-hover:scale-110`} strokeWidth={1.75} />
                  </div>
                  {/* Step badge */}
                  <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-white border border-slate-200 shadow-sm flex items-center justify-center">
                    <span className="text-[10px] font-bold text-slate-400">{s.step}</span>
                  </div>
                </div>

                <h3 className="text-lg font-semibold text-slate-900 mb-3 group-hover:text-slate-800 transition-colors">{s.title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed max-w-xs">{s.desc}</p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
