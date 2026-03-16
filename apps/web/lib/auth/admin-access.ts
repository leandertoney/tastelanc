import { SupabaseClient } from '@supabase/supabase-js';
import { MARKET_SLUG } from '@/config/market';

export interface AdminAccessResult {
  isAuthorized: boolean;
  role: 'super_admin' | 'co_founder' | 'market_admin' | null;
  userId: string;
  marketId: string;           // Current deploy's market (always set)
  scopedMarketIds: string[] | null; // null = see all markets, string[] = scoped to these markets
}

// Cached market ID — resolved once per process, reused across requests
let _cachedMarketId: string | null = null;
async function resolveMarketId(supabase: SupabaseClient): Promise<string> {
  if (_cachedMarketId) return _cachedMarketId;
  const { data, error } = await supabase
    .from('markets').select('id')
    .eq('slug', MARKET_SLUG).eq('is_active', true).single();
  if (error || !data) throw new Error(`[resolveMarketId] Market "${MARKET_SLUG}" not found`);
  _cachedMarketId = data.id;
  return data.id;
}

/**
 * Verifies that the current user has admin access for the current market deploy.
 * - super_admin / co_founder: full access on any deploy, scopedMarketIds = null
 * - market_admin: access only if admin_market_ids includes this deploy's market
 *
 * Throws { status, message } on failure for route handlers to catch.
 */
export async function verifyAdminAccess(
  supabase: SupabaseClient
): Promise<AdminAccessResult> {
  // 1. Authenticate
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
    throw { status: 401, message: 'Unauthorized' };
  }

  // 2. Resolve market
  const marketId = await resolveMarketId(supabase);

  // 3. Fetch profile role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, admin_market_ids')
    .eq('id', user.id)
    .maybeSingle();

  const role = profile?.role as 'super_admin' | 'co_founder' | 'market_admin' | null;
  const adminMarketIds = profile?.admin_market_ids as string[] | null;

  // 4. Authorize
  let isAuthorized = false;
  if (role === 'super_admin' || role === 'co_founder') {
    isAuthorized = true;
  } else if (role === 'market_admin' && adminMarketIds?.includes(marketId)) {
    isAuthorized = true;
  }

  if (!isAuthorized) {
    throw { status: 403, message: 'Admin access required' };
  }

  return {
    isAuthorized,
    role,
    userId: user.id,
    marketId,
    scopedMarketIds: (role === 'super_admin' || role === 'co_founder') ? null : adminMarketIds,
  };
}

/**
 * Lightweight admin check for non-admin contexts (Stripe routes, RestaurantContext, etc.).
 * Returns true if the user has admin privileges for the current market deploy.
 */
export async function isUserAdmin(supabase: SupabaseClient): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, admin_market_ids')
    .eq('id', user.id)
    .maybeSingle();

  if (!profile?.role) return false;
  if (profile.role === 'super_admin' || profile.role === 'co_founder') return true;
  if (profile.role === 'market_admin') {
    const marketId = await resolveMarketId(supabase);
    return (profile.admin_market_ids as string[] | null)?.includes(marketId) ?? false;
  }
  return false;
}
