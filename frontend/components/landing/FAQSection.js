'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

const FAQS = [
  {
    q: 'Puis-je utiliser Fluxora sans carte bancaire ?',
    a: 'Oui, le plan Starter est entièrement gratuit et ne nécessite aucune carte bancaire. Vous pouvez l\'utiliser sans limite de temps pour découvrir la plateforme.',
  },
  {
    q: 'Mes données sont-elles sécurisées ?',
    a: 'Absolument. Vos données sont chiffrées en transit (TLS) et au repos. Elles sont hébergées sur des infrastructures européennes conformes au RGPD. Nous ne revendons jamais vos données.',
  },
  {
    q: 'Puis-je passer d\'un plan à l\'autre facilement ?',
    a: 'Oui, vous pouvez upgrader ou downgrader votre plan à tout moment depuis votre espace paramètres. Le changement est effectif immédiatement, avec un pro-rata calculé automatiquement.',
  },
  {
    q: 'Fluxora est-il compatible avec mon expert-comptable ?',
    a: 'Oui. Fluxora vous permet d\'exporter votre journal comptable en CSV ou PDF. Nos exports sont compatibles avec les formats standards utilisés par les experts-comptables en France.',
  },
];

function FAQItem({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-4 px-6 py-5 text-left hover:bg-slate-50 transition-colors"
      >
        <span className="text-sm font-semibold text-slate-900">{q}</span>
        <ChevronDown
          size={16}
          className={`flex-shrink-0 text-slate-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && (
        <div className="px-6 pb-5">
          <p className="text-sm text-slate-500 leading-relaxed">{a}</p>
        </div>
      )}
    </div>
  );
}

export default function FAQSection() {
  return (
    <section id="faq" className="bg-slate-50 py-24">
      <div className="max-w-3xl mx-auto px-6">

        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-slate-200 text-slate-600 text-xs font-semibold px-4 py-1.5 rounded-full mb-6">
            Questions fréquentes
          </div>
          <h2 className="text-4xl font-bold text-slate-900 tracking-tight mb-4">
            Vous avez des questions ?
          </h2>
          <p className="text-slate-500 text-lg">
            Voici les réponses aux questions les plus fréquentes.
          </p>
        </div>

        {/* FAQ items */}
        <div className="space-y-3">
          {FAQS.map((faq) => (
            <FAQItem key={faq.q} q={faq.q} a={faq.a} />
          ))}
        </div>

        {/* Contact nudge */}
        <p className="text-center text-sm text-slate-400 mt-10">
          Vous ne trouvez pas votre réponse ?{' '}
          <a
            href="mailto:support@fluxora.io"
            className="text-indigo-600 hover:text-indigo-700 font-medium transition-colors"
          >
            Contactez notre support
          </a>
        </p>
      </div>
    </section>
  );
}
