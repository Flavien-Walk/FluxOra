'use client';

import { useState, useEffect } from 'react';
import { Loader2, UserPlus } from 'lucide-react';
import api from '@/lib/api';

export default function AssistantClientPicker({ flow, onSelectClient, onNewClient }) {
  const [clients,    setClients]    = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [selectedId, setSelectedId] = useState(null);

  useEffect(() => {
    api.get('/api/assistant/clients')
      .then(({ data }) => setClients(data.clients || []))
      .catch(() => setClients([]))
      .finally(() => setLoading(false));
  }, []);

  const handleSelect = async (clientId, clientName) => {
    if (selectedId) return; // évite double-clic
    setSelectedId(clientId);
    await onSelectClient(clientId, clientName);
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-slate-400 text-[12px] mt-3">
        <Loader2 size={13} className="animate-spin" />
        <span>Chargement des clients…</span>
      </div>
    );
  }

  return (
    <div className="mt-3 space-y-1.5">
      {clients.length === 0 && (
        <p className="text-[12px] text-slate-400 py-1">Aucun client enregistré pour l&apos;instant.</p>
      )}

      {clients.map((c) => {
        const isRunning = selectedId === c._id;
        const isDisabled = !!selectedId;
        return (
          <button
            key={c._id}
            onClick={() => handleSelect(c._id, c.name)}
            disabled={isDisabled}
            className="w-full flex items-center gap-2.5 text-left rounded-xl bg-white border border-slate-200 hover:border-accent-300 hover:bg-accent-50 disabled:opacity-60 disabled:cursor-not-allowed px-3.5 py-2.5 transition-colors"
          >
            <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
              {isRunning
                ? <Loader2 size={12} className="animate-spin text-accent-600" />
                : <span className="text-[11px] font-bold text-slate-600">{c.name[0]?.toUpperCase()}</span>
              }
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[12.5px] font-semibold text-slate-800 truncate">{c.name}</p>
              {c.company && <p className="text-[11px] text-slate-400 truncate">{c.company}</p>}
              {!c.company && c.email && <p className="text-[11px] text-slate-400 truncate">{c.email}</p>}
            </div>
          </button>
        );
      })}

      <button
        onClick={onNewClient}
        disabled={!!selectedId}
        className="w-full flex items-center gap-2 rounded-xl bg-slate-50 border border-slate-200 hover:bg-slate-100 disabled:opacity-60 px-3.5 py-2.5 text-[12.5px] font-medium text-slate-600 transition-colors"
      >
        <UserPlus size={13} />
        <span>Créer un nouveau client</span>
      </button>
    </div>
  );
}
