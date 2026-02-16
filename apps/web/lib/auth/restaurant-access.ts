import { SupabaseClient } from '@supabase/supabase-js';
import type { Restaurant } from '@/types/database';
import { MARKET_SLUG } from '@/config/market';
import { isUserAdmin as checkIsUserAdmin } from '@/lib/auth/admin-access';

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

export interface RestaurantAccessResult {
  canAccess: boolean;
  isAdmin: boolean;
  isOwner: boolean;
  isMember: boolean;
  memberRole?: 'manager';
  restaurant: Restaurant | null;
  userId: string | null;
  error?: string;
}

/**
 * Verifies if the current user can access a specific restaurant.
 * Access is granted if:
 * 1. User is admin (super_admin or market_admin for this market)
 * 2. User is the owner of the restaurant (restaurant.owner_id === user.id)
 *
 * @param supabase - Supabase client instance
 * @param restaurantId - The restaurant ID to check access for
 * @returns Object containing access status and restaurant data
 */
export async function verifyRestaurantAccess(
  supabase: SupabaseClient,
  restaurantId: string
): Promise<RestaurantAccessResult> {
  // Get current user
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return {
      canAccess: false,
      isAdmin: false,
      isOwner: false,
      isMember: false,
      restaurant: null,
      userId: null,
      error: 'Unauthorized - not logged in',
    };
  }

  const isAdmin = await checkIsUserAdmin(supabase);

  // Resolve market for cross-market isolation
  const marketId = await resolveMarketId(supabase);

  // Fetch the restaurant with tier info — scoped to this market
  const { data: restaurant, error: restaurantError } = await supabase
    .from('restaurants')
    .select('*, tiers(name)')
    .eq('id', restaurantId)
    .eq('market_id', marketId)
    .single();

  if (restaurantError || !restaurant) {
    return {
      canAccess: false,
      isAdmin,
      isOwner: false,
      isMember: false,
      restaurant: null,
      userId: user.id,
      error: 'Restaurant not found',
    };
  }

  const isOwner = restaurant.owner_id === user.id;

  // Check team membership if not owner and not admin
  let isMember = false;
  let memberRole: 'manager' | undefined;

  if (!isOwner && !isAdmin) {
    const { data: membership } = await supabase
      .from('restaurant_members')
      .select('role')
      .eq('restaurant_id', restaurantId)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single();

    if (membership) {
      // Only honor membership if restaurant is on Elite tier
      const tierName = (restaurant as any).tiers?.name;
      if (tierName === 'elite') {
        isMember = true;
        memberRole = membership.role as 'manager';
      }
    }
  }

  const canAccess = isAdmin || isOwner || isMember;

  if (!canAccess) {
    return {
      canAccess: false,
      isAdmin,
      isOwner,
      isMember: false,
      restaurant: null,
      userId: user.id,
      error: 'Access denied - not owner, admin, or team member',
    };
  }

  // Strip tiers join from the restaurant object before returning
  const { tiers: _tiers, ...restaurantData } = restaurant as any;

  return {
    canAccess: true,
    isAdmin,
    isOwner,
    isMember,
    memberRole,
    restaurant: restaurantData as Restaurant,
    userId: user.id,
  };
}

/**
 * Gets the restaurant owned by the current user.
 * For admin mode, fetches a specific restaurant by ID.
 *
 * @param supabase - Supabase client instance
 * @param adminRestaurantId - Optional restaurant ID for admin mode
 * @returns Object containing restaurant data and user info
 */
export async function getOwnedRestaurant(
  supabase: SupabaseClient,
  adminRestaurantId?: string | null
): Promise<RestaurantAccessResult> {
  // Get current user
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return {
      canAccess: false,
      isAdmin: false,
      isOwner: false,
      isMember: false,
      restaurant: null,
      userId: null,
      error: 'Unauthorized - not logged in',
    };
  }

  const isAdmin = await checkIsUserAdmin(supabase);

  // Resolve market for cross-market isolation
  const marketId = await resolveMarketId(supabase);

  // If admin mode with specific restaurant ID
  if (adminRestaurantId && isAdmin) {
    const { data: restaurant, error: restaurantError } = await supabase
      .from('restaurants')
      .select('*')
      .eq('id', adminRestaurantId)
      .eq('market_id', marketId)
      .single();

    if (restaurantError || !restaurant) {
      return {
        canAccess: false,
        isAdmin: true,
        isOwner: false,
        isMember: false,
        restaurant: null,
        userId: user.id,
        error: 'Restaurant not found',
      };
    }

    return {
      canAccess: true,
      isAdmin: true,
      isOwner: false,
      isMember: false,
      restaurant: restaurant as Restaurant,
      userId: user.id,
    };
  }

  // Normal owner mode - find restaurant by owner_id — scoped to this market
  const { data: restaurant, error: restaurantError } = await supabase
    .from('restaurants')
    .select('*')
    .eq('owner_id', user.id)
    .eq('market_id', marketId)
    .single();

  if (restaurantError || !restaurant) {
    return {
      canAccess: false,
      isAdmin,
      isOwner: false,
      isMember: false,
      restaurant: null,
      userId: user.id,
      error: 'No restaurant found for this owner',
    };
  }

  return {
    canAccess: true,
    isAdmin,
    isOwner: true,
    isMember: false,
    restaurant: restaurant as Restaurant,
    userId: user.id,
  };
}

/**
 * Checks if user is admin — re-exported from admin-access.ts for backwards compatibility
 */
export { isUserAdmin } from '@/lib/auth/admin-access';
