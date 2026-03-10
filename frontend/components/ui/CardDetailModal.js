'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, RotateCcw, Lock, Unlock, Trash2, Zap } from 'lucide-react';
import Button from '@/components/ui/Button';

const COLOR_MAP = {
  indigo:  'from-indigo-500 to-indigo-800',
  violet:  'from-violet-500 to-violet-800',
  emerald: 'from-emerald-400 to-emerald-700',
  rose:    'from-rose-500 to-rose-800',
  amber:   'from-amber-400 to-orange-600',
  sky:     'from-sky-400 to-sky-700',
};

const CATEGORIES = [
  { value: 'software',  label: 'Logiciels / SaaS' },
  { value: 'marketing', label: 'Marketing / Pub' },
  { value: 'suppliers', label: 'Fournisseurs' },
  { value: 'travel',    label: 'Déplacements' },
  { value: 'office',    label: 'Bureautique' },
  { value: 'other',     label: 'Autre' },
];

const fmt = (n) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n ?? 0);

export default function CardDetailModal({ card, open, onClose, onToggleBlock, onDelete, loading }) {
  const [flipped, setFlipped] = useState(false);

  /* Reset flip when a different card opens */
  useEffect(() => { if (open) setFlipped(false); }, [open, card?._id]);

  if (!card) return null;

  const gradient = COLOR_MAP[card.color] || COLOR_MAP.indigo;
  const usePct   = card.monthlyLimit > 0
    ? Math.min(100, Math.round((card.currentMonthSpend / card.monthlyLimit) * 100))
    : 0;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(8px)' }}
          onClick={onClose}
        >
          <motion.div
            key="panel"
            initial={{ opacity: 0, scale: 0.93, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.93, y: 20 }}
            transition={{ type: 'spring', stiffness: 360, damping: 32 }}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-[420px] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >

            {/* ─── Header ─────────────────────────────────── */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <div>
                <h2 className="text-[15px] font-semibold text-slate-900">{card.name}</h2>
                <p className="text-[11px] mt-0.5">
                  {card.status === 'blocked'
                    ? <span className="text-red-500 font-medium">● Bloquée</span>
                    : <span className="text-emerald-500 font-medium">● Active</span>
                  }
                </p>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors"
              >
                <X size={15} className="text-slate-600" />
              </button>
            </div>

            {/* ─── 3D Card flip ───────────────────────────── */}
            <div className="px-5 pt-5 pb-3 flex flex-col items-center">
              {/* Perspective wrapper */}
              <div style={{ perspective: '1100px', width: '340px', height: '204px' }}>
                <motion.div
                  animate={{ rotateY: flipped ? 180 : 0 }}
                  transition={{ type: 'spring', stiffness: 260, damping: 26 }}
                  style={{ transformStyle: 'preserve-3d', width: '100%', height: '100%', position: 'relative' }}
                >

                  {/* RECTO */}
                  <div
                    style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden', position: 'absolute', inset: 0 }}
                    className={`rounded-2xl bg-gradient-to-br ${gradient} text-white p-6 overflow-hidden`}
                  >
                    {/* Dot pattern */}
                    <div className="absolute inset-0" style={{
                      opacity: 0.06,
                      backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)',
                      backgroundSize: '20px 20px',
                    }} />
                    {/* Chip EMV */}
                    <div className="absolute top-5 right-5 w-10 h-7 rounded-md bg-gradient-to-br from-yellow-300/70 to-yellow-500/50 border border-white/25 flex items-center justify-center">
                      <div style={{
                        width: '28px', height: '20px', borderRadius: '2px',
                        background: 'repeating-linear-gradient(90deg,rgba(0,0,0,0.12),rgba(0,0,0,0.12) 1.5px,transparent 1.5px,transparent 4px)',
                        border: '1px solid rgba(0,0,0,0.12)',
                      }} />
                    </div>
                    <div className="relative z-10 h-full flex flex-col justify-between">
                      <div className="flex items-center gap-1.5">
                        <Zap size={14} fill="currentColor" className="text-white/75" />
                        <span className="text-[13px] font-bold tracking-wide text-white/90">Fluxora</span>
                      </div>
                      <p className="text-[15px] font-mono tracking-[0.24em] text-white/85">
                        •••• •••• •••• {card.last4}
                      </p>
                      <div className="flex justify-between items-end">
                        <div>
                          <p className="text-[9px] text-white/45 uppercase tracking-widest mb-0.5">Titulaire</p>
                          <p className="text-[14px] font-semibold">{card.name}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[9px] text-white/45 uppercase tracking-widest mb-0.5">Expire</p>
                          <p className="text-[13px] font-mono">{String(card.expiryMonth).padStart(2, '0')}/{card.expiryYear}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* VERSO */}
                  <div
                    style={{
                      backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden',
                      transform: 'rotateY(180deg)',
                      position: 'absolute', inset: 0,
                    }}
                    className={`rounded-2xl bg-gradient-to-br ${gradient} text-white overflow-hidden`}
                  >
                    <div className="absolute inset-0" style={{
                      opacity: 0.06,
                      backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)',
                      backgroundSize: '20px 20px',
                    }} />
                    {/* Bande magnétique */}
                    <div className="absolute top-9 left-0 right-0 h-11 bg-black/60" />
                    {/* Zone signature + CVC */}
                    <div className="relative z-10 pt-[84px] px-5 space-y-3">
                      <div className="flex items-center gap-3">
                        {/* Signature strip */}
                        <div className="flex-1 h-8 bg-white rounded-sm flex items-end px-2 pb-1 overflow-hidden">
                          <div className="flex gap-[2px] items-end w-full">
                            {Array.from({ length: 32 }).map((_, i) => (
                              <div key={i} className="flex-1 rounded-t-[1px]" style={{
                                height: `${8 + Math.sin(i * 1.3) * 6}px`,
                                background: `hsl(${220 + i * 4},55%,70%)`,
                                opacity: 0.7,
                              }} />
                            ))}
                          </div>
                        </div>
                        {/* CVC box */}
                        <div className="bg-white rounded-lg px-3.5 py-2 text-center min-w-[56px]">
                          <p className="text-[8px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5">CVC</p>
                          <p className="text-sm font-mono font-bold text-slate-800 tracking-widest">•••</p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between mt-1">
                        <div className="flex items-center gap-1.5">
                          <Zap size={11} fill="currentColor" className="text-white/65" />
                          <span className="text-[11px] font-bold tracking-wide text-white/75">Fluxora</span>
                        </div>
                        <p className="text-[9px] text-white/40">Carte virtuelle simulée</p>
                      </div>
                    </div>
                  </div>

                </motion.div>
              </div>

              {/* Flip toggle */}
              <button
                onClick={() => setFlipped((f) => !f)}
                className="mt-3.5 flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-slate-700 transition-colors group"
              >
                <RotateCcw size={12} className="transition-transform duration-300 group-hover:-rotate-180" />
                {flipped ? 'Voir le recto' : 'Voir le verso'}
              </button>
            </div>

            {/* ─── Budget + Détails ────────────────────────── */}
            <div className="px-5 pb-3">
              <div className="bg-slate-50 rounded-xl p-4 space-y-3">
                <div>
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="text-slate-500 font-medium">Budget mensuel</span>
                    <span className="tabular-nums">
                      <span className="font-semibold text-slate-800">{fmt(card.currentMonthSpend)}</span>
                      <span className="text-slate-400"> / {fmt(card.monthlyLimit)}</span>
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-1.5">
                    <div
                      className={`h-1.5 rounded-full transition-all duration-500 ${usePct > 80 ? 'bg-red-500' : 'bg-emerald-500'}`}
                      style={{ width: `${usePct}%` }}
                    />
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1 tabular-nums">
                    {fmt(card.monthlyLimit - card.currentMonthSpend)} restants ce mois
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-x-4 gap-y-2.5 text-xs border-t border-slate-200 pt-3">
                  <div>
                    <p className="text-slate-400 mb-0.5">Catégorie</p>
                    <p className="font-semibold text-slate-700">
                      {CATEGORIES.find((c) => c.value === card.category)?.label || card.category}
                    </p>
                  </div>
                  {card.linkedVendor && (
                    <div>
                      <p className="text-slate-400 mb-0.5">Fournisseur</p>
                      <p className="font-semibold text-slate-700">{card.linkedVendor}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-slate-400 mb-0.5">Numéro</p>
                    <p className="font-mono font-semibold text-slate-700">•••• {card.last4}</p>
                  </div>
                  <div>
                    <p className="text-slate-400 mb-0.5">Expiration</p>
                    <p className="font-mono font-semibold text-slate-700">
                      {String(card.expiryMonth).padStart(2, '0')}/{card.expiryYear}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* ─── Actions ─────────────────────────────────── */}
            <div className="px-5 py-4 flex gap-2 border-t border-slate-100">
              <Button
                size="sm"
                variant="secondary"
                onClick={() => onToggleBlock(card)}
                loading={loading === card._id}
                className="flex-1"
              >
                {card.status === 'blocked'
                  ? <><Unlock size={13} /> Débloquer</>
                  : <><Lock size={13} /> Bloquer</>
                }
              </Button>
              <Button
                size="sm"
                variant="danger"
                onClick={() => { onDelete(card); }}
                loading={loading === card._id + '-del'}
              >
                <Trash2 size={13} /> Supprimer
              </Button>
            </div>

          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
