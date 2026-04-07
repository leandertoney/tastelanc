// Instagram Agent v1: Post generation orchestrator
// Decision flow: Tonight/Today → Weekend Preview → Category Roundup (fallback)

import { SupabaseClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import {
  ContentType,
  GenerationResult,
  GenerationMetadata,
  ScoredCandidate,
  MarketConfig,
} from './types';
import {
  fetchTonightCandidates,
  fetchWeekendCandidates,
  fetchCategoryRoundupCandidates,
  fetchUpcomingEventsCandidates,
  fetchHolidaySpecialsCandidates,
  selectTopCandidates,
  fetchSpotlightCandidates,
} from './scoring';
import {
  buildCaptionPrompt,
  buildPartyTeaserCaption,
  buildSpotlightCaption,
  SpotlightCaptionContext,
  getMarketDisplayName,
  getAppName,
  getTodaysRoundupCategory,
  getThemeForDay,
  DEFAULT_PUBLISH_HOUR_ET,
  DEFAULT_PUBLISH_MINUTE_ET,
  APPROVAL_TIMEOUT_HOURS,
  EVENT_TYPE_INSTAGRAM_LABELS,
} from './prompts';
import { DayTheme, RestaurantSpotlightCandidate } from './types';
import { selectMedia, recordMediaUsage } from './media';
import { generateCarouselSlides, composeWeeklyRoundupSlides, composeHolidayPosterSlides, composeRestaurantSpotlightSlides } from './overlay';
import { HolidaySpecialSlide } from './types';
import { SlideCandidate, HeadlineParts } from './types';

const MIN_CANDIDATES_FOR_POST = 3; // Need at least 3 total to make "hidden count" compelling
const VISIBLE_COUNT = 3;

interface GenerateOptions {
  supabase: SupabaseClient;
  market: MarketConfig;
  date: Date;
  forceType?: ContentType;
  forceSubtype?: string; // 'events', 'happy_hour', 'special'
  postSlot?: string; // 'am' or 'pm'
  scheduledPublishAt?: string; // ISO timestamp for auto-publish
  dayTheme?: DayTheme;
}

export async function generateInstagramPost(opts: GenerateOptions): Promise<GenerationResult> {
  const { supabase, market, date, forceType } = opts;
  const today = date.toISOString().split('T')[0];

  // Check if we already have a post for today with the same content type
  // (Now scoped by content_type to allow 2 posts/day with different types)
  const existingQuery = supabase
    .from('instagram_posts')
    .select('id, status')
    .eq('market_id', market.market_id)
    .eq('post_date', today);

  // If we know the content type upfront (forced), scope the check
  if (forceType) {
    existingQuery.eq('content_type', forceType);
  }

  const { data: existingRows } = await existingQuery;
  const existing = existingRows?.[0] || null;

  if (existing && existing.status === 'published') {
    return { success: true, post_id: existing.id, error: 'Already published today' };
  }

  // If there's a draft or failed post for today, we'll overwrite it
  const existingId = existing?.id;

  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const dayOfWeek = dayNames[date.getDay()];
  const dayNumber = date.getDay(); // 0=Sun, 5=Fri, 6=Sat

  let result: GenerationResult;
  let decisionPath = '';

  // Decision flow
  if (forceType === 'party_teaser') {
    // Party teaser: short-circuit all candidate fetching, use pre-written captions
    decisionPath = 'forced:party_teaser';
    result = await generatePartyTeaser(opts, decisionPath);
  } else if (opts.dayTheme === 'weekly_roundup') {
    // Monday Weekly Roundup: pulls from ALL sources for the week ahead
    decisionPath = 'weekly_roundup';
    result = await generateWeeklyRoundup(opts, decisionPath);
  } else if (forceType) {
    decisionPath = `forced:${forceType}`;
    result = await generateByType(opts, forceType, dayOfWeek, today, decisionPath);
  } else {
    // Step 1: Try Tonight/Today (Mon-Sun, always attempt first)
    decisionPath = 'auto:tonight_today';
    result = await generateTonightToday(opts, dayOfWeek, today, decisionPath);

    // Step 2: If tonight didn't have enough, try Weekend Preview (Thu/Fri only)
    if (!result.success && (dayNumber === 4 || dayNumber === 5)) {
      decisionPath = 'auto:weekend_preview';
      result = await generateWeekendPreview(opts, date, decisionPath);
    }

    // Step 3: Fallback to Category Roundup (always works)
    if (!result.success) {
      decisionPath = 'auto:category_roundup_fallback';
      result = await generateCategoryRoundup(opts, date, decisionPath);
    }
  }

  // If we overwrote an existing record, update rather than insert
  if (result.success && existingId && result.post_id !== existingId) {
    // Delete old draft
    await supabase.from('instagram_posts').delete().eq('id', existingId);
  }

  return result;
}

async function generateByType(
  opts: GenerateOptions,
  type: ContentType,
  dayOfWeek: string,
  today: string,
  decisionPath: string
): Promise<GenerationResult> {
  switch (type) {
    case 'tonight_today':
      return generateTonightToday(opts, dayOfWeek, today, decisionPath);
    case 'weekend_preview':
      return generateWeekendPreview(opts, opts.date, decisionPath);
    case 'category_roundup':
      return generateCategoryRoundup(opts, opts.date, decisionPath);
    case 'upcoming_events':
      return generateUpcomingEvents(opts, decisionPath);
    case 'party_teaser':
      return generatePartyTeaser(opts, decisionPath);
    case 'restaurant_spotlight':
      // Spotlight has its own entry point (generateRestaurantSpotlight), not routed through here
      return { success: false, error: 'Use generateRestaurantSpotlight() for spotlight posts' };
  }
}

// ============================================
// Party Teaser Generator
// ============================================
// Generates a pre-written FOMO teaser for the April 20 industry party.
// Does NOT require restaurant candidates — uses static overlay + pre-written copy.
async function generatePartyTeaser(
  opts: GenerateOptions,
  decisionPath: string
): Promise<GenerationResult> {
  const { supabase, market, date, scheduledPublishAt } = opts;
  const today = date.toISOString().split('T')[0];
  const marketName = getMarketDisplayName(market.market_slug);
  const appName = getAppName(market.market_slug);

  // Determine which caption to use based on how many party_teaser posts already exist for this market
  const { count: existingCount } = await supabase
    .from('instagram_posts')
    .select('id', { count: 'exact', head: true })
    .eq('market_id', market.market_id)
    .eq('content_type', 'party_teaser');

  const postIndex = existingCount ?? 0;

  const caption = buildPartyTeaserCaption({
    appName,
    marketName,
    postIndex,
    eventDate: 'April 20',
    venueName: 'Hempfield Apothetique',
  });

  // Use a dark branded overlay image — static asset served from the web app
  // Admin can swap this out with a real photo from the venue
  const mediaUrls: string[] = [];

  // Determine publish time
  const publishAt = scheduledPublishAt ?? (() => {
    const pub = new Date(date);
    pub.setUTCHours(DEFAULT_PUBLISH_HOUR_ET + 5, DEFAULT_PUBLISH_MINUTE_ET, 0, 0);
    return pub.toISOString();
  })();

  const { data: post, error } = await supabase
    .from('instagram_posts')
    .insert({
      market_id: market.market_id,
      post_date: today,
      content_type: 'party_teaser',
      selected_entity_ids: [],
      caption,
      media_urls: mediaUrls,
      status: 'pending_review',
      scheduled_publish_at: publishAt,
      day_theme: null,
      generation_metadata: {
        post_type: 'party_teaser',
        total_candidates: 0,
        total_hidden: 0,
        visible_names: [],
        decision_path: decisionPath,
        model_used: 'static',
        day_of_week: date.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase(),
        party_post_index: postIndex,
      },
    })
    .select('id')
    .single();

  if (error || !post) {
    return { success: false, error: `Failed to save party teaser: ${error?.message}` };
  }

  return {
    success: true,
    post_id: post.id,
    content_type: 'party_teaser',
    caption,
    media_urls: mediaUrls,
  };
}

async function generateTonightToday(
  opts: GenerateOptions,
  dayOfWeek: string,
  today: string,
  decisionPath: string
): Promise<GenerationResult> {
  const { supabase, market } = opts;

  const { events, happyHours, specials } = await fetchTonightCandidates(
    supabase,
    market.market_id,
    dayOfWeek,
    today
  );

  // Determine best sub-type for tonight
  type SubType = { candidates: ScoredCandidate[]; subType: string; subTypeLabel: string };
  const subTypes: SubType[] = [];

  // Group events by event_type
  const eventsByType = new Map<string, ScoredCandidate[]>();
  for (const e of events) {
    // We need to look up the event type — it's stored on the entity
    // For scoring purposes, we grouped by restaurant. The entity_name contains the event name.
    // We'll just use all events as one bucket
    const existing = eventsByType.get('events') || [];
    existing.push(e);
    eventsByType.set('events', existing);
  }

  if (events.length >= MIN_CANDIDATES_FOR_POST) {
    subTypes.push({ candidates: events, subType: 'events', subTypeLabel: 'Events' });
  }
  if (happyHours.length >= MIN_CANDIDATES_FOR_POST) {
    subTypes.push({ candidates: happyHours, subType: 'happy_hour', subTypeLabel: 'Happy Hours' });
  }
  if (specials.length >= MIN_CANDIDATES_FOR_POST) {
    subTypes.push({ candidates: specials, subType: 'special', subTypeLabel: 'Specials' });
  }

  // Also try combining all tonight candidates
  const allTonight = [...events, ...happyHours, ...specials];
  if (subTypes.length === 0 && allTonight.length >= MIN_CANDIDATES_FOR_POST) {
    subTypes.push({ candidates: allTonight, subType: 'tonight', subTypeLabel: 'Things Happening' });
  }

  if (subTypes.length === 0) {
    return { success: false, error: 'Not enough tonight/today candidates' };
  }

  // If a specific subtype was forced (e.g., 'events' for PM slot), prefer it
  let chosen: SubType | undefined;
  if (opts.forceSubtype) {
    chosen = subTypes.find(s => s.subType === opts.forceSubtype);
  }
  // Otherwise pick the sub-type with the most candidates (more hidden = better curiosity gap)
  if (!chosen) {
    subTypes.sort((a, b) => b.candidates.length - a.candidates.length);
    chosen = subTypes[0];
  }

  // Query recently-used entities for variety (same as upcoming_events)
  const weekStart = new Date(opts.date);
  weekStart.setDate(opts.date.getDate() - 3);
  const weekEnd = new Date(opts.date);
  weekEnd.setDate(opts.date.getDate() + 3);

  const { data: nearbyPosts } = await supabase
    .from('instagram_posts')
    .select('selected_entity_ids, post_date')
    .eq('market_id', market.market_id)
    .eq('content_type', 'tonight_today')
    .neq('post_date', today)
    .gte('post_date', weekStart.toISOString().split('T')[0])
    .lte('post_date', weekEnd.toISOString().split('T')[0]);

  const recentEntityIds = new Set<string>();
  if (nearbyPosts) {
    for (const p of nearbyPosts) {
      if (p.selected_entity_ids) {
        for (const id of p.selected_entity_ids) {
          recentEntityIds.add(id);
        }
      }
    }
  }

  const { visible, totalCount } = selectTopCandidates(chosen.candidates, VISIBLE_COUNT, today, recentEntityIds);
  const dayLabel = dayOfWeek === 'saturday' || dayOfWeek === 'sunday' ? 'today' : 'tonight';

  return await buildAndSavePost(opts, {
    contentType: 'tonight_today',
    visible,
    totalCount,
    dayLabel,
    subType: chosen.subType,
    subTypeLabel: chosen.subTypeLabel,
    decisionPath: `${decisionPath}:${chosen.subType}`,
  });
}

async function generateWeekendPreview(
  opts: GenerateOptions,
  date: Date,
  decisionPath: string
): Promise<GenerationResult> {
  const { supabase, market } = opts;

  // Calculate this weekend's dates
  const dayNumber = date.getDay();
  const daysToFriday = dayNumber <= 5 ? 5 - dayNumber : 5 - dayNumber + 7;
  const friday = new Date(date);
  friday.setDate(date.getDate() + daysToFriday);
  const saturday = new Date(friday);
  saturday.setDate(friday.getDate() + 1);
  const sunday = new Date(friday);
  sunday.setDate(friday.getDate() + 2);

  const { candidates } = await fetchWeekendCandidates(
    supabase,
    market.market_id,
    friday.toISOString().split('T')[0],
    saturday.toISOString().split('T')[0],
    sunday.toISOString().split('T')[0]
  );

  if (candidates.length < MIN_CANDIDATES_FOR_POST) {
    return { success: false, error: 'Not enough weekend candidates' };
  }

  const { visible, totalCount } = selectTopCandidates(candidates, VISIBLE_COUNT);

  return await buildAndSavePost(opts, {
    contentType: 'weekend_preview',
    visible,
    totalCount,
    dayLabel: 'this weekend',
    subType: 'weekend',
    subTypeLabel: 'Weekend Plans',
    decisionPath,
  });
}

async function generateCategoryRoundup(
  opts: GenerateOptions,
  date: Date,
  decisionPath: string
): Promise<GenerationResult> {
  const { supabase, market } = opts;
  const roundupTopic = getTodaysRoundupCategory(date);

  let { candidates } = await fetchCategoryRoundupCandidates(
    supabase,
    market.market_id,
    roundupTopic.category
  );

  // If the day's category doesn't have enough, try the next one
  let attempts = 0;
  let topicUsed = roundupTopic;
  const dayOfYear = Math.floor(
    (date.getTime() - new Date(date.getFullYear(), 0, 0).getTime()) / 86400000
  );

  while (candidates.length < MIN_CANDIDATES_FOR_POST && attempts < 5) {
    attempts++;
    const { ROUNDUP_CATEGORIES } = await import('./prompts');
    const nextTopic = ROUNDUP_CATEGORIES[(dayOfYear + attempts) % ROUNDUP_CATEGORIES.length];
    const result = await fetchCategoryRoundupCandidates(
      supabase,
      market.market_id,
      nextTopic.category
    );
    candidates = result.candidates;
    topicUsed = nextTopic;
  }

  if (candidates.length < MIN_CANDIDATES_FOR_POST) {
    // Ultimate fallback: just use all active restaurants
    const { data: allRestaurants } = await supabase
      .from('restaurants')
      .select(`id, name, slug, cover_image_url, average_rating, created_at,
        tier:tiers(name)
      `)
      .eq('market_id', market.market_id)
      .eq('is_active', true)
      .limit(50);

    if (!allRestaurants || allRestaurants.length < MIN_CANDIDATES_FOR_POST) {
      return { success: false, error: 'Not enough restaurants for any roundup' };
    }

    const { loadRecencyMemory, scoreCandidate } = await import('./scoring');
    const memory = await loadRecencyMemory(supabase, market.market_id);
    candidates = allRestaurants.map((r: any) =>
      scoreCandidate({
        restaurant_id: r.id,
        restaurant_name: r.name,
        restaurant_slug: r.slug,
        entity_id: r.id,
        entity_type: 'restaurant',
        entity_name: r.name,
        image_url: null,
        cover_image_url: r.cover_image_url,
        tier_slug: r.tier?.name || null,
        average_rating: r.average_rating,
        created_at: r.created_at,
        detail_text: 'Hidden Gem',
      }, memory)
    );
    topicUsed = { category: 'hidden_gems', label: 'Hidden Gems' };
  }

  const { visible, totalCount } = selectTopCandidates(candidates, VISIBLE_COUNT);

  return await buildAndSavePost(opts, {
    contentType: 'category_roundup',
    visible,
    totalCount,
    dayLabel: '',
    subType: topicUsed.category,
    subTypeLabel: topicUsed.label,
    decisionPath: `${decisionPath}:${topicUsed.category}`,
  });
}

async function generateUpcomingEvents(
  opts: GenerateOptions,
  decisionPath: string
): Promise<GenerationResult> {
  const { supabase, market, date } = opts;
  const today = date.toISOString().split('T')[0];

  const { candidates } = await fetchUpcomingEventsCandidates(supabase, market.market_id, date);

  if (candidates.length < MIN_CANDIDATES_FOR_POST) {
    return { success: false, error: 'Not enough upcoming events' };
  }

  // Query entity IDs already used in nearby posts (same week, same market, same content type)
  // to avoid repeating the same events across consecutive days
  const weekStart = new Date(date);
  weekStart.setDate(date.getDate() - 3); // look back 3 days
  const weekEnd = new Date(date);
  weekEnd.setDate(date.getDate() + 3); // look ahead 3 days

  const { data: nearbyPosts } = await supabase
    .from('instagram_posts')
    .select('selected_entity_ids, post_date')
    .eq('market_id', market.market_id)
    .eq('content_type', 'upcoming_events')
    .neq('post_date', today) // exclude this date (we're regenerating it)
    .gte('post_date', weekStart.toISOString().split('T')[0])
    .lte('post_date', weekEnd.toISOString().split('T')[0]);

  const recentEntityIds = new Set<string>();
  if (nearbyPosts) {
    for (const p of nearbyPosts) {
      if (p.selected_entity_ids) {
        for (const id of p.selected_entity_ids) {
          recentEntityIds.add(id);
        }
      }
    }
  }

  // For events: deduplicate by event (not restaurant) — same venue can show
  // multiple times if it has different events (e.g. Live Music + Trivia)
  const { visible, totalCount } = selectTopCandidates(candidates, VISIBLE_COUNT, today, recentEntityIds, true);

  return await buildAndSavePost(opts, {
    contentType: 'upcoming_events',
    visible,
    totalCount,
    dayLabel: 'This Week',
    subType: 'events',
    subTypeLabel: 'Events',
    decisionPath,
  });
}

/**
 * Monday Weekly Roundup: "The Magazine Issue"
 * Pulls from ALL content sources for the week ahead:
 * - Happy hours (Mon-Sun)
 * - Specials (Mon-Sun)
 * - Events (Mon-Sun)
 * - Holiday specials (if any fall this week)
 *
 * Selects a diverse mix across categories, prioritizing:
 * 1. Holiday specials (most timely, highest boost)
 * 2. Events (time-sensitive)
 * 3. Happy hours & specials (evergreen but relevant)
 */
async function generateWeeklyRoundup(
  opts: GenerateOptions,
  decisionPath: string
): Promise<GenerationResult> {
  const { supabase, market, date } = opts;
  const today = date.toISOString().split('T')[0];

  // Build the week range (Mon-Sun from the target date)
  const weekEnd = new Date(date);
  weekEnd.setDate(date.getDate() + 6);

  // Fetch holiday specials for this week
  const { candidates: holidayCandidates, holidayTag } =
    await fetchHolidaySpecialsCandidates(supabase, market.market_id, date, weekEnd);

  // Fetch events for the week
  const { candidates: eventCandidates } =
    await fetchUpcomingEventsCandidates(supabase, market.market_id, date);

  // Fetch today's happy hours and specials as a representative sample
  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const dayOfWeek = dayNames[date.getDay()];
  const { happyHours, specials } =
    await fetchTonightCandidates(supabase, market.market_id, dayOfWeek, today);

  // Combine all candidates
  const allCandidates = [...holidayCandidates, ...eventCandidates, ...happyHours, ...specials];

  if (allCandidates.length < MIN_CANDIDATES_FOR_POST) {
    return { success: false, error: 'Not enough content for weekly roundup' };
  }

  // Select top candidates — aim for diversity across types
  // Holiday specials already have a +5 score boost so they'll surface naturally
  const { visible, totalCount } = selectTopCandidates(allCandidates, VISIBLE_COUNT, today);

  // Build labels that reflect what's in the roundup
  const hasHoliday = holidayCandidates.length > 0;
  const holidayLabel = hasHoliday ? formatHolidayLabel(holidayTag) : null;

  const subTypeLabel = hasHoliday
    ? `This Week + ${holidayLabel}`
    : 'This Week';

  // If there are holiday specials, fetch the raw data for poster-style slides
  let holidaySlideData: HolidaySpecialSlide[] | undefined;
  if (hasHoliday && holidayTag) {
    const fromStr = date.toISOString().split('T')[0];
    const toStr = weekEnd.toISOString().split('T')[0];

    const { data: rawSpecials } = await supabase
      .from('holiday_specials')
      .select(`
        name, category, special_price, discount_description, description,
        restaurant:restaurants!inner(name, cover_image_url, market_id)
      `)
      .eq('is_active', true)
      .eq('holiday_tag', holidayTag)
      .eq('restaurant.market_id', market.market_id)
      .gte('event_date', fromStr)
      .lte('event_date', toStr);

    if (rawSpecials && rawSpecials.length > 0) {
      // Group by restaurant
      const byRestaurant = new Map<string, HolidaySpecialSlide>();
      for (const s of rawSpecials) {
        const rName = (s.restaurant as any)?.name || 'Unknown';
        const coverUrl = (s.restaurant as any)?.cover_image_url || null;
        if (!byRestaurant.has(rName)) {
          byRestaurant.set(rName, { restaurant_name: rName, cover_image_url: coverUrl, specials: [] });
        }
        byRestaurant.get(rName)!.specials.push({
          name: s.name,
          category: s.category,
          price: s.special_price ? String(s.special_price) : null,
          description: s.discount_description || s.description || null,
        });
      }
      holidaySlideData = Array.from(byRestaurant.values());
    }
  }

  return await buildAndSavePost(opts, {
    contentType: 'tonight_today', // Use existing content type for DB compatibility
    visible,
    totalCount,
    dayLabel: 'This Week',
    subType: hasHoliday ? `weekly_roundup:${holidayTag}` : 'weekly_roundup',
    subTypeLabel,
    decisionPath: hasHoliday
      ? `${decisionPath}:with_holiday:${holidayTag}`
      : decisionPath,
    holidaySlideData,
    holidayTag: holidayTag || undefined,
    holidayLabel: holidayLabel || undefined,
  });
}

/** Convert holiday_tag like 'st-patricks-2026' to a display label */
function formatHolidayLabel(tag: string | null): string {
  if (!tag) return 'Holiday Specials';
  const HOLIDAY_LABELS: Record<string, string> = {
    'st-patricks': "St. Patrick's Day",
    'cinco-de-mayo': 'Cinco de Mayo',
    'easter': 'Easter',
    'valentines': "Valentine's Day",
    'fourth-of-july': '4th of July',
    'halloween': 'Halloween',
  };
  // Strip year suffix (e.g., 'st-patricks-2026' → 'st-patricks')
  const base = tag.replace(/-\d{4}$/, '');
  return HOLIDAY_LABELS[base] || tag.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

// ============================================
// Build caption + save post
// ============================================

interface BuildPostParams {
  contentType: ContentType;
  visible: ScoredCandidate[];
  totalCount: number;
  dayLabel: string;
  subType: string;
  subTypeLabel: string;
  decisionPath: string;
  holidaySlideData?: HolidaySpecialSlide[];
  holidayTag?: string;
  holidayLabel?: string;
}

async function buildAndSavePost(
  opts: GenerateOptions,
  params: BuildPostParams
): Promise<GenerationResult> {
  const { supabase, market, date } = opts;
  const today = date.toISOString().split('T')[0];

  // Generate caption with OpenAI
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
  const marketName = getMarketDisplayName(market.market_slug);
  const appName = getAppName(market.market_slug);

  const { system, user } = buildCaptionPrompt({
    marketName,
    appName,
    contentType: params.contentType,
    visibleNames: params.visible.map(c => c.restaurant_name),
    totalCount: params.totalCount,
    dayLabel: params.dayLabel,
    subType: params.subType,
    subTypeLabel: params.subTypeLabel,
  });

  let caption: string;
  let tokenUsage = { prompt: 0, completion: 0, total: 0 };

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      max_tokens: 500,
      temperature: 0.8,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
    });

    caption = response.choices[0]?.message?.content?.trim() || '';
    tokenUsage = {
      prompt: response.usage?.prompt_tokens || 0,
      completion: response.usage?.completion_tokens || 0,
      total: response.usage?.total_tokens || 0,
    };

    if (!caption) {
      throw new Error('Empty caption from OpenAI');
    }
  } catch (err: any) {
    await logGeneration(supabase, market.market_id, {
      decisionPath: params.decisionPath,
      candidateSummary: { visible: params.visible.length, total: params.totalCount },
      selectedPostType: params.contentType,
      selectedIds: params.visible.map(c => c.entity_id),
      modelUsed: 'gpt-4o-mini',
      tokenUsage,
      success: false,
      errorMessage: err.message,
    });
    return { success: false, error: `Caption generation failed: ${err.message}` };
  }

  // Select one image per candidate for carousel slides
  const media = await selectMedia(supabase, market.market_id, params.visible);

  // Build carousel headline
  const headline = buildHeadline(params);

  // Map candidates to SlideCandidate format
  const slideCandidates: SlideCandidate[] = params.visible.map((c, i) => ({
    restaurant_name: c.restaurant_name,
    detail_text: c.detail_text || params.subTypeLabel || '',
    image_url: media.urls[i] || c.image_url,
    cover_image_url: c.cover_image_url,
  }));

  // Generate composited carousel slides
  const isWeeklyRoundup = opts.dayTheme === 'weekly_roundup' || params.subType?.startsWith('weekly_roundup');
  const hasHolidayPoster = params.holidaySlideData && params.holidaySlideData.length > 0;

  let carouselUrls: string[];
  try {
    if (hasHolidayPoster) {
      // Holiday poster slides — typographic poster cards matching the mobile app design
      const marketName = getMarketDisplayName(market.market_slug);
      const appName = getAppName(market.market_slug);
      const dateLabel = new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric' }).format(date)
        .toUpperCase().replace(/(\d+)/, (_, d) => {
          const n = parseInt(d);
          const suffix = n === 1 || n === 21 || n === 31 ? 'ST' : n === 2 || n === 22 ? 'ND' : n === 3 || n === 23 ? 'RD' : 'TH';
          return `${n}${suffix}`;
        });

      carouselUrls = await composeHolidayPosterSlides({
        supabase,
        market,
        holidaySlides: params.holidaySlideData!,
        totalRestaurants: params.holidaySlideData!.length,
        date: today,
        appName,
        marketName,
        holidayLabel: params.holidayLabel || "St. Patrick's Day",
        dateLabel: new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric' }).format(date).toUpperCase(),
      });
    } else if (isWeeklyRoundup) {
      const holidayTag = params.subType?.includes(':') ? params.subType.split(':').pop() : null;
      carouselUrls = await composeWeeklyRoundupSlides({
        supabase,
        market,
        candidates: slideCandidates,
        headline,
        totalCount: params.totalCount,
        date: today,
        holidayTag,
      });
    } else {
      carouselUrls = await generateCarouselSlides({
        supabase,
        market,
        candidates: slideCandidates,
        headline,
        totalCount: params.totalCount,
        date: today,
        contentType: params.contentType,
      });
    }
  } catch (err: any) {
    console.error('[Instagram] Carousel generation failed, falling back to raw images:', err.message);
    carouselUrls = media.urls.filter(Boolean);
  }

  const metadata: GenerationMetadata = {
    post_type: params.contentType,
    total_candidates: params.totalCount,
    total_hidden: params.totalCount - params.visible.length,
    visible_names: params.visible.map(c => c.restaurant_name),
    decision_path: params.decisionPath,
    model_used: 'gpt-4o-mini',
    token_usage: tokenUsage,
    day_of_week: new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(date),
    ...(params.subType && { event_type: params.subType }),
    ...(params.subTypeLabel && { category: params.subTypeLabel }),
  };

  // Upsert post record
  // New approval flow: posts start as 'pending_review' and auto-publish
  // at scheduled_publish_at unless a human rejects them
  const postData: Record<string, unknown> = {
    market_id: market.market_id,
    post_date: today,
    content_type: params.contentType,
    selected_entity_ids: params.visible.map(c => c.entity_id),
    caption,
    media_urls: carouselUrls,
    status: opts.scheduledPublishAt ? 'pending_review' : 'draft',
    generation_metadata: metadata,
    post_slot: opts.postSlot || 'am',
  };

  // Add scheduling fields if provided
  if (opts.scheduledPublishAt) {
    postData.scheduled_publish_at = opts.scheduledPublishAt;
  }
  if (opts.dayTheme) {
    postData.day_theme = opts.dayTheme;
  }

  const { data: post, error: insertError } = await supabase
    .from('instagram_posts')
    .upsert(postData, { onConflict: 'market_id,post_date,content_type' })
    .select('id')
    .single();

  if (insertError || !post) {
    await logGeneration(supabase, market.market_id, {
      decisionPath: params.decisionPath,
      candidateSummary: { visible: params.visible.length, total: params.totalCount },
      selectedPostType: params.contentType,
      selectedIds: params.visible.map(c => c.entity_id),
      modelUsed: 'gpt-4o-mini',
      tokenUsage,
      success: false,
      errorMessage: insertError?.message || 'Failed to save post',
    });
    return { success: false, error: `DB save failed: ${insertError?.message}` };
  }

  // Record usage for recency memory
  await recordMediaUsage(supabase, market.market_id, params.visible, media.urls, params.contentType);

  // Log success
  await logGeneration(supabase, market.market_id, {
    decisionPath: params.decisionPath,
    candidateSummary: {
      visible: params.visible.length,
      total: params.totalCount,
      scores: params.visible.map(c => ({ name: c.restaurant_name, score: c.score })),
    },
    selectedPostType: params.contentType,
    selectedIds: params.visible.map(c => c.entity_id),
    modelUsed: 'gpt-4o-mini',
    tokenUsage,
    success: true,
  });

  return {
    success: true,
    post_id: post.id,
    content_type: params.contentType,
    caption,
    media_urls: carouselUrls,
  };
}

