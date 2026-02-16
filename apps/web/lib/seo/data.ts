import { createClient } from '@supabase/supabase-js';
import { MARKET_SLUG } from '@/config/market';
import type {
  Restaurant,
  HappyHour,
  HappyHourItem,
  Special,
  Event,
  BlogPost,
} from './types';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const service = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = () =>
  createClient(url, service, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

// ── Market Resolution (cached per process) ──────────────
let _cachedMarketId: string | null = null;

async function resolveMarketId(): Promise<string> {
  if (_cachedMarketId) return _cachedMarketId;
  const { data, error } = await supabase()
    .from('markets')
    .select('id')
    .eq('slug', MARKET_SLUG)
    .eq('is_active', true)
    .single();
  if (error || !data) {
    throw new Error(`[resolveMarketId] Market "${MARKET_SLUG}" not found or inactive`);
  }
  _cachedMarketId = data.id;
  return data.id;
}

// ── Restaurants ─────────────────────────────────────────

export async function fetchRestaurants(activeOnly = true) {
  const marketId = await resolveMarketId();
  const client = supabase();
  let q = client.from('restaurants').select('*').eq('market_id', marketId);
  if (activeOnly) q = q.eq('is_active', true);
  const { data, error } = await q;
  if (error) throw error;
  return (data || []) as Restaurant[];
}

export async function fetchRestaurantBySlug(slug: string) {
  const marketId = await resolveMarketId();
  const { data } = await supabase()
    .from('restaurants')
    .select('*')
    .eq('slug', slug)
    .eq('market_id', marketId)
    .eq('is_active', true)
    .single();
  return (data || null) as Restaurant | null;
}

// ── Happy Hours ─────────────────────────────────────────

export async function fetchHappyHours() {
  const marketId = await resolveMarketId();
  const { data, error } = await supabase()
    .from('happy_hours')
    .select('*, restaurant:restaurants!inner(id)')
    .eq('restaurant.market_id', marketId)
    .eq('is_active', true);
  if (error) throw error;
  return (data || []) as HappyHour[];
}

export async function fetchHappyHourItems(ids: string[]) {
  if (!ids.length) return [];
  const { data, error } = await supabase()
    .from('happy_hour_items')
    .select('*')
    .in('happy_hour_id', ids);
  if (error) throw error;
  return (data || []) as HappyHourItem[];
}

// ── Specials ────────────────────────────────────────────

export async function fetchSpecials() {
  const marketId = await resolveMarketId();
  const { data, error } = await supabase()
    .from('specials')
    .select('*, restaurant:restaurants!inner(id)')
    .eq('restaurant.market_id', marketId)
    .eq('is_active', true);
  if (error) throw error;
  return (data || []) as Special[];
}

// ── Events ──────────────────────────────────────────────

export async function fetchEvents() {
  const marketId = await resolveMarketId();
  const { data, error } = await supabase()
    .from('events')
    .select('*, restaurant:restaurants!inner(id)')
    .eq('restaurant.market_id', marketId)
    .eq('is_active', true);
  if (error) throw error;
  return (data || []) as Event[];
}

export async function fetchEventsWithRestaurants() {
  const [events, restaurants] = await Promise.all([
    fetchEvents(),
    fetchRestaurants(true),
  ]);
  const map = new Map(restaurants.map((r) => [r.id, r]));
  return events.map((e) => ({ event: e, restaurant: map.get(e.restaurant_id) || null }));
}

// ── Blog Posts ──────────────────────────────────────────

function isMissingBlogTable(err: any) {
  return err?.code === 'PGRST205' || String(err?.message || '').includes('blog_posts');
}

export async function fetchBlogPosts() {
  const marketId = await resolveMarketId();
  try {
    const { data, error } = await supabase()
      .from('blog_posts')
      .select('*')
      .eq('market_id', marketId)
      .or('status.eq.published,status.is.null')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []) as BlogPost[];
  } catch (err) {
    if (isMissingBlogTable(err)) return [];
    throw err;
  }
}

export async function fetchBlogPostBySlug(slug: string) {
  const marketId = await resolveMarketId();
  try {
    const { data, error } = await supabase()
      .from('blog_posts')
      .select('*')
      .eq('slug', slug)
      .eq('market_id', marketId)
      .single();
    if (error) throw error;
    return (data || null) as BlogPost | null;
  } catch (err) {
    if (isMissingBlogTable(err)) return null;
    throw err;
  }
}

export async function fetchBlogPostsByTag(tag: string) {
  const marketId = await resolveMarketId();
  try {
    const { data, error } = await supabase()
      .from('blog_posts')
      .select('*')
      .eq('market_id', marketId)
      .contains('tags', [tag])
      .or('status.eq.published,status.is.null')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []) as BlogPost[];
  } catch (err) {
    if (isMissingBlogTable(err)) return [];
    throw err;
  }
}

export async function fetchAllBlogTags(): Promise<string[]> {
  try {
    const posts = await fetchBlogPosts();
    const tagSet = new Set<string>();
    posts.forEach(post => {
      (post.tags || []).forEach(tag => tagSet.add(tag));
    });
    return Array.from(tagSet).sort();
  } catch {
    return [];
  }
}
