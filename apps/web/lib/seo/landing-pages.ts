import type { MarketBrand } from '@/config/market';
import { ALL_CATEGORIES } from '@/lib/constants/categories';

// ── Types ──────────────────────────────────────────────

export type LandingDataType = 'restaurants' | 'happy-hours' | 'events';

export interface LandingSubcategory {
  /** H2 heading text */
  heading: (b: MarketBrand) => string;
  /** 1–2 sentence intro below the H2 */
  body: (b: MarketBrand) => string;
  /** Optional category filter to subset the main data set */
  filterCategory?: string;
}

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

  // ── SEO Editorial Layer (optional) ──────────────────────
  /** 120–200 word editorial paragraph shown under the H1 */
  editorialIntro?: (b: MarketBrand) => string;
  /** 3–5 H2 subcategory sections rendered mid-page */
  subcategories?: LandingSubcategory[];
  /** Extra FAQ items appended to the base faqs array */
  extraFaqs?: Array<{
    q: (b: MarketBrand) => string;
    a: (b: MarketBrand) => string;
  }>;
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
    editorialIntro: (b) =>
      `${b.countyShort}, ${b.state} has a thriving ${label.toLowerCase()} dining scene — and ${b.name} tracks every restaurant so you always know where to eat. Whether you're a local looking for a new favorite or a visitor exploring ${b.county}, this list is updated regularly from live restaurant data so you're never working off stale information. We pull happy hour times, daily specials, and current events directly from each restaurant, giving you an accurate picture of what's happening right now. From long-standing neighborhood gems to newer spots making waves, the ${label.toLowerCase()} restaurants below represent the best of what ${b.countyShort} has to offer. Bookmark this page — it changes as the dining scene does.`,
    subcategories: [
      {
        heading: (b) => `Best Overall ${label} Restaurants in ${b.countyShort}`,
        body: (b) =>
          `These are the top-rated ${label.toLowerCase()} spots in ${b.county} based on real customer activity, verified hours, and complete menus in the ${b.name} app.`,
      },
      {
        heading: (b) => `${label} Restaurants with Happy Hour Deals`,
        body: (b) =>
          `Many ${label.toLowerCase()} restaurants in ${b.countyShort} run happy hour specials on drinks and appetizers. Check the ${b.name} app for current times and prices.`,
      },
      {
        heading: (b) => `${label} Restaurants Open Late in ${b.countyShort}`,
        body: (b) =>
          `Need a late dinner? Several ${label.toLowerCase()} spots in ${b.county} keep their kitchens open past 9pm. Hours are verified and updated regularly.`,
      },
    ],
    extraFaqs: [
      {
        q: (b) => `Do ${label.toLowerCase()} restaurants in ${b.countyShort} have happy hours?`,
        a: (b) =>
          `Yes — many ${label.toLowerCase()} restaurants in ${b.county} offer happy hour drink and food specials. The ${b.name} app lists current deals with exact times at each location.`,
      },
      {
        q: (b) => `Are there ${label.toLowerCase()} restaurants open late in ${b.countyShort}?`,
        a: (b) =>
          `Several ${label.toLowerCase()} restaurants in ${b.county} stay open late. Download the ${b.name} app to see current hours and late-night menus in real time.`,
      },
    ],
  };
}

// ── Happy Hour Day Pages ────────────────────────────────

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const;

