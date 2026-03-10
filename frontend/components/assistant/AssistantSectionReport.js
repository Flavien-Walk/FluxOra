'use client';

import { ASSISTANT_SECTION_CONFIG } from '@/lib/assistant/normalizeAssistantResponse';

export default function AssistantSectionReport({ sections }) {
  if (!sections) return null;

  return (
    <div className="mt-3 space-y-3">
      {ASSISTANT_SECTION_CONFIG.map(([key, title]) => {
        const items = sections[key] || [];
        if (!items.length) return null;

        return (
          <section key={key} className="rounded-xl border border-slate-200 bg-white/70 px-3.5 py-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
              {title}
            </p>
            <ul className="mt-2 space-y-1.5">
              {items.map((item, index) => (
                <li key={`${key}-${index}`} className="flex gap-2 text-[12.5px] text-slate-700 leading-relaxed">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent-400" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
