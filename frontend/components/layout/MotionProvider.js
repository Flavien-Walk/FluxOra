'use client';

import { MotionConfig } from 'framer-motion';

// Respecte le réglage système « réduire les animations » (WCAG 2.3.3)
export default function MotionProvider({ children }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
