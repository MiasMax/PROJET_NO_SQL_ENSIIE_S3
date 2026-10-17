/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        poke: {
          dark: '#0a0d14',
          surface: '#121826',
          elevated: '#1a2236',
          card: '#121824',
          border: 'rgba(255, 255, 255, 0.08)',
          gold: '#f59e0b',
          red: '#ef4444',
          blue: '#3b82f6',
          teal: '#09B1BA',
          emerald: '#10b981',
          purple: '#8b5cf6',
          indigo: '#6366f1',
          cyan: '#06b6d4',
        },
      },
      fontFamily: {
        sans: ['Outfit', 'Inter', 'system-ui', 'sans-serif'],
        display: ['Space Grotesk', 'Outfit', 'sans-serif'],
      },
      boxShadow: {
        'holo': '0 0 25px rgba(59, 130, 246, 0.4)',
        'gold-glow': '0 0 30px rgba(245, 158, 11, 0.35)',
        'indigo-glow': '0 0 25px rgba(99, 102, 241, 0.3)',
      },
      keyframes: {
        'modal-enter': {
          from: { opacity: '0', transform: 'scale(0.96) translateY(10px)' },
          to: { opacity: '1', transform: 'scale(1) translateY(0)' },
        },
        'card-appear': {
          from: { opacity: '0', transform: 'translateY(10px) scale(0.985)' },
          to: { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        'hub-shimmer': {
          '0%': { backgroundPosition: '100% 0' },
          '100%': { backgroundPosition: '-100% 0' },
        },
      },
      animation: {
        'modal': 'modal-enter 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
        'appear': 'card-appear 0.28s cubic-bezier(0.16, 1, 0.3, 1) both',
        'shimmer': 'hub-shimmer 1.2s infinite linear',
      },
    },
  },
  plugins: [],
}
