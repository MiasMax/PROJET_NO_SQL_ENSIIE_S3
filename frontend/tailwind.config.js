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
          card: '#121824',
          border: '#1e293b',
          gold: '#f59e0b',
          red: '#ef4444',
          blue: '#3b82f6',
          teal: '#09B1BA', // Vinted brand teal
          emerald: '#10b981',
          purple: '#8b5cf6',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'holo': '0 0 25px rgba(59, 130, 246, 0.4)',
        'gold-glow': '0 0 30px rgba(245, 158, 11, 0.35)',
      },
    },
  },
  plugins: [],
}
