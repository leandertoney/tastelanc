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
          bg: '#1A1A1A',
          card: '#252525',
          accent: '#A41E22',
          'accent-hover': '#8B1A1D',
          surface: '#1E1E1E',
          'surface-light': '#2A2A2A',
          muted: 'rgba(255,255,255,0.7)',
        },
        lancaster: {
          red: '#A41E22',
          dark: '#1A1A1A',
          gold: '#D4AF37',
        },
      },
    },
  },
  plugins: [],
};

export default config;
