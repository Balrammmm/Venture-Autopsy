import type { Config } from 'tailwindcss'

/**
 * Colours resolve through CSS variables holding raw RGB triplets, so the
 * `/45` opacity modifiers keep working while the theme swaps underneath.
 * Dark is the default; `data-theme="light"` redefines the same tokens.
 */
const v = (name: string) => `rgb(var(--${name}) / <alpha-value>)`

export default {
  content: ['./src/**/*.{ts,tsx}'],
  darkMode: ['class', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        ink: {
          950: v('ink-950'),
          900: v('ink-900'),
          800: v('ink-800'),
          700: v('ink-700'),
          600: v('ink-600'),
          500: v('ink-500'),
          400: v('ink-400'),
          300: v('ink-300'),
        },
        paper: {
          DEFAULT: v('paper'),
          dim: v('paper-dim'),
          faint: v('paper-faint'),
          sub: v('paper-sub'),
        },
        /* Semantic accents. Colour carries meaning, never decoration. */
        action: {
          DEFAULT: v('action'),
          deep: v('action-deep'),
          ink: v('action-ink'),
          // Accent as a foreground colour. Darkens on parchment so lime never
          // becomes low-contrast text.
          text: v('action-text'),
          wash: 'rgb(var(--action) / 0.12)',
        },
        signal: {
          DEFAULT: v('signal'),
          deep: v('signal-deep'),
          wash: 'rgb(var(--signal) / 0.12)',
        },
        intel: {
          DEFAULT: v('intel'),
          deep: v('intel-deep'),
          wash: 'rgb(var(--intel) / 0.12)',
        },
        risk: {
          DEFAULT: v('risk'),
          deep: v('risk-deep'),
          wash: 'rgb(var(--risk) / 0.12)',
        },
        unknown: { DEFAULT: v('unknown'), wash: 'rgb(var(--unknown) / 0.12)' },
        /* Kept so existing app pages keep compiling; both map to the new roles. */
        lime: { DEFAULT: v('action'), deep: v('action-deep'), wash: 'rgb(var(--action) / 0.12)' },
        ember: { DEFAULT: v('risk'), deep: v('risk-deep'), wash: 'rgb(var(--risk) / 0.12)' },
      },
      fontFamily: {
        display: ['var(--font-display)', 'Georgia', 'serif'],
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'monospace'],
      },
      letterSpacing: { display: '-0.03em', tightest: '-0.045em' },
      transitionTimingFunction: {
        out: 'cubic-bezier(0.23, 1, 0.32, 1)',
        inout: 'cubic-bezier(0.77, 0, 0.175, 1)',
        drawer: 'cubic-bezier(0.32, 0.72, 0, 1)',
      },
      maxWidth: { measure: '68ch' },
    },
  },
  plugins: [],
} satisfies Config
