import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { queryKeys } from '../lib/queryClient';
import type { BlogPost } from '../types/database';

/**
 * Fetch list of published blog posts
 */
export function useBlogPosts(limit = 20) {
  return useQuery({
    queryKey: queryKeys.blog.list,
    queryFn: async (): Promise<BlogPost[]> => {
      const { data, error } = await supabase
        .from('blog_posts')
        .select('id, slug, title, summary, tags, cover_image_url, published_at, created_at')
        .eq('status', 'published')
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
  return useQuery({
    queryKey: [...queryKeys.blog.list, 'latest', limit],
    queryFn: async (): Promise<BlogPost[]> => {
      const { data, error } = await supabase
        .from('blog_posts')
        .select('id, slug, title, summary, tags, cover_image_url, published_at, created_at')
        .eq('status', 'published')
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
