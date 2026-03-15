import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        serif: ['Playfair Display', 'serif'],
      },
      colors: {
        tastelanc: {
          bg: 'rgb(var(--brand-bg) / <alpha-value>)',
          card: 'rgb(var(--brand-card) / <alpha-value>)',
          accent: 'rgb(var(--brand-accent) / <alpha-value>)',
          'accent-hover': 'rgb(var(--brand-accent-hover) / <alpha-value>)',
          surface: 'rgb(var(--brand-surface) / <alpha-value>)',
          'surface-light': 'rgb(var(--brand-surface-light) / <alpha-value>)',
          'header-bg': 'rgb(var(--brand-header-bg) / <alpha-value>)',
          'header-text': 'rgb(var(--brand-header-text) / <alpha-value>)',
          'text-primary': 'rgb(var(--brand-text-primary) / <alpha-value>)',
          'text-secondary': 'rgb(var(--brand-text-secondary) / <alpha-value>)',
          'text-muted': 'rgb(var(--brand-text-muted) / <alpha-value>)',
          'text-faint': 'rgb(var(--brand-text-faint) / <alpha-value>)',
          border: 'rgb(var(--brand-border) / <alpha-value>)',
          'border-light': 'rgb(var(--brand-border-light) / <alpha-value>)',
          'input-bg': 'rgb(var(--brand-input-bg) / <alpha-value>)',
          muted: 'rgb(var(--brand-text-secondary) / <alpha-value>)',
        },
        lancaster: {
          red: 'rgb(var(--brand-accent) / <alpha-value>)',
          dark: 'rgb(var(--brand-bg) / <alpha-value>)',
          gold: 'rgb(var(--brand-gold) / <alpha-value>)',
        },
      },
    },
  },
  plugins: [],
};

export default config;
