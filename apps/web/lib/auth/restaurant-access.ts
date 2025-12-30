import { SupabaseClient } from '@supabase/supabase-js';
import type { Restaurant } from '@/types/database';

export interface RestaurantAccessResult {
  canAccess: boolean;
  isAdmin: boolean;
  isOwner: boolean;
  restaurant: Restaurant | null;
  userId: string | null;
  error?: string;
}

/**
 * Verifies if the current user can access a specific restaurant.
 * Access is granted if:
 * 1. User is admin (admin@tastelanc.com)
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
      restaurant: null,
      userId: null,
      error: 'Unauthorized - not logged in',
    };
  }

  const isAdmin = user.email === 'admin@tastelanc.com';

  // Fetch the restaurant
  const { data: restaurant, error: restaurantError } = await supabase
    .from('restaurants')
    .select('*')
    .eq('id', restaurantId)
    .single();

  if (restaurantError || !restaurant) {
    return {
      canAccess: false,
      isAdmin,
      isOwner: false,
      restaurant: null,
      userId: user.id,
      error: 'Restaurant not found',
    };
  }

  const isOwner = restaurant.owner_id === user.id;
  const canAccess = isAdmin || isOwner;

  if (!canAccess) {
    return {
      canAccess: false,
      isAdmin,
      isOwner,
      restaurant: null,
      userId: user.id,
      error: 'Access denied - not owner or admin',
    };
  }

  return {
    canAccess: true,
    isAdmin,
    isOwner,
    restaurant: restaurant as Restaurant,
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
      restaurant: null,
      userId: null,
      error: 'Unauthorized - not logged in',
    };
  }

  const isAdmin = user.email === 'admin@tastelanc.com';

  // If admin mode with specific restaurant ID
  if (adminRestaurantId && isAdmin) {
    const { data: restaurant, error: restaurantError } = await supabase
      .from('restaurants')
      .select('*')
      .eq('id', adminRestaurantId)
      .single();

    if (restaurantError || !restaurant) {
      return {
        canAccess: false,
        isAdmin: true,
        isOwner: false,
        restaurant: null,
        userId: user.id,
        error: 'Restaurant not found',
      };
    }

    return {
      canAccess: true,
      isAdmin: true,
      isOwner: false,
      restaurant: restaurant as Restaurant,
      userId: user.id,
    };
  }

  // Normal owner mode - find restaurant by owner_id
  const { data: restaurant, error: restaurantError } = await supabase
    .from('restaurants')
    .select('*')
    .eq('owner_id', user.id)
    .single();

  if (restaurantError || !restaurant) {
    return {
      canAccess: false,
      isAdmin,
      isOwner: false,
      restaurant: null,
      userId: user.id,
      error: 'No restaurant found for this owner',
    };
  }

  return {
    canAccess: true,
    isAdmin,
    isOwner: true,
    restaurant: restaurant as Restaurant,
    userId: user.id,
  };
}

/**
 * Checks if user is admin
 */
export async function isUserAdmin(supabase: SupabaseClient): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  return user?.email === 'admin@tastelanc.com';
}
