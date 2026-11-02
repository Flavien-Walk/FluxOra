'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const FAQS = [
  {
    q: 'FluxOra est-il une banque ?',
    a: "Non. Fluxora est un cockpit financier — un logiciel de pilotage, pas un établissement bancaire. Nous ne détenons pas vos fonds. Les flux de paiement transitent par des partenaires agréés (établissements de paiement ou EME). Votre argent reste chez eux, sécurisé et séparé. Fluxora agrège, visualise et automatise — c'est tout.",
  },
  {
    q: 'Mes données sont-elles sécurisées ?',
    a: 'Oui. Vos données sont chiffrées en transit (TLS 1.3) et au repos (AES-256). Elles sont hébergées sur des infrastructures européennes conformes au RGPD. Nous ne revendons jamais vos données. Accès aux données strictement limité à vos collaborateurs autorisés.',
  },
  {
    q: "Puis-je passer d'un plan à l'autre facilement ?",
    a: "Oui, vous pouvez upgrader ou downgrader votre plan à tout moment depuis votre espace paramètres. Le changement est effectif immédiatement, avec un pro-rata calculé automatiquement.",
  },
  {
    q: "Fluxora est-il compatible avec mon expert-comptable ?",
    a: "Oui. Fluxora génère un journal comptable complet, exportable en CSV ou PDF. Nos exports sont compatibles avec les formats standards utilisés par les experts-comptables en France (FEC inclus). Votre comptable peut accéder à un espace lecture dédié.",
  },
  {
    q: "Combien de temps faut-il pour déployer Fluxora ?",
    a: "En général moins de 48 heures. La configuration initiale (organisation, utilisateurs, connexion aux comptes) prend 30 minutes. L'onboarding complet avec import de données historiques est accompagné par notre équipe.",
  },
  {
    q: "Quels types d'entreprises utilisent Fluxora ?",
    a: "Fluxora est conçu pour les freelances, TPE et PME de 1 à 200 personnes : agences, cabinets de conseil, studios créatifs, e-commerce, SaaS B2B. Si vous avez besoin de maîtriser vos dépenses, votre trésorerie et vos flux, Fluxora est fait pour vous.",
  },
  {
    q: "Puis-je utiliser Fluxora sans engagement ?",
    a: "Oui. Tous nos plans sont sans engagement de durée. Vous pouvez résilier à tout moment depuis votre tableau de bord, sans frais ni préavis. Vos données vous appartiennent et sont exportables intégralement.",
  },
];

function FAQItem({ q, a, index }) {
  const [open, setOpen] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.45, delay: index * 0.08, ease: [0.22, 1, 0.36, 1] }}
      className={`border rounded-xl overflow-hidden transition-all duration-200 ${
        open ? 'border-indigo-200 shadow-[0_0_20px_rgba(99,102,241,0.08)]' : 'border-slate-200 hover:border-slate-300'
      }`}
    >
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-4 px-6 py-5 text-left hover:bg-slate-50/70 transition-colors"
      >
        <span className={`text-sm font-semibold transition-colors ${open ? 'text-indigo-700' : 'text-slate-900'}`}>
          {q}
        </span>
        <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-200 ${
          open ? 'bg-indigo-100' : 'bg-slate-100'
        }`}>
          <ChevronDown
            size={14}
            className={`transition-transform duration-300 ${open ? 'rotate-180 text-indigo-600' : 'text-slate-400'}`}
          />
        </div>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="answer"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="px-6 pb-5 pt-1">
              <p className="text-sm text-slate-500 leading-relaxed">{a}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function FAQSection() {
  return (
    <section id="faq" className="bg-slate-50 py-24">
      <div className="max-w-3xl mx-auto px-6">

        <motion.div
          className="text-center mb-12"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="inline-flex items-center gap-2 bg-slate-200 text-slate-600 text-xs font-semibold px-4 py-1.5 rounded-full mb-6">
            Questions fréquentes
          </div>
          <h2 className="text-4xl font-bold text-slate-900 tracking-tight mb-4">
            Vous avez des questions ?
          </h2>
          <p className="text-slate-500 text-lg">
            Voici les réponses aux questions les plus fréquentes.
          </p>
        </motion.div>

        <div className="space-y-3">
          {FAQS.map((faq, i) => (
            <FAQItem key={faq.q} q={faq.q} a={faq.a} index={i} />
          ))}
        </div>

        <motion.p
          className="text-center text-sm text-slate-400 mt-10"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          Vous ne trouvez pas votre réponse ?{' '}
          <a
            href="mailto:support@fluxora.io"
            className="text-indigo-600 hover:text-indigo-700 font-medium transition-colors"
          >
            Contactez notre support
          </a>
        </motion.p>
      </div>
    </section>
  );
}
