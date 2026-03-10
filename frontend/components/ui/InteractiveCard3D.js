'use client';

import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { Zap } from 'lucide-react';

const COLOR_MAP = {
  indigo:  'from-indigo-500 via-indigo-600 to-indigo-800',
  violet:  'from-violet-500 via-violet-600 to-violet-800',
  emerald: 'from-emerald-400 via-emerald-500 to-emerald-700',
  rose:    'from-rose-500 via-rose-600 to-rose-800',
  amber:   'from-amber-400 via-amber-500 to-orange-600',
  sky:     'from-sky-400 via-sky-500 to-sky-700',
};

const SHADOW_MAP = {
  indigo:  { idle: '0 8px 24px rgba(99,102,241,0.3), 0 2px 8px rgba(0,0,0,0.2)',  selected: '0 20px 50px rgba(99,102,241,0.55), 0 6px 20px rgba(0,0,0,0.25)'  },
  violet:  { idle: '0 8px 24px rgba(139,92,246,0.3), 0 2px 8px rgba(0,0,0,0.2)', selected: '0 20px 50px rgba(139,92,246,0.55), 0 6px 20px rgba(0,0,0,0.25)' },
  emerald: { idle: '0 8px 24px rgba(16,185,129,0.3), 0 2px 8px rgba(0,0,0,0.2)', selected: '0 20px 50px rgba(16,185,129,0.55), 0 6px 20px rgba(0,0,0,0.25)' },
  rose:    { idle: '0 8px 24px rgba(244,63,94,0.3), 0 2px 8px rgba(0,0,0,0.2)',   selected: '0 20px 50px rgba(244,63,94,0.55), 0 6px 20px rgba(0,0,0,0.25)'   },
  amber:   { idle: '0 8px 24px rgba(245,158,11,0.28), 0 2px 8px rgba(0,0,0,0.2)', selected: '0 20px 50px rgba(245,158,11,0.5), 0 6px 20px rgba(0,0,0,0.25)'  },
  sky:     { idle: '0 8px 24px rgba(14,165,233,0.3), 0 2px 8px rgba(0,0,0,0.2)',  selected: '0 20px 50px rgba(14,165,233,0.55), 0 6px 20px rgba(0,0,0,0.25)'  },
};

export default function InteractiveCard3D({ card, isSelected, onClick }) {
  const mouseX = useMotionValue(0.5);
  const mouseY = useMotionValue(0.5);

  const rotateX = useSpring(
    useTransform(mouseY, [0, 1], [14, -14]),
    { stiffness: 200, damping: 26 }
  );
  const rotateY = useSpring(
    useTransform(mouseX, [0, 1], [-16, 16]),
    { stiffness: 200, damping: 26 }
  );

  /* Shine highlight follows mouse */
  const shineBackground = useTransform(
    [mouseX, mouseY],
    ([x, y]) =>
      `radial-gradient(circle at ${x * 100}% ${y * 100}%, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0.06) 40%, transparent 70%)`,
  );

  const gradient = COLOR_MAP[card.color] || COLOR_MAP.indigo;
  const shadows  = SHADOW_MAP[card.color] || SHADOW_MAP.indigo;

  const usePct = card.monthlyLimit > 0
    ? Math.min(100, Math.round((card.currentMonthSpend / card.monthlyLimit) * 100))
    : 0;

  const handleMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    mouseX.set((e.clientX - rect.left) / rect.width);
    mouseY.set((e.clientY - rect.top) / rect.height);
  };

  const handleMouseLeave = () => {
    mouseX.set(0.5);
    mouseY.set(0.5);
  };

  return (
    <div
      style={{ perspective: '900px' }}
      className="relative w-72 flex-shrink-0 snap-start"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {/* Selected glow halo */}
      <motion.div
        className="absolute -inset-3 rounded-3xl pointer-events-none blur-xl"
        style={{ background: `${COLOR_MAP[card.color] || COLOR_MAP.indigo}`.includes('indigo') ? 'rgba(99,102,241,0.35)' : 'rgba(16,185,129,0.35)' }}
        animate={{ opacity: isSelected ? 1 : 0 }}
        transition={{ duration: 0.3 }}
      />

      <motion.button
        onClick={onClick}
        variants={{
          normal:   { scale: 1,    y: 0  },
          selected: { scale: 1.05, y: -6 },
        }}
        animate={isSelected ? 'selected' : 'normal'}
        whileTap={{ scale: 0.955, rotateX: 0, rotateY: 0, y: 2 }}
        transition={{ type: 'spring', stiffness: 320, damping: 26 }}
        style={{
          rotateX,
          rotateY,
          transformStyle: 'preserve-3d',
          boxShadow: isSelected ? shadows.selected : shadows.idle,
        }}
        className={`relative w-full h-44 rounded-2xl bg-gradient-to-br ${gradient} text-white p-5 text-left overflow-hidden ${
          card.status === 'blocked' ? 'opacity-55' : ''
        }`}
      >
        {/* Shine layer */}
        <motion.div
          className="absolute inset-0 rounded-2xl pointer-events-none"
          style={{ background: shineBackground }}
        />

        {/* Subtle dot pattern */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            opacity: 0.055,
            backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,1) 1px, transparent 0)',
            backgroundSize: '20px 20px',
          }}
        />

        {/* Card content */}
        <div className="relative z-10 h-full flex flex-col justify-between">
          {/* Top row */}
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-1.5">
              <Zap size={13} className="text-white/75" fill="currentColor" />
              <span className="text-[13px] font-bold tracking-wide text-white/90">Fluxora</span>
            </div>
            {card.status === 'blocked' ? (
              <span className="text-[10px] bg-black/25 backdrop-blur-sm px-2 py-0.5 rounded-full font-semibold tracking-wide">
                Bloquée
              </span>
            ) : (
              /* Chip visual */
              <div className="w-8 h-6 rounded-sm bg-white/20 backdrop-blur-sm border border-white/10" />
            )}
          </div>

          {/* Card number */}
          <p className="text-[15px] font-mono tracking-[0.22em] text-white/80">
            •••• •••• •••• {card.last4}
          </p>

          {/* Bottom */}
          <div className="flex justify-between items-end">
            <div>
              <p className="text-[9px] text-white/45 uppercase tracking-widest mb-0.5">Titulaire</p>
              <p className="text-[13px] font-semibold truncate max-w-[130px]">{card.name}</p>
            </div>
            <div className="text-right">
              <p className="text-[9px] text-white/45 uppercase tracking-widest mb-0.5">Expire</p>
              <p className="text-[13px] font-mono font-medium">
                {String(card.expiryMonth).padStart(2, '0')}/{card.expiryYear}
              </p>
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
