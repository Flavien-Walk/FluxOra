import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown } from 'lucide-react';

export function Card({ children, className, hover = false }) {
  return (
    <div
      className={cn(
        'bg-white rounded-xl shadow-card overflow-hidden',
        'border border-[rgba(148,163,184,0.3)]',
        hover && 'card-interactive hover:shadow-card-hover hover:border-[rgba(28,110,242,0.2)]',
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

/* ─── StatCard premium ────────────────────────────────── */
const STAT_THEMES = {
  indigo: {
    icon:    'bg-accent-50 text-accent-600',
    bar:     'bg-accent-500',
    trend:   'text-accent-700 bg-accent-50',
    value:   'text-slate-900',
  },
  green: {
    icon:    'bg-success-50 text-success-600',
    bar:     'bg-success-500',
    trend:   'text-success-700 bg-success-50',
    value:   'text-slate-900',
  },
  yellow: {
    icon:    'bg-warning-50 text-warning-600',
    bar:     'bg-warning-500',
    trend:   'text-warning-700 bg-warning-50',
    value:   'text-slate-900',
  },
  red: {
    icon:    'bg-danger-50 text-danger-600',
    bar:     'bg-danger-500',
    trend:   'text-danger-700 bg-danger-50',
    value:   'text-slate-900',
  },
  purple: {
    icon:    'bg-purple-50 text-purple-600',
    bar:     'bg-purple-500',
    trend:   'text-purple-700 bg-purple-50',
    value:   'text-slate-900',
  },
  blue: {
    icon:    'bg-blue-50 text-blue-600',
    bar:     'bg-blue-500',
    trend:   'text-blue-700 bg-blue-50',
    value:   'text-slate-900',
  },
};

/* Bar top colors for each theme */
const BAR_COLORS = {
  indigo: '#1C6EF2',
  green:  '#10B981',
  yellow: '#F59E0B',
  red:    '#EF4444',
  purple: '#9333EA',
  blue:   '#3B82F6',
};

export function StatCard({ label, value, sub, icon: Icon, color = 'indigo', trend }) {
  const t = STAT_THEMES[color] ?? STAT_THEMES.indigo;
  const barColor = BAR_COLORS[color] ?? BAR_COLORS.indigo;
  const trendPositive = trend == null ? null : trend >= 0;

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-card overflow-hidden relative">
      {/* Accent bar top */}
      <div className="h-[3px]" style={{ background: barColor }} />

      <div className="p-5">
        {/* Top row: icon + trend badge */}
        <div className="flex items-start justify-between mb-4">
          {Icon && (
            <div className={cn(
              'w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0',
              t.icon
            )}>
              <Icon size={18} strokeWidth={1.75} />
            </div>
          )}
          {trendPositive !== null && (
            <span className={cn(
              'flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-full',
              trendPositive
                ? 'text-success-700 bg-success-50'
                : 'text-danger-600 bg-danger-50'
            )}>
              {trendPositive
                ? <TrendingUp size={11} />
                : <TrendingDown size={11} />}
              {trendPositive ? '+' : ''}{trend}%
            </span>
          )}
        </div>

        {/* Label */}
        <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400 mb-1">
          {label}
        </p>

        {/* Value */}
        <p className={cn('text-2xl font-bold tabular-nums leading-tight', t.value)}>
          {value}
        </p>

        {/* Sub text */}
        {sub && (
          <p className="text-xs text-slate-400 mt-1.5">{sub}</p>
        )}
      </div>
    </div>
  );
}
