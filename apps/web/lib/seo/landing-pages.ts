import type { MarketBrand } from '@/config/market';
import { ALL_CATEGORIES } from '@/lib/constants/categories';

// ── Types ──────────────────────────────────────────────

export type LandingDataType = 'restaurants' | 'happy-hours' | 'events';

export interface LandingPageConfig {
  slug: string;
  title: (b: MarketBrand) => string;
  description: (b: MarketBrand) => string;
  h1: (b: MarketBrand) => string;
  intro: (b: MarketBrand) => string;
  dataType: LandingDataType;
  filter: {
    category?: string;
    day?: string;
    eventType?: string;
  };
  faqs: Array<{
    q: (b: MarketBrand) => string;
    a: (b: MarketBrand) => string;
  }>;
  relatedSlugs: string[];
}

// ── Helper: Generate cuisine pages from ALL_CATEGORIES ──

function cuisinePage(
  slug: string,
  label: string,
  category: string,
  relatedSlugs: string[],
): LandingPageConfig {
  return {
    slug,
    title: (b) => `Best ${label} Restaurants in ${b.countyShort}, ${b.state} | ${b.name}`,
    description: (b) =>
      `Discover the best ${label.toLowerCase()} restaurants in ${b.countyShort}, ${b.state}. Real reviews, happy hours, and specials — all in one app.`,
    h1: (b) => `Best ${label} Restaurants in ${b.countyShort}, ${b.state}`,
    intro: (b) =>
      `Looking for great ${label.toLowerCase()} food in ${b.countyShort}? Here are the top-rated ${label.toLowerCase()} spots, updated daily with real happy hours, specials, and events.`,
    dataType: 'restaurants',
    filter: { category },
    faqs: [
      {
        q: (b) => `What are the best ${label.toLowerCase()} restaurants in ${b.countyShort}?`,
        a: (b) =>
          `${b.name} tracks the best ${label.toLowerCase()} restaurants in ${b.county}, with real-time happy hours, specials, and ratings from local diners.`,
      },
      {
        q: (b) => `How many ${label.toLowerCase()} restaurants are in ${b.countyShort}?`,
        a: (b) =>
          `Download the ${b.name} app to browse all ${label.toLowerCase()} restaurants in ${b.county}, with menus, photos, and directions.`,
      },
    ],
    relatedSlugs,
  };
}

// ── Happy Hour Day Pages ────────────────────────────────

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const;

function happyHourDayPage(day: string): LandingPageConfig {
  const capitalized = day.charAt(0).toUpperCase() + day.slice(1);
  const otherDays = DAYS.filter((d) => d !== day).map((d) => `${d}-happy-hours`);
  return {
    slug: `${day}-happy-hours`,
    title: (b) => `Best ${capitalized} Happy Hours in ${b.countyShort}, ${b.state} | ${b.name}`,
    description: (b) =>
      `Find the best ${capitalized.toLowerCase()} happy hour deals in ${b.countyShort}, ${b.state}. Drink specials, food deals, and more.`,
    h1: (b) => `Best ${capitalized} Happy Hours in ${b.countyShort}, ${b.state}`,
    intro: (b) =>
      `Planning your ${capitalized.toLowerCase()}? Here are the best happy hour deals happening in ${b.countyShort} — from craft beer specials to half-price appetizers.`,
    dataType: 'happy-hours',
    filter: { day },
    faqs: [
      {
        q: (b) => `What time do happy hours start on ${capitalized.toLowerCase()} in ${b.countyShort}?`,
        a: (b) =>
          `Most ${capitalized.toLowerCase()} happy hours in ${b.countyShort} start between 3-5pm. Download the ${b.name} app for exact times and deals at every restaurant.`,
      },
      {
        q: (b) => `Where are the best ${capitalized.toLowerCase()} drink deals in ${b.countyShort}?`,
        a: (b) =>
          `The ${b.name} app shows all ${capitalized.toLowerCase()} happy hour specials in real-time, including prices, times, and locations.`,
      },
    ],
    relatedSlugs: ['happy-hours', ...otherDays.slice(0, 3)],
  };
}

// ── Static Pages ────────────────────────────────────────

