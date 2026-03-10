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
        /* ─── Brand (Cobalt Royal — Mercury / Stripe inspired) ────── */
        accent: {
          DEFAULT: '#1C6EF2',
          hover:   '#1558D6',
          light:   '#E8F0FE',
          50:      '#E8F0FE',
          100:     '#CBE0FD',
          200:     '#9DC3FB',
          300:     '#6AA5F8',
          400:     '#3D87F5',
          500:     '#1C6EF2',
          600:     '#1558D6',
          700:     '#1047B5',
          800:     '#0D399A',
          900:     '#0A2D7E',
        },
        /* ─── Semantic ──────────────────────────────────────────────── */
        success: {
          50:  '#ECFDF5',
          100: '#D1FAE5',
          200: '#A7F3D0',
          400: '#34D399',
          500: '#10B981',
          600: '#059669',
          700: '#047857',
        },
        warning: {
          50:  '#FFFBEB',
          100: '#FEF3C7',
          200: '#FDE68A',
          400: '#FBBF24',
          500: '#F59E0B',
          600: '#D97706',
          700: '#B45309',
        },
        danger: {
          50:  '#FEF2F2',
          100: '#FEE2E2',
          200: '#FECACA',
          400: '#F87171',
          500: '#EF4444',
          600: '#DC2626',
          700: '#B91C1C',
        },
        /* ─── App surfaces ──────────────────────────────────────────── */
        app: {
          bg:      '#F1F4F9',
          surface: '#F8FAFC',
        },
      },
      boxShadow: {
        'xs':          '0 1px 2px rgba(0,0,0,0.06)',
        'card':        '0 1px 3px rgba(0,0,0,0.07), 0 4px 14px rgba(0,0,0,0.05)',
        'card-hover':  '0 8px 30px rgba(0,0,0,0.13), 0 2px 8px rgba(0,0,0,0.06)',
        'card-raised': '0 4px 16px rgba(0,0,0,0.10), 0 1px 4px rgba(0,0,0,0.05)',
        'md':          '0 4px 12px rgba(0,0,0,0.09), 0 2px 4px rgba(0,0,0,0.05)',
        'lg':          '0 12px 32px rgba(0,0,0,0.12), 0 4px 8px rgba(0,0,0,0.05)',
        'hero':        '0 20px 60px rgba(0,0,0,0.3)',
        'glow':        '0 0 0 3px rgba(28,110,242,0.2)',
      },
      borderRadius: {
        'DEFAULT': '8px',
        'sm':  '6px',
        'md':  '8px',
        'lg':  '12px',
        'xl':  '16px',
        '2xl': '20px',
        '3xl': '24px',
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
    },
  },
  plugins: [],
};
