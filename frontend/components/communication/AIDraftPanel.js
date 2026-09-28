'use client';

import { useState } from 'react';
import { Sparkles, Wand2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import Button from '@/components/ui/Button';
import { socialApi } from '@/hooks/useSocial';

const TONES = [
  { id: 'professionnel', label: 'Professionnel' },
  { id: 'inspirant', label: 'Inspirant' },
  { id: 'pedagogique', label: 'Pédagogique' },
  { id: 'decontracte', label: 'Décontracté' },
];

const IDEAS = [
  'Présenter mon activité et mes services',
  'Partager une leçon apprise ce trimestre',
  'Annoncer une nouvelle offre',
  '3 conseils pour mieux gérer sa trésorerie',
];

/**
 * Rédaction assistée : l'IA (compétence marketing) propose 3 variantes + des photos.
 * onApply({ text, photos, brief }) remplit l'éditeur.
 */
export default function AIDraftPanel({ onApply, aiConfigured }) {
  const [brief, setBrief] = useState('');
  const [tone, setTone] = useState('professionnel');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const generate = async () => {
    if (brief.trim().length < 5) return toast.error('Décrivez le sujet du post en quelques mots.');
    setLoading(true);
    try {
      const data = await socialApi.aiDraft({ brief: brief.trim(), tone });
      setResult(data);
    } catch (err) {
      toast.error(err.response?.data?.error || 'La rédaction IA a échoué.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-xl border border-accent-100 bg-gradient-to-br from-accent-50/70 to-white p-4 space-y-3">
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-accent-500 to-accent-700 flex items-center justify-center">
          <Sparkles size={14} className="text-white" />
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-900">Rédiger avec l'IA</p>
          <p className="text-[11px] text-slate-500">Accroche, structure aérée, appel à l'action et hashtags</p>
        </div>
      </div>

      {!aiConfigured && (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-[11px] text-amber-800">
          IA non configurée : ajoutez ANTHROPIC_API_KEY dans les variables d'environnement du back.
        </p>
      )}

      <textarea
        value={brief}
        onChange={(e) => setBrief(e.target.value)}
        rows={3}
        placeholder="De quoi voulez-vous parler ? Ex. : on vient de terminer la refonte du site d'une boulangerie, 2 mois de travail, +40 % de commandes en ligne"
        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent-500 resize-none"
      />

      <div className="flex flex-wrap gap-1.5">
        {IDEAS.map((idea) => (
          <button key={idea} onClick={() => setBrief(idea)} className="rounded-full bg-white border border-slate-200 px-2.5 py-1 text-[11px] text-slate-600 hover:border-accent-300 hover:text-accent-700">
            {idea}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap gap-1">
          {TONES.map((t) => (
            <button
              key={t.id}
              onClick={() => setTone(t.id)}
              className={cn('rounded-md px-2.5 py-1 text-xs font-medium transition', tone === t.id ? 'bg-accent-600 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50')}
            >
              {t.label}
            </button>
          ))}
        </div>
        <Button size="sm" onClick={generate} loading={loading} disabled={!aiConfigured} className="ml-auto">
          <Wand2 size={14} /> Générer
        </Button>
      </div>

      {result?.variants?.length > 0 && (
        <div className="space-y-2 pt-1">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">Choisissez une variante</p>
          {result.variants.map((v, i) => (
            <div key={i} className="rounded-lg border border-slate-200 bg-white p-3">
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <span className="text-[11px] font-semibold text-accent-700">{v.angle}</span>
                <button
                  onClick={() => onApply({ text: v.text, photos: result.photos || [], brief: brief.trim() })}
                  className="text-xs font-semibold text-accent-600 hover:text-accent-800"
                >
                  Utiliser →
                </button>
              </div>
              <p className="text-xs text-slate-600 whitespace-pre-line line-clamp-5">{v.text}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
