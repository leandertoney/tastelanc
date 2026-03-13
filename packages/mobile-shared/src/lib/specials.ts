import { getSupabase } from '../config/theme';
import { paidFairRotate, getTierName, eliteFirstStableSort } from './fairRotation';
import type { Special, Restaurant, Tier } from '../types/database';

export interface SpecialWithRestaurant extends Special {
  restaurant: Pick<Restaurant, 'id' | 'name' | 'cover_image_url' | 'tier_id'> & {
    tiers: Pick<Tier, 'name'> | null;
  };
}

export async function getActiveDailySpecials(marketId: string | null = null): Promise<SpecialWithRestaurant[]> {
  const supabase = getSupabase();
  const dayOfWeek = new Date().toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();

  let query = supabase
    .from('specials')
    .select(`
      *,
      restaurant:restaurants!inner(id, name, cover_image_url, tier_id, market_id, tiers(name))
    `)
    .eq('is_active', true)
    .contains('days_of_week', [dayOfWeek]);

  if (marketId) {
    query = query.eq('restaurant.market_id', marketId);
  }

  const { data, error } = await query;

  if (error) {
    console.warn('getActiveDailySpecials query failed:', error.message);
    return [];
  }

  // Unlike happy hours, daily specials show ALL restaurants (not just paid).
  // Paid partners still get priority positioning at the top.
  const all = data || [];
  return eliteFirstStableSort(
    all,
    (s) => getTierName({ restaurant: s.restaurant }),
  ).slice(0, 15);
}
