import type { AppBrand } from '@tastelanc/mobile-shared';

export const BRAND: AppBrand = {
  // Core identity
  appName: 'TasteFayetteville',
  cityName: 'Fayetteville',
  cityPossessive: "Fayetteville's",
  marketSlug: 'fayetteville-nc',
  sampleAddress: 'Hay St, Fayetteville',

  // Badges & labels
  pickBadgeLabel: 'TasteFayetteville Pick',
  verifiedLabel: 'TasteFayetteville verified',

  // Profile
  userTitle: 'TasteFayetteville Explorer',
  userSubtitle: "Discovering Fayetteville's best spots",
  tagline: 'Made with love in Fayetteville, NC',
  slogan: "Fayetteville's go-to for what's happening now.",

  // URLs (shared backend)
  supportEmail: 'info@tastelanc.com',
  privacyUrl: 'https://tastelanc.com/privacy',
  termsUrl: 'https://tastelanc.com/terms',
  websiteUrl: 'https://tastelanc.com',
  appStoreUrl: 'https://apps.apple.com/us/app/tastefayetteville/id0000000000',
  playStoreUrl: 'https://play.google.com/store/apps/details?id=com.tastelanc.fayetteville',

  // Defaults
  defaultItineraryTitle: 'My Fayetteville Day',
  userAgent: 'TasteFayetteville-Mobile',

  // AI Assistant
  aiName: 'Libertie',
  mollieGreeting:
    "Hi! I'm Libertie, your TasteFayetteville AI assistant. I can help you discover restaurants, find deals, and plan your next dining experience in Fayetteville. What are you in the mood for today?",
  mollieSubtitle: 'Your AI Concierge',
  mollieSamplePrompt: 'What are the best dinner spots in Fayetteville?',

  // Brand palette — the 4 colors that define the visual identity
  // Change ONLY these when launching a new market app
  palette: {
    background: '#040F1A',  // dark navy (primary bg — matched to logo bottom edge)
    navy: '#93B5CF',        // light blue (accent/pin/highlight)
    gold: '#C8102E',        // red (fork/CTA — maps to "gold" slot)
    green: '#4A90D9',       // bright blue complement (success/positive states)
  },
};
