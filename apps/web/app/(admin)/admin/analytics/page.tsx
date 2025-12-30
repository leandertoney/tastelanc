import { createClient } from '@/lib/supabase/server';
import { Card } from '@/components/ui';
import { Eye, MousePointer, TrendingUp, Calendar } from 'lucide-react';

async function getAnalytics() {
  const supabase = await createClient();

  // Date ranges
  const now = new Date();
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);

  // Page views - 30 days
  const { count: pageViews30d } = await supabase
    .from('analytics_page_views')
    .select('*', { count: 'exact', head: true })
    .gte('viewed_at', thirtyDaysAgo.toISOString());

  // Page views - 7 days
  const { count: pageViews7d } = await supabase
    .from('analytics_page_views')
    .select('*', { count: 'exact', head: true })
    .gte('viewed_at', sevenDaysAgo.toISOString());

  // Page views - today
  const { count: pageViewsToday } = await supabase
    .from('analytics_page_views')
    .select('*', { count: 'exact', head: true })
    .gte('viewed_at', yesterday.toISOString());

  // Clicks - 30 days
  const { count: clicks30d } = await supabase
    .from('analytics_clicks')
    .select('*', { count: 'exact', head: true })
    .gte('clicked_at', thirtyDaysAgo.toISOString());

  // Top restaurants by views
  const { data: topRestaurants } = await supabase
    .from('analytics_page_views')
    .select('restaurant_id, restaurants(name, slug)')
    .gte('viewed_at', thirtyDaysAgo.toISOString());

  // Count views per restaurant
  const restaurantViews: Record<string, { name: string; slug: string; count: number }> = {};
  topRestaurants?.forEach((view) => {
    const restaurant = Array.isArray(view.restaurants)
      ? view.restaurants[0]
      : view.restaurants;

    if (restaurant && view.restaurant_id) {
      if (!restaurantViews[view.restaurant_id]) {
        restaurantViews[view.restaurant_id] = {
          name: restaurant.name,
          slug: restaurant.slug,
          count: 0,
        };
      }
      restaurantViews[view.restaurant_id].count++;
    }
  });

  const topRestaurantsList = Object.values(restaurantViews)
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // Views by page type
  const { data: viewsByType } = await supabase
    .from('analytics_page_views')
    .select('page_type')
    .gte('viewed_at', thirtyDaysAgo.toISOString());

  const pageTypeStats: Record<string, number> = {};
  viewsByType?.forEach((view: { page_type: string }) => {
    pageTypeStats[view.page_type] = (pageTypeStats[view.page_type] || 0) + 1;
  });

  // Clicks by type
  const { data: clicksByType } = await supabase
    .from('analytics_clicks')
    .select('click_type')
    .gte('clicked_at', thirtyDaysAgo.toISOString());

  const clickTypeStats: Record<string, number> = {};
  clicksByType?.forEach((click: { click_type: string }) => {
    clickTypeStats[click.click_type] = (clickTypeStats[click.click_type] || 0) + 1;
  });

  return {
    pageViews30d: pageViews30d || 0,
    pageViews7d: pageViews7d || 0,
    pageViewsToday: pageViewsToday || 0,
    clicks30d: clicks30d || 0,
    topRestaurants: topRestaurantsList,
    pageTypeStats,
    clickTypeStats,
  };
}

