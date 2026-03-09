import Link from 'next/link';
import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import {
  Zap, FileText, TrendingUp, Shield, CheckCircle,
  ArrowRight, BarChart3, Receipt, Clock, Users,
  ChevronRight, Star,
} from 'lucide-react';

export default async function Home() {
  const { userId } = await auth();
  if (userId) redirect('/dashboard');

  return (
    <main className="min-h-screen bg-white font-sans antialiased">

      {/* ── Nav ── */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-100">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 bg-[#1C6EF2] rounded-lg flex items-center justify-center">
              <Zap size={13} className="text-white" fill="currentColor" />
            </div>
            <span className="text-sm font-bold text-slate-900 tracking-tight">Fluxora</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/sign-in" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">
              Connexion
            </Link>
            <Link href="/sign-up"
              className="text-sm font-semibold bg-[#1C6EF2] text-white px-4 py-2 rounded-lg hover:bg-[#1558D6] transition-colors">
              Commencer gratuitement
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="relative overflow-hidden pt-32 pb-24 px-6"
        style={{ background: 'linear-gradient(160deg, #0F172A 0%, #1A2744 55%, #0F172A 100%)' }}>
        {/* Decorative glows */}
        <div className="absolute top-0 right-0 w-[600px] h-[600px] rounded-full opacity-20"
          style={{ background: 'radial-gradient(circle, #1C6EF2 0%, transparent 70%)', transform: 'translate(30%, -30%)' }} />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full opacity-10"
          style={{ background: 'radial-gradient(circle, #8B5CF6 0%, transparent 70%)', transform: 'translate(-30%, 30%)' }} />

        <div className="relative z-10 max-w-4xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 text-white/80 text-xs font-medium px-4 py-1.5 rounded-full mb-8 backdrop-blur-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Disponible maintenant · Version 1.0
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-tight tracking-tight mb-6">
            Le cockpit financier des{' '}
            <span className="text-transparent bg-clip-text"
              style={{ backgroundImage: 'linear-gradient(135deg, #60A5FA 0%, #818CF8 100%)' }}>
              freelances & PME
            </span>
          </h1>
          <p className="text-lg text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            Factures, devis, dépenses, paiements, comptabilité.
            Tout ce dont vous avez besoin pour gérer votre activité — en un seul endroit.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/sign-up"
              className="group inline-flex items-center gap-2 bg-[#1C6EF2] text-white text-sm font-semibold px-7 py-3.5 rounded-xl hover:bg-[#1558D6] transition-all shadow-lg shadow-blue-500/30">
              Commencer gratuitement
              <ArrowRight size={15} className="group-hover:translate-x-0.5 transition-transform" />
            </Link>
            <Link href="/sign-in"
              className="inline-flex items-center gap-2 bg-white/10 border border-white/20 text-white text-sm font-medium px-7 py-3.5 rounded-xl hover:bg-white/15 transition-all backdrop-blur-sm">
              Se connecter
            </Link>
          </div>

          {/* Trust signals */}
          <div className="flex items-center justify-center gap-6 mt-12 flex-wrap">
            {['Aucune carte requise', 'Démarrage en 2 min', 'Données sécurisées'].map((t) => (
              <div key={t} className="flex items-center gap-1.5 text-slate-500 text-xs">
                <CheckCircle size={12} className="text-emerald-500" />
                {t}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Social proof bar ── */}
      <section className="border-b border-slate-100 py-8 px-6 bg-slate-50">
        <div className="max-w-5xl mx-auto flex items-center justify-center gap-10 flex-wrap">
          {[
            { icon: Users,    value: '500+',   label: 'Utilisateurs actifs' },
            { icon: FileText, value: '12 000+', label: 'Factures générées' },
            { icon: TrendingUp, value: '99.9%', label: 'Uptime garanti' },
          ].map(({ icon: Icon, value, label }) => (
            <div key={label} className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center shadow-sm">
                <Icon size={15} className="text-[#1C6EF2]" />
              </div>
              <div>
                <p className="text-lg font-bold text-slate-900 leading-none">{value}</p>
                <p className="text-xs text-slate-500 mt-0.5">{label}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features ── */}
      <section className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-xs font-semibold uppercase tracking-widest text-[#1C6EF2] mb-3">Fonctionnalités</p>
            <h2 className="text-3xl font-bold text-slate-900">Tout ce qu'il vous faut, rien de plus</h2>
            <p className="text-slate-500 mt-3 max-w-xl mx-auto">
              Un outil conçu pour les indépendants et petites entreprises. Simple, complet, rapide.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              {
                icon: FileText, color: 'bg-blue-50 text-blue-600',
                title: 'Facturation professionnelle',
                desc: 'Créez et envoyez des factures PDF en quelques secondes. Suivi automatique des paiements.'
              },
              {
                icon: BarChart3, color: 'bg-emerald-50 text-emerald-600',
                title: 'Tableau de bord financier',
                desc: 'KPIs en temps réel : CA, cashflow, factures en retard. Tout visible en un coup d\'œil.'
              },
              {
                icon: Receipt, color: 'bg-rose-50 text-rose-600',
                title: 'Gestion des dépenses',
                desc: 'Catégorisez vos dépenses, suivez votre budget et préparez votre comptabilité.'
              },
              {
                icon: TrendingUp, color: 'bg-purple-50 text-purple-600',
                title: 'Devis intelligents',
                desc: 'Transformez un devis accepté en facture en un clic. Taux d\'acceptation suivi automatiquement.'
              },
              {
                icon: Clock, color: 'bg-amber-50 text-amber-600',
                title: 'Relances automatiques',
                desc: 'Détectez les factures en retard et relancez vos clients sans effort.'
              },
              {
                icon: Shield, color: 'bg-slate-100 text-slate-600',
                title: 'Comptabilité intégrée',
                desc: 'Journal comptable automatique. Crédits, débits, bilans — toujours à jour.'
              },
            ].map(({ icon: Icon, color, title, desc }) => (
              <div key={title} className="bg-white rounded-2xl border border-slate-200 p-6 hover:shadow-md hover:border-slate-300 transition-all duration-200">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${color}`}>
                  <Icon size={18} strokeWidth={1.75} />
                </div>
                <h3 className="text-sm font-semibold text-slate-900 mb-2">{title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="py-20 px-6 bg-slate-50">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-xs font-semibold uppercase tracking-widest text-[#1C6EF2] mb-3">Comment ça marche</p>
            <h2 className="text-3xl font-bold text-slate-900">Opérationnel en 3 étapes</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { step: '01', title: 'Créez votre compte', desc: 'Inscription en moins de 2 minutes. Aucune carte bancaire requise.' },
              { step: '02', title: 'Ajoutez vos clients', desc: 'Importez ou créez votre base clients. Prêt pour facturer immédiatement.' },
              { step: '03', title: 'Gérez tout depuis un seul endroit', desc: 'Factures, devis, dépenses et comptabilité en temps réel.' },
            ].map(({ step, title, desc }) => (
              <div key={step} className="text-center">
                <div className="w-12 h-12 bg-[#1C6EF2] text-white rounded-2xl flex items-center justify-center text-sm font-bold mx-auto mb-4 shadow-lg shadow-blue-500/20">
                  {step}
                </div>
                <h3 className="text-sm font-semibold text-slate-900 mb-2">{title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA Final ── */}
      <section className="py-24 px-6"
        style={{ background: 'linear-gradient(135deg, #0F172A 0%, #1A2744 100%)' }}>
        <div className="max-w-2xl mx-auto text-center">
          <div className="w-12 h-12 bg-[#1C6EF2] rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-blue-500/30">
            <Zap size={20} className="text-white" fill="currentColor" />
          </div>
          <h2 className="text-3xl font-bold text-white mb-4">
            Prêt à prendre le contrôle de vos finances ?
          </h2>
          <p className="text-slate-400 mb-8">
            Rejoignez des centaines de freelances et PME qui gèrent leur activité avec Fluxora.
          </p>
          <Link href="/sign-up"
            className="group inline-flex items-center gap-2 bg-[#1C6EF2] text-white text-sm font-semibold px-8 py-4 rounded-xl hover:bg-[#1558D6] transition-all shadow-lg shadow-blue-500/30">
            Commencer gratuitement
            <ChevronRight size={15} className="group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-slate-100 py-8 px-6">
        <div className="max-w-6xl mx-auto flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-[#1C6EF2] rounded-md flex items-center justify-center">
              <Zap size={11} className="text-white" fill="currentColor" />
            </div>
            <span className="text-sm font-semibold text-slate-700">Fluxora</span>
          </div>
          <p className="text-xs text-slate-400">
            © {new Date().getFullYear()} Fluxora. Le cockpit financier des freelances & PME.
          </p>
          <div className="flex items-center gap-4">
            <Link href="/sign-in"  className="text-xs text-slate-500 hover:text-slate-700 transition-colors">Connexion</Link>
            <Link href="/sign-up"  className="text-xs text-slate-500 hover:text-slate-700 transition-colors">S'inscrire</Link>
          </div>
        </div>
      </footer>

    </main>
  );
}
