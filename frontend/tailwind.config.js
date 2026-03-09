/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
      },
      colors: {
        /* ─── Brand Color (Cobalt Blue — Mercury / Stripe inspired) ─── */
        accent: {
          DEFAULT: '#1C6EF2',
          hover:   '#1558D6',
          light:   '#EBF3FE',
          50:      '#EBF3FE',
          100:     '#D2E5FD',
          200:     '#A8CCFB',
          300:     '#6DAAFF',
          400:     '#3D8DF7',
          500:     '#1C6EF2',
          600:     '#1558D6',
          700:     '#1047B5',
        },
        /* ─── Semantic Colors ────────────────────────────────────────── */
        success: {
          50:  '#ECFDF5',
          100: '#D1FAE5',
          500: '#10B981',
          600: '#059669',
          700: '#047857',
        },
        warning: {
          50:  '#FFFBEB',
          100: '#FEF3C7',
          500: '#F59E0B',
          600: '#D97706',
          700: '#B45309',
        },
        danger: {
          50:  '#FEF2F2',
          100: '#FEE2E2',
          500: '#EF4444',
          600: '#DC2626',
          700: '#B91C1C',
        },
        /* ─── Sidebar dark surface ────────────────────────────────────── */
        sidebar: {
          bg:      '#0F172A',
          hover:   'rgba(255,255,255,0.07)',
          active:  'rgba(255,255,255,0.12)',
          border:  '#1E293B',
          text:    '#94A3B8',
          'text-active': '#F1F5F9',
          label:   '#475569',
        },
      },
      boxShadow: {
        'xs':         '0 1px 2px rgba(0,0,0,0.05)',
        'card':       '0 1px 3px rgba(0,0,0,0.07), 0 1px 2px rgba(0,0,0,0.04)',
        'card-hover': '0 4px 16px rgba(28,110,242,0.12), 0 1px 3px rgba(0,0,0,0.06)',
        'md':         '0 4px 12px rgba(0,0,0,0.08), 0 2px 4px rgba(0,0,0,0.04)',
        'lg':         '0 8px 24px rgba(0,0,0,0.10), 0 4px 8px rgba(0,0,0,0.04)',
        'glow':       '0 0 0 3px rgba(28,110,242,0.15)',
      },
      borderRadius: {
        'DEFAULT': '8px',
        'sm': '6px',
        'md': '8px',
        'lg': '12px',
        'xl': '16px',
        '2xl': '20px',
      },
      fontSize: {
        'xxs':  ['11px', '16px'],
        'xs':   ['12px', '16px'],
        'sm':   ['13px', '20px'],
        'base': ['14px', '22px'],
        'md':   ['15px', '24px'],
        'lg':   ['16px', '24px'],
        'xl':   ['18px', '28px'],
        '2xl':  ['20px', '28px'],
        '3xl':  ['24px', '32px'],
        '4xl':  ['30px', '36px'],
      },
      spacing: {
        '4.5': '1.125rem',
        '13':  '3.25rem',
        '15':  '3.75rem',
        '18':  '4.5rem',
      },
      backgroundImage: {
        'gradient-stat': 'linear-gradient(135deg, var(--tw-gradient-from), var(--tw-gradient-to))',
      },
    },
  },
  plugins: [],
};