function happyHourDayPage(day: string): LandingPageConfig {
  const capitalized = day.charAt(0).toUpperCase() + day.slice(1);
  const otherDays = DAYS.filter((d) => d !== day).map((d) => `${d}-happy-hours`);
  const isWeekend = day === 'friday' || day === 'saturday' || day === 'sunday';
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
    editorialIntro: (b) =>
      `${capitalized} happy hours in ${b.countyShort}, ${b.state} are a local tradition — and this list is pulled directly from live restaurant data so you always know what's actually running. ${isWeekend ? `${b.countyShort} ${day === 'friday' ? 'kicks off the weekend' : 'keeps the weekend going'} with some of the best happy hour deals of the week, from early afternoon specials to late-night bar deals.` : `Midweek happy hours in ${b.countyShort} are a great way to unwind without the weekend crowds.`} Every listing below shows real start and end times, food and drink specials, and links directly to the restaurant's full profile. Updated regularly as restaurants add and change their deals. Download the ${b.name} app for push notifications when your favorite spots post new specials.`,
    subcategories: [
      {
        heading: (b) => `Best ${capitalized} Happy Hour Drink Specials in ${b.countyShort}`,
        body: (b) =>
          `These ${b.countyShort} bars and restaurants run the best ${capitalized.toLowerCase()} drink specials — from $3 drafts to half-price cocktails. Times and prices shown are live from the ${b.name} app.`,
      },
      {
        heading: (b) => `${capitalized} Happy Hours with Food Deals`,
        body: (b) =>
          `Not just drinks — these spots offer ${capitalized.toLowerCase()} food specials alongside their happy hour menus. Half-price apps, discounted plates, and more in ${b.county}.`,
      },
      {
        heading: (b) => `Late ${capitalized} Happy Hours in ${b.countyShort}`,
        body: (b) =>
          `Some ${b.countyShort} bars extend their happy hour into the evening. These spots run late ${capitalized.toLowerCase()} deals — great if you can't make the early window.`,
      },
      {
        heading: (b) => `${capitalized} Outdoor Happy Hours in ${b.countyShort}`,
        body: (b) =>
          `When the weather's right, these ${b.countyShort} spots serve happy hour on patios, rooftops, and outdoor spaces. See current hours in the ${b.name} app.`,
      },
    ],
    extraFaqs: [
      {
        q: (b) => `Are there late night happy hours on ${capitalized.toLowerCase()} in ${b.countyShort}?`,
        a: (b) =>
          `Yes — some ${b.countyShort} bars run ${capitalized.toLowerCase()} happy hours past 8pm. The ${b.name} app lists exact end times so you don't miss the window.`,
      },
      {
        q: (b) => `Do ${b.countyShort} bars have food specials on ${capitalized.toLowerCase()}?`,
        a: (b) =>
          `Many ${b.countyShort} restaurants pair food specials with their ${capitalized.toLowerCase()} happy hours — half-price appetizers, discounted flatbreads, and more. Check the ${b.name} app for current offers.`,
      },
      {
        q: (b) => `Which ${b.countyShort} restaurants have outdoor seating for ${capitalized.toLowerCase()} happy hour?`,
        a: (b) =>
          `Several ${b.countyShort} bars and restaurants offer outdoor happy hour seating on ${capitalized.toLowerCase()}. Download the ${b.name} app to filter by outdoor dining and see live happy hour times.`,
      },
    ],
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
  editorialIntro: (b) =>
    `Happy hours in ${b.countyShort}, ${b.state} run the full spectrum — from $3 draft nights at neighborhood dive bars to carefully curated cocktail specials at upscale lounges. This page pulls live data from every bar and restaurant in ${b.county} that has a registered happy hour, so what you see here reflects what's actually running today, not last season's deals. We track start times, end times, individual food and drink specials, and verified locations. Whether you're planning a post-work meetup, a casual date night, or just want to stretch your dining budget, ${b.countyShort}'s happy hour scene has something at every price point. Bookmark this page — deals change regularly and the list updates automatically. For real-time push alerts when your favorite spot posts a new deal, download the free ${b.name} app.`,
  subcategories: [
    {
      heading: (b) => `Best Overall Happy Hours in ${b.countyShort}`,
      body: (b) =>
        `The top-rated happy hours in ${b.county} based on deal quality, variety, and verified hours. These spots consistently run strong specials across drinks and food.`,
    },
    {
      heading: (b) => `Cheap Happy Hours in ${b.countyShort}`,
      body: (b) =>
        `Looking to keep it budget-friendly? These ${b.countyShort} bars and restaurants offer the most affordable happy hour deals in the county — under $5 drinks and discounted apps.`,
    },
    {
      heading: (b) => `Late Night Happy Hours in ${b.countyShort}`,
      body: (b) =>
        `Not everyone makes the 5pm window. These ${b.countyShort} spots run happy hours into the evening, some as late as 10pm or midnight on weekends.`,
    },
    {
      heading: (b) => `Outdoor Happy Hours in ${b.countyShort}`,
      body: (b) =>
        `Patios, rooftops, and sidewalk seating — these ${b.countyShort} spots let you enjoy happy hour outside. Hours are live and verified in the ${b.name} app.`,
    },
  ],
  extraFaqs: [
    {
      q: (b) => `What time do happy hours end in ${b.countyShort}?`,
      a: (b) =>
        `Happy hour end times in ${b.countyShort} vary by location — most wrap up between 6-7pm, but some bars run specials until 9pm or later. The ${b.name} app shows exact end times for every venue.`,
    },
    {
      q: (b) => `Are there happy hours every day in ${b.countyShort}?`,
      a: (b) =>
        `Yes — ${b.countyShort} has happy hours running every day of the week. Some spots only run them Monday–Friday; others include weekends. Filter by day in the ${b.name} app.`,
    },
    {
      q: (b) => `Do ${b.countyShort} restaurants offer food specials during happy hour?`,
      a: (b) =>
        `Many do. Beyond drink specials, several ${b.county} restaurants offer half-price appetizers, discounted flatbreads, and food combos during happy hour. The ${b.name} app lists both food and drink deals at each location.`,
    },
  ],
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
    editorialIntro: (b) =>
      `${b.countyShort}, ${b.state} punches well above its weight for date night dining. Whether you're after candlelit fine dining, a low-key cocktail bar with character, or a rooftop with a view, the local restaurant scene delivers. This list is updated regularly from live data — menus, hours, and happy hour specials are pulled directly from ${b.name}'s restaurant database so every recommendation reflects what's actually open and running. For a first date or a tenth anniversary, ${b.countyShort}'s most romantic restaurants are tracked here with verified hours, current specials, and links to full menus. Ask ${b.aiName} in the ${b.name} app for a personalized date night itinerary tailored to your budget and vibe.`,
    subcategories: [
      {
        heading: (b) => `Best Fine Dining Date Nights in ${b.countyShort}`,
        body: (b) =>
          `For a special occasion, these ${b.countyShort} fine dining restaurants set the standard — white tablecloths, curated wine lists, and menus that make an impression.`,
      },
      {
        heading: (b) => `Romantic Cocktail Bars in ${b.countyShort}`,
        body: (b) =>
          `Not every date night needs a full dinner. These ${b.county} cocktail bars offer the right atmosphere — low lighting, craft drinks, and a relaxed pace.`,
      },
      {
        heading: (b) => `Date Night Restaurants with Happy Hour Specials`,
        body: (b) =>
          `Great date nights don't have to break the bank. These ${b.countyShort} romantic restaurants run happy hour specials on drinks and apps — see current deals in the ${b.name} app.`,
      },
    ],
    extraFaqs: [
      {
        q: (b) => `What are good date night spots in ${b.countyShort} for a first date?`,
        a: (b) =>
          `For a first date in ${b.countyShort}, cocktail bars and casual upscale restaurants are a safe bet — comfortable enough to talk, nice enough to impress. The ${b.name} app's AI guide ${b.aiName} can suggest spots based on your neighborhood and budget.`,
      },
      {
        q: (b) => `Are there romantic restaurants in ${b.countyShort} with outdoor seating?`,
        a: (b) =>
          `Yes — several of ${b.countyShort}'s most romantic restaurants have patio and rooftop seating. Download the ${b.name} app and filter by outdoor dining to see options with live hours.`,
      },
    ],
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
    editorialIntro: (b) =>
      `Outdoor dining in ${b.countyShort}, ${b.state} ranges from casual sidewalk patios to elevated rooftop terraces — and this list covers all of it. Every restaurant below has been verified in the ${b.name} database with current hours, outdoor seating details, and any running happy hour or food specials. Whether you want brunch in the sun, a relaxed afternoon beer on a brewery patio, or a dinner with a view, ${b.county} delivers. Listings are updated regularly as restaurants open new outdoor spaces or change their hours for the season. For real-time status — especially weather-dependent seasonal patios — download the ${b.name} app and check before you go.`,
    subcategories: [
      {
        heading: (b) => `Best Patio Restaurants in ${b.countyShort}`,
        body: (b) =>
          `These ${b.countyShort} restaurants are known for their outdoor patio spaces — a great option for a relaxed lunch or dinner when the weather cooperates.`,
      },
      {
        heading: (b) => `Rooftop Dining in ${b.countyShort}`,
        body: (b) =>
          `${b.countyShort}'s rooftop bars and restaurants offer food, drinks, and views. See current hours and happy hour deals in the ${b.name} app.`,
      },
      {
        heading: (b) => `Outdoor Happy Hours in ${b.countyShort}`,
        body: (b) =>
          `These spots combine outdoor seating with happy hour specials — the ideal combo on a warm ${b.countyShort} evening. Times and deals are live in the ${b.name} app.`,
      },
    ],
    extraFaqs: [
      {
        q: (b) => `Which ${b.countyShort} restaurants have the best outdoor seating?`,
        a: (b) =>
          `The best outdoor dining in ${b.countyShort} spans rooftops, garden patios, and streetside tables. Download the ${b.name} app to filter restaurants by outdoor seating and see current hours.`,
      },
      {
        q: (b) => `Are ${b.countyShort} restaurant patios open year-round?`,
        a: (b) =>
          `Some ${b.county} restaurants keep outdoor spaces open seasonally — typically spring through fall. Hours are updated regularly in the ${b.name} app so you're never guessing.`,
      },
    ],
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
    editorialIntro: (b) =>
      `${b.countyShort}, ${b.state} has a genuine live music culture — not just cover bands on weekends, but original artists, jazz nights, bluegrass sessions, and DJ sets woven into the fabric of the local bar and restaurant scene. This list is sourced from verified event data in the ${b.name} platform, updated regularly as venues post upcoming performances. You'll find everything from intimate acoustic sets at neighborhood bars to full band nights at larger venues. Scroll down for a full breakdown by venue type, and download the ${b.name} app to get push notifications when your favorite venue adds a new show.`,
    subcategories: [
      {
        heading: (b) => `Best Live Music Bars in ${b.countyShort}`,
        body: (b) =>
          `These ${b.countyShort} bars book live acts regularly — from local original artists to cover bands and jazz ensembles. Check the ${b.name} app for upcoming show dates.`,
      },
      {
        heading: (b) => `Restaurants with Live Music in ${b.countyShort}`,
        body: (b) =>
          `Live music isn't limited to bars. These ${b.county} restaurants host performers on weekends and select weeknights — dinner and a show, without the ticket price.`,
      },
      {
        heading: (b) => `Open Mic Nights in ${b.countyShort}`,
        body: (b) =>
          `Several ${b.countyShort} venues host regular open mic nights — great for discovering local talent or taking the stage yourself. Dates and times in the ${b.name} app.`,
      },
    ],
    extraFaqs: [
      {
        q: (b) => `Which bars in ${b.countyShort} have live music on weekends?`,
        a: (b) =>
          `Several ${b.countyShort} bars host live bands on Friday and Saturday nights. The ${b.name} app lists upcoming shows by venue with times and performer details.`,
      },
      {
        q: (b) => `Are there free live music venues in ${b.countyShort}?`,
        a: (b) =>
          `Many ${b.countyShort} bars and restaurants host free live music — no cover charge. Download the ${b.name} app to find no-cover shows happening this week.`,
      },
    ],
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
    editorialIntro: (b) =>
      `Finding late night food in ${b.countyShort}, ${b.state} used to mean guessing which places were still open. This list solves that — every restaurant below has been verified in the ${b.name} database with actual kitchen hours, not just "open late" marketing language. We track which spots serve a full menu past 10pm, which ones switch to a limited late-night menu, and which bars keep the kitchen running until last call. Updated regularly from live restaurant data so you're not driving somewhere that closed its kitchen at 9pm. Whether you need a post-concert burger, a late dinner after work, or a 2am pizza slice, ${b.countyShort}'s late-night dining scene has real options.`,
    subcategories: [
      {
        heading: (b) => `Restaurants Open Past Midnight in ${b.countyShort}`,
        body: (b) =>
          `These ${b.countyShort} spots keep their kitchens open past 12am — verified hours in the ${b.name} app so you know before you go.`,
      },
      {
        heading: (b) => `Late Night Bar Food in ${b.countyShort}`,
        body: (b) =>
          `The best ${b.countyShort} bars serving real food late — wings, burgers, tacos, and more alongside their drink menus.`,
      },
      {
        heading: (b) => `Late Night Pizza & Fast Food in ${b.countyShort}`,
        body: (b) =>
          `Sometimes you just need a slice. These ${b.county} spots specialize in late-night comfort food — quick, satisfying, and open when everything else is closed.`,
      },
    ],
    extraFaqs: [
      {
        q: (b) => `What time do ${b.countyShort} restaurant kitchens close?`,
        a: (b) =>
          `Most ${b.countyShort} restaurant kitchens close between 9-10pm, but late-night spots stay open until midnight or later. The ${b.name} app shows verified kitchen close times for each location.`,
      },
      {
        q: (b) => `Are there bars in ${b.countyShort} that serve food late?`,
        a: (b) =>
          `Yes — several ${b.countyShort} bars run full or limited food menus late into the night. Download the ${b.name} app to see which bars near you are still serving food right now.`,
      },
    ],
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
    editorialIntro: (b) =>
      `${b.countyShort}, ${b.state} has a bar scene that runs the full spectrum — from no-frills neighborhood dives to craft cocktail lounges with seasonal menus. This list is pulled from live data in the ${b.name} restaurant database, so every bar below has verified hours, current happy hour specials, and links to their full profile. Whether you're looking for a sports bar to catch the game, a quiet spot for a nightcap, or a lively bar with live music on weekends, the ${b.countyShort} bar scene has a fit for every mood. Updated regularly as bars update their specials, hours, and events. Download the ${b.name} app to set alerts for your favorite spots.`,
    subcategories: [
      {
        heading: (b) => `Best Dive Bars in ${b.countyShort}`,
        body: (b) =>
          `${b.countyShort}'s best dive bars — cheap drinks, no pretense, and a loyal local crowd. These spots have been neighborhood fixtures for a reason.`,
      },
      {
        heading: (b) => `Best Sports Bars in ${b.countyShort}`,
        body: (b) =>
          `Multiple screens, cold drafts, and game-day specials. These ${b.county} sports bars are the go-to for watching big games in a good crowd.`,
      },
      {
        heading: (b) => `Bars with the Best Happy Hours in ${b.countyShort}`,
        body: (b) =>
          `These ${b.countyShort} bars run the strongest happy hour deals — discounted drafts, cocktail specials, and bar bites. Current times and prices in the ${b.name} app.`,
      },
      {
        heading: (b) => `Bars Open Late in ${b.countyShort}`,
        body: (b) =>
          `Night owls: these ${b.countyShort} bars stay open late on weekends. Verified close times in the ${b.name} app so you can plan your night with confidence.`,
      },
    ],
    extraFaqs: [
      {
        q: (b) => `What are the best dive bars in ${b.countyShort}?`,
        a: (b) =>
          `${b.countyShort} has a handful of beloved dive bars with cheap drinks and a genuine local feel. The ${b.name} app lists all bars in ${b.county} with verified hours and happy hour specials.`,
      },
      {
        q: (b) => `Are there sports bars in ${b.countyShort} with multiple TVs?`,
        a: (b) =>
          `Yes — several ${b.countyShort} sports bars are set up for game day with multiple large screens and drink specials during big games. Find them in the ${b.name} app.`,
      },
    ],
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
    editorialIntro: (b) =>
      `${b.countyShort}, ${b.state} has built a genuine craft beer culture over the past decade, with breweries ranging from small-batch taprooms to larger production facilities with full food programs. This list is sourced from verified brewery data in the ${b.name} platform — taproom hours, current specials, and events are updated regularly so you're never showing up to a closed taproom. Several of ${b.countyShort}'s best breweries also run food trucks, kitchen collaborations, or full kitchens alongside their beer programs, making them a solid destination for a full evening. Check the ${b.name} app for live taproom hours and seasonal tap list announcements.`,
    subcategories: [
      {
        heading: (b) => `Best Craft Breweries in ${b.countyShort}`,
        body: (b) =>
          `These are the standout craft breweries in ${b.county} — known for consistent quality, interesting rotating taps, and welcoming taproom experiences.`,
      },
      {
        heading: (b) => `Breweries with Food in ${b.countyShort}`,
        body: (b) =>
          `Beer is better with food. These ${b.countyShort} breweries offer kitchen menus or regular food truck partnerships alongside their tap lists.`,
      },
      {
        heading: (b) => `Breweries with Outdoor Seating in ${b.countyShort}`,
        body: (b) =>
          `Beer gardens, patios, and outdoor taprooms in ${b.county}. These breweries are the best spots to enjoy a pint outside when the weather cooperates.`,
      },
    ],
    extraFaqs: [
      {
        q: (b) => `What are the best craft breweries in ${b.countyShort}?`,
        a: (b) =>
          `${b.countyShort} has a thriving craft brewery scene. The ${b.name} app lists all local breweries with taproom hours, current specials, and upcoming events.`,
      },
      {
        q: (b) => `Do ${b.countyShort} breweries serve food?`,
        a: (b) =>
          `Several ${b.county} breweries run full kitchens or partner with food trucks. Check each brewery's profile in the ${b.name} app to see current food options.`,
      },
    ],
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
    editorialIntro: (b) =>
      `The cocktail bar scene in ${b.countyShort}, ${b.state} has matured considerably — you'll find bartenders doing serious work with house-made syrups, local spirits, and seasonal menus that change with the market. This list is sourced from verified data in the ${b.name} platform and updated regularly with current hours and happy hour specials. Whether you're looking for a classic speakeasy vibe, a bright and lively cocktail lounge, or a date-night bar with a focused menu, ${b.county} has strong options across every style. Many of these spots also run cocktail happy hours with significant discounts — check the ${b.name} app for current deals before you head out.`,
    subcategories: [
      {
        heading: (b) => `Best Craft Cocktail Bars in ${b.countyShort}`,
        body: (b) =>
          `These ${b.countyShort} bars are known for thoughtful cocktail programs — creative seasonal menus, quality spirits, and skilled bartenders.`,
      },
      {
        heading: (b) => `Cocktail Bars with Happy Hour Deals in ${b.countyShort}`,
        body: (b) =>
          `Great cocktails don't have to mean full price. These ${b.county} cocktail bars run happy hour specials on signature drinks — current times and discounts in the ${b.name} app.`,
      },
      {
        heading: (b) => `Cocktail Bars for Date Night in ${b.countyShort}`,
        body: (b) =>
          `Low lighting, curated drinks, and the right atmosphere — these ${b.countyShort} cocktail bars are the ideal setting for a date night.`,
      },
    ],
    extraFaqs: [
      {
        q: (b) => `What are the best speakeasies in ${b.countyShort}?`,
        a: (b) =>
          `${b.countyShort} has a few bars with that speakeasy feel — hidden entrances, intimate atmospheres, and serious cocktail programs. Find them in the ${b.name} app.`,
      },
      {
        q: (b) => `Do cocktail bars in ${b.countyShort} have happy hours?`,
        a: (b) =>
          `Several ${b.countyShort} cocktail bars run happy hour specials on their signature drinks. The ${b.name} app lists current cocktail happy hour deals with exact times and prices.`,
      },
    ],
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
    editorialIntro: (b) =>
      `Rooftop dining and drinking in ${b.countyShort}, ${b.state} is a seasonal highlight — and this list captures every verified rooftop bar and restaurant in the ${b.name} database. From full-service rooftop restaurants with dinner menus to casual rooftop bars built for sunset drinks, ${b.county}'s elevated spaces offer some of the best warm-weather experiences in the area. Hours and operational status are updated regularly — rooftop spaces are weather-dependent and can have limited seasons. Download the ${b.name} app for live status, current specials, and happy hour times at each location before you make the trip.`,
    subcategories: [
      {
        heading: (b) => `Best Rooftop Bars in ${b.countyShort}`,
        body: (b) =>
          `These ${b.countyShort} rooftop bars are built for drinks with a view — cocktails, craft beer, and skyline scenery. Current hours and happy hour deals in the ${b.name} app.`,
      },
      {
        heading: (b) => `Rooftop Restaurants with Full Dining in ${b.countyShort}`,
        body: (b) =>
          `Not just drinks — these ${b.county} rooftop spots serve full menus, making them a complete date night or group dinner destination with elevated views.`,
      },
      {
        heading: (b) => `Rooftop Happy Hours in ${b.countyShort}`,
        body: (b) =>
          `Get the view at half the price. These ${b.countyShort} rooftop venues run happy hour specials — the best time to experience them. Times in the ${b.name} app.`,
      },
    ],
    extraFaqs: [
      {
        q: (b) => `Which ${b.countyShort} rooftop bars have the best views?`,
        a: (b) =>
          `${b.countyShort}'s rooftop bars vary in their views — some overlook the city, others face open landscapes. Download the ${b.name} app to browse photos and details for each rooftop location.`,
      },
      {
        q: (b) => `Are ${b.countyShort} rooftop bars open year-round?`,
        a: (b) =>
          `Most ${b.countyShort} rooftop bars operate seasonally — typically spring through fall — though some close or open based on weather. The ${b.name} app shows current hours and seasonal status.`,
      },
    ],
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