const HAPPY_HOURS_OVERVIEW: LandingPageConfig = {
  slug: 'happy-hours',
  title: (b) => `Best Happy Hours in ${b.countyShort}, ${b.state} | ${b.name}`,
  description: (b) =>
    `Find the best happy hour deals in ${b.countyShort}, ${b.state}. Discover drink specials, food deals, and daily happy hour times at local bars and restaurants.`,
  h1: (b) => `Best Happy Hours in ${b.countyShort}, ${b.state}`,
  intro: (b) =>
    `Discover the best happy hour deals across ${b.county}. From craft beer specials to half-price appetizers, we track every deal so you don't have to.`,
  dataType: 'happy-hours',
  filter: {},
  faqs: [
    {
      q: (b) => `What are the best happy hours in ${b.countyShort}?`,
      a: (b) =>
        `${b.name} tracks happy hours at every restaurant and bar in ${b.county}. Download the app to see real-time deals, prices, and times.`,
    },
    {
      q: (b) => `What time do happy hours start in ${b.countyShort}?`,
      a: (b) =>
        `Happy hours in ${b.countyShort} typically start between 3-5pm, with some starting as early as 11am. The ${b.name} app shows exact times for every location.`,
    },
    {
      q: (b) => `Is there a happy hour app for ${b.countyShort}?`,
      a: (b) =>
        `Yes! ${b.name} is the #1 app for finding happy hours in ${b.county}. It shows real-time specials, prices, and times at every bar and restaurant — and it's free.`,
    },
  ],
  relatedSlugs: ['monday-happy-hours', 'friday-happy-hours', 'bars', 'cocktail-bars'],
};

const RESTAURANT_APP: LandingPageConfig = {
  slug: 'restaurant-app',
  title: (b) => `Best Restaurant App for ${b.countyShort}, ${b.state} | ${b.name}`,
  description: (b) =>
    `${b.name} is the #1 restaurant discovery app for ${b.countyShort}, ${b.state}. Find happy hours, events, specials, and personalized recommendations — all free.`,
  h1: (b) => `The Best Restaurant App for ${b.countyShort}, ${b.state}`,
  intro: (b) =>
    `Stop scrolling through Yelp reviews and Google Maps. ${b.name} is built specifically for ${b.county} — with real-time happy hours, daily specials, local events, and an AI dining guide named ${b.aiName} who knows every restaurant in town.`,
  dataType: 'restaurants',
  filter: {},
  faqs: [
    {
      q: (b) => `What is ${b.name}?`,
      a: (b) =>
        `${b.name} is a free restaurant discovery app for ${b.county}. It tracks happy hours, specials, events, and nightlife in real-time — plus an AI assistant (${b.aiName}) that gives personalized dining recommendations.`,
    },
    {
      q: () => `Is there a free app for finding restaurant deals?`,
      a: (b) =>
        `Yes! ${b.name} is 100% free and shows real-time happy hours, food specials, and drink deals at restaurants in ${b.county}. Available on iOS and Android.`,
    },
    {
      q: () => `What's the best dining app in 2026?`,
      a: (b) =>
        `For ${b.countyShort}, ${b.state}, ${b.name} is the best dining app. Unlike Yelp or Google Maps, it's built by locals and updated daily with happy hours, events, and specials you won't find anywhere else.`,
    },
  ],
  relatedSlugs: ['happy-hours', 'date-night-restaurants', 'live-music'],
};

// ── Build the full config array ─────────────────────────

// Cuisine pages — auto-generated from categories
const CUISINE_PAGES: LandingPageConfig[] = ALL_CATEGORIES
  .filter((c) => c.group === 'cuisines')
  .map((c) => {
    const slug = c.value.replace(/_/g, '-') + '-restaurants';
    // Pick 3 related cuisine slugs
    const siblings = ALL_CATEGORIES
      .filter((s) => s.group === 'cuisines' && s.value !== c.value)
      .slice(0, 3)
      .map((s) => s.value.replace(/_/g, '-') + '-restaurants');
    return cuisinePage(slug, c.label, c.value, siblings);
  });

