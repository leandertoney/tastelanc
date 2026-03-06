// Instagram Agent v1: Media selection and validation

import { SupabaseClient } from '@supabase/supabase-js';
import { ScoredCandidate } from './types';

interface MediaSelection {
  urls: string[];
  isCarousel: boolean;
}

/**
 * Select the best media for a post from the scored candidates.
 * Prefers entity-level images, falls back to restaurant cover images.
 * Avoids recently used assets when possible.
 */
export async function selectMedia(
  supabase: SupabaseClient,
  marketId: string,
  candidates: ScoredCandidate[]
): Promise<MediaSelection> {
  // Load recently used asset URLs (last 14 days)
  const { data: recentAssets } = await supabase
    .from('instagram_post_memory')
    .select('asset_url')
    .eq('market_id', marketId)
    .not('asset_url', 'is', null)
    .gte('last_used_at', new Date(Date.now() - 14 * 86400000).toISOString());

  const recentUrls = new Set((recentAssets || []).map(a => a.asset_url));

  // Collect all possible images per candidate
  const candidateImages: { url: string; priority: number }[] = [];

  for (const c of candidates) {
    // Priority 1: Entity's own image (not recently used)
    if (c.image_url && !recentUrls.has(c.image_url)) {
      candidateImages.push({ url: c.image_url, priority: 3 });
    } else if (c.image_url) {
      candidateImages.push({ url: c.image_url, priority: 1 }); // Used recently but still usable
    }

    // Priority 2: Restaurant cover image
    if (c.cover_image_url && !recentUrls.has(c.cover_image_url)) {
      candidateImages.push({ url: c.cover_image_url, priority: 2 });
    } else if (c.cover_image_url) {
      candidateImages.push({ url: c.cover_image_url, priority: 0 });
    }

    // Priority 3: Check restaurant_photos table for additional options
    const { data: photos } = await supabase
      .from('restaurant_photos')
      .select('url')
      .eq('restaurant_id', c.restaurant_id)
      .order('is_cover', { ascending: false })
      .order('display_order', { ascending: true })
      .limit(3);

    if (photos) {
      for (const photo of photos) {
        if (!recentUrls.has(photo.url)) {
          candidateImages.push({ url: photo.url, priority: 2 });
        } else {
          candidateImages.push({ url: photo.url, priority: 0 });
        }
      }
    }
  }

  // Sort by priority descending, deduplicate
  candidateImages.sort((a, b) => b.priority - a.priority);
  const seen = new Set<string>();
  const uniqueImages: string[] = [];
  for (const img of candidateImages) {
    if (!seen.has(img.url)) {
      seen.add(img.url);
      uniqueImages.push(img.url);
    }
  }

  if (uniqueImages.length === 0) {
    return { urls: [], isCarousel: false };
  }

  // V1: single image post (structured for easy carousel upgrade)
  // Use the highest-priority image
  return {
    urls: [uniqueImages[0]],
    isCarousel: false,
  };
}

/**
 * Record which assets and restaurants were used in a post.
 */
export async function recordMediaUsage(
  supabase: SupabaseClient,
  marketId: string,
  candidates: ScoredCandidate[],
  mediaUrls: string[],
  contentType: string
): Promise<void> {
  const now = new Date().toISOString();

  // Record restaurant usage
  for (const c of candidates) {
    const { data: existing } = await supabase
      .from('instagram_post_memory')
      .select('id, use_count_30d, use_count_90d')
      .eq('market_id', marketId)
      .eq('restaurant_id', c.restaurant_id)
      .eq('content_type', contentType)
      .maybeSingle();

    if (existing) {
      await supabase
        .from('instagram_post_memory')
        .update({
          last_used_at: now,
          use_count_30d: existing.use_count_30d + 1,
          use_count_90d: existing.use_count_90d + 1,
        })
        .eq('id', existing.id);
    } else {
      await supabase
        .from('instagram_post_memory')
        .insert({
          market_id: marketId,
          restaurant_id: c.restaurant_id,
          content_type: contentType,
          last_used_at: now,
        });
    }
  }

  // Record asset usage
  for (const url of mediaUrls) {
    const { data: existing } = await supabase
      .from('instagram_post_memory')
      .select('id, use_count_30d, use_count_90d')
      .eq('market_id', marketId)
      .eq('asset_url', url)
      .maybeSingle();

    if (existing) {
      await supabase
        .from('instagram_post_memory')
        .update({
          last_used_at: now,
          use_count_30d: existing.use_count_30d + 1,
          use_count_90d: existing.use_count_90d + 1,
        })
        .eq('id', existing.id);
    } else {
      await supabase
        .from('instagram_post_memory')
        .insert({
          market_id: marketId,
          asset_url: url,
          content_type: contentType,
          last_used_at: now,
        });
    }
  }
}
