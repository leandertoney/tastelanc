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
} from './scoring';
import {
  buildCaptionPrompt,
  getMarketDisplayName,
  getAppName,
  getTodaysRoundupCategory,
  getThemeForDay,
  DEFAULT_PUBLISH_HOUR_ET,
  DEFAULT_PUBLISH_MINUTE_ET,
  APPROVAL_TIMEOUT_HOURS,
  EVENT_TYPE_INSTAGRAM_LABELS,
} from './prompts';
import { DayTheme } from './types';
import { selectMedia, recordMediaUsage } from './media';
import { generateCarouselSlides } from './overlay';
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
  if (opts.dayTheme === 'weekly_roundup') {
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
  }
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

  // Generate composited carousel slides (cover + 3 restaurants + CTA)
  let carouselUrls: string[];
  try {
    carouselUrls = await generateCarouselSlides({
      supabase,
      market,
      candidates: slideCandidates,
      headline,
      totalCount: params.totalCount,
      date: today,
      contentType: params.contentType,
    });
  } catch (err: any) {
    console.error('[Instagram] Carousel generation failed, falling back to raw images:', err.message);
    // Fallback: use raw candidate images
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
