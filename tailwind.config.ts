import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['selector', '[data-theme="dark"]'],

  content: [
    './index.html',
    './src/**/*.{ts,tsx}',
  ],

  theme: {
    extend: {
      colors: {
        /* Surfaces */
        page:             'var(--bg-page)',
        surface:          'var(--bg-surface)',
        'surface-raised': 'var(--bg-surface-raised)',

        /* Text */
        primary:   'var(--text-primary)',
        secondary: 'var(--text-secondary)',
        muted:     'var(--text-muted)',

        /* Borders */
        border:          'var(--border)',
        'border-strong': 'var(--border-strong)',

        /* Brand accents */
        magenta: {
          DEFAULT: 'var(--accent-magenta)',
          hover:   'var(--accent-magenta-hover)',
        },
        teal: {
          DEFAULT: 'var(--accent-teal)',
          hover:   'var(--accent-teal-hover)',
        },

        /* Gold / Orange accents (dark mode primary) */
        gold: {
          DEFAULT: 'var(--accent-gold)',
          hover:   'var(--accent-gold-hover)',
          muted:   'var(--accent-gold-muted)',
        },
        brand: {
          DEFAULT: 'var(--accent-orange)',
          hover:   'var(--accent-orange-hover)',
        },

        /* Semantic */
        danger:  'var(--color-danger)',
        warning: 'var(--color-warning)',
        success: 'var(--color-success)',

        /* Checkerboard tiles */
        'checker-1': 'var(--checker-tile-1)',
        'checker-2': 'var(--checker-tile-2)',
      },

      fontFamily: {
        display: ['var(--font-display)'],
        body:    ['var(--font-body)'],
        mono:    ['var(--font-mono)'],
      },

      borderRadius: {
        sm: 'var(--radius-sm)',
        md: 'var(--radius-md)',
        lg: 'var(--radius-lg)',
        xl: 'var(--radius-xl)',
      },

      boxShadow: {
        focus:    'var(--shadow-focus)',
        sm:       'var(--shadow-sm)',
        md:       'var(--shadow-md)',
        lg:       'var(--shadow-lg)',
        glow:     'var(--shadow-glow)',
        'glow-sm':'var(--shadow-glow-sm)',
      },

      backgroundImage: {
        'gradient-hero':  'var(--gradient-hero)',
        'gradient-brand': 'var(--gradient-brand)',
      },

      keyframes: {
        'pulse-glow': {
          '0%, 100%': { boxShadow: '0 0 8px rgba(245,158,11,0.20)' },
          '50%':       { boxShadow: '0 0 24px rgba(245,158,11,0.50)' },
        },
        'border-spin': {
          '0%':   { backgroundPosition: '0% 50%' },
          '50%':  { backgroundPosition: '100% 50%' },
          '100%': { backgroundPosition: '0% 50%' },
        },
        'fade-up': {
          from: { opacity: '0', transform: 'translateY(12px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          '0%':   { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition:  '200% 0' },
        },
        'slide-in-left': {
          from: { opacity: '0', transform: 'translateX(-100%)' },
          to:   { opacity: '1', transform: 'translateX(0)' },
        },
      },
      animation: {
        'pulse-glow':     'pulse-glow 2.5s ease-in-out infinite',
        'border-spin':    'border-spin 3s linear infinite',
        'fade-up':        'fade-up 0.4s ease both',
        shimmer:          'shimmer 2s linear infinite',
        'slide-in-left':  'slide-in-left 0.25s ease both',
      },
    },
  },

  plugins: [],
};

export default config;
