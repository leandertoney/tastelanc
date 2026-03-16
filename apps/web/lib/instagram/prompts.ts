// Instagram Agent v1: Caption prompt templates
// Rules: concise, local, utility-first, no cringe, no generic AI food-blog tone
// Always push toward app install, never reveal the full list, mention hidden quantity

import { ContentType, DayTheme, WeeklyThemeConfig } from './types';

interface PromptContext {
  marketName: string;        // "Lancaster" or "Cumberland County"
  appName: string;           // "TasteLanc" or "TasteCumberland"
  contentType: ContentType;
  visibleNames: string[];    // 2-3 restaurant/event names to feature
  totalCount: number;        // total eligible (the hidden number)
  dayLabel: string;          // "tonight", "today", "this weekend"
  subType?: string;          // e.g. "live_music", "trivia", "happy_hour", "brunch", "pizza"
  subTypeLabel?: string;     // e.g. "Live Music", "Trivia", "Happy Hours", "Brunch", "Pizza"
}

const SYSTEM_PROMPT = `You are a social media writer for a local restaurant discovery app. Your job is to write Instagram captions that create a curiosity gap and drive app installs.

Rules:
- Write like a knowledgeable local, not a brand account
- Be concise: 4-8 lines max, excluding hashtags
- Use the "partial list" strategy: show 2-3 places, imply there are more
- The hidden count must feel surprising ("but there are actually X happening tonight")
- End with a clear CTA to install/open the app
- No generic food-blog language ("culinary journey", "tantalizing", "foodie paradise")
- No excessive emojis. One or two max. Use them only if they add meaning
- Include 3-5 relevant local hashtags at the end
- Do NOT use quotation marks around restaurant names
- Do NOT use bullet points with dashes. Use • for list items
- Output ONLY the caption text. No labels, no "Caption:" prefix
- Keep it real and useful, not salesy`;

function buildTonightTodayPrompt(ctx: PromptContext): string {
  const items = ctx.visibleNames.map(n => `• ${n}`).join('\n');
  return `Write an Instagram caption for ${ctx.appName} about ${ctx.subTypeLabel || 'things happening'} ${ctx.dayLabel} in ${ctx.marketName}, PA.

Featured (show these):
${items}

Total count: ${ctx.totalCount} ${ctx.subTypeLabel?.toLowerCase() || 'options'} ${ctx.dayLabel}

Structure:
1. Hook line mentioning the count and ${ctx.dayLabel}
2. List the ${ctx.visibleNames.length} featured spots with •
3. Line revealing the actual total ("But there are actually ${ctx.totalCount} happening ${ctx.dayLabel}")
4. CTA: "Open ${ctx.appName} to see the full list" or similar

Hashtags should include #${ctx.marketName.replace(/\s+/g, '')}PA and 2-4 relevant tags.`;
}

function buildWeekendPreviewPrompt(ctx: PromptContext): string {
  const items = ctx.visibleNames.map(n => `• ${n}`).join('\n');
  return `Write an Instagram caption for ${ctx.appName} previewing ${ctx.subTypeLabel || 'weekend plans'} this weekend in ${ctx.marketName}, PA.

Featured (show these):
${items}

Total count: ${ctx.totalCount} options this weekend

Structure:
1. Hook about the weekend coming up
2. List the ${ctx.visibleNames.length} highlighted spots with •
3. Mention the full count available in the app
4. CTA: download or open ${ctx.appName} for the complete weekend guide

Hashtags should include #${ctx.marketName.replace(/\s+/g, '')}PA and 2-4 relevant tags.`;
}

function buildCategoryRoundupPrompt(ctx: PromptContext): string {
  const items = ctx.visibleNames.map(n => `• ${n}`).join('\n');
  return `Write an Instagram caption for ${ctx.appName} about the best ${ctx.subTypeLabel || 'spots'} in ${ctx.marketName}, PA.

Featured (show these):
${items}

Total in category: ${ctx.totalCount} spots on ${ctx.appName}

Structure:
1. Hook question or statement about ${ctx.subTypeLabel?.toLowerCase() || 'this category'}
2. List ${ctx.visibleNames.length} spots with •
3. Mention there are ${ctx.totalCount} total on the app
4. CTA: "Find your new favorite on ${ctx.appName}" or similar

Hashtags should include #${ctx.marketName.replace(/\s+/g, '')}PA and 2-4 relevant tags.`;
}

