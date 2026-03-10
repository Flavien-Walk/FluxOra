'use client';

import { useEffect } from 'react';
import { motion, useMotionValue, useSpring, useTransform, animate } from 'framer-motion';
import { Zap } from 'lucide-react';

const COLOR_MAP = {
  indigo:  'from-indigo-500 to-indigo-800',
  violet:  'from-violet-500 to-violet-800',
  emerald: 'from-emerald-400 to-emerald-700',
  rose:    'from-rose-500 to-rose-800',
  amber:   'from-amber-400 to-orange-600',
  sky:     'from-sky-400 to-sky-700',
};

export default function InteractiveCard3D({ card, isSelected, onClick }) {
  const mouseX = useMotionValue(0.5);
  const mouseY = useMotionValue(0.5);
  const scaleV = useMotionValue(1);
  const yV     = useMotionValue(0);

  const rotateX = useSpring(useTransform(mouseY, [0, 1], [8, -8]),   { stiffness: 200, damping: 26 });
  const rotateY = useSpring(useTransform(mouseX, [0, 1], [-10, 10]), { stiffness: 200, damping: 26 });

  const shine = useTransform(
    [mouseX, mouseY],
    ([x, y]) => `radial-gradient(circle at ${x * 100}% ${y * 100}%, rgba(255,255,255,0.22) 0%, transparent 65%)`,
  );

  /* Reactive selection — stop animations on unmount to avoid promise rejections */
  useEffect(() => {
    const a1 = animate(scaleV, isSelected ? 1.05 : 1, { type: 'spring', stiffness: 320, damping: 28 });
    const a2 = animate(yV,     isSelected ? -6   : 0, { type: 'spring', stiffness: 320, damping: 28 });
    return () => { a1.stop(); a2.stop(); };
  }, [isSelected]);

  /* Press feedback via motion value — avoids whileTap/style conflict */
  const onDown = () => animate(scaleV, isSelected ? 1.01 : 0.95, { type: 'spring', stiffness: 400, damping: 20 });
  const onUp   = () => animate(scaleV, isSelected ? 1.05 : 1,    { type: 'spring', stiffness: 400, damping: 20 });

  const gradient = COLOR_MAP[card.color] || COLOR_MAP.indigo;
  const usePct   = card.monthlyLimit > 0
    ? Math.min(100, Math.round((card.currentMonthSpend / card.monthlyLimit) * 100))
    : 0;

  return (
    /* perspective wrapper — purely for 3-D context, no visual styling */
    <div style={{ width: '280px', flexShrink: 0, perspective: '900px' }} className="snap-start">
      <motion.button
        onClick={onClick}
        onMouseMove={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          mouseX.set((e.clientX - r.left) / r.width);
          mouseY.set((e.clientY - r.top)  / r.height);
        }}
        onMouseLeave={() => { mouseX.set(0.5); mouseY.set(0.5); }}
        onPointerDown={onDown}
        onPointerUp={onUp}
        onPointerLeave={onUp}
        style={{
          rotateX,
          rotateY,
          scale: scaleV,
          y: yV,
          /* NOTE: NO transformStyle:'preserve-3d' here — incompatible with overflow:hidden
             and causes the gray-box rendering artifact in Chromium/WebKit */
          boxShadow: isSelected
            ? '0 16px 40px rgba(0,0,0,0.3), 0 4px 12px rgba(0,0,0,0.15)'
            : '0 4px 16px rgba(0,0,0,0.18), 0 2px 4px rgba(0,0,0,0.1)',
          width:  '100%',
          height: '176px',
        }}
        className={`relative rounded-2xl bg-gradient-to-br ${gradient} text-white p-5 text-left overflow-hidden cursor-pointer block ${
          card.status === 'blocked' ? 'opacity-55' : ''
        } ${isSelected ? 'ring-2 ring-white/30' : ''}`}
      >
        {/* Shine */}
        <motion.div className="absolute inset-0 rounded-2xl pointer-events-none" style={{ background: shine }} />

        {/* Dot pattern */}
        <div className="absolute inset-0 pointer-events-none" style={{
          opacity: 0.05,
          backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,1) 1px, transparent 0)',
          backgroundSize: '20px 20px',
        }} />

        {/* Content */}
        <div className="relative z-10 h-full flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-1.5">
              <Zap size={13} fill="currentColor" className="text-white/75" />
              <span className="text-[13px] font-bold tracking-wide text-white/90">Fluxora</span>
            </div>
            {card.status === 'blocked'
              ? <span className="text-[10px] bg-black/25 backdrop-blur-sm px-2 py-0.5 rounded-full font-semibold">Bloquée</span>
              : <div className="w-8 h-5 bg-white/20 rounded-sm" />
            }
          </div>

          <p className="text-[14px] font-mono tracking-[0.2em] text-white/80">
            •••• •••• •••• {card.last4}
          </p>

          <div className="flex justify-between items-end">
            <div>
              <p className="text-[9px] text-white/45 uppercase tracking-widest mb-0.5">Titulaire</p>
              <p className="text-[13px] font-semibold truncate max-w-[130px]">{card.name}</p>
            </div>
            <div className="text-right">
              <p className="text-[9px] text-white/45 uppercase tracking-widest mb-0.5">Expire</p>
              <p className="text-[13px] font-mono">{String(card.expiryMonth).padStart(2, '0')}/{card.expiryYear}</p>
            </div>
          </div>
        </div>

        {/* Budget bar */}
        <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-black/20 rounded-b-2xl overflow-hidden">
          <motion.div
            className={`h-full ${usePct > 80 ? 'bg-red-300' : 'bg-white/65'}`}
            initial={{ width: 0 }}
            animate={{ width: `${usePct}%` }}
            transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          />
        </div>
      </motion.button>
    </div>
  );
}
