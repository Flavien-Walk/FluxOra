'use client';

import { cn } from '@/lib/utils';

export default function PartnerFilters({ categories, active, onChange, counts }) {
  return (
    <div className="flex gap-1.5 flex-wrap">
      {categories.map(({ id, label }) => {
        const count = counts?.[id] ?? 0;
        const isAll = id === 'all';
        return (
          <button
            key={id}
            onClick={() => onChange(id)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150',
              active === id
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-white border border-slate-200 text-slate-500 hover:border-slate-300 hover:text-slate-700'
            )}
          >
            {label}
            {!isAll && count > 0 && (
              <span className={cn(
                'text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none tabular-nums',
                active === id ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-400',
              )}>
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