function buildUpcomingEventsPrompt(ctx: PromptContext): string {
  const items = ctx.visibleNames.map(n => `• ${n}`).join('\n');
  return `Write an Instagram caption for ${ctx.appName} about upcoming events this week in ${ctx.marketName}, PA.

Featured (show these):
${items}

IMPORTANT: Do NOT mention a specific number of events. Never say "10 events" or any exact count. Instead, imply there are many more without giving a number. Use phrases like "the full lineup", "way more happening", "and that's just a few".

Structure:
1. Hook about what's happening this week in ${ctx.marketName}
2. List the ${ctx.visibleNames.length} highlighted events/venues with •
3. Tease that there's way more on the app (but do NOT give a number)
4. CTA: download or open ${ctx.appName} to see the full lineup

Tone: excited but not over the top. Like telling a friend what's going on this week.
Hashtags should include #${ctx.marketName.replace(/\s+/g, '')}PA and 2-4 relevant tags.`;
}

function buildWeeklyRoundupPrompt(ctx: PromptContext): string {
  const items = ctx.visibleNames.map(n => `• ${n}`).join('\n');
  const isHoliday = ctx.subType?.includes(':');
  const holidayName = isHoliday ? ctx.subTypeLabel?.split(' + ')[1] : null;

  if (holidayName) {
    return `Write an Instagram caption for ${ctx.appName}'s weekly roundup — a magazine-style "what's happening this week" post for ${ctx.marketName}, PA.

This week features ${holidayName}! Make sure the holiday is front and center in the hook.

Featured spots this week:
${items}

Total things happening: ${ctx.totalCount}+ happenings across happy hours, specials, events${holidayName ? `, and ${holidayName} celebrations` : ''}

Structure:
1. Hook that leads with ${holidayName} + what else is happening this week
2. List ${ctx.visibleNames.length} highlighted spots with • (mention which ones are ${holidayName} specials)
3. Tease that there's way more on the app
4. CTA: open ${ctx.appName} to see the full week — plus the ${holidayName} tab for all the deals

Tone: excited but not over the top. Like a friend giving you the weekly rundown.
Hashtags: #${ctx.marketName.replace(/\s+/g, '')}PA #${holidayName.replace(/['\s]/g, '')} and 2-3 relevant tags.`;
  }

  return `Write an Instagram caption for ${ctx.appName}'s weekly roundup — a magazine-style "what's happening this week" post for ${ctx.marketName}, PA.

Featured spots this week:
${items}

Total things happening: ${ctx.totalCount}+ happenings across happy hours, specials, and events

Structure:
1. Hook about what's happening this week in ${ctx.marketName}
2. List ${ctx.visibleNames.length} highlighted spots with •
3. Tease that there's way more on the app
4. CTA: open ${ctx.appName} to see the full week

Tone: excited but not over the top. Like a friend giving you the weekly rundown.
Hashtags: #${ctx.marketName.replace(/\s+/g, '')}PA and 2-4 relevant tags.`;
}

export function buildCaptionPrompt(ctx: PromptContext): { system: string; user: string } {
  let user: string;

  // Weekly roundup gets its own prompt
  if (ctx.subType?.startsWith('weekly_roundup')) {
    user = buildWeeklyRoundupPrompt(ctx);
    return { system: SYSTEM_PROMPT, user };
  }

  switch (ctx.contentType) {
    case 'tonight_today':
      user = buildTonightTodayPrompt(ctx);
      break;
    case 'weekend_preview':
      user = buildWeekendPreviewPrompt(ctx);
      break;
    case 'category_roundup':
      user = buildCategoryRoundupPrompt(ctx);
      break;
    case 'upcoming_events':
      user = buildUpcomingEventsPrompt(ctx);
      break;
  }
  return { system: SYSTEM_PROMPT, user };
}

// ============================================
// Weekly Content Calendar
// ============================================
// 1 post/day, Monday–Friday only. Each day has a unique theme.
// Saturday & Sunday: no scheduled posts (special/holiday posts only).

