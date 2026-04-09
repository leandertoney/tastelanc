import type { AppBrand } from '@tastelanc/mobile-shared';

export const BRAND: AppBrand = {
  // Core identity
  appName: 'TasteOceanCity',
  cityName: 'Ocean City',
  cityPossessive: "Ocean City's",
  marketSlug: 'ocean-city-md',
  sampleAddress: 'Boardwalk, Ocean City',

  // Badges & labels
  pickBadgeLabel: 'TasteOceanCity Pick',
  verifiedLabel: 'TasteOceanCity verified',

  // Profile
  userTitle: 'TasteOceanCity Explorer',
  userSubtitle: "Discovering Ocean City's best spots",
  tagline: 'Made with love in Ocean City, MD',
  slogan: "Ocean City's go-to for what's happening now.",

  // URLs (shared backend)
  supportEmail: 'info@tastelanc.com',
  privacyUrl: 'https://tastelanc.com/privacy',
  termsUrl: 'https://tastelanc.com/terms',
  websiteUrl: 'https://oceancity.tastelanc.com',
  appStoreUrl: 'https://apps.apple.com/us/app/tasteoceancity/id0000000000',
  playStoreUrl: 'https://play.google.com/store/apps/details?id=com.tastelanc.oceancity',

  // Defaults
  defaultItineraryTitle: 'My Ocean City Day',
  userAgent: 'TasteOceanCity-Mobile',

  // AI Assistant
  aiName: 'Sandie',
  mollieGreeting:
    "Hi! I'm Sandie, your TasteOceanCity AI assistant. I can help you discover restaurants, find happy hour deals, and plan your next dining experience in Ocean City. What are you in the mood for today?",
  mollieSubtitle: 'Your AI Concierge',
  mollieSamplePrompt: 'What are the best seafood spots in Ocean City?',

  // Market features — MD allows happy hour promotions
  features: {
    happyHours: true,
    dailySpecialsCarousel: true,
  },

  // Brand palette — 4-color vintage coastal (+ white free fifth)
  palette: {
    background: '#B8D8E8',  // sky blue — primary background
    navy: '#D4785A',        // salmon — accent, buttons, pins, badges
    gold: '#F5C842',        // sun yellow — CTA, highlights
    green: '#1A4A5A',       // deep teal — text, headers, dark elements
  } as any,
};
