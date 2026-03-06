// Instagram Agent v1: Caption prompt templates
// Rules: concise, local, utility-first, no cringe, no generic AI food-blog tone
// Always push toward app install, never reveal the full list, mention hidden quantity

import { ContentType } from './types';

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

export function buildCaptionPrompt(ctx: PromptContext): { system: string; user: string } {
  let user: string;
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
  }
  return { system: SYSTEM_PROMPT, user };
}

// Market name mapping
export function getMarketDisplayName(slug: string): string {
  const map: Record<string, string> = {
    'lancaster-pa': 'Lancaster',
    'cumberland-pa': 'Cumberland County',
  };
  return map[slug] || slug;
}

export function getAppName(slug: string): string {
  const map: Record<string, string> = {
    'lancaster-pa': 'TasteLanc',
    'cumberland-pa': 'TasteCumberland',
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
