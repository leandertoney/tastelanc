import { type QuestionCategory } from './types';

interface QuestionCandidate {
  statement: string;
  answer: boolean;
  restaurantName: string;
  category: QuestionCategory;
  explanation: string;
  imageUrl: string | null;
}

// Maps restaurant ID → cover image URL
export type RestaurantImageMap = Record<string, string | null>;

// ─────────────────────────────────────────────────────────
// RAW DATA TYPES (from Supabase joins)
// ─────────────────────────────────────────────────────────

export interface HappyHourRow {
  id: string;
  name: string;
  days_of_week: string[];
  start_time: string;
  end_time: string;
  restaurant: { id: string; name: string };
  happy_hour_items: {
    name: string;
    discounted_price: number | null;
    original_price: number | null;
    discount_description: string | null;
  }[];
}

export interface SpecialRow {
  id: string;
  name: string;
  days_of_week: string[];
  special_price: number | null;
  original_price: number | null;
  discount_description: string | null;
  restaurant: { id: string; name: string };
}

export interface EventRow {
  id: string;
  name: string;
  event_type: string;
  days_of_week: string[];
  performer_name: string | null;
  cover_charge: number | null;
  restaurant: { id: string; name: string } | null;
}

export interface RestaurantRow {
  id: string;
  name: string;
  categories: string[];
  vibe_tags: string[] | null;
  best_for: string[] | null;
  neighborhood: string | null;
  cover_image_url: string | null;
}

// ─────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────

const DAY_LABELS: Record<string, string> = {
  monday: 'Mondays',
  tuesday: 'Tuesdays',
  wednesday: 'Wednesdays',
  thursday: 'Thursdays',
  friday: 'Fridays',
  saturday: 'Saturdays',
  sunday: 'Sundays',
};

const ALL_DAYS = Object.keys(DAY_LABELS);

const EVENT_TYPE_LABELS: Record<string, string> = {
  live_music: 'live music',
  trivia: 'trivia',
  karaoke: 'karaoke',
  dj: 'DJ',
  comedy: 'comedy',
  sports: 'sports watch parties',
  bingo: 'bingo',
  music_bingo: 'music bingo',
  poker: 'poker',
};

const ALL_EVENT_TYPES = Object.keys(EVENT_TYPE_LABELS);

const CATEGORY_LABELS: Record<string, string> = {
  bars: 'a bar',
  nightlife: 'a nightlife spot',
  rooftops: 'a rooftop spot',
  american: 'an American food spot',
  italian: 'an Italian restaurant',
  mexican: 'a Mexican restaurant',
  chinese: 'a Chinese restaurant',
  japanese_sushi: 'a sushi spot',
  thai: 'a Thai restaurant',
  indian: 'an Indian restaurant',
  mediterranean: 'a Mediterranean restaurant',
  bbq: 'a BBQ joint',
  seafood: 'a seafood restaurant',
  steakhouse: 'a steakhouse',
  pizza: 'a pizza place',
  breakfast: 'a breakfast spot',
  brunch: 'a brunch spot',
  fine_dining: 'a fine dining restaurant',
  casual: 'a casual dining spot',
  fast_casual: 'a fast casual spot',
  cafe_coffee: 'a coffee shop',
  bakery: 'a bakery',
};

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function pickRandomExcluding<T>(arr: T[], exclude: T[]): T | null {
  const filtered = arr.filter((item) => !exclude.includes(item));
  return filtered.length > 0 ? pickRandom(filtered) : null;
}

function formatTime(time: string): string {
  const [h, m] = time.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  return m === 0 ? `${hour} ${ampm}` : `${hour}:${m.toString().padStart(2, '0')} ${ampm}`;
}

function formatPrice(price: number): string {
  return price % 1 === 0 ? `$${price}` : `$${price.toFixed(2)}`;
}

function fudgePrice(price: number): number {
  // Create a plausible wrong price within a reasonable range
  const offset = Math.max(1, Math.round(price * 0.3));
  const direction = Math.random() > 0.5 ? 1 : -1;
  const fudged = price + direction * (Math.floor(Math.random() * offset) + 1);
  return Math.max(1, Math.round(fudged));
}

// ─────────────────────────────────────────────────────────
// TEMPLATE FUNCTIONS
// ─────────────────────────────────────────────────────────

