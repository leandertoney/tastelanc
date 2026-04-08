import { getSupabase } from '../config/theme';
import { eliteFirstStableSort, getTierName } from './fairRotation';
import type { Restaurant, Tier } from '../types/database';

const COUPONS_API_BASE = 'https://tastelanc.com/api/mobile/coupons';

async function getAuthHeaders(): Promise<HeadersInit> {
  const supabase = getSupabase();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new Error('No active session');
  }

  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${session.access_token}`,
  };
}

export type CtaType = 'claim_deal' | 'leave_recommendation' | 'learn_more' | 'show_to_staff' | 'custom';

export interface Coupon {
  id: string;
  restaurant_id: string;
  title: string;
  description: string | null;
  discount_type: 'percent_off' | 'dollar_off' | 'bogo' | 'free_item' | 'custom';
  discount_value: number | null;
  original_price: number | null;
  image_url: string | null;
  start_date: string;
  end_date: string | null;
  days_of_week: string[];
  start_time: string | null;
  end_time: string | null;
  max_claims_total: number | null;
  max_claims_per_user: number;
  claims_count: number;
  is_active: boolean;
  created_at: string;
  cta_type: CtaType;
  cta_label: string | null;
}

/** Default button labels for each CTA type */
export const CTA_LABELS: Record<CtaType, string> = {
  claim_deal: 'Claim Deal',
  leave_recommendation: 'Leave a Recommendation',
  learn_more: 'Learn More',
  show_to_staff: 'Show to Staff',
  custom: 'View Deal',
};

/** Get the display label for a coupon's CTA button */
export function getCtaLabel(coupon: Pick<Coupon, 'cta_type' | 'cta_label'>): string {
  if (coupon.cta_label) return coupon.cta_label;
  return CTA_LABELS[coupon.cta_type] || CTA_LABELS.claim_deal;
}

export interface CouponWithRestaurant extends Coupon {
  restaurant: Pick<Restaurant, 'id' | 'name' | 'cover_image_url' | 'tier_id'> & {
    tiers: Pick<Tier, 'name'> | null;
  };
}

export interface CouponClaim {
  id: string;
  status: 'claimed' | 'redeemed' | 'expired' | 'cancelled';
  claimed_at: string;
  redeemed_at: string | null;
  coupon: Coupon & {
    restaurant: Pick<Restaurant, 'id' | 'name' | 'cover_image_url' | 'slug'>;
  };
}

export function formatDiscount(coupon: Coupon): string {
  switch (coupon.discount_type) {
    case 'percent_off':
      return coupon.discount_value ? `${coupon.discount_value}% Off` : '% Off';
    case 'dollar_off':
      return coupon.discount_value ? `$${coupon.discount_value} Off` : '$ Off';
    case 'bogo':
      return 'BOGO';
    case 'free_item':
      return 'Free Item';
    case 'custom':
      return coupon.title;
    default:
      return '';
  }
}

/**
 * Get active coupons for a market, filtered to today's day and not expired.
 */
export async function getActiveCoupons(marketId: string | null = null): Promise<CouponWithRestaurant[]> {
  const supabase = getSupabase();
  const dayOfWeek = new Date().toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
  const today = new Date().toISOString().split('T')[0];

  let query = supabase
    .from('coupons')
    .select(`
      *,
      restaurant:restaurants!inner(id, name, cover_image_url, tier_id, market_id, tiers(name))
    `)
    .eq('is_active', true)
    .lte('start_date', today);

  if (marketId) {
    query = query.eq('restaurant.market_id', marketId);
  }

  const { data, error } = await query;

  if (error) {
    console.warn('getActiveCoupons query failed:', error.message);
    return [];
  }

  // Filter: not expired, valid for today (empty days_of_week = every day), not maxed out
  const filtered = (data || []).filter((coupon) => {
    if (coupon.end_date && coupon.end_date < today) return false;
    if (coupon.days_of_week && coupon.days_of_week.length > 0) {
      if (!coupon.days_of_week.includes(dayOfWeek)) return false;
    }
    if (coupon.max_claims_total && coupon.claims_count >= coupon.max_claims_total) return false;
    return true;
  });

  return eliteFirstStableSort(
    filtered,
    (c) => getTierName({ restaurant: c.restaurant }),
  ).slice(0, 20);
}

/**
 * Get ALL active coupons (no day filter) for the View All screen.
 */
export async function getAllCoupons(marketId: string | null = null): Promise<CouponWithRestaurant[]> {
  const supabase = getSupabase();
  const today = new Date().toISOString().split('T')[0];

  let query = supabase
    .from('coupons')
    .select(`
      *,
      restaurant:restaurants!inner(id, name, cover_image_url, tier_id, market_id, tiers(name))
    `)
    .eq('is_active', true)
    .lte('start_date', today);

  if (marketId) {
    query = query.eq('restaurant.market_id', marketId);
  }

  const { data, error } = await query;

  if (error) {
    console.warn('getAllCoupons query failed:', error.message);
    return [];
  }

  // Filter expired only
  const filtered = (data || []).filter((coupon) => {
    if (coupon.end_date && coupon.end_date < today) return false;
    if (coupon.max_claims_total && coupon.claims_count >= coupon.max_claims_total) return false;
    return true;
  });

  return eliteFirstStableSort(
    filtered,
    (c) => getTierName({ restaurant: c.restaurant }),
  );
}

/**
 * Get coupons for a specific restaurant.
 */
export async function getRestaurantCoupons(restaurantId: string): Promise<Coupon[]> {
  const supabase = getSupabase();
  const today = new Date().toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('coupons')
    .select('*')
    .eq('restaurant_id', restaurantId)
    .eq('is_active', true)
    .lte('start_date', today)
    .order('created_at', { ascending: false });

  if (error) {
    console.warn('getRestaurantCoupons query failed:', error.message);
    return [];
  }

  return (data || []).filter((coupon) => {
    if (coupon.end_date && coupon.end_date < today) return false;
    if (coupon.max_claims_total && coupon.claims_count >= coupon.max_claims_total) return false;
    return true;
  });
}

/**
 * Claim a coupon via the API.
 */
export async function claimCoupon(couponId: string): Promise<{ claim: { id: string; coupon_id: string; status: string; claimed_at: string } }> {
  const headers = await getAuthHeaders();
  const response = await fetch(`${COUPONS_API_BASE}/${couponId}/claim`, {
    method: 'POST',
    headers,
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Failed to claim coupon');
  }
  return data;
}

/**
 * Get the user's claimed coupons.
 */
export async function getMyClaims(): Promise<CouponClaim[]> {
  const headers = await getAuthHeaders();
  const response = await fetch(`${COUPONS_API_BASE}/claims`, {
    method: 'GET',
    headers,
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Failed to fetch claims');
  }
  return data.claims || [];
}

/**
 * Get the rotating redemption code for a claim.
 */
export async function getClaimCode(claimId: string): Promise<{ code: string; expires_in: number; valid_until: string }> {
  const headers = await getAuthHeaders();
  const response = await fetch(`${COUPONS_API_BASE}/claims/${claimId}/code`, {
    method: 'GET',
    headers,
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Failed to get code');
  }
  return data;
}

/**
 * Redeem a claimed coupon (user-initiated flow).
 */
export async function redeemClaim(claimId: string): Promise<{ confirmation_code: string }> {
  const headers = await getAuthHeaders();
  const response = await fetch(`${COUPONS_API_BASE}/claims/${claimId}/redeem`, {
    method: 'POST',
    headers,
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Failed to redeem coupon');
  return data;
}

/**
 * Cancel a claimed coupon.
 */
export async function cancelClaim(claimId: string): Promise<void> {
  const headers = await getAuthHeaders();
  const response = await fetch(`${COUPONS_API_BASE}/claims/${claimId}/cancel`, {
    method: 'POST',
    headers,
  });

  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.error || 'Failed to cancel coupon');
  }
}
