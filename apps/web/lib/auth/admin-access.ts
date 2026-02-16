import { SupabaseClient } from '@supabase/supabase-js';
import { MARKET_SLUG } from '@/config/market';

export interface AdminAccessResult {
  isAuthorized: boolean;
  role: 'super_admin' | 'market_admin' | null;
  userId: string;
  marketId: string;           // Current deploy's market (always set)
  scopedMarketId: string | null; // null = see all markets, string = scoped to this market
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
 * - super_admin: full access on any deploy
 * - market_admin: access only if admin_market_id matches this deploy's market
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
    .select('role, admin_market_id')
    .eq('id', user.id)
    .single();

  const role = profile?.role as 'super_admin' | 'market_admin' | null;

  // 4. Authorize
  let isAuthorized = false;
  if (role === 'super_admin') {
    isAuthorized = true;
  } else if (role === 'market_admin' && profile?.admin_market_id === marketId) {
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
    scopedMarketId: role === 'super_admin' ? null : marketId,
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
    .select('role, admin_market_id')
    .eq('id', user.id)
    .single();

  if (!profile?.role) return false;
  if (profile.role === 'super_admin') return true;
  if (profile.role === 'market_admin') {
    const marketId = await resolveMarketId(supabase);
    return profile.admin_market_id === marketId;
  }
  return false;
}
