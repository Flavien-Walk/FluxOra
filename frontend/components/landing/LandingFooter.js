import Link from 'next/link';
import { Zap } from 'lucide-react';

const LINKS = {
  Produit: [
    { label: 'Fonctionnalités', href: '#features' },
    { label: 'Tarifs', href: '#pricing' },
    { label: 'Comment ça marche', href: '#how-it-works' },
    { label: 'FAQ', href: '#faq' },
  ],
  Compte: [
    { label: 'Se connecter', href: '/sign-in' },
    { label: 'S\'inscrire', href: '/sign-up' },
    { label: 'Dashboard', href: '/dashboard' },
  ],
  Légal: [
    { label: 'Mentions légales', href: '/legal/mentions-legales' },
    { label: 'CGU', href: '/legal/cgu' },
    { label: 'CGV', href: '/legal/cgv' },
    { label: 'Confidentialité', href: '/legal/confidentialite' },
    { label: 'Cookies', href: '/legal/cookies' },
    { label: 'Contact', href: 'mailto:support@fluxora.io' },
  ],
};

export default function LandingFooter() {
  return (
    <footer className="bg-[#0A0F1E] border-t border-white/5">
      <div className="max-w-7xl mx-auto px-6 py-16">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-12">

          {/* Brand */}
          <div className="md:col-span-1">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-[0_0_16px_rgba(79,70,229,0.4)]">
                <Zap size={16} className="text-white" strokeWidth={2.5} />
              </div>
              <span className="text-white font-bold text-lg tracking-tight">Fluxora</span>
            </div>
            <p className="text-sm text-slate-500 leading-relaxed">
              Le cockpit financier des freelances et PME. Factures, devis, dépenses et comptabilité en un seul outil.
            </p>
          </div>

          {/* Links */}
          {Object.entries(LINKS).map(([category, items]) => (
            <div key={category}>
              <h4 className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-4">
                {category}
              </h4>
              <ul className="space-y-2.5">
                {items.map((item) => (
                  <li key={item.label}>
                    <Link
                      href={item.href}
                      className="text-sm text-slate-400 hover:text-white transition-colors"
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="mt-16 pt-8 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-slate-600">
            © {new Date().getFullYear()} Fluxora. Tous droits réservés.
          </p>
          <p className="text-xs text-slate-600">
            Fait avec soin pour les indépendants 🇫🇷
          </p>
        </div>
      </div>
    </footer>
  );
}
