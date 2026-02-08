import { Platform } from 'react-native';
import { supabase } from './supabase';

const PAGE_TYPE_MAP: Record<string, string> = {
  RestaurantDetail: 'restaurant',
  EventDetail: 'events',
  Home: 'home',
  Search: 'other',
  Favorites: 'other',
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
};

async function getVisitorId(): Promise<string> {
  try {
    const { data } = await supabase.auth.getUser();
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
        user_agent: `TasteLanc-Mobile/${Platform.OS}`,
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
