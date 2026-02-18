import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { queryKeys } from '../lib/queryClient';
import type { BlogPost } from '../types/database';

// Safe market ID getter — avoids crash if MarketProvider hasn't mounted
function useMarketIdSafe(): string | null {
  try {
    // Dynamic require to avoid crash if context isn't available
    const { useMarket } = require('../context/MarketContext');
    const { marketId } = useMarket();
    return marketId;
  } catch {
    return null;
  }
}

/**
 * Fetch list of published blog posts for the current market
 */
export function useBlogPosts(limit = 20) {
  const marketId = useMarketIdSafe();

  return useQuery({
    queryKey: [...queryKeys.blog.list, marketId],
    queryFn: async (): Promise<BlogPost[]> => {
      let query = supabase
        .from('blog_posts')
        .select('id, slug, title, summary, tags, cover_image_url, published_at, created_at')
        .eq('status', 'published')
        .order('published_at', { ascending: false, nullsFirst: false })
        .limit(limit);

      if (marketId) {
        query = query.eq('market_id', marketId);
      }

      const { data, error } = await query;

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

  return useQuery({
    queryKey: [...queryKeys.blog.list, 'latest', marketId, limit],
    queryFn: async (): Promise<BlogPost[]> => {
      let query = supabase
        .from('blog_posts')
        .select('id, slug, title, summary, tags, cover_image_url, published_at, created_at')
        .eq('status', 'published')
        .not('cover_image_url', 'is', null)
        .order('published_at', { ascending: false, nullsFirst: false })
        .limit(limit);

      if (marketId) {
        query = query.eq('market_id', marketId);
      }

      const { data, error } = await query;

      if (error) {
        console.warn('useBlogPosts query failed:', error.message);
        return [];
      }
      return (data as BlogPost[]) || [];
    },
    staleTime: 10 * 60 * 1000,
  });
}
