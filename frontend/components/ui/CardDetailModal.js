'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, RotateCcw, Lock, Unlock, Trash2, Zap, Eye, EyeOff, Copy, Check } from 'lucide-react';
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

/* Simulated card data derived from last4 — no backend needed */
function fakeFullNumber(last4) {
  const l = String(last4).padStart(4, '0');
  return `4242 ${(1000 + parseInt(l, 10) % 9000).toString().slice(0, 4)} ${(5678 + parseInt(l[0] + l[2], 10) % 1000).toString().padStart(4, '0')} ${l}`;
}
function fakeCVC(last4) {
  const l = String(last4).padStart(4, '0');
  return `${(parseInt(l[1], 10) + 3) % 10}${(parseInt(l[2], 10) + 5) % 10}${(parseInt(l[3], 10) + 7) % 10}`;
}

function CopyBtn({ value }) {
  const [copied, setCopied] = useState(false);
  const handle = async () => {
    try { await navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch {}
  };
  return (
    <button onClick={handle} className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-400 hover:text-emerald-600 transition-colors">
      {copied ? <Check size={11} className="text-emerald-500" /> : <Copy size={11} />}
      {copied ? 'Copié' : 'Copier'}
    </button>
  );
}

export default function CardDetailModal({ card, open, onClose, onToggleBlock, onDelete, loading }) {
  const [flipped,     setFlipped]     = useState(false);
  const [showNumber,  setShowNumber]  = useState(false);
  const [showCVC,     setShowCVC]     = useState(false);

  /* Reset all reveals when modal opens or card changes */
  useEffect(() => {
    if (open) { setFlipped(false); setShowNumber(false); setShowCVC(false); }
  }, [open, card?._id]);

  const fullNumber = useMemo(() => fakeFullNumber(card?.last4), [card?.last4]);
  const cvc        = useMemo(() => fakeCVC(card?.last4),        [card?.last4]);

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
          transition={{ duration: 0.16 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(15,23,42,0.65)', backdropFilter: 'blur(10px)' }}
          onClick={onClose}
        >
          <motion.div
            key={`panel-${card._id}`}
            initial={{ opacity: 0, scale: 0.93, y: 18 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: 'spring', stiffness: 340, damping: 30 }}
            className="bg-white rounded-[22px] shadow-[0_28px_80px_rgba(15,23,42,0.3)] w-full max-w-[460px] overflow-hidden border border-slate-200/80"
            onClick={(e) => e.stopPropagation()}
          >

            {/* ── Header ───────────────────────────────────── */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <div>
                <h2 className="text-[16px] font-semibold text-slate-900 leading-tight">{card.name}</h2>
                <p className="text-[12px] mt-0.5 font-medium">
                  {card.status === 'blocked'
                    ? <span className="text-red-500">● Bloquée</span>
                    : <span className="text-emerald-500">● Active</span>
                  }
                </p>
              </div>
              <button onClick={onClose}
                className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors">
                <X size={16} className="text-slate-600" />
              </button>
            </div>

            {/* ── 3D Card + controls ───────────────────────── */}
            <div className="px-5 pt-6 pb-4 flex flex-col items-center gap-4">

              {/* Perspective wrapper — 3D lives here, not on the card faces */}
              <div style={{ perspective: '1200px', width: '100%', maxWidth: '360px', height: '216px' }}>
                <motion.div
                  animate={{ rotateY: flipped ? 180 : 0 }}
                  transition={{ type: 'spring', stiffness: 260, damping: 24 }}
                  style={{ transformStyle: 'preserve-3d', width: '100%', height: '100%', position: 'relative' }}
                >

                  {/* RECTO */}
                  <div
                    className={`absolute inset-0 rounded-[20px] bg-gradient-to-br ${gradient} text-white overflow-hidden`}
                    style={{
                      backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden',
                      boxShadow: '0 22px 56px rgba(0,0,0,0.24)',
                    }}
                  >
                    {/* Light overlay */}
                    <div className="absolute inset-0" style={{
                      background: 'radial-gradient(ellipse at 20% 20%, rgba(255,255,255,0.22) 0%, transparent 55%), radial-gradient(ellipse at 80% 80%, rgba(0,0,0,0.1) 0%, transparent 40%)',
                    }} />
                    {/* Dot pattern */}
                    <div className="absolute inset-0" style={{
                      opacity: 0.055,
                      backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)',
                      backgroundSize: '20px 20px',
                    }} />
                    {/* Chip EMV */}
                    <div className="absolute top-5 right-5 w-11 h-8 rounded-lg bg-gradient-to-br from-yellow-300/75 to-yellow-500/55 border border-white/20"
                      style={{ boxShadow: 'inset 0 1px 2px rgba(255,255,255,0.3)' }}>
                      <div style={{
                        margin: '4px 5px', width: '26px', height: '18px', borderRadius: '3px',
                        background: 'repeating-linear-gradient(90deg,rgba(0,0,0,0.1),rgba(0,0,0,0.1) 1.5px,transparent 1.5px,transparent 4px)',
                        border: '1px solid rgba(0,0,0,0.1)',
                      }} />
                    </div>

                    <div className="relative z-10 h-full flex flex-col justify-between p-6">
                      <div className="flex items-center gap-1.5">
                        <Zap size={14} fill="currentColor" className="text-white/80" />
                        <span className="text-[14px] font-bold tracking-wide text-white/90">Fluxora</span>
                      </div>

                      <div className="space-y-3">
                        {/* Number with reveal */}
                        <div>
                          <p className="text-[9px] text-white/45 uppercase tracking-[0.22em] mb-1.5">Numéro de carte</p>
                          <AnimatePresence mode="wait">
                            <motion.p
                              key={showNumber ? 'full' : 'masked'}
                              initial={{ opacity: 0, y: 3, filter: 'blur(5px)' }}
                              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                              exit={{ opacity: 0, y: -3, filter: 'blur(5px)' }}
                              transition={{ duration: 0.16 }}
                              className="text-[17px] font-mono tracking-[0.18em] text-white/90"
                            >
                              {showNumber ? fullNumber : `•••• •••• •••• ${card.last4}`}
                            </motion.p>
                          </AnimatePresence>
                        </div>

                        <div className="flex justify-between items-end">
                          <div>
                            <p className="text-[9px] text-white/45 uppercase tracking-widest mb-0.5">Titulaire</p>
                            <p className="text-[14px] font-semibold max-w-[190px] truncate">{card.name}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-[9px] text-white/45 uppercase tracking-widest mb-0.5">Expire</p>
                            <p className="text-[14px] font-mono">{String(card.expiryMonth).padStart(2, '0')}/{card.expiryYear}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* VERSO */}
                  <div
                    className={`absolute inset-0 rounded-[20px] bg-gradient-to-br ${gradient} text-white overflow-hidden`}
                    style={{
                      transform: 'rotateY(180deg)',
                      backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden',
                      boxShadow: '0 22px 56px rgba(0,0,0,0.24)',
                    }}
                  >
                    <div className="absolute inset-0" style={{
                      opacity: 0.055,
                      backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)',
                      backgroundSize: '20px 20px',
                    }} />
                    {/* Bande magnétique */}
                    <div className="absolute top-9 left-0 right-0 h-12 bg-black/60" />

                    <div className="relative z-10 px-5 pt-[90px] space-y-2.5">
                      <div className="flex items-center gap-3">
                        {/* Signature strip */}
                        <div className="flex-1 h-9 bg-white rounded-sm overflow-hidden flex items-end px-1.5 pb-1">
                          <div className="flex gap-[2px] items-end w-full">
                            {Array.from({ length: 34 }).map((_, i) => (
                              <div key={i} className="flex-1 rounded-t-[1px]" style={{
                                height: `${8 + Math.abs(Math.sin(i * 1.4)) * 5}px`,
                                background: `hsl(${205 + i * 5},55%,70%)`,
                                opacity: 0.7,
                              }} />
                            ))}
                          </div>
                        </div>
                        {/* CVC */}
                        <div className="bg-white rounded-lg px-3.5 py-2 text-center min-w-[64px]">
                          <p className="text-[8px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5">CVC</p>
                          <AnimatePresence mode="wait">
                            <motion.p
                              key={showCVC ? 'cvc-show' : 'cvc-hide'}
                              initial={{ opacity: 0, y: 2, filter: 'blur(4px)' }}
                              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                              exit={{ opacity: 0, y: -2, filter: 'blur(4px)' }}
                              transition={{ duration: 0.15 }}
                              className="text-sm font-mono font-bold text-slate-800 tracking-widest"
                            >
                              {showCVC ? cvc : '•••'}
                            </motion.p>
                          </AnimatePresence>
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <Zap size={11} fill="currentColor" className="text-white/65" />
                          <span className="text-[11px] font-bold tracking-wide text-white/75">Fluxora</span>
                        </div>
                        <p className="text-[9px] text-white/40 italic">Carte virtuelle simulée</p>
                      </div>
                    </div>
                  </div>

                </motion.div>
              </div>

              {/* Controls row */}
              <div className="flex flex-wrap items-center justify-center gap-2">
                {/* Flip */}
                <button
                  onClick={() => setFlipped((f) => !f)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-[12px] font-medium text-slate-600 transition-colors"
                >
                  <RotateCcw size={12} />
                  {flipped ? 'Recto' : 'Verso'}
                </button>

                {!flipped ? (
                  /* Number controls */
                  <>
                    <button
                      onClick={() => setShowNumber((v) => !v)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-[12px] font-medium text-slate-600 transition-colors"
                    >
                      {showNumber ? <EyeOff size={12} /> : <Eye size={12} />}
                      {showNumber ? 'Masquer' : 'Numéro complet'}
                    </button>
                    {showNumber && <CopyBtn value={fullNumber} />}
                  </>
                ) : (
                  /* CVC controls */
                  <>
                    <button
                      onClick={() => setShowCVC((v) => !v)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-[12px] font-medium text-slate-600 transition-colors"
                    >
                      {showCVC ? <EyeOff size={12} /> : <Eye size={12} />}
                      {showCVC ? 'Masquer CVC' : 'Voir CVC'}
                    </button>
                    {showCVC && <CopyBtn value={cvc} />}
                  </>
                )}
              </div>
            </div>

            {/* ── Budget + Détails ─────────────────────────── */}
            <div className="px-5 pb-4">
              <div className="bg-slate-50 rounded-2xl p-4 space-y-3.5 border border-slate-100">
                {/* Budget bar */}
                <div>
                  <div className="flex justify-between text-[12px] mb-2">
                    <span className="text-slate-500 font-medium">Budget mensuel</span>
                    <span className="tabular-nums">
                      <span className="font-semibold text-slate-800">{fmt(card.currentMonthSpend)}</span>
                      <span className="text-slate-400"> / {fmt(card.monthlyLimit)}</span>
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                    <motion.div
                      className={`h-2 rounded-full ${usePct > 80 ? 'bg-red-500' : 'bg-emerald-500'}`}
                      initial={{ width: 0 }}
                      animate={{ width: `${usePct}%` }}
                      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                    />
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1.5 tabular-nums">
                    {fmt(card.monthlyLimit - card.currentMonthSpend)} restants ce mois
                  </p>
                </div>

                {/* Meta grid */}
                <div className="grid grid-cols-2 gap-x-4 gap-y-3 border-t border-slate-200 pt-3 text-[12px]">
                  <div>
                    <p className="text-slate-400 mb-0.5">Catégorie</p>
                    <p className="font-semibold text-slate-700">
                      {CATEGORIES.find((c) => c.value === card.category)?.label || card.category}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-400 mb-0.5">Statut</p>
                    <p className={`font-semibold ${card.status === 'blocked' ? 'text-red-500' : 'text-emerald-600'}`}>
                      {card.status === 'blocked' ? 'Bloquée' : 'Active'}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-400 mb-0.5">Numéro</p>
                    <p className="font-mono font-semibold text-slate-700">
                      {showNumber ? fullNumber : `•••• ${card.last4}`}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-400 mb-0.5">CVC</p>
                    <p className="font-mono font-semibold text-slate-700">{showCVC ? cvc : '•••'}</p>
                  </div>
                  <div>
                    <p className="text-slate-400 mb-0.5">Expiration</p>
                    <p className="font-mono font-semibold text-slate-700">
                      {String(card.expiryMonth).padStart(2, '0')}/{card.expiryYear}
                    </p>
                  </div>
                  {card.linkedVendor && (
                    <div>
                      <p className="text-slate-400 mb-0.5">Fournisseur</p>
                      <p className="font-semibold text-slate-700 truncate">{card.linkedVendor}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* ── Actions footer ───────────────────────────── */}
            <div className="px-5 py-4 flex gap-2 border-t border-slate-100">
              <Button
                size="sm" variant="secondary"
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
                size="sm" variant="danger"
                onClick={() => onDelete(card)}
                loading={loading === `${card._id}-del`}
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
