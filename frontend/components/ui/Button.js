'use client';

import { cn } from '@/lib/utils';

const variants = {
  primary:   'bg-accent-500 text-white shadow-xs hover:bg-accent-600 active:bg-accent-700',
  secondary: 'bg-white text-slate-700 border border-slate-200 shadow-xs hover:bg-slate-50 active:bg-slate-100',
  danger:    'bg-danger-500 text-white shadow-xs hover:bg-danger-600 active:bg-danger-700',
  ghost:     'text-slate-600 hover:bg-slate-100 hover:text-slate-900 active:bg-slate-200',
  outline:   'border border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50',
};

const sizes = {
  xs: 'h-7 px-2.5 text-xs gap-1.5 rounded',
  sm: 'h-8 px-3 text-sm gap-1.5 rounded-md',
  md: 'h-9 px-4 text-sm gap-2 rounded-lg',
  lg: 'h-10 px-5 text-base gap-2 rounded-lg',
};

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  className,
  disabled = false,
  loading = false,
  onClick,
  type = 'button',
  ...props
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center font-medium',
        'transition-all duration-150 ease-in-out',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 focus-visible:ring-offset-1',
        'disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none',
        'active:scale-[0.98]',
        variants[variant] ?? variants.primary,
        sizes[size] ?? sizes.md,
        className
      )}
      {...props}
    >
      {loading ? (
        <>
          <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin flex-shrink-0" />
          <span>{children}</span>
        </>
      ) : children}
    </button>
  );
}
