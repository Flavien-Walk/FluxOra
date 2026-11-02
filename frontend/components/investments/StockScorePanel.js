'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { ThumbsUp, ThumbsDown, Newspaper, ChevronDown, Sparkles, Info } from 'lucide-react';
import api from '@/lib/api';
import { cn } from '@/lib/utils';

const fetcher = async (url) => (await api.get(url)).data;

// Couleur de la note : rouge → ambre → vert, toujours accompagnée du libellé
const tone = (s) => (s == null ? '#94A3B8' : s >= 70 ? '#0E8A4F' : s >= 55 ? '#2E9E6A' : s >= 45 ? '#C98A12' : '#C0392B');
const VERDICT_CLASS = {
  favorable: 'bg-emerald-50 text-emerald-800',
  interesting: 'bg-emerald-50 text-emerald-700',
  neutral: 'bg-amber-50 text-amber-900',
  unfavorable: 'bg-red-50 text-red-800',
};

function Gauge({ score }) {
  const pct = Math.max(0, Math.min(100, score ?? 0));
  const angle = (pct / 100) * 180;
  const rad = (a) => (Math.PI * (180 - a)) / 180;
  const x = 60 + 48 * Math.cos(rad(angle)); const y = 60 - 48 * Math.sin(rad(angle));
  return (
    <svg viewBox="0 0 120 70" className="w-32" role="img" aria-label={`Score ${score ?? '—'} sur 100`}>
      <path d="M12 60 A48 48 0 0 1 108 60" fill="none" stroke="#E2E8F0" strokeWidth="10" strokeLinecap="round" />
      {score != null && <path d={`M12 60 A48 48 0 0 1 ${x.toFixed(1)} ${y.toFixed(1)}`} fill="none" stroke={tone(score)} strokeWidth="10" strokeLinecap="round" />}
      <text x="60" y="56" textAnchor="middle" fontSize="20" fontWeight="700" fill="#0F172A">{score == null ? '—' : `${Math.round(score)}%`}</text>
    </svg>
  );
}

/**
 * Score Fluxora d'une valeur : note en %, verdict, familles, points forts / faibles, presse, synthèse IA.
 */
