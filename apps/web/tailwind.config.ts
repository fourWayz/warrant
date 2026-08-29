import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'class',
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-sans)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      colors: {
        ground: {
          DEFAULT: '#08090b',
          raised: '#0e1013',
          panel: '#121417',
          border: '#1e2126',
          'border-strong': '#2a2e35',
        },
        ink: {
          DEFAULT: '#e8e6df',
          muted: '#9a9a94',
          faint: '#6b6c6c',
        },
        accent: {
          DEFAULT: '#c9a24a',
          bright: '#e0bd6c',
          dim: '#8a6f34',
          wash: 'rgba(201, 162, 74, 0.08)',
        },
        allow: {
          DEFAULT: '#4caf7d',
          wash: 'rgba(76, 175, 125, 0.1)',
        },
        block: {
          DEFAULT: '#d9695a',
          wash: 'rgba(217, 105, 90, 0.1)',
        },
      },
      boxShadow: {
        subtle: '0 1px 0 0 rgba(255,255,255,0.03) inset, 0 0 0 1px rgba(255,255,255,0.02)',
        raised: '0 8px 30px -12px rgba(0,0,0,0.6)',
      },
      backgroundImage: {
        'grain-fade': 'radial-gradient(80% 60% at 50% 0%, rgba(201,162,74,0.06), transparent 60%)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
    },
  },
  plugins: [],
}

export default config
