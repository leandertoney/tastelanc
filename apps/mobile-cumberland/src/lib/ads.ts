import { supabase } from './supabase';
import { getEpochSeed } from './fairRotation';
import type { FeaturedAd } from '../types/database';

/**
 * Fetch all currently active featured ads.
 * Filters by is_active, start_date/end_date, ordered by priority DESC.
 */
export async function getActiveAds(marketId: string | null = null): Promise<FeaturedAd[]> {
  const today = new Date().toISOString().split('T')[0];

  let query = supabase
    .from('featured_ads')
    .select('*')
    .eq('is_active', true)
    .or(`start_date.is.null,start_date.lte.${today}`)
    .or(`end_date.is.null,end_date.gte.${today}`)
    .order('priority', { ascending: false });

  // Filter by market — include ads for this market OR global ads (null market_id)
  if (marketId) {
    query = query.or(`market_id.eq.${marketId},market_id.is.null`);
  }

  const { data, error } = await query;

  if (error) {
    console.warn('[Ads] Failed to fetch active ads:', error.message);
    return [];
  }

  return data || [];
}

// --- Ad Event Tracking ---
// Mirrors the batched, deduped, fire-and-forget pattern from impressions.ts

interface PendingAdEvent {
  ad_id: string;
  event_type: 'impression' | 'click';
  visitor_id: string;
  epoch_seed: number;
  position_index: number | null;
}

let adBuffer: PendingAdEvent[] = [];
let adFlushTimer: ReturnType<typeof setTimeout> | null = null;
const adSeen = new Set<string>();

let cachedAdVisitorId: string | null = null;
let adVisitorIdExpiry = 0;

async function getAdVisitorId(): Promise<string> {
  const now = Date.now();
  if (cachedAdVisitorId && now < adVisitorIdExpiry) return cachedAdVisitorId;

  try {
    const { data } = await supabase.auth.getUser();
    cachedAdVisitorId = data?.user?.id || 'anonymous';
  } catch {
    cachedAdVisitorId = 'anonymous';
  }
  adVisitorIdExpiry = now + 5 * 60 * 1000;
  return cachedAdVisitorId;
}

async function flushAdEvents() {
  if (adBuffer.length === 0) return;
  const batch = [...adBuffer];
  adBuffer = [];

  try {
    await supabase
      .from('ad_events')
      .upsert(batch, { onConflict: 'ad_id,visitor_id,epoch_seed' });
  } catch {
    // Silently fail — don't break the app for analytics
  }
}

function scheduleAdFlush() {
  if (adFlushTimer) return;
  adFlushTimer = setTimeout(() => {
    adFlushTimer = null;
    flushAdEvents();
  }, 10_000);
}

/**
 * Track an ad impression. Fire-and-forget. Deduped per 30-min epoch.
 */
export function trackAdImpression(adId: string, positionIndex: number) {
  const epoch = getEpochSeed();
  const dedupeKey = `ad:${adId}:${epoch}`;
  if (adSeen.has(dedupeKey)) return;
  adSeen.add(dedupeKey);

  if (adSeen.size > 200) {
    adSeen.clear();
    adSeen.add(dedupeKey);
  }

  (async () => {
    try {
      const visitorId = await getAdVisitorId();
      adBuffer.push({
        ad_id: adId,
        event_type: 'impression',
        visitor_id: visitorId,
        epoch_seed: epoch,
        position_index: positionIndex,
      });
      scheduleAdFlush();
    } catch {
      // Silently fail
    }
  })();
}

/**
 * Track an ad click. Immediate insert (clicks are rare, high-value).
 */
export function trackAdClick(adId: string, positionIndex: number) {
  (async () => {
    try {
      const visitorId = await getAdVisitorId();
      const epoch = getEpochSeed();
      await supabase.from('ad_events').insert({
        ad_id: adId,
        event_type: 'click',
        visitor_id: visitorId,
        epoch_seed: epoch,
        position_index: positionIndex,
      });
    } catch {
      // Silently fail
    }
  })();
}
