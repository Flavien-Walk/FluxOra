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
        accent: {
          DEFAULT: '#6366F1',
          hover:   '#4F46E5',
          light:   '#EEF2FF',
          50:      '#EEF2FF',
          100:     '#E0E7FF',
          500:     '#6366F1',
          600:     '#4F46E5',
          700:     '#4338CA',
        },
      },
      boxShadow: {
        'xs':   '0 1px 2px rgba(0,0,0,0.05)',
        'card': '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)',
        'md':   '0 4px 12px rgba(0,0,0,0.08), 0 2px 4px rgba(0,0,0,0.04)',
        'lg':   '0 8px 24px rgba(0,0,0,0.10), 0 4px 8px rgba(0,0,0,0.04)',
        'card-hover': '0 4px 12px rgba(99,102,241,0.10), 0 1px 3px rgba(0,0,0,0.06)',
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
        'xxs': ['11px', '16px'],
        'xs':  ['12px', '16px'],
        'sm':  ['13px', '20px'],
        'base':['14px', '22px'],
        'md':  ['15px', '24px'],
        'lg':  ['16px', '24px'],
        'xl':  ['18px', '28px'],
        '2xl': ['20px', '28px'],
        '3xl': ['24px', '32px'],
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
