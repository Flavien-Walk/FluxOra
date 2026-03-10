'use client';

import {
  Users, FileText, ClipboardList, Receipt,
  BookOpen, BarChart3,
} from 'lucide-react';
import { motion } from 'framer-motion';

const FEATURES = [
  {
    icon: Users,
    iconBg: 'bg-emerald-500/10',
    iconColor: 'text-emerald-400',
    glowColor: 'group-hover:shadow-[0_0_30px_rgba(16,185,129,0.12)]',
    accentBar: 'from-emerald-400 to-teal-400',
    title: 'CRM Clients',
    desc: "Centralisez vos contacts, suivez l'historique de chaque client et accédez à toutes leurs factures en un clic.",
  },
  {
    icon: ClipboardList,
    iconBg: 'bg-blue-500/10',
    iconColor: 'text-blue-400',
    glowColor: 'group-hover:shadow-[0_0_30px_rgba(59,130,246,0.12)]',
    accentBar: 'from-blue-400 to-cyan-400',
    title: 'Devis professionnels',
    desc: "Créez des devis en quelques secondes, envoyez-les par email et transformez-les en factures d'un clic.",
  },
  {
    icon: FileText,
    iconBg: 'bg-indigo-500/10',
    iconColor: 'text-indigo-400',
    glowColor: 'group-hover:shadow-[0_0_30px_rgba(99,102,241,0.12)]',
    accentBar: 'from-indigo-400 to-violet-400',
    title: 'Facturation simple',
    desc: 'Générez des factures PDF conformes, suivez les paiements et relancez automatiquement les clients en retard.',
  },
  {
    icon: Receipt,
    iconBg: 'bg-rose-500/10',
    iconColor: 'text-rose-400',
    glowColor: 'group-hover:shadow-[0_0_30px_rgba(244,63,94,0.12)]',
    accentBar: 'from-rose-400 to-pink-400',
    title: 'Suivi des dépenses',
    desc: 'Enregistrez vos dépenses par catégorie, visualisez vos postes de coût et gardez le cap sur votre budget.',
  },
  {
    icon: BookOpen,
    iconBg: 'bg-amber-500/10',
    iconColor: 'text-amber-400',
    glowColor: 'group-hover:shadow-[0_0_30px_rgba(245,158,11,0.12)]',
    accentBar: 'from-amber-400 to-orange-400',
    title: 'Comptabilité intégrée',
    desc: "Toutes vos entrées et sorties dans un journal comptable clair. Export simplifié pour votre expert-comptable.",
  },
  {
    icon: BarChart3,
    iconBg: 'bg-purple-500/10',
    iconColor: 'text-purple-400',
    glowColor: 'group-hover:shadow-[0_0_30px_rgba(168,85,247,0.12)]',
    accentBar: 'from-purple-400 to-fuchsia-400',
    title: 'Dashboard analytique',
    desc: 'Visualisez votre chiffre d\'affaires, votre cashflow et vos KPI clés en temps réel sur un seul écran.',
  },
];

const cardVariants = {
  hidden: { opacity: 0, y: 32, scale: 0.97 },
  show:   { opacity: 1, y: 0,  scale: 1    },
};

export default function FeaturesGrid() {
  return (
    <section id="features" className="bg-white py-24">
      <div className="max-w-7xl mx-auto px-6">

        {/* Header */}
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-600 text-xs font-semibold px-4 py-1.5 rounded-full mb-6">
            Tout ce dont vous avez besoin
          </div>
          <h2 className="text-4xl font-bold text-slate-900 tracking-tight mb-4">
            Un cockpit complet pour votre activité
          </h2>
          <p className="text-lg text-slate-500 max-w-2xl mx-auto">
            Fluxora remplace cinq outils par un seul. Moins de friction, plus de clarté, plus de temps pour votre métier.
          </p>
        </motion.div>

        {/* Grid */}
        <motion.div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-80px' }}
          transition={{ staggerChildren: 0.1 }}
        >
          {FEATURES.map((f) => {
            const Icon = f.icon;
            return (
              <motion.div
                key={f.title}
                variants={cardVariants}
                transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                className={`
                  group relative p-7 rounded-2xl border border-slate-100 bg-white
                  hover:shadow-[0_8px_30px_rgba(0,0,0,0.08)] transition-all duration-300
                  cursor-default overflow-hidden
                  ${f.glowColor}
                `}
              >
                {/* Accent gradient line top on hover */}
                <div className={`
                  absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r ${f.accentBar}
                  opacity-0 group-hover:opacity-100 transition-opacity duration-300
                `} />

                <div className={`inline-flex w-12 h-12 rounded-xl items-center justify-center mb-5 ${f.iconBg} transition-transform duration-300 group-hover:scale-110`}>
                  <Icon size={22} className={f.iconColor} strokeWidth={1.75} />
                </div>
                <h3 className="text-base font-semibold text-slate-900 mb-2">{f.title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{f.desc}</p>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