function buildHeadline(params: BuildPostParams): HeadlineParts {
  const count = String(params.totalCount);
  const label = params.subTypeLabel || 'Spots';

  if (params.contentType === 'tonight_today') {
    const day = params.dayLabel.charAt(0).toUpperCase() + params.dayLabel.slice(1);
    return { count, label, dayLabel: day };
  }
  if (params.contentType === 'weekend_preview') {
    return { count, label, dayLabel: 'This Weekend' };
  }
  if (params.contentType === 'upcoming_events') {
    return { count, label, dayLabel: 'This Week' };
  }
  // category_roundup
  return { count: 'Best', label, dayLabel: 'Near You' };
}

// ============================================
// Logging helper
// ============================================

async function logGeneration(
  supabase: SupabaseClient,
  marketId: string,
  log: {
    decisionPath: string;
    candidateSummary: any;
    selectedPostType: string;
    selectedIds: string[];
    modelUsed: string;
    tokenUsage: any;
    success: boolean;
    errorMessage?: string;
  }
) {
  await supabase.from('instagram_generation_logs').insert({
    market_id: marketId,
    decision_path: log.decisionPath,
    candidate_summary: log.candidateSummary,
    selected_post_type: log.selectedPostType,
    selected_ids: log.selectedIds,
    model_used: log.modelUsed,
    token_usage: log.tokenUsage,
    success: log.success,
    error_message: log.errorMessage || null,
  });
}

