import { cn } from '@/lib/utils';

export function Card({ children, className, hover = false }) {
  return (
    <div
      className={cn(
        'bg-white rounded-xl border border-gray-200 shadow-card overflow-hidden',
        hover && 'transition-shadow duration-200 hover:shadow-card-hover hover:border-gray-300',
        className
      )}
    >
      {children}
    </div>
  );
}

export function CardHeader({ children, className }) {
  return (
    <div className={cn('px-5 py-4 border-b border-gray-100', className)}>
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
const STAT_COLORS = {
  indigo:  { icon: 'bg-indigo-50 text-indigo-600',  value: 'text-gray-900', badge: 'text-indigo-600 bg-indigo-50' },
  green:   { icon: 'bg-green-50 text-green-600',    value: 'text-gray-900', badge: 'text-green-600 bg-green-50'   },
  yellow:  { icon: 'bg-amber-50 text-amber-600',    value: 'text-gray-900', badge: 'text-amber-600 bg-amber-50'   },
  red:     { icon: 'bg-red-50 text-red-600',        value: 'text-gray-900', badge: 'text-red-600 bg-red-50'       },
  purple:  { icon: 'bg-purple-50 text-purple-600',  value: 'text-gray-900', badge: 'text-purple-600 bg-purple-50' },
  blue:    { icon: 'bg-blue-50 text-blue-600',      value: 'text-gray-900', badge: 'text-blue-600 bg-blue-50'     },
};

export function StatCard({ label, value, sub, icon: Icon, color = 'indigo', trend }) {
  const c = STAT_COLORS[color] ?? STAT_COLORS.indigo;
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-card p-5">
      <div className="flex items-start justify-between mb-3">
        {Icon && (
          <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0', c.icon)}>
            <Icon size={17} />
          </div>
        )}
        {trend != null && (
          <span className={cn(
            'text-xxs font-semibold px-1.5 py-0.5 rounded-md',
            trend >= 0 ? 'text-green-700 bg-green-50' : 'text-red-600 bg-red-50'
          )}>
            {trend >= 0 ? '+' : ''}{trend}%
          </span>
        )}
      </div>
      <p className="text-xxs font-semibold uppercase tracking-wide text-gray-400 mb-1">{label}</p>
      <p className={cn('text-2xl font-bold tabular-nums', c.value)}>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}
