'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import AssistantPanel from './AssistantPanel';

export default function AssistantTrigger() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Floating button — bottom right */}
      <motion.button
        onClick={() => setOpen(true)}
        initial={{ scale: 0.7, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.6, type: 'spring', stiffness: 280, damping: 22 }}
        title="Assistant IA Fluxora"
        className="fixed bottom-6 right-6 z-40 w-12 h-12 rounded-2xl bg-gradient-to-br from-accent-500 to-accent-700 text-white flex items-center justify-center hover:scale-105 active:scale-95 transition-transform"
        style={{ boxShadow: '0 8px 28px rgba(28,110,242,0.45)' }}
      >
        <Sparkles size={20} strokeWidth={1.75} />
      </motion.button>

      <AssistantPanel open={open} onClose={() => setOpen(false)} />
    </>
  );
}
