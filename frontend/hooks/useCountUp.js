'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Anime un compteur de 0 → target sur `duration` ms.
 * Retourne la valeur courante formatée par `formatter`.
 *
 * @param {number|null} target - valeur finale (null = pas encore chargé)
 * @param {function} formatter - (n: number) => string
 * @param {number} duration - durée animation en ms
 */
export function useCountUp(target, formatter, duration = 900) {
  const [display, setDisplay] = useState(target == null ? null : formatter(0));
  const rafRef   = useRef(null);
  const startRef = useRef(null);
  const prevRef  = useRef(null);

  useEffect(() => {
    if (target == null) return;

    // Annule l'animation précédente
    if (rafRef.current) cancelAnimationFrame(rafRef.current);

    const from = prevRef.current ?? 0;
    prevRef.current = target;
    startRef.current = null;

    const step = (timestamp) => {
      if (!startRef.current) startRef.current = timestamp;
      const elapsed = timestamp - startRef.current;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = from + (target - from) * eased;
      setDisplay(formatter(current));
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(step);
      } else {
        setDisplay(formatter(target));
      }
    };

    rafRef.current = requestAnimationFrame(step);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [target, formatter, duration]);

  return display;
}
