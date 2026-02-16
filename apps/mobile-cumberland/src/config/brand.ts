export const BRAND = {
  // Core identity
  appName: 'TasteCumberland',
  cityName: 'Cumberland County',
  cityPossessive: "Cumberland County's",
  marketSlug: 'cumberland-pa',
  sampleAddress: 'N Hanover St, Carlisle',

  // Badges & labels
  pickBadgeLabel: 'TasteCumberland Pick',
  verifiedLabel: 'TasteCumberland verified',

  // Profile
  userTitle: 'TasteCumberland Explorer',
  userSubtitle: "Discovering Cumberland County's best spots",
  tagline: 'Made with love in Cumberland County, PA',
  slogan: "Cumberland County's go-to for what's happening now.",

  // URLs (shared backend)
  supportEmail: 'support@tastelanc.com',
  privacyUrl: 'https://tastelanc.com/privacy',
  termsUrl: 'https://tastelanc.com/terms',
  websiteUrl: 'https://tastelanc.com',
  appStoreUrl: '', // TODO: set after App Store listing created
  playStoreUrl: '', // TODO: set after Play Store listing created

  // Defaults
  defaultItineraryTitle: 'My Cumberland Day',
  userAgent: 'TasteCumberland-Mobile',

  // AI Assistant
  aiName: 'Mollie',
  mollieGreeting:
    "Hi! I'm Mollie, your TasteCumberland AI assistant. I can help you discover restaurants, find deals, and plan your next dining experience. What are you in the mood for today?",
  mollieSubtitle: 'Your TasteCumberland AI',
  mollieSamplePrompt: 'What are the best dinner spots in Cumberland County?',

  // Brand palette — the 4 colors that define the visual identity
  // Change ONLY these when launching a new market app
  palette: {
    background: '#F4EBDD',  // warm cream
    navy: '#0F1E2E',        // deep midnight navy (accent/text)
    gold: '#C9A227',        // muted heritage gold
    green: '#2E7D32',       // grass green
  },
} as const;