export default function StockScorePanel({ isin }) {
  const { data, error, isLoading } = useSWR(isin ? `/api/investments/advisor/score/${isin}` : null, fetcher, { revalidateOnFocus: false });
  const [showAll, setShowAll] = useState(false);

  if (isLoading) {
    return <div className="rounded-xl border border-slate-200 p-4 text-sm text-slate-500">Analyse des 50 indicateurs en cours… (jusqu’à 10 s)</div>;
  }
  if (error || !data) {
    return <div className="rounded-xl border border-slate-200 p-4 text-sm text-slate-600">{error?.response?.data?.error || 'Score indisponible pour cette valeur.'}</div>;
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 space-y-4" aria-labelledby="score-title">
      <div className="flex flex-wrap items-center gap-4">
        <Gauge score={data.score} />
        <div className="min-w-0 flex-1">
          <h3 id="score-title" className="text-sm font-semibold text-slate-900">Score Fluxora</h3>
          {data.verdict && <span className={cn('mt-1 inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold', VERDICT_CLASS[data.verdict.key])}>{data.verdict.label}</span>}
          <p className="mt-1.5 text-xs text-slate-500">
            {data.rank ? `${data.rank}ᵉ sur ${data.universeSize} valeurs analysées · ` : ''}
            {data.available}/{data.applicable} indicateurs disponibles (confiance {Math.round(data.confidence)} %)
            {data.financialSector && ' · secteur financier : ratios de dette et d’EBITDA non pertinents, ignorés'}
          </p>
        </div>
      </div>

      {/* Familles */}
      <ul className="space-y-1.5">
        {data.families.map((f) => (
          <li key={f.key} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)_2.5rem] items-center gap-2 text-xs">
            <span className="truncate text-slate-700">{f.label} <span className="text-slate-500">({Math.round(f.weight * 100)} %)</span></span>
            <span className="h-2 rounded-full bg-slate-100 overflow-hidden" role="img" aria-label={`${f.label} : ${f.score ?? 'non disponible'} sur 100`}>
              {f.score != null && <span className="block h-full rounded-full" style={{ width: `${f.score}%`, background: tone(f.score) }} />}
            </span>
            <span className="text-right font-semibold tabular-nums text-slate-900">{f.score == null ? '—' : Math.round(f.score)}</span>
          </li>
        ))}
      </ul>

      {data.aiSummary && (
        <p className="flex gap-2 rounded-lg bg-accent-50/60 px-3 py-2 text-sm text-slate-800">
          <Sparkles size={15} className="mt-0.5 flex-shrink-0 text-accent-600" aria-hidden="true" /> {data.aiSummary}
        </p>
      )}

      {/* Pourquoi cette note */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <p className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-emerald-800"><ThumbsUp size={13} aria-hidden="true" /> Points forts</p>
          <ul className="space-y-1.5 text-xs text-slate-700">
            {data.strengths.length ? data.strengths.map((s) => <li key={s.key}>{s.text}</li>) : <li className="text-slate-500">Aucun indicateur nettement au-dessus de la moyenne.</li>}
          </ul>
        </div>
        <div>
          <p className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-red-800"><ThumbsDown size={13} aria-hidden="true" /> Points faibles</p>
          <ul className="space-y-1.5 text-xs text-slate-700">
            {data.weaknesses.length ? data.weaknesses.map((s) => <li key={s.key}>{s.text}</li>) : <li className="text-slate-500">Aucun indicateur nettement en dessous de la moyenne.</li>}
          </ul>
        </div>
      </div>

      {/* Presse */}
      {data.news?.length > 0 && (
        <div>
          <p className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-slate-700"><Newspaper size={13} aria-hidden="true" /> Dans la presse (30 derniers jours)</p>
          <ul className="space-y-1">
            {data.news.slice(0, 5).map((n) => (
              <li key={n.link} className="flex items-start gap-2 text-xs">
                <span className={cn('mt-0.5 flex-shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold',
                  n.tone === 'positive' ? 'bg-emerald-50 text-emerald-800' : n.tone === 'negative' ? 'bg-red-50 text-red-800' : 'bg-slate-100 text-slate-600')}>
                  {n.tone === 'positive' ? '+ positif' : n.tone === 'negative' ? '− négatif' : 'neutre'}
                </span>
                <a href={n.link} target="_blank" rel="noreferrer" className="text-slate-700 hover:text-accent-700 hover:underline">
                  {n.title} <span className="text-slate-500">— {n.source}, {new Date(n.date).toLocaleDateString('fr-FR')}</span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Détail des 50 indicateurs */}
      <div>
        <button onClick={() => setShowAll((v) => !v)} aria-expanded={showAll}
          className="flex items-center gap-1 text-xs font-semibold text-accent-700 hover:underline">
          <ChevronDown size={14} className={cn('transition-transform', showAll && 'rotate-180')} aria-hidden="true" />
          {showAll ? 'Masquer' : 'Voir'} le détail des 50 indicateurs
        </button>
        {showAll && (
          <div className="mt-2 max-h-72 overflow-auto rounded-lg border border-slate-100">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-slate-50 text-slate-500">
                <tr><th scope="col" className="px-2 py-1.5 text-left font-semibold">Indicateur</th><th scope="col" className="px-2 py-1.5 text-right font-semibold">Valeur</th><th scope="col" className="px-2 py-1.5 text-right font-semibold">Note</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.variables.map((v) => (
                  <tr key={v.key} className={cn(v.score == null && 'text-slate-500')}>
                    <td className="px-2 py-1">{v.label}</td>
                    <td className="px-2 py-1 text-right tabular-nums">{v.notApplicable ? 'non pertinent' : v.display ?? 'n.d.'}</td>
                    <td className="px-2 py-1 text-right font-semibold tabular-nums" style={{ color: v.score == null ? undefined : tone(v.score) }}>{v.score == null ? '—' : Math.round(v.score)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p className="flex items-start gap-1.5 text-[11px] text-slate-500">
        <Info size={12} className="mt-0.5 flex-shrink-0" aria-hidden="true" /> {data.disclaimer}
      </p>
    </section>
  );
}
