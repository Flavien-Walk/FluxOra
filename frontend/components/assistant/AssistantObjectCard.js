'use client';

import { cn } from '@/lib/utils';

const TONE_STYLES = {
  default: 'border-slate-200 bg-white text-slate-700',
  success: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  warning: 'border-amber-200 bg-amber-50 text-amber-800',
  danger: 'border-red-200 bg-red-50 text-red-800',
  info: 'border-accent-200 bg-accent-50 text-accent-800',
};

export default function AssistantObjectCard({ card }) {
  if (!card) return null;

  return (
    <div className={cn('mt-2.5 rounded-xl border px-3.5 py-3', TONE_STYLES[card.tone] || TONE_STYLES.default)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[12.5px] font-semibold leading-snug">{card.title}</p>
          {card.subtitle && (
            <p className="mt-0.5 text-[11px] opacity-80">{card.subtitle}</p>
          )}
        </div>
        {(card.badge || card.confidence?.label) && (
          <div className="flex flex-col items-end gap-1 shrink-0">
            {card.badge && (
              <span className="rounded-full bg-white/70 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                {card.badge}
              </span>
            )}
            {card.confidence?.label && (
              <span className="rounded-full bg-white/70 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                Confiance {card.confidence.label.toLowerCase()}
              </span>
            )}
          </div>
        )}
      </div>

      {card.fields?.length > 0 && (
        <div className="mt-3 grid gap-2">
          {card.fields.map((field, index) => (
            <div key={`${card.id}-field-${index}`} className="rounded-lg bg-white/70 px-3 py-2">
              {field.label && (
                <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                  {field.label}
                </p>
              )}
              <p className="text-[12px] text-slate-700">{field.value}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