// Feature/vibe pages
const FEATURE_PAGES: LandingPageConfig[] = [
  {
    slug: 'date-night-restaurants',
    title: (b) => `Best Date Night Restaurants in ${b.countyShort}, ${b.state} | ${b.name}`,
    description: (b) => `Plan the perfect date night in ${b.countyShort}. Romantic restaurants, cozy bars, and special experiences.`,
    h1: (b) => `Best Date Night Restaurants in ${b.countyShort}, ${b.state}`,
    intro: (b) => `Planning a date night in ${b.countyShort}? From intimate fine dining to cozy cocktail bars, here are the most romantic spots in town.`,
    dataType: 'restaurants',
    filter: { category: 'date_night' },
    faqs: [
      { q: (b) => `Where should I go on a date in ${b.countyShort}?`, a: (b) => `${b.name} curates the best date night spots in ${b.county}. Download the app for personalized recommendations from ${b.aiName}.` },
      { q: (b) => `What are the most romantic restaurants in ${b.countyShort}?`, a: (b) => `From fine dining to cocktail bars, ${b.name} tracks all the best romantic restaurants in ${b.county} with real happy hours and specials.` },
    ],
    relatedSlugs: ['fine-dining-restaurants', 'cocktail-bar-restaurants', 'italian-restaurants'],
  },
  {
    slug: 'outdoor-dining',
    title: (b) => `Best Outdoor Dining in ${b.countyShort}, ${b.state} | ${b.name}`,
    description: (b) => `Find the best patios, rooftops, and outdoor dining spots in ${b.countyShort}, ${b.state}.`,
    h1: (b) => `Best Outdoor Dining in ${b.countyShort}, ${b.state}`,
    intro: (b) => `Enjoy a meal al fresco at the best outdoor dining spots in ${b.countyShort}. Patios, rooftops, and sidewalk cafes — all with real-time hours and specials.`,
    dataType: 'restaurants',
    filter: { category: 'outdoor_dining' },
    faqs: [
      { q: (b) => `Where can I eat outside in ${b.countyShort}?`, a: (b) => `${b.name} tracks all outdoor dining options in ${b.county}. Download the app to find patios, rooftops, and more near you.` },
    ],
    relatedSlugs: ['rooftop-restaurants', 'date-night-restaurants', 'breweries'],
  },
  {
    slug: 'live-music',
    title: (b) => `Best Live Music Venues in ${b.countyShort}, ${b.state} | ${b.name}`,
    description: (b) => `Find live music tonight in ${b.countyShort}. Bars, restaurants, and venues with live bands, DJs, and open mics.`,
    h1: (b) => `Best Live Music Venues in ${b.countyShort}, ${b.state}`,
    intro: (b) => `Looking for live music in ${b.countyShort} tonight? Here are the top venues hosting live bands, solo artists, DJs, and open mic nights.`,
    dataType: 'restaurants',
    filter: { category: 'live_music' },
    faqs: [
      { q: (b) => `Where can I find live music in ${b.countyShort} tonight?`, a: (b) => `The ${b.name} app shows live music events happening tonight in ${b.county}, with times, performers, and venues — all updated daily.` },
    ],
    relatedSlugs: ['bars', 'nightlife-restaurants', 'happy-hours'],
  },
  {
    slug: 'late-night-food',
    title: (b) => `Best Late Night Food in ${b.countyShort}, ${b.state} | ${b.name}`,
    description: (b) => `Find restaurants and bars open late in ${b.countyShort}, ${b.state}. Late night menus, kitchen hours, and deals.`,
    h1: (b) => `Best Late Night Food in ${b.countyShort}, ${b.state}`,
    intro: (b) => `Hungry after midnight in ${b.countyShort}? Here are the restaurants and bars still serving food late — with real-time hours and menus.`,
    dataType: 'restaurants',
    filter: { category: 'late_night' },
    faqs: [
      { q: (b) => `What restaurants are open late in ${b.countyShort}?`, a: (b) => `Download the ${b.name} app to see which restaurants are open late tonight in ${b.county}, with live hours and menus.` },
    ],
    relatedSlugs: ['bars', 'pizza-restaurants', 'nightlife-restaurants'],
  },
  {
    slug: 'bars',
    title: (b) => `Best Bars in ${b.countyShort}, ${b.state} | ${b.name}`,
    description: (b) => `Find the best bars in ${b.countyShort}, ${b.state}. Dive bars, cocktail lounges, sports bars, and more with real-time happy hours.`,
    h1: (b) => `Best Bars in ${b.countyShort}, ${b.state}`,
    intro: (b) => `From dive bars to upscale cocktail lounges, here are the best bars in ${b.countyShort} — with real-time happy hour deals and specials.`,
    dataType: 'restaurants',
    filter: { category: 'bars' },
    faqs: [
      { q: (b) => `What are the best bars in ${b.countyShort}?`, a: (b) => `${b.name} tracks every bar in ${b.county} with real-time happy hours, drink specials, and events. Download the free app to find your next spot.` },
    ],
    relatedSlugs: ['happy-hours', 'cocktail-bars', 'nightlife-restaurants', 'breweries'],
  },
  {
    slug: 'breweries',
    title: (b) => `Best Breweries in ${b.countyShort}, ${b.state} | ${b.name}`,
    description: (b) => `Discover the best breweries and craft beer spots in ${b.countyShort}, ${b.state}.`,
    h1: (b) => `Best Breweries in ${b.countyShort}, ${b.state}`,
    intro: (b) => `Craft beer lovers, this is for you. Here are the top breweries in ${b.countyShort} with taproom hours, specials, and events.`,
    dataType: 'restaurants',
    filter: { category: 'brewery' },
    faqs: [
      { q: (b) => `How many breweries are in ${b.countyShort}?`, a: (b) => `Download the ${b.name} app to browse all breweries in ${b.county} with taproom hours, beer lists, and happy hour specials.` },
    ],
    relatedSlugs: ['bars', 'happy-hours', 'outdoor-dining'],
  },
  {
    slug: 'cocktail-bars',
    title: (b) => `Best Cocktail Bars in ${b.countyShort}, ${b.state} | ${b.name}`,
    description: (b) => `Find the best cocktail bars and speakeasies in ${b.countyShort}, ${b.state}.`,
    h1: (b) => `Best Cocktail Bars in ${b.countyShort}, ${b.state}`,
    intro: (b) => `Looking for craft cocktails in ${b.countyShort}? From speakeasies to rooftop lounges, here are the best cocktail bars in town.`,
    dataType: 'restaurants',
    filter: { category: 'cocktail_bar' },
    faqs: [
      { q: (b) => `Where can I find craft cocktails in ${b.countyShort}?`, a: (b) => `${b.name} tracks the best cocktail bars in ${b.county}. Download the app for happy hour cocktail specials and recommendations from ${b.aiName}.` },
    ],
    relatedSlugs: ['bars', 'date-night-restaurants', 'happy-hours'],
  },
  {
    slug: 'rooftop-restaurants',
    title: (b) => `Best Rooftop Bars & Restaurants in ${b.countyShort}, ${b.state} | ${b.name}`,
    description: (b) => `Find rooftop dining and bars in ${b.countyShort}, ${b.state}. Views, drinks, and vibes.`,
    h1: (b) => `Best Rooftop Bars & Restaurants in ${b.countyShort}, ${b.state}`,
    intro: (b) => `Enjoy a drink with a view at the best rooftop spots in ${b.countyShort}. Updated with real hours and happy hour specials.`,
    dataType: 'restaurants',
    filter: { category: 'rooftops' },
    faqs: [
      { q: (b) => `Are there rooftop bars in ${b.countyShort}?`, a: (b) => `Yes! Download the ${b.name} app to find rooftop bars and restaurants in ${b.county} with real-time hours, menus, and specials.` },
    ],
    relatedSlugs: ['outdoor-dining', 'cocktail-bars', 'date-night-restaurants'],
  },
];

// Happy hour day pages
const HAPPY_HOUR_DAY_PAGES: LandingPageConfig[] = DAYS.map(happyHourDayPage);

// ── Export all landing pages ────────────────────────────

export const LANDING_PAGES: LandingPageConfig[] = [
  RESTAURANT_APP,
  HAPPY_HOURS_OVERVIEW,
  ...HAPPY_HOUR_DAY_PAGES,
  ...CUISINE_PAGES,
  ...FEATURE_PAGES,
];

/** Look up a landing page config by slug */
export function getLandingPage(slug: string): LandingPageConfig | undefined {
  return LANDING_PAGES.find((p) => p.slug === slug);
}

/** Get all landing page slugs (for generateStaticParams) */
export function getAllLandingPageSlugs(): string[] {
  return LANDING_PAGES.map((p) => p.slug);
}
