'use client';

import { useEffect, useState } from 'react';

// Indicateur de chargement qui explique l'attente quand l'API (offre gratuite) se réveille
export default function ServerWakeLoader({ delayMs = 4000 }) {
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setSlow(true), delayMs);
    return () => clearTimeout(t);
  }, [delayMs]);

  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-3 p-6 text-center" role="status" aria-live="polite">
      <div className="w-5 h-5 border-2 border-accent-600 border-t-transparent rounded-full animate-spin" aria-hidden="true" />
      <p className="text-sm text-slate-600">
        {slow ? 'Réveil du serveur… cela peut prendre jusqu’à une minute après une période d’inactivité.' : 'Chargement…'}
      </p>
    </div>
  );
}