// ============================================================================
// Restaurant Spotlight Generator
// ============================================================================
// Generates an "Inside [Restaurant Name]" carousel for a single paid partner.
// Called manually from the admin restaurant detail page, or can be auto-scheduled.

interface SpotlightOptions {
  supabase: SupabaseClient;
  market: MarketConfig;
  date: Date;
  restaurantId?: string;        // if provided, use this restaurant; otherwise auto-select
  scheduledPublishAt?: string;  // ISO timestamp for auto-publish
  // Self-correction hints from quality check pipeline (populated on retry)
  captionHints?: string[];      // specific copy fixes, e.g. "Lead with the Happy Hour time"
  excludeEntityIds?: string[];  // expired/inactive entity IDs to skip when building slides
  skipPhotoIds?: string[];      // photo IDs that failed to load — use a different cover
}

export async function generateRestaurantSpotlight(opts: SpotlightOptions): Promise<GenerationResult> {
  const { supabase, market, date } = opts;
  const today = date.toISOString().split('T')[0];
  const appName = getAppName(market.market_slug);
  const marketName = getMarketDisplayName(market.market_slug);

  // 1. Resolve which restaurant to spotlight
  let targetRestaurantId = opts.restaurantId;

  if (!targetRestaurantId) {
    const candidates = await fetchSpotlightCandidates(supabase, market.market_id);
    if (candidates.length === 0) {
      return { success: false, error: 'No eligible premium/elite restaurants found for spotlight' };
    }
    targetRestaurantId = candidates[0].restaurant_id;
  }

  // 2. Verify eligibility: active, premium or elite tier
  const { data: restaurant, error: rErr } = await supabase
    .from('restaurants')
    .select(`
      id, name, slug, description, custom_description, cover_image_url, logo_url,
      categories, market_id,
      tier:tiers!inner(name)
    `)
    .eq('id', targetRestaurantId)
    .eq('is_active', true)
    .in('tiers.name', ['premium', 'elite'])
    .single();

  if (rErr || !restaurant) {
    return {
      success: false,
      error: `Restaurant not found or not eligible for spotlight (must be premium/elite and active): ${rErr?.message ?? 'not found'}`,
    };
  }

  // 3. Fetch all content in parallel
  const [photosRes, specialsRes, hhRes, eventsRes, dealsRes] = await Promise.all([
    supabase
      .from('restaurant_photos')
      .select('id, url, caption, is_cover, display_order')
      .eq('restaurant_id', targetRestaurantId)
      .order('is_cover', { ascending: false })
      .order('display_order', { ascending: true }),

    supabase
      .from('specials')
      .select('id, name, description, image_url, special_price, original_price, days_of_week, start_time, end_time')
      .eq('restaurant_id', targetRestaurantId)
      .eq('is_active', true)
      .limit(5),

    supabase
      .from('happy_hours')
      .select(`
        id, name, description, image_url, start_time, end_time, days_of_week,
        items:happy_hour_items(name, discounted_price, original_price)
      `)
      .eq('restaurant_id', targetRestaurantId)
      .eq('is_active', true)
      .limit(3),

    supabase
      .from('events')
      .select('id, name, description, image_url, event_type, start_time, performer_name, days_of_week, event_date, is_recurring')
      .eq('restaurant_id', targetRestaurantId)
      .eq('is_active', true)
      .order('event_date', { ascending: true, nullsFirst: false })
      .limit(5),

    supabase
      .from('coupons')
      .select('id, title, description, discount_type, discount_value, original_price, image_url, days_of_week, start_time, end_time, end_date')
      .eq('restaurant_id', targetRestaurantId)
      .eq('is_active', true)
      .or(`end_date.is.null,end_date.gte.${today}`)
      .limit(5),
  ]);

  // Apply correction hints from quality pipeline (populated on retry)
  const excludeIds = new Set(opts.excludeEntityIds ?? []);
  const skipPhotoIdSet = new Set(opts.skipPhotoIds ?? []);

  const photos = (photosRes.data ?? []).filter((p: any) => !skipPhotoIdSet.has(p.id));
  const specials = (specialsRes.data ?? []).filter((s: any) => !excludeIds.has(s.id));
  const happyHours = ((hhRes.data ?? []) as any[]).filter((h: any) => !excludeIds.has(h.id));
  const events = (eventsRes.data ?? []).filter((e: any) => !excludeIds.has(e.id));
  const deals = (dealsRes.data ?? []).filter((d: any) => !excludeIds.has(d.id));

  const tierName = (restaurant as any).tier?.name as 'premium' | 'elite';

  const candidateData: RestaurantSpotlightCandidate = {
    id: restaurant.id,
    name: restaurant.name,
    slug: restaurant.slug,
    description: (restaurant as any).description ?? null,
    custom_description: (restaurant as any).custom_description ?? null,
    cover_image_url: restaurant.cover_image_url ?? null,
    logo_url: (restaurant as any).logo_url ?? null,
    categories: (restaurant as any).categories ?? [],
    tier_name: tierName,
    market_id: restaurant.market_id,
    specials: specials as any[],
    happy_hours: happyHours,
    events: events as any[],
    deals: deals as any[],
    photos: photos as any[],
  };

  // 4. Generate caption via OpenAI
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

  const hhHighlight = happyHours.length > 0
    ? (() => {
        const hh = happyHours[0];
        const start = hh.start_time?.slice(0, 5) ?? '';
        const end = hh.end_time?.slice(0, 5) ?? '';
        return `${hh.days_of_week?.join('/') ?? 'Daily'} ${start}–${end}`.trim();
      })()
    : null;

  const eventHighlight = events.length > 0
    ? (() => {
        const e = events[0];
        const label = EVENT_TYPE_INSTAGRAM_LABELS[e.event_type] ?? 'Event';
        const days = e.days_of_week?.join('/') ?? '';
        return days ? `${label} every ${days}` : label;
      })()
    : null;

  const captionCtx: SpotlightCaptionContext = {
    restaurantName: restaurant.name,
    marketName,
    appName,
    categories: (restaurant as any).categories ?? [],
    description: (restaurant as any).custom_description ?? (restaurant as any).description ?? null,
    hasSpecials: specials.length > 0,
    hasHappyHour: happyHours.length > 0,
    hasEvents: events.length > 0,
    hasDeals: deals.length > 0,
    specialHighlights: specials.slice(0, 2).map((s: any) => s.name),
    hhHighlight,
    eventHighlight,
    dealHighlights: deals.slice(0, 2).map((d: any) => d.title),
    correctionHints: opts.captionHints,
  };

  const { system, user } = buildSpotlightCaption(captionCtx);

  let caption = '';
  let tokenUsage = { prompt: 0, completion: 0, total: 0 };

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      max_tokens: 400,
      temperature: 0.8,
    });
    caption = completion.choices[0]?.message?.content?.trim() ?? '';
    tokenUsage = {
      prompt: completion.usage?.prompt_tokens ?? 0,
      completion: completion.usage?.completion_tokens ?? 0,
      total: completion.usage?.total_tokens ?? 0,
    };
  } catch (err) {
    return { success: false, error: `Caption generation failed: ${(err as Error).message}` };
  }

  // 5. Generate carousel slides
  let carouselUrls: string[];
  try {
    carouselUrls = await composeRestaurantSpotlightSlides({
      supabase,
      market,
      restaurant: candidateData,
      date: today,
    });
  } catch (err) {
    return { success: false, error: `Slide generation failed: ${(err as Error).message}` };
  }

  if (carouselUrls.length === 0) {
    return { success: false, error: 'No slides generated' };
  }

  // 6. Save to instagram_posts
  const metadata: GenerationMetadata = {
    post_type: 'restaurant_spotlight',
    total_candidates: 1,
    total_hidden: 0,
    visible_names: [restaurant.name],
    decision_path: opts.restaurantId ? 'manual:admin_selected' : 'auto:spotlight_score',
    model_used: 'gpt-4o-mini',
    token_usage: tokenUsage,
    day_of_week: new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(date),
    spotlight_restaurant_id: targetRestaurantId,
  };

  const { data: post, error: insertErr } = await supabase
    .from('instagram_posts')
    .upsert(
      {
        market_id: market.market_id,
        post_date: today,
        content_type: 'restaurant_spotlight',
        selected_entity_ids: [targetRestaurantId],
        caption,
        media_urls: carouselUrls,
        status: 'pending_review',
        scheduled_publish_at: opts.scheduledPublishAt ?? null,
        day_theme: null,
        generation_metadata: metadata,
      },
      { onConflict: 'market_id,post_date,content_type' }
    )
    .select('id')
    .single();

  if (insertErr || !post) {
    return { success: false, error: `DB save failed: ${insertErr?.message ?? 'unknown'}` };
  }

  return {
    success: true,
    post_id: post.id,
    content_type: 'restaurant_spotlight',
    caption,
    media_urls: carouselUrls,
  };
}
