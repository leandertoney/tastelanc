import { supabase } from './supabase';
import { getEpochSeed } from './fairRotation';

/**
 * Section names used for impression tracking.
 * Must match the section_name values stored in section_impressions table.
 */
export type SectionName =
  | 'happy_hours'
  | 'entertainment'
  | 'events'
  | 'featured'
  | 'recommended'
  | 'other_places'
  | 'search'
  | 'category'
  | 'specials_view_all'
  | 'happy_hours_view_all'
  | 'featured_view_all';

interface PendingImpression {
  restaurant_id: string;
  section_name: SectionName;
  position_index: number;
  visitor_id: string;
  epoch_seed: number;
}

// In-memory buffer for batched inserts
let buffer: PendingImpression[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;

// Dedup set: "restaurantId:sectionName:epoch" per visitor session
const seen = new Set<string>();

// Cache visitor ID to avoid repeated auth calls
let cachedVisitorId: string | null = null;
let visitorIdExpiry = 0;

async function getVisitorId(): Promise<string> {
  const now = Date.now();
  if (cachedVisitorId && now < visitorIdExpiry) return cachedVisitorId;

  try {
    const { data } = await supabase.auth.getUser();
    cachedVisitorId = data?.user?.id || 'anonymous';
  } catch {
    cachedVisitorId = 'anonymous';
  }
  visitorIdExpiry = now + 5 * 60 * 1000; // cache for 5 min
  return cachedVisitorId;
}

/**
 * Flush buffered impressions to Supabase.
 * Uses upsert with the dedup index so duplicates are silently ignored.
 */
async function flush() {
  if (buffer.length === 0) return;

  const batch = [...buffer];
  buffer = [];

  try {
    // Use insert (not upsert) — client-side seen set already deduplicates,
    // and the DB unique index on (restaurant_id, section_name, visitor_id, epoch_seed)
    // catches edge-case duplicates. The previous upsert silently failed because
    // the INSERT RLS policy doesn't cover the UPDATE part of upsert.
    await supabase
      .from('section_impressions')
      .insert(batch);
  } catch {
    // Silently fail — don't break the app for analytics
  }
}

function scheduleFlush() {
  if (flushTimer) return;
  flushTimer = setTimeout(() => {
    flushTimer = null;
    flush();
  }, 10_000); // 10-second buffer
}

/**
 * Track that a restaurant was visible on screen in a given section.
 * Fire-and-forget — call without await. Batched and deduped automatically.
 *
 * @param restaurantId - The restaurant UUID
 * @param sectionName  - Which section (happy_hours, featured, etc.)
 * @param positionIndex - 0-based position in the list/carousel
 */
export function trackImpression(
  restaurantId: string,
  sectionName: SectionName,
  positionIndex: number,
) {
  const epoch = getEpochSeed();
  const dedupeKey = `${restaurantId}:${sectionName}:${epoch}`;

  // Client-side dedup — don't even buffer if already tracked this epoch
  if (seen.has(dedupeKey)) return;
  seen.add(dedupeKey);

  // Prune seen set when epoch changes (keeps memory bounded)
  if (seen.size > 500) {
    seen.clear();
    seen.add(dedupeKey);
  }

  (async () => {
    try {
      const visitorId = await getVisitorId();
      buffer.push({
        restaurant_id: restaurantId,
        section_name: sectionName,
        position_index: positionIndex,
        visitor_id: visitorId,
        epoch_seed: epoch,
      });
      scheduleFlush();
    } catch {
      // Silently fail
    }
  })();
}

/**
 * Track impressions for a batch of visible items.
 * Convenience wrapper for FlatList onViewableItemsChanged.
 */
export function trackVisibleItems(
  items: Array<{ restaurantId: string; index: number }>,
  sectionName: SectionName,
) {
  for (const item of items) {
    trackImpression(item.restaurantId, sectionName, item.index);
  }
}
