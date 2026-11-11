/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['selector', '[data-theme="dark"]'],
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        neo: {
          canvas: 'var(--bg-canvas)',
          bg: 'var(--bg-canvas)',
          surface: 'var(--bg-surface)',
          alt: 'var(--bg-surface-alt)',
          muted: 'var(--bg-surface-muted)',
          ink: 'var(--text-primary)',
          'ink-2': 'var(--text-secondary)',
          'ink-3': 'var(--text-muted)',
          border: 'var(--border-default)',
          'border-strong': 'var(--border-strong)',
          vermilion: 'var(--accent-primary)',
          'vermilion-hover': 'var(--accent-primary-hover)',
          cobalt: 'var(--accent-secondary)',
          'cobalt-hover': 'var(--accent-secondary-hover)',
          lens: 'var(--pokedex-lens)',
        },
      },
      fontFamily: {
        sans: ['DM Sans', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['Space Grotesk', 'DM Sans', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      boxShadow: {
        tactile: 'var(--shadow-card)',
        'tactile-cobalt': 'var(--shadow-card-hover)',
        'tactile-sm': 'var(--shadow-control)',
        'tactile-modal': 'var(--shadow-modal)',
      },
      keyframes: {
        'modal-pop': {
          from: { opacity: '0', transform: 'translateY(8px) scale(0.98)' },
          to: { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        'drawer-in': {
          from: { opacity: '0', transform: 'translateX(24px)' },
          to: { opacity: '1', transform: 'translateX(0)' },
        },
      },
      animation: {
        'modal-pop': 'modal-pop 0.16s cubic-bezier(0.16, 1, 0.3, 1)',
        'drawer-in': 'drawer-in 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
      },
    },
  },
  plugins: [],
};
