'use client';

import Link from 'next/link';
import { ArrowRight, TrendingUp, Clock, CheckCircle2, CircleDollarSign } from 'lucide-react';

/* ─── Mini KPI Card for mockup ─── */
function MockKPI({ label, value, color, sub }) {
  const colorMap = {
    green:  { bg: 'bg-emerald-500/10', text: 'text-emerald-400', dot: 'bg-emerald-400' },
    blue:   { bg: 'bg-blue-500/10',    text: 'text-blue-400',    dot: 'bg-blue-400'    },
    yellow: { bg: 'bg-amber-500/10',   text: 'text-amber-400',   dot: 'bg-amber-400'   },
    indigo: { bg: 'bg-indigo-500/10',  text: 'text-indigo-400',  dot: 'bg-indigo-400'  },
  };
  const c = colorMap[color] ?? colorMap.blue;
  return (
    <div className={`rounded-xl p-3.5 border border-white/5 ${c.bg} backdrop-blur-sm`}>
      <div className="flex items-center gap-1.5 mb-2">
        <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
        <span className="text-[10px] text-slate-400 uppercase tracking-widest font-medium">{label}</span>
      </div>
      <p className={`text-xl font-bold tabular-nums ${c.text}`}>{value}</p>
      {sub && <p className="text-[10px] text-slate-500 mt-0.5">{sub}</p>}
    </div>
  );
}

/* ─── Mockup dashboard card ─── */
function DashboardMockup() {
  return (
    <div className="relative w-full max-w-lg mx-auto lg:mx-0">
      {/* Outer glow */}
      <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-indigo-500/10 rounded-3xl blur-xl scale-105" />

      {/* Main card */}
      <div className="relative bg-[#111827]/90 border border-white/10 rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.5)] overflow-hidden backdrop-blur-sm">

        {/* Header bar */}
        <div className="flex items-center gap-1.5 px-4 py-3 border-b border-white/5">
          <span className="w-2.5 h-2.5 rounded-full bg-red-500/70" />
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500/70" />
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/70" />
          <span className="ml-3 text-[11px] text-slate-500 font-medium">Fluxora — Dashboard</span>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          {/* Hero banner mini */}
          <div className="rounded-xl px-4 py-3 bg-gradient-to-r from-slate-900 to-[#1A2744] border border-white/5 flex items-center justify-between">
            <div>
              <p className="text-[10px] text-slate-500 uppercase tracking-widest">Bonjour</p>
              <p className="text-white text-sm font-bold">Acme Studio</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-[10px] text-slate-500">CA total</p>
                <p className="text-sm font-bold text-white">84 200 €</p>
              </div>
              <div className="w-px h-6 bg-slate-700" />
              <div className="text-right">
                <p className="text-[10px] text-slate-500">Cashflow</p>
                <p className="text-sm font-bold text-emerald-400">+12 400 €</p>
              </div>
            </div>
          </div>

          {/* KPI grid */}
          <div className="grid grid-cols-2 gap-2.5">
            <MockKPI label="Chiffre d'affaires" value="84 200 €" color="green" sub="CA total" />
            <MockKPI label="En attente" value="6 800 €" color="yellow" sub="3 factures" />
            <MockKPI label="Dépenses" value="5 320 €" color="indigo" sub="Ce mois" />
            <MockKPI label="Devis en cours" value="4" color="blue" sub="Valeur : 28 000 €" />
          </div>

          {/* Mini chart bars */}
          <div className="rounded-xl bg-slate-900/60 border border-white/5 p-4">
            <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-3">CA — 6 derniers mois</p>
            <div className="flex items-end gap-1.5 h-12">
              {[35, 55, 40, 70, 60, 90].map((h, i) => (
                <div key={i} className="flex-1 rounded-t-sm" style={{
                  height: `${h}%`,
                  background: i === 5
                    ? 'linear-gradient(to top, #1C6EF2, #818cf8)'
                    : 'rgba(148, 163, 184, 0.12)',
                }} />
              ))}
            </div>
            <div className="flex justify-between mt-1.5">
              {['Oct', 'Nov', 'Déc', 'Jan', 'Fév', 'Mar'].map((m) => (
                <span key={m} className="text-[9px] text-slate-600">{m}</span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Floating badge */}
      <div className="absolute -top-3 -right-3 bg-emerald-500 text-white text-[10px] font-bold px-2.5 py-1 rounded-full shadow-[0_0_16px_rgba(16,185,129,0.5)]">
        Cashflow +
      </div>
      <div className="absolute -bottom-3 -left-3 bg-[#111827] border border-white/10 rounded-xl px-3 py-1.5 shadow-lg">
        <div className="flex items-center gap-1.5">
          <CheckCircle2 size={12} className="text-emerald-400" />
          <span className="text-[10px] text-slate-300 font-medium">2 devis acceptés</span>
        </div>
      </div>
    </div>
  );
}

export default function HeroSection({ isConnected }) {
  return (
    <section className="relative min-h-screen bg-[#0A0F1E] flex items-center overflow-hidden">

      {/* Background gradients */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/3 w-[600px] h-[600px] rounded-full bg-indigo-500/20 blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] rounded-full bg-blue-500/15 blur-[100px]" />
        <div className="absolute top-1/2 left-1/4 w-[300px] h-[300px] rounded-full bg-violet-600/10 blur-[80px]" />
      </div>

      {/* Grid overlay */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)',
          backgroundSize: '50px 50px',
        }}
      />

      <div className="relative z-10 max-w-7xl mx-auto px-6 pt-24 pb-20 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">

          {/* Left: copy */}
          <div>
            {/* Badge */}
            <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold px-4 py-1.5 rounded-full mb-8">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
              Cockpit financier tout-en-un
            </div>

            {/* Headline */}
            <h1 className="text-5xl lg:text-7xl font-bold tracking-tight text-white leading-[1.06] mb-6">
              Gérez vos{' '}
              <span className="bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
                finances
              </span>
              {' '}en un coup d&apos;œil
            </h1>

            {/* Subtitle */}
            <p className="text-lg text-slate-400 leading-relaxed mb-10 max-w-lg">
              Fluxora centralise vos factures, devis, dépenses et comptabilité.
              Pensé pour les freelances et PME qui veulent gagner du temps.
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row gap-4 mb-12">
              <Link
                href={isConnected ? '/dashboard' : '/sign-up'}
                className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-[0_0_30px_rgba(79,70,229,0.4)] hover:shadow-[0_0_45px_rgba(79,70,229,0.6)] transition-all duration-200"
              >
                {isConnected ? 'Accéder au dashboard' : 'Commencer gratuitement'}
                <ArrowRight size={16} />
              </Link>
              {!isConnected && (
                <Link
                  href="/sign-in"
                  className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl font-semibold text-white/70 border border-white/20 hover:border-white/40 hover:text-white hover:bg-white/5 transition-all duration-200"
                >
                  Se connecter
                </Link>
              )}
            </div>

            {/* Social proof */}
            <div className="flex items-center gap-6 text-sm text-slate-500">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 size={14} className="text-emerald-500" />
                <span>Gratuit pour démarrer</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 size={14} className="text-emerald-500" />
                <span>Sans CB requise</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 size={14} className="text-emerald-500" />
                <span>Données sécurisées</span>
              </div>
            </div>
          </div>

          {/* Right: mockup */}
          <div className="lg:flex lg:justify-end">
            <DashboardMockup />
          </div>
        </div>
      </div>

      {/* Bottom fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-white to-transparent" />
    </section>
  );
}
