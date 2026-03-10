'use client';

const STATUS_STYLES = {
  ready: 'bg-accent-50 text-accent-700 border-accent-100',
  info: 'bg-slate-50 text-slate-600 border-slate-200',
  success: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  warning: 'bg-amber-50 text-amber-700 border-amber-100',
  error: 'bg-red-50 text-red-700 border-red-100',
};

export default function AssistantJournal({ entries }) {
  if (!entries?.length) return null;

  return (
    <div className="border-t border-slate-100 px-4 py-3">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
        Journal de l&apos;agent
      </p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {entries.slice(-6).map((entry, index) => (
          <span
            key={`${entry.type || 'entry'}-${entry.at || index}`}
            className={`rounded-full border px-2.5 py-1 text-[10px] font-medium ${STATUS_STYLES[entry.status] || STATUS_STYLES.info}`}
          >
            {entry.label || entry.type || 'Événement'}
          </span>
        ))}
      </div>
    </div>
  );
}