export function generateHappyHourQuestions(
  happyHours: HappyHourRow[],
  allRestaurantNames: string[],
  imageMap: RestaurantImageMap
): QuestionCandidate[] {
  const questions: QuestionCandidate[] = [];

  for (const hh of happyHours) {
    const rName = hh.restaurant.name;
    const imageUrl = imageMap[hh.restaurant.id] || null;

    // TRUE: "[Restaurant] has happy hour on [day]"
    if (hh.days_of_week.length > 0) {
      const day = pickRandom(hh.days_of_week);
      questions.push({
        statement: `${rName} has happy hour on ${DAY_LABELS[day] || day}.`,
        answer: true,
        restaurantName: rName,
        category: 'happy_hour',
        explanation: `Their happy hour runs ${formatTime(hh.start_time)}–${formatTime(hh.end_time)}.`,
        imageUrl,
      });

      // FALSE: wrong day
      const wrongDay = pickRandomExcluding(ALL_DAYS, hh.days_of_week);
      if (wrongDay) {
        questions.push({
          statement: `${rName} has happy hour on ${DAY_LABELS[wrongDay]}.`,
          answer: false,
          restaurantName: rName,
          category: 'happy_hour',
          explanation: `Their happy hour is on ${hh.days_of_week.map((d) => DAY_LABELS[d]).join(', ')}.`,
          imageUrl,
        });
      }
    }

    // TRUE/FALSE: item pricing
    for (const item of hh.happy_hour_items) {
      if (item.discounted_price != null) {
        // TRUE: correct price
        questions.push({
          statement: `${rName} has ${item.name} for ${formatPrice(item.discounted_price)} during happy hour.`,
          answer: true,
          restaurantName: rName,
          category: 'happy_hour',
          explanation: item.original_price
            ? `That's down from ${formatPrice(item.original_price)}!`
            : `${formatPrice(item.discounted_price)} is the happy hour price.`,
          imageUrl,
        });

        // FALSE: wrong price
        const wrongPrice = fudgePrice(item.discounted_price);
        questions.push({
          statement: `${rName} has ${item.name} for ${formatPrice(wrongPrice)} during happy hour.`,
          answer: false,
          restaurantName: rName,
          category: 'happy_hour',
          explanation: `It's actually ${formatPrice(item.discounted_price)}.`,
          imageUrl,
        });
      }
    }
  }

  return questions;
}

export function generateSpecialQuestions(
  specials: SpecialRow[],
  allRestaurantNames: string[],
  imageMap: RestaurantImageMap
): QuestionCandidate[] {
  const questions: QuestionCandidate[] = [];

  for (const sp of specials) {
    const rName = sp.restaurant.name;
    const imageUrl = imageMap[sp.restaurant.id] || null;

    // TRUE: "[Restaurant] offers [special] on [day]"
    if (sp.days_of_week.length > 0) {
      const day = pickRandom(sp.days_of_week);
      questions.push({
        statement: `${rName} offers "${sp.name}" on ${DAY_LABELS[day] || day}.`,
        answer: true,
        restaurantName: rName,
        category: 'special',
        explanation: sp.special_price
          ? `It's ${formatPrice(sp.special_price)}!`
          : `Check it out at ${rName}!`,
        imageUrl,
      });

      // FALSE: wrong day
      const wrongDay = pickRandomExcluding(ALL_DAYS, sp.days_of_week);
      if (wrongDay) {
        questions.push({
          statement: `${rName} offers "${sp.name}" on ${DAY_LABELS[wrongDay]}.`,
          answer: false,
          restaurantName: rName,
          category: 'special',
          explanation: `It's actually on ${sp.days_of_week.map((d) => DAY_LABELS[d]).join(', ')}.`,
          imageUrl,
        });
      }
    }

    // TRUE/FALSE: pricing
    if (sp.special_price != null) {
      questions.push({
        statement: `${rName}'s "${sp.name}" special costs ${formatPrice(sp.special_price)}.`,
        answer: true,
        restaurantName: rName,
        category: 'special',
        explanation: sp.original_price
          ? `Down from ${formatPrice(sp.original_price)}.`
          : `${formatPrice(sp.special_price)} is the deal price.`,
        imageUrl,
      });

      const wrongPrice = fudgePrice(sp.special_price);
      questions.push({
        statement: `${rName}'s "${sp.name}" special costs ${formatPrice(wrongPrice)}.`,
        answer: false,
        restaurantName: rName,
        category: 'special',
        explanation: `It's actually ${formatPrice(sp.special_price)}.`,
        imageUrl,
      });
    }
  }

  return questions;
}

