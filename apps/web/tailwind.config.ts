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
          muted: 'rgba(255,255,255,0.7)',
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
