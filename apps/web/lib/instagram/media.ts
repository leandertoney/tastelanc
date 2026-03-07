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

  // Select one best image per candidate (for carousel slides)
  const perCandidateUrls: string[] = [];

  for (const c of candidates) {
    // ONLY use the entity's own uploaded image — no cover images, no restaurant_photos fallback
    if (c.image_url) {
      perCandidateUrls.push(c.image_url);
    }
  }

  return {
    urls: perCandidateUrls,
    isCarousel: perCandidateUrls.length > 1,
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
