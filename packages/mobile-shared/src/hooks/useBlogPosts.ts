import { useQuery } from '@tanstack/react-query';
import { getSupabase } from '../config/theme';
import { getBrand } from '../config/theme';
import { queryKeys } from '../lib/queryKeys';
import type { BlogPost } from '../types/database';

// Safe market ID getter — avoids crash if MarketProvider hasn't mounted
function useMarketIdSafe(): string | null {
  try {
    const { useMarket } = require('../context/MarketContext');
    const { marketId } = useMarket();
    return marketId;
  } catch {
    return null;
  }
}

// Get market slug from brand config
function getMarketSlug(): string {
  try {
    return getBrand().marketSlug;
  } catch {
    return 'lancaster-pa';
  }
}

// Fallback: resolve market_id from market slug via Supabase
let _cachedFallbackId: string | null = null;
async function getMarketIdFallback(): Promise<string | null> {
  if (_cachedFallbackId) return _cachedFallbackId;
  try {
    const supabase = getSupabase();
    const marketSlug = getMarketSlug();
    const { data } = await supabase
      .from('markets')
      .select('id')
      .eq('slug', marketSlug)
      .single();
    if (data?.id) {
      _cachedFallbackId = data.id;
      return data.id;
    }
  } catch {}
  return null;
}

/**
 * Fetch list of published blog posts for the current market
 */
export function useBlogPosts(limit = 20) {
  const marketId = useMarketIdSafe();
  const marketSlug = getMarketSlug();

  return useQuery({
    queryKey: [...queryKeys.blog.list, marketId ?? marketSlug],
    queryFn: async (): Promise<BlogPost[]> => {
      const resolvedId = marketId ?? (await getMarketIdFallback());
      if (!resolvedId) return []; // Never show cross-market posts

      const supabase = getSupabase();
      const { data, error } = await supabase
        .from('blog_posts')
        .select('id, slug, title, summary, tags, cover_image_url, published_at, created_at')
        .eq('status', 'published')
        .eq('market_id', resolvedId)
        .order('published_at', { ascending: false, nullsFirst: false })
        .limit(limit);

      if (error) {
        console.warn('useBlogPosts query failed:', error.message);
        return [];
      }
      return (data as BlogPost[]) || [];
    },
    staleTime: 10 * 60 * 1000,
  });
}

/**
 * Fetch latest published blog posts with cover images for HomeScreen section
 */
export function useLatestBlogPosts(limit = 5) {
  const marketId = useMarketIdSafe();
  const marketSlug = getMarketSlug();

  return useQuery({
    queryKey: [...queryKeys.blog.list, 'latest', marketId ?? marketSlug, limit],
    queryFn: async (): Promise<BlogPost[]> => {
      const resolvedId = marketId ?? (await getMarketIdFallback());
      if (!resolvedId) return []; // Never show cross-market posts

      const supabase = getSupabase();
      const { data, error } = await supabase
        .from('blog_posts')
        .select('id, slug, title, summary, tags, cover_image_url, published_at, created_at')
        .eq('status', 'published')
        .eq('market_id', resolvedId)
        .not('cover_image_url', 'is', null)
        .order('published_at', { ascending: false, nullsFirst: false })
        .limit(limit);

      if (error) {
        console.warn('useBlogPosts query failed:', error.message);
        return [];
      }
      return (data as BlogPost[]) || [];
    },
    staleTime: 10 * 60 * 1000,
  });
}
