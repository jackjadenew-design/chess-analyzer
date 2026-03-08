/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['DM Sans', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
        display: ['Syne', 'sans-serif'],
      },
      colors: {
        board: {
          light: '#f0d9b5',
          dark: '#b58863',
          highlight: '#cdd26a',
          selected: '#f6f669',
          lastmove: '#cdd26a',
          check: '#e74c3c',
        },
        surface: {
          950: 'rgb(var(--surface-950) / <alpha-value>)',
          900: 'rgb(var(--surface-900) / <alpha-value>)',
          800: 'rgb(var(--surface-800) / <alpha-value>)',
          750: 'rgb(var(--surface-750) / <alpha-value>)',
          700: 'rgb(var(--surface-700) / <alpha-value>)',
          600: 'rgb(var(--surface-600) / <alpha-value>)',
          500: 'rgb(var(--surface-500) / <alpha-value>)',
          400: 'rgb(var(--surface-400) / <alpha-value>)',
          300: 'rgb(var(--surface-300) / <alpha-value>)',
          200: 'rgb(var(--surface-200) / <alpha-value>)',
          100: 'rgb(var(--surface-100) / <alpha-value>)',
          50: 'rgb(var(--surface-50) / <alpha-value>)',
        },
        accent: {
          600: 'rgb(var(--accent-600) / <alpha-value>)',
          500: 'rgb(var(--accent-500) / <alpha-value>)',
          400: 'rgb(var(--accent-400) / <alpha-value>)',
          300: 'rgb(var(--accent-300) / <alpha-value>)',
          DEFAULT: 'rgb(var(--accent-500) / <alpha-value>)',
          hover: 'rgb(var(--accent-400) / <alpha-value>)',
          dim: 'rgb(var(--accent-600) / <alpha-value>)',
        },
      },
      animation: {
        'fade-in': 'fadeIn 0.15s ease-out',
        'slide-in': 'slideIn 0.2s ease-out',
        'pulse-soft': 'pulseSoft 2s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: { from: { opacity: '0' }, to: { opacity: '1' } },
        slideIn: { from: { transform: 'translateY(-4px)', opacity: '0' }, to: { transform: 'translateY(0)', opacity: '1' } },
        pulseSoft: { '0%, 100%': { opacity: '1' }, '50%': { opacity: '0.5' } },
      },
    },
  },
  plugins: [],
};
