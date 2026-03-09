import { clsx } from 'clsx';

/**
 * Utility to merge Tailwind classes safely.
 * Usage: cn('base-class', condition && 'conditional-class', props.className)
 */
export function cn(...inputs) {
  return clsx(inputs);
}
