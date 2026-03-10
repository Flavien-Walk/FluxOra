'use client';

import Link from 'next/link';
import { ArrowRight, CheckCircle2, ShieldCheck, Zap, TrendingUp } from 'lucide-react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';

/* ─── Variants ─── */
const fadeUp = { hidden: { opacity: 0, y: 24 }, show: { opacity: 1, y: 0 } };
const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.11 } } };

/* ─── Floating badge ─── */
function FloatingBadge({ children, className, delay = 0 }) {
  return (
    <motion.div
      className={`absolute pointer-events-none ${className}`}
      initial={{ opacity: 0, scale: 0.82 }}
      animate={{ opacity: 1, scale: 1, y: [0, -7, 0] }}
      transition={{
        opacity: { duration: 0.5, delay },
        scale:   { duration: 0.5, delay },
        y: { duration: 3.8, delay: delay + 0.6, repeat: Infinity, ease: 'easeInOut' },
      }}
    >
      {children}
    </motion.div>
  );
}

/* ─── Mini KPI ─── */
function MockKPI({ label, value, color, sub }) {
  const palette = {
    green:  { bg: 'bg-emerald-500/10', text: 'text-emerald-400', dot: 'bg-emerald-400' },
    blue:   { bg: 'bg-blue-500/10',    text: 'text-blue-400',    dot: 'bg-blue-400'    },
    yellow: { bg: 'bg-amber-500/10',   text: 'text-amber-400',   dot: 'bg-amber-400'   },
    indigo: { bg: 'bg-indigo-500/10',  text: 'text-indigo-400',  dot: 'bg-indigo-400'  },
  };
  const c = palette[color] ?? palette.blue;
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

/* ─── Dashboard Mockup 3D avec parallax souris ─── */
function DashboardMockup3D() {
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const rotateX = useSpring(useTransform(mouseY, [-0.5, 0.5], [7, -7]),  { stiffness: 120, damping: 25 });
  const rotateY = useSpring(useTransform(mouseX, [-0.5, 0.5], [-9, 9]),  { stiffness: 120, damping: 25 });
  const shadowX = useTransform(mouseX, [-0.5, 0.5], [-16, 16]);
  const shadowY = useTransform(mouseY, [-0.5, 0.5], [-10, 20]);

  const handleMove = (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    mouseX.set((e.clientX - r.left - r.width  / 2) / r.width);
    mouseY.set((e.clientY - r.top  - r.height / 2) / r.height);
  };
  const handleLeave = () => { mouseX.set(0); mouseY.set(0); };

  return (
    <div
      className="relative w-full max-w-lg mx-auto lg:mx-0"
      style={{ perspective: '1100px' }}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
    >
      {/* Ambient glow */}
      <div className="absolute inset-0 bg-gradient-to-r from-blue-500/15 to-indigo-500/15 rounded-3xl blur-2xl scale-110 pointer-events-none" />

      {/* 3D tilt container */}
      <motion.div
        style={{ rotateX, rotateY, transformStyle: 'preserve-3d' }}
        initial={{ opacity: 0, y: 32, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.75, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
        className="relative"
      >
        {/* Dynamic depth shadow */}
        <motion.div
          className="absolute -inset-1 rounded-2xl opacity-30 pointer-events-none"
          style={{
            background: 'linear-gradient(135deg,rgba(99,102,241,0.3),rgba(28,110,242,0.2))',
            translateX: shadowX,
            translateY: shadowY,
            filter: 'blur(20px)',
          }}
        />

        {/* Card */}
        <div className="relative bg-[#0D1526]/95 border border-white/10 rounded-2xl shadow-[0_25px_70px_rgba(0,0,0,0.65)] overflow-hidden backdrop-blur-sm">

          {/* Mac header */}
          <div className="flex items-center gap-1.5 px-4 py-3 border-b border-white/5 bg-white/[0.02]">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500/70" />
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500/70" />
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/70" />
            <div className="flex-1 flex justify-center">
              <span className="text-[11px] text-slate-500 font-medium px-3 py-0.5 bg-slate-800/60 rounded-md">
                fluxora.io/dashboard
              </span>
            </div>
          </div>

          {/* Content */}
          <div className="p-5 space-y-4">
            {/* Header banner */}
            <div className="rounded-xl px-4 py-3 bg-gradient-to-r from-slate-900 to-[#1A2744] border border-white/5 flex items-center justify-between">
              <div>
                <p className="text-[10px] text-slate-500 uppercase tracking-widest">Bonjour 👋</p>
                <p className="text-white text-sm font-bold">Acme Studio</p>
              </div>
              <div className="flex items-center gap-5">
                <div className="text-right">
                  <p className="text-[10px] text-slate-500">CA total</p>
                  <p className="text-sm font-bold text-white tabular-nums">84 200 €</p>
                </div>
                <div className="w-px h-6 bg-slate-700" />
                <div className="text-right">
                  <p className="text-[10px] text-slate-500">Cashflow</p>
                  <p className="text-sm font-bold text-emerald-400 tabular-nums">+12 400 €</p>
                </div>
              </div>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-2 gap-2.5">
              <MockKPI label="Chiffre d'affaires" value="84 200 €" color="green"  sub="CA total" />
              <MockKPI label="En attente"         value="6 800 €"  color="yellow" sub="3 factures" />
              <MockKPI label="Dépenses"           value="5 320 €"  color="indigo" sub="Ce mois" />
              <MockKPI label="Devis en cours"     value="4"        color="blue"   sub="Valeur : 28 000 €" />
            </div>

            {/* Animated chart */}
            <div className="rounded-xl bg-slate-900/60 border border-white/5 p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-[10px] text-slate-500 uppercase tracking-widest">CA — 6 derniers mois</p>
                <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
                  <TrendingUp size={10} /> +18%
                </span>
              </div>
              <div className="flex items-end gap-1.5 h-12">
                {[35, 55, 40, 70, 60, 90].map((h, i) => (
                  <motion.div
                    key={i}
                    className="flex-1 rounded-t-sm"
                    style={{
                      background: i === 5
                        ? 'linear-gradient(to top,#1C6EF2,#818cf8)'
                        : 'rgba(148,163,184,0.12)',
                    }}
                    initial={{ height: 0 }}
                    animate={{ height: `${h}%` }}
                    transition={{ duration: 0.6, delay: 0.9 + i * 0.07, ease: 'easeOut' }}
                  />
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

        {/* Floating badges */}
        <FloatingBadge className="-top-4 -right-4" delay={1.0}>
          <div className="bg-emerald-500 text-white text-[10px] font-bold px-3 py-1.5 rounded-full shadow-[0_0_20px_rgba(16,185,129,0.6)] flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
            Cashflow positif
          </div>
        </FloatingBadge>

        <FloatingBadge className="-bottom-4 -left-4" delay={1.3}>
          <div className="bg-[#111827] border border-white/10 rounded-xl px-3 py-2 shadow-xl backdrop-blur-sm">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={13} className="text-emerald-400" />
              <span className="text-[11px] text-slate-300 font-medium">2 devis acceptés</span>
            </div>
          </div>
        </FloatingBadge>

        <FloatingBadge className="top-1/2 -right-14 hidden lg:block" delay={1.6}>
          <div className="bg-[#111827] border border-blue-500/30 rounded-xl px-3 py-2 shadow-xl backdrop-blur-sm">
            <div className="flex items-center gap-2">
              <Zap size={11} className="text-blue-400" fill="currentColor" />
              <span className="text-[11px] text-blue-300 font-medium">Facture envoyée</span>
            </div>
          </div>
        </FloatingBadge>
      </motion.div>
    </div>
  );
}

/* ─── Hero Section ─── */
export default function HeroSection({ isConnected }) {
  return (
    <section className="relative min-h-screen bg-[#0A0F1E] flex items-center overflow-hidden">

      {/* Background gradients */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/3 w-[700px] h-[700px] rounded-full bg-indigo-500/20 blur-[140px]" />
        <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] rounded-full bg-blue-500/15 blur-[120px]" />
        <div className="absolute top-1/2 left-1/4 w-[350px] h-[350px] rounded-full bg-violet-600/10 blur-[100px]" />
      </div>

      {/* Grid overlay */}
      <div
        className="absolute inset-0 opacity-[0.025] pointer-events-none"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,1) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,1) 1px,transparent 1px)',
          backgroundSize: '60px 60px',
        }}
      />

      <div className="relative z-10 max-w-7xl mx-auto px-6 pt-24 pb-20 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">

          {/* Copy */}
          <motion.div variants={stagger} initial="hidden" animate="show">
            <motion.div variants={fadeUp}>
              <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold px-4 py-1.5 rounded-full mb-8">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                Cockpit financier tout-en-un
              </div>
            </motion.div>

            <motion.h1 variants={fadeUp} className="text-5xl lg:text-7xl font-bold tracking-tight text-white leading-[1.06] mb-6">
              Pilotez vos{' '}
              <span className="bg-gradient-to-r from-blue-400 via-indigo-400 to-violet-400 bg-clip-text text-transparent">
                finances
              </span>
              <br />comme un pro
            </motion.h1>

            <motion.p variants={fadeUp} className="text-lg text-slate-400 leading-relaxed mb-10 max-w-lg">
              Fluxora centralise vos factures, devis, dépenses et comptabilité.
              Un seul outil pour remplacer cinq. Pensé pour les freelances et PME.
            </motion.p>

            <motion.div variants={fadeUp} className="flex flex-col sm:flex-row gap-4 mb-12">
              <Link
                href={isConnected ? '/dashboard' : '/sign-up'}
                className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-[0_0_30px_rgba(79,70,229,0.45)] hover:shadow-[0_0_50px_rgba(79,70,229,0.65)] transition-all duration-200 hover:-translate-y-0.5"
              >
                {isConnected ? 'Accéder au dashboard' : 'Commencer gratuitement'}
                <ArrowRight size={16} />
              </Link>
              {!isConnected && (
                <Link
                  href="/sign-in"
                  className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl font-semibold text-white/70 border border-white/15 hover:border-white/35 hover:text-white hover:bg-white/5 transition-all duration-200 hover:-translate-y-0.5"
                >
                  Se connecter
                </Link>
              )}
            </motion.div>

            <motion.div variants={fadeUp} className="flex flex-wrap items-center gap-5 text-sm text-slate-500">
              {[
                { icon: CheckCircle2, label: 'Gratuit pour démarrer' },
                { icon: ShieldCheck,  label: 'Données sécurisées RGPD' },
                { icon: Zap,          label: 'Opérationnel en 5 min' },
              ].map(({ icon: Icon, label }) => (
                <div key={label} className="flex items-center gap-1.5">
                  <Icon size={14} className="text-emerald-500" />
                  <span>{label}</span>
                </div>
              ))}
            </motion.div>
          </motion.div>

          {/* 3D Mockup */}
          <div className="lg:flex lg:justify-end lg:pr-8">
            <DashboardMockup3D />
          </div>
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-white to-transparent pointer-events-none" />
    </section>
  );
}
