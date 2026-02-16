import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { queryKeys } from '../lib/queryClient';
import { useMarket } from '../context/MarketContext';
import type { BlogPost } from '../types/database';

/**
 * Fetch list of blog posts filtered by current market
 */
export function useBlogPosts(limit = 20) {
  const { marketId } = useMarket();

  return useQuery({
    queryKey: [...queryKeys.blog.list, marketId],
    queryFn: async (): Promise<BlogPost[]> => {
      const { data, error } = await supabase
        .from('blog_posts')
        .select('id, slug, title, summary, tags, cover_image_url, created_at')
        .eq('market_id', marketId!)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.warn('useBlogPosts query failed:', error.message);
        return [];
      }
      return (data as BlogPost[]) || [];
    },
    staleTime: 10 * 60 * 1000,
    enabled: !!marketId,
  });
}

/**
 * Fetch latest blog posts with cover images for HomeScreen section, filtered by current market
 */
export function useLatestBlogPosts(limit = 5) {
  const { marketId } = useMarket();

  return useQuery({
    queryKey: [...queryKeys.blog.list, 'latest', marketId, limit],
    queryFn: async (): Promise<BlogPost[]> => {
      const { data, error } = await supabase
        .from('blog_posts')
        .select('id, slug, title, summary, tags, cover_image_url, created_at')
        .eq('market_id', marketId!)
        .not('cover_image_url', 'is', null)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.warn('useBlogPosts query failed:', error.message);
        return [];
      }
      return (data as BlogPost[]) || [];
    },
    staleTime: 10 * 60 * 1000,
    enabled: !!marketId,
  });
}