export function generateEventQuestions(events: EventRow[], imageMap: RestaurantImageMap): QuestionCandidate[] {
  const questions: QuestionCandidate[] = [];

  for (const ev of events) {
    if (!ev.restaurant) continue;
    const rName = ev.restaurant.name;
    const typeLabel = EVENT_TYPE_LABELS[ev.event_type] || ev.event_type;
    const imageUrl = imageMap[ev.restaurant.id] || null;

    // TRUE: "[Restaurant] hosts [event_type] nights"
    questions.push({
      statement: `${rName} hosts ${typeLabel} nights.`,
      answer: true,
      restaurantName: rName,
      category: 'event',
      explanation: ev.performer_name
        ? `Featuring ${ev.performer_name}!`
        : `Check out their ${typeLabel} events.`,
      imageUrl,
    });

    // FALSE: wrong event type for this restaurant
    const wrongType = pickRandomExcluding(ALL_EVENT_TYPES, [ev.event_type]);
    if (wrongType) {
      questions.push({
        statement: `${rName} hosts ${EVENT_TYPE_LABELS[wrongType] || wrongType} nights.`,
        answer: false,
        restaurantName: rName,
        category: 'event',
        explanation: `They actually host ${typeLabel}, not ${EVENT_TYPE_LABELS[wrongType]}.`,
        imageUrl,
      });
    }

    // TRUE/FALSE: cover charge
    if (ev.cover_charge != null && ev.cover_charge > 0) {
      questions.push({
        statement: `The cover charge for ${typeLabel} at ${rName} is ${formatPrice(ev.cover_charge)}.`,
        answer: true,
        restaurantName: rName,
        category: 'event',
        explanation: `${formatPrice(ev.cover_charge)} gets you in the door.`,
        imageUrl,
      });
    }
  }

  return questions;
}

export function generateVibeQuestions(restaurants: RestaurantRow[]): QuestionCandidate[] {
  const questions: QuestionCandidate[] = [];

  // Collect all categories across all restaurants for generating false answers
  const allCategories = Array.from(new Set(restaurants.flatMap((r) => r.categories)));

  for (const r of restaurants) {
    const imageUrl = r.cover_image_url || null;

    // TRUE: "[Restaurant] is known as a [category] spot"
    for (const cat of r.categories) {
      if (CATEGORY_LABELS[cat]) {
        questions.push({
          statement: `${r.name} is known as ${CATEGORY_LABELS[cat]}.`,
          answer: true,
          restaurantName: r.name,
          category: 'cuisine',
          explanation: `That's one of their main vibes.`,
          imageUrl,
        });
      }
    }

    // FALSE: wrong category
    const wrongCat = pickRandomExcluding(
      allCategories.filter((c) => CATEGORY_LABELS[c]),
      r.categories
    );
    if (wrongCat && CATEGORY_LABELS[wrongCat]) {
      questions.push({
        statement: `${r.name} is known as ${CATEGORY_LABELS[wrongCat]}.`,
        answer: false,
        restaurantName: r.name,
        category: 'cuisine',
        explanation: `They're actually more of ${r.categories
          .filter((c) => CATEGORY_LABELS[c])
          .map((c) => CATEGORY_LABELS[c])
          .slice(0, 2)
          .join(' and ') || 'a different vibe'}.`,
        imageUrl,
      });
    }

    // TRUE: vibe tags
    if (r.vibe_tags && r.vibe_tags.length > 0) {
      const vibe = pickRandom(r.vibe_tags);
      questions.push({
        statement: `${r.name} is described as "${vibe}."`,
        answer: true,
        restaurantName: r.name,
        category: 'vibe',
        explanation: `That's how people describe the vibe there.`,
        imageUrl,
      });
    }

    // TRUE: neighborhood
    if (r.neighborhood) {
      questions.push({
        statement: `${r.name} is located in the ${r.neighborhood} area.`,
        answer: true,
        restaurantName: r.name,
        category: 'vibe',
        explanation: `You can find them in ${r.neighborhood}.`,
        imageUrl,
      });
    }
  }

  return questions;
}
