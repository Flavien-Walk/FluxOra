'use client';

import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { useCountUp } from '@/hooks/useCountUp';

export function Card({ children, className, hover = false }) {
  return (
    <div
      className={cn(
        'bg-white rounded-xl shadow-card overflow-hidden',
        'border border-slate-100',
        hover && 'card-interactive hover:shadow-card-hover hover:border-slate-200',
        className
      )}
    >
      {children}
    </div>
  );
}

export function CardHeader({ children, className }) {
  return (
    <div className={cn('px-5 py-4 border-b border-slate-100', className)}>
      {children}
    </div>
  );
}

export function CardBody({ children, className }) {
  return (
    <div className={cn('px-5 py-4', className)}>
      {children}
    </div>
  );
}

/* ─── StatCard — Stripe / Mercury / Ramp style ───────────── */
const STAT_THEMES = {
  indigo: {
    icon:     'bg-gradient-to-br from-accent-500 to-accent-700 text-white',
    iconGlow: '0 4px 14px rgba(28,110,242,0.5)',
    value:    'text-slate-900',
  },
  green: {
    icon:     'bg-gradient-to-br from-emerald-400 to-emerald-600 text-white',
    iconGlow: '0 4px 14px rgba(16,185,129,0.5)',
    value:    'text-slate-900',
  },
  yellow: {
    icon:     'bg-gradient-to-br from-amber-400 to-amber-600 text-white',
    iconGlow: '0 4px 14px rgba(245,158,11,0.5)',
    value:    'text-slate-900',
  },
  red: {
    icon:     'bg-gradient-to-br from-red-500 to-red-700 text-white',
    iconGlow: '0 4px 14px rgba(239,68,68,0.5)',
    value:    'text-slate-900',
  },
  purple: {
    icon:     'bg-gradient-to-br from-violet-500 to-violet-700 text-white',
    iconGlow: '0 4px 14px rgba(139,92,246,0.5)',
    value:    'text-slate-900',
  },
  blue: {
    icon:     'bg-gradient-to-br from-blue-500 to-blue-700 text-white',
    iconGlow: '0 4px 14px rgba(59,130,246,0.5)',
    value:    'text-slate-900',
  },
  rose: {
    icon:     'bg-gradient-to-br from-rose-500 to-rose-700 text-white',
    iconGlow: '0 4px 14px rgba(244,63,94,0.5)',
    value:    'text-slate-900',
  },
};

/**
 * StatCard — Carte KPI premium.
 * Props:
 *  - value       : string  — valeur formatée (statique)
 *  - numericValue: number  — active l'animation countUp
 *  - formatter   : fn      — (n) => string
 */
export function StatCard({ label, value, sub, icon: Icon, color = 'indigo', trend, numericValue, formatter }) {
  const t = STAT_THEMES[color] ?? STAT_THEMES.indigo;
  const trendPositive = trend == null ? null : trend >= 0;

  const defaultFmt = (n) => Math.round(n).toLocaleString('fr-FR');
  const animated = useCountUp(
    numericValue != null ? numericValue : null,
    formatter ?? defaultFmt,
    800,
  );

  const displayValue = numericValue != null ? (animated ?? '…') : value;

  return (
    <div className="bg-white rounded-xl border border-slate-100 shadow-card relative group transition-all duration-200 hover:shadow-card-hover hover:-translate-y-0.5">
      <div className="p-5">
        {/* Icon + trend */}
        <div className="flex items-start justify-between mb-4">
          {Icon && (
            <div
              className={cn(
                'w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0',
                'transition-transform duration-300 group-hover:scale-110',
                t.icon,
              )}
              style={{ boxShadow: t.iconGlow }}
            >
              <Icon size={18} strokeWidth={1.75} />
            </div>
          )}
          {trendPositive !== null && (
            <span className={cn(
              'flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-full',
              trendPositive
                ? 'text-success-700 bg-success-50'
                : 'text-danger-600 bg-danger-50',
            )}>
              {trendPositive ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
              {trendPositive ? '+' : ''}{trend}%
            </span>
          )}
        </div>

        {/* Label */}
        <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400 mb-1">
          {label}
        </p>

        {/* Value */}
        <p className={cn('text-2xl font-bold tabular-nums leading-tight stat-value-enter', t.value)}>
          {displayValue}
        </p>

        {/* Sub */}
        {sub && (
          <p className="text-xs text-slate-400 mt-1.5">{sub}</p>
        )}
      </div>
    </div>
  );
}
