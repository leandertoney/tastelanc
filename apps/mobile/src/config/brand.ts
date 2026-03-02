export const BRAND = {
  // Core identity
  appName: 'TasteLanc',
  cityName: 'Lancaster',
  cityPossessive: "Lancaster's",
  marketSlug: 'lancaster-pa',
  sampleAddress: 'N Queen St, Lancaster',

  // Badges & labels
  pickBadgeLabel: 'TasteLanc Pick',
  verifiedLabel: 'TasteLanc verified',

  // Profile
  userTitle: 'TasteLanc Explorer',
  userSubtitle: "Discovering Lancaster's best spots",
  tagline: 'Made with love in Lancaster, PA',
  slogan: "Lancaster's go-to for what's happening now.",

  // URLs (shared backend)
  supportEmail: 'support@tastelanc.com',
  privacyUrl: 'https://tastelanc.com/privacy',
  termsUrl: 'https://tastelanc.com/terms',
  websiteUrl: 'https://tastelanc.com',
  appStoreUrl: 'https://apps.apple.com/app/tastelanc/id6755852717',
  playStoreUrl: '', // TODO: set after Play Store listing created

  // Defaults
  defaultItineraryTitle: 'My Lancaster Day',
  userAgent: 'TasteLanc-Mobile',

  // AI Assistant
  aiName: 'Rosie',
  mollieGreeting:
    "Hi! I'm Rosie, your TasteLanc AI assistant. I can help you discover restaurants, find deals, and plan your next dining experience. What are you in the mood for today?",
  mollieSubtitle: 'Your AI Concierge',
  mollieSamplePrompt: 'What are the best dinner spots in Lancaster?',

  // Brand palette — the 4 colors that define the visual identity
  // Change ONLY these when launching a new market app
  palette: {
    background: '#1a1a1a',    // dark surface
    navy: '#FFFFFF',          // white text on dark
    gold: '#C9A227',          // heritage gold
    green: '#2E7D32',         // grass green
  },
} as const;