export const WEEKLY_CONTENT_CALENDAR: WeeklyThemeConfig[] = [
  {
    dayOfWeek: 1, // Monday
    theme: 'weekly_roundup',
    label: 'The Weekly Roundup',
    contentType: 'tonight_today',
    description: 'Magazine-style carousel: the mood this week — happy hours, specials, events, and top picks all in one issue',
  },
  {
    dayOfWeek: 2, // Tuesday
    theme: 'happy_hour_spotlight',
    label: 'Happy Hour Spotlight',
    contentType: 'tonight_today',
    forceSubtype: 'happy_hour',
    description: 'Deep dive on 3-4 standout happy hours happening this week',
  },
  {
    dayOfWeek: 3, // Wednesday
    theme: 'hidden_gems',
    label: 'Hidden Gems',
    contentType: 'category_roundup',
    forceSubtype: 'hidden_gems',
    description: 'Lesser-known restaurants, new openings, underrated spots',
  },
  {
    dayOfWeek: 4, // Thursday
    theme: 'weekend_preview',
    label: 'Weekend Preview',
    contentType: 'weekend_preview',
    description: "What's happening Fri-Sun: events, specials, live music",
  },
  {
    dayOfWeek: 5, // Friday
    theme: 'specials_deals',
    label: 'Specials & Deals',
    contentType: 'tonight_today',
    forceSubtype: 'special',
    description: 'Best food & drink specials for the weekend',
  },
];

export function getThemeForDay(date: Date): WeeklyThemeConfig | null {
  const dayOfWeek = date.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
  return WEEKLY_CONTENT_CALENDAR.find(t => t.dayOfWeek === dayOfWeek) || null;
}

// Default publish time: 11:30 AM ET
export const DEFAULT_PUBLISH_HOUR_ET = 11;
export const DEFAULT_PUBLISH_MINUTE_ET = 30;

// Approval timeout: 2 hours before publish time
export const APPROVAL_TIMEOUT_HOURS = 2;

// Market name mapping
export function getMarketDisplayName(slug: string): string {
  const map: Record<string, string> = {
    'lancaster-pa': 'Lancaster',
    'cumberland-pa': 'Cumberland County',
    'fayetteville-nc': 'Fayetteville',
  };
  return map[slug] || slug;
}

export function getAppName(slug: string): string {
  const map: Record<string, string> = {
    'lancaster-pa': 'TasteLanc',
    'cumberland-pa': 'TasteCumberland',
    'fayetteville-nc': 'TasteFayetteville',
  };
  return map[slug] || 'TasteLanc';
}

// Roundup topic rotation — deterministic by day of year
export const ROUNDUP_CATEGORIES: { category: string; label: string }[] = [
  { category: 'pizza', label: 'Pizza' },
  { category: 'brunch', label: 'Brunch' },
  { category: 'mexican', label: 'Mexican' },
  { category: 'bbq', label: 'BBQ' },
  { category: 'seafood', label: 'Seafood' },
  { category: 'italian', label: 'Italian' },
  { category: 'bars', label: 'Bars' },
  { category: 'breakfast', label: 'Breakfast' },
  { category: 'desserts', label: 'Desserts' },
  { category: 'outdoor_dining', label: 'Outdoor Dining' },
  { category: 'date_night', label: 'Date Night Spots' },
  { category: 'family_friendly', label: 'Family-Friendly Spots' },
  { category: 'casual', label: 'Casual Dining' },
  { category: 'fine_dining', label: 'Fine Dining' },
  { category: 'cafe_coffee', label: 'Coffee Shops' },
  { category: 'brewery', label: 'Breweries' },
  { category: 'steakhouse', label: 'Steakhouses' },
  { category: 'asian', label: 'Asian Food' },
  { category: 'fast_casual', label: 'Fast Casual' },
  { category: 'late_night', label: 'Late Night Eats' },
  { category: 'pet_friendly', label: 'Pet-Friendly Spots' },
  { category: 'sports_bar', label: 'Sports Bars' },
];

export function getTodaysRoundupCategory(date: Date): { category: string; label: string } {
  const dayOfYear = Math.floor(
    (date.getTime() - new Date(date.getFullYear(), 0, 0).getTime()) / 86400000
  );
  return ROUNDUP_CATEGORIES[dayOfYear % ROUNDUP_CATEGORIES.length];
}

// Event type display labels for Instagram
export const EVENT_TYPE_INSTAGRAM_LABELS: Record<string, string> = {
  live_music: 'Live Music',
  trivia: 'Trivia Nights',
  karaoke: 'Karaoke',
  dj: 'DJ Nights',
  comedy: 'Comedy Shows',
  sports: 'Sports Watch Parties',
  bingo: 'Bingo',
  music_bingo: 'Music Bingo',
  poker: 'Poker Nights',
  other: 'Events',
};
