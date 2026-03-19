import type { MetadataRoute } from 'next';
import { createClient } from '@supabase/supabase-js';
import { BRAND, MARKET_SLUG } from '@/config/market';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || `https://${BRAND.domain}`;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    { url: siteUrl, lastModified: now, changeFrequency: 'daily', priority: 1.0 },
    { url: `${siteUrl}/restaurants`, lastModified: now, changeFrequency: 'daily', priority: 0.9 },
    { url: `${siteUrl}/happy-hours`, lastModified: now, changeFrequency: 'daily', priority: 0.8 },
    { url: `${siteUrl}/events`, lastModified: now, changeFrequency: 'daily', priority: 0.8 },
    { url: `${siteUrl}/blog`, lastModified: now, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${siteUrl}/for-restaurants`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${siteUrl}/vote`, lastModified: now, changeFrequency: 'weekly', priority: 0.5 },
    { url: `${siteUrl}/careers`, lastModified: now, changeFrequency: 'monthly', priority: 0.4 },
    { url: `${siteUrl}/contact`, lastModified: now, changeFrequency: 'monthly', priority: 0.3 },
    { url: `${siteUrl}/support`, lastModified: now, changeFrequency: 'monthly', priority: 0.3 },
    { url: `${siteUrl}/privacy`, lastModified: now, changeFrequency: 'yearly', priority: 0.2 },
    { url: `${siteUrl}/terms`, lastModified: now, changeFrequency: 'yearly', priority: 0.2 },
  ];

  // Get market ID
  const { data: market } = await supabase
    .from('markets')
    .select('id')
    .eq('slug', MARKET_SLUG)
    .eq('is_active', true)
    .single();

  const marketId = market?.id;

  // Restaurant pages
  let restaurantPages: MetadataRoute.Sitemap = [];
  if (marketId) {
    const { data: restaurants } = await supabase
      .from('restaurants')
      .select('slug, updated_at')
      .eq('market_id', marketId)
      .eq('is_active', true)
      .not('slug', 'is', null);

    restaurantPages = (restaurants || []).map((r) => ({
      url: `${siteUrl}/restaurants/${r.slug}`,
      lastModified: r.updated_at ? new Date(r.updated_at) : now,
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    }));
  }

  // Blog post pages (scoped to market if marketId available)
  let blogQuery = supabase
    .from('blog_posts')
    .select('slug, published_at, updated_at')
    .eq('status', 'published')
    .not('slug', 'is', null)
    .order('published_at', { ascending: false });

  if (marketId) {
    blogQuery = blogQuery.eq('market_id', marketId);
  }

  const { data: blogPosts } = await blogQuery;

  const blogPages: MetadataRoute.Sitemap = (blogPosts || []).map((post) => ({
    url: `${siteUrl}/blog/${post.slug}`,
    lastModified: post.updated_at ? new Date(post.updated_at) : new Date(post.published_at),
    changeFrequency: 'monthly' as const,
    priority: 0.6,
  }));

  return [...staticPages, ...restaurantPages, ...blogPages];
}
