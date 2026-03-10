'use client';

import { CheckCircle2, UserX } from 'lucide-react';

export default function AssistantEntityCard({ entityCard }) {
  if (!entityCard) return null;
  const { found, name, detail } = entityCard;

  if (found) {
    return (
      <div className="mt-2.5 flex items-center gap-3 bg-emerald-50 border border-emerald-100 rounded-xl px-3.5 py-2.5">
        <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-[12.5px] font-semibold text-emerald-800 truncate">{name}</p>
          {detail && <p className="text-[11px] text-emerald-600">{detail}</p>}
        </div>
        <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-semibold shrink-0">Trouvé</span>
      </div>
    );
  }

  return (
    <div className="mt-2.5 flex items-center gap-3 bg-amber-50 border border-amber-100 rounded-xl px-3.5 py-2.5">
      <UserX size={14} className="text-amber-500 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-[12.5px] font-semibold text-amber-800 truncate">{name}</p>
        <p className="text-[11px] text-amber-600">Introuvable dans vos clients</p>
      </div>
      <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-semibold shrink-0">À créer</span>
    </div>
  );
}