export default async function AdminAnalyticsPage() {
  const analytics = await getAnalytics();

  return (
    <div>
      <div className="mb-6 md:mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-white">Platform Analytics</h1>
        <p className="text-gray-400 mt-1 text-sm md:text-base">Master view of all platform activity</p>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6 mb-6 md:mb-8">
        <Card className="p-4 md:p-6">
          <div className="flex items-center gap-2 md:gap-3 mb-3 md:mb-4">
            <div className="w-8 h-8 md:w-10 md:h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
              <Eye className="w-4 h-4 md:w-5 md:h-5 text-blue-500" />
            </div>
            <span className="text-gray-400 text-xs md:text-sm">Today</span>
          </div>
          <p className="text-xl md:text-3xl font-bold text-white">{analytics.pageViewsToday.toLocaleString()}</p>
          <p className="text-gray-500 text-xs md:text-sm">page views</p>
        </Card>

        <Card className="p-4 md:p-6">
          <div className="flex items-center gap-2 md:gap-3 mb-3 md:mb-4">
            <div className="w-8 h-8 md:w-10 md:h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-4 h-4 md:w-5 md:h-5 text-green-500" />
            </div>
            <span className="text-gray-400 text-xs md:text-sm">7 days</span>
          </div>
          <p className="text-xl md:text-3xl font-bold text-white">{analytics.pageViews7d.toLocaleString()}</p>
          <p className="text-gray-500 text-xs md:text-sm">page views</p>
        </Card>

        <Card className="p-4 md:p-6">
          <div className="flex items-center gap-2 md:gap-3 mb-3 md:mb-4">
            <div className="w-8 h-8 md:w-10 md:h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
              <Calendar className="w-4 h-4 md:w-5 md:h-5 text-purple-500" />
            </div>
            <span className="text-gray-400 text-xs md:text-sm">30 days</span>
          </div>
          <p className="text-xl md:text-3xl font-bold text-white">{analytics.pageViews30d.toLocaleString()}</p>
          <p className="text-gray-500 text-xs md:text-sm">page views</p>
        </Card>

        <Card className="p-4 md:p-6">
          <div className="flex items-center gap-2 md:gap-3 mb-3 md:mb-4">
            <div className="w-8 h-8 md:w-10 md:h-10 bg-tastelanc-accent/20 rounded-lg flex items-center justify-center">
              <MousePointer className="w-4 h-4 md:w-5 md:h-5 text-tastelanc-accent" />
            </div>
            <span className="text-gray-400 text-xs md:text-sm">30 days</span>
          </div>
          <p className="text-xl md:text-3xl font-bold text-white">{analytics.clicks30d.toLocaleString()}</p>
          <p className="text-gray-500 text-xs md:text-sm">total clicks</p>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-4 md:gap-8">
        {/* Top Restaurants */}
        <Card className="p-4 md:p-6">
          <h2 className="text-lg md:text-xl font-semibold text-white mb-4 md:mb-6">Top Restaurants (30d)</h2>
          {analytics.topRestaurants.length === 0 ? (
            <p className="text-gray-500 text-center py-8 text-sm">No data yet</p>
          ) : (
            <div className="space-y-2 md:space-y-3">
              {analytics.topRestaurants.map((restaurant, index) => (
                <div
                  key={restaurant.slug}
                  className="flex items-center justify-between p-2 md:p-3 rounded-lg bg-tastelanc-surface-light/50"
                >
                  <div className="flex items-center gap-2 md:gap-3 min-w-0">
                    <span className="w-5 h-5 md:w-6 md:h-6 bg-tastelanc-surface rounded-full flex items-center justify-center text-xs text-gray-400 flex-shrink-0">
                      {index + 1}
                    </span>
                    <span className="text-white text-sm truncate">{restaurant.name}</span>
                  </div>
                  <span className="text-gray-400 text-xs md:text-sm whitespace-nowrap ml-2">{restaurant.count.toLocaleString()}</span>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Page Type Breakdown */}
        <Card className="p-4 md:p-6">
          <h2 className="text-lg md:text-xl font-semibold text-white mb-4 md:mb-6">Views by Page Type</h2>
          {Object.keys(analytics.pageTypeStats).length === 0 ? (
            <p className="text-gray-500 text-center py-8 text-sm">No data yet</p>
          ) : (
            <div className="space-y-3 md:space-y-4">
              {Object.entries(analytics.pageTypeStats)
                .sort((a, b) => b[1] - a[1])
                .map(([type, count]) => {
                  const percentage = (count / analytics.pageViews30d) * 100;
                  return (
                    <div key={type}>
                      <div className="flex justify-between mb-1">
                        <span className="text-gray-400 capitalize text-sm">{type.replace('_', ' ')}</span>
                        <span className="text-white text-sm">{count.toLocaleString()}</span>
                      </div>
                      <div className="h-2 bg-tastelanc-surface-light rounded-full overflow-hidden">
                        <div
                          className="h-full bg-tastelanc-accent rounded-full"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </Card>

        {/* Click Type Breakdown */}
        <Card className="p-4 md:p-6 lg:col-span-2">
          <h2 className="text-lg md:text-xl font-semibold text-white mb-4 md:mb-6">Clicks by Type (30d)</h2>
          {Object.keys(analytics.clickTypeStats).length === 0 ? (
            <p className="text-gray-500 text-center py-8 text-sm">No click data yet</p>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
              {Object.entries(analytics.clickTypeStats)
                .sort((a, b) => b[1] - a[1])
                .map(([type, count]) => (
                  <div key={type} className="p-3 md:p-4 rounded-lg bg-tastelanc-surface-light/50">
                    <p className="text-xl md:text-2xl font-bold text-white">{count.toLocaleString()}</p>
                    <p className="text-gray-400 text-xs md:text-sm capitalize">{type.replace('_', ' ')}</p>
                  </div>
                ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
