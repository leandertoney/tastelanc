import { Platform } from 'react-native';
import { getSupabase, getBrand } from '../config/theme';

// One id per app launch so sessions in analytics_page_views are real
// sessions, not a stand-in for distinct visitors (they used to be equal).
const SESSION_ID = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

// Set by MarketProvider once the market row loads. All three market apps write
// to the same table; without this, Cumberland and Fayetteville rows were
// indistinguishable from Lancaster.
let analyticsMarketId: string | null = null;
export function setAnalyticsMarket(marketId: string | null) {
  analyticsMarketId = marketId;
}

const PAGE_TYPE_MAP: Record<string, string> = {
  RestaurantDetail: 'restaurant',
  EventDetail: 'events',
  Home: 'home',
  Search: 'other',
  Move: 'other',
  Favorites: 'other',
  SpecialsViewAll: 'specials',
  HappyHoursViewAll: 'happy_hour',
  EventsViewAll: 'events',
  EntertainmentViewAll: 'events',
  Category: 'other',
  Vote: 'vote',
  Rewards: 'other',
  Profile: 'other',
  RestaurantHappyHours: 'happy_hour',
  RestaurantSpecials: 'specials',
  RestaurantEvents: 'events',
  RestaurantMenu: 'menu',
  StPatricksDay: 'holiday_specials',
};

async function getVisitorId(): Promise<string> {
  try {
    const { data } = await getSupabase().auth.getUser();
    return data?.user?.id || 'anonymous';
  } catch {
    return 'anonymous';
  }
}

/**
 * Track a screen view. Fire-and-forget — call without await.
 */
export function trackScreenView(screenName: string, restaurantId?: string) {
  (async () => {
    try {
      const supabase = getSupabase();
      const brand = getBrand();
      const visitorId = await getVisitorId();
      const pageType = PAGE_TYPE_MAP[screenName] || 'other';
      const pagePath = restaurantId
        ? `/mobile/${screenName.toLowerCase()}/${restaurantId}`
        : `/mobile/${screenName.toLowerCase()}`;

      await supabase.from('analytics_page_views').insert({
        page_type: pageType,
        page_path: pagePath,
        restaurant_id: restaurantId || null,
        visitor_id: visitorId,
        session_id: SESSION_ID,
        market_id: analyticsMarketId,
        user_agent: `${brand.userAgent}/${Platform.OS}`,
      });
    } catch {
      // Silently fail — don't break the app for analytics
    }
  })();
}

/**
 * Track a user interaction click. Fire-and-forget — call without await.
 */
export function trackClick(clickType: string, restaurantId?: string) {
  (async () => {
    try {
      const supabase = getSupabase();
      const visitorId = await getVisitorId();

      await supabase.from('analytics_clicks').insert({
        click_type: clickType,
        restaurant_id: restaurantId || null,
        visitor_id: visitorId,
      });
    } catch {
      // Silently fail — don't break the app for analytics
    }
  })();
}
