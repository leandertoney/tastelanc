import { createClient } from '@/lib/supabase/server';
import { Card } from '@/components/ui';
import { Eye, MousePointer, TrendingUp, Calendar, Layers, AlertTriangle } from 'lucide-react';

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

  // --- Visibility Fairness Data ---

  // Total impressions (7d)
  const { count: impressions7d } = await supabase
    .from('section_impressions')
    .select('*', { count: 'exact', head: true })
    .gte('impressed_at', sevenDaysAgo.toISOString());

  // Get visibility data from the 7-day view (includes tier, avg position, click count)
  const { data: visibilityData } = await supabase
    .from('restaurant_visibility_7d')
    .select('*');

  // Process visibility by tier
  const tierStats: Record<string, { count: number; totalImpressions: number; totalPosition: number }> = {};
  const restaurantVisibility: Array<{
    name: string;
    tier: string;
    impressions: number;
    avgPosition: number;
    ctr: number;
  }> = [];

  (visibilityData || []).forEach((row: {
    restaurant_name: string;
    tier_name: string;
    total_impressions: number;
    avg_position: number;
    ctr_percent: number;
  }) => {
    const tier = row.tier_name || 'basic';
    if (!tierStats[tier]) {
      tierStats[tier] = { count: 0, totalImpressions: 0, totalPosition: 0 };
    }
    tierStats[tier].count++;
    tierStats[tier].totalImpressions += row.total_impressions;
    tierStats[tier].totalPosition += row.avg_position;

    restaurantVisibility.push({
      name: row.restaurant_name,
      tier,
      impressions: row.total_impressions,
      avgPosition: row.avg_position,
      ctr: row.ctr_percent,
    });
  });

  // Calculate tier averages
  const tierAverages = Object.entries(tierStats).map(([tier, stats]) => ({
    tier,
    restaurants: stats.count,
    avgImpressions: stats.count > 0 ? Math.round(stats.totalImpressions / stats.count) : 0,
    avgPosition: stats.count > 0 ? Math.round((stats.totalPosition / stats.count) * 10) / 10 : 0,
  })).sort((a, b) => {
    const order: Record<string, number> = { elite: 0, premium: 1, basic: 2 };
    return (order[a.tier] ?? 3) - (order[b.tier] ?? 3);
  });

  // Find outliers (>1.5x or <0.5x their tier average)
  const outliers = restaurantVisibility
    .map((r) => {
      const tierAvg = tierAverages.find(t => t.tier === r.tier);
      if (!tierAvg || tierAvg.avgImpressions === 0) return null;
      const ratio = r.impressions / tierAvg.avgImpressions;
      if (ratio > 1.5) return { ...r, ratio, type: 'over-exposed' as const };
      if (ratio < 0.5 && r.impressions > 0) return { ...r, ratio, type: 'under-exposed' as const };
      return null;
    })
    .filter((r): r is NonNullable<typeof r> => r !== null)
    .sort((a, b) => b.ratio - a.ratio);

  // Top visibility restaurants (for sales tool)
  const topByImpressions = restaurantVisibility
    .sort((a, b) => b.impressions - a.impressions)
    .slice(0, 10);

  return {
    pageViews30d: pageViews30d || 0,
    pageViews7d: pageViews7d || 0,
    pageViewsToday: pageViewsToday || 0,
    clicks30d: clicks30d || 0,
    topRestaurants: topRestaurantsList,
    pageTypeStats,
    clickTypeStats,
    impressions7d: impressions7d || 0,
    tierAverages,
    outliers,
    topByImpressions,
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

      {/* Visibility Fairness Section */}
      <div className="mt-6 md:mt-8">
        <div className="mb-4 md:mb-6">
          <h2 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2">
            <Layers className="w-5 h-5 md:w-6 md:h-6" />
            Visibility Fairness (7d)
          </h2>
          <p className="text-gray-400 mt-1 text-sm">Fair rotation metrics for sales conversations and monitoring</p>
        </div>

        {/* Impressions stat */}
        <Card className="p-4 md:p-6 mb-4 md:mb-6">
          <div className="flex items-center gap-2 md:gap-3 mb-3">
            <div className="w-8 h-8 md:w-10 md:h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
              <Layers className="w-4 h-4 md:w-5 md:h-5 text-blue-500" />
            </div>
            <span className="text-gray-400 text-xs md:text-sm">7 days</span>
          </div>
          <p className="text-xl md:text-3xl font-bold text-white">{analytics.impressions7d.toLocaleString()}</p>
          <p className="text-gray-500 text-xs md:text-sm">total section impressions</p>
        </Card>

        <div className="grid lg:grid-cols-2 gap-4 md:gap-8">
          {/* Tier Averages */}
          <Card className="p-4 md:p-6">
            <h3 className="text-lg md:text-xl font-semibold text-white mb-4 md:mb-6">Avg Impressions by Tier</h3>
            {analytics.tierAverages.length === 0 ? (
              <p className="text-gray-500 text-center py-8 text-sm">No impression data yet</p>
            ) : (
              <div className="space-y-3 md:space-y-4">
                {analytics.tierAverages.map((tier) => {
                  const maxAvg = Math.max(...analytics.tierAverages.map(t => t.avgImpressions), 1);
                  const percentage = (tier.avgImpressions / maxAvg) * 100;
                  const tierColors: Record<string, string> = {
                    elite: 'bg-yellow-500',
                    premium: 'bg-blue-500',
                    basic: 'bg-gray-500',
                  };
                  return (
                    <div key={tier.tier}>
                      <div className="flex justify-between mb-1">
                        <span className="text-gray-300 capitalize text-sm">
                          {tier.tier} ({tier.restaurants} restaurants)
                        </span>
                        <span className="text-white text-sm">{tier.avgImpressions.toLocaleString()} avg</span>
                      </div>
                      <div className="h-2 bg-tastelanc-surface-light rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${tierColors[tier.tier] || 'bg-gray-500'}`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <p className="text-gray-500 text-xs mt-1">Avg position: #{tier.avgPosition}</p>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          {/* Outlier Detection */}
          <Card className="p-4 md:p-6">
            <h3 className="text-lg md:text-xl font-semibold text-white mb-4 md:mb-6 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-yellow-500" />
              Visibility Outliers
            </h3>
            {analytics.outliers.length === 0 ? (
              <p className="text-gray-500 text-center py-8 text-sm">
                No outliers detected. All restaurants are within normal visibility ranges.
              </p>
            ) : (
              <div className="space-y-2 md:space-y-3">
                {analytics.outliers.slice(0, 8).map((outlier, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-2 md:p-3 rounded-lg bg-tastelanc-surface-light/50"
                  >
                    <div className="min-w-0">
                      <span className="text-white text-sm truncate block">{outlier.name}</span>
                      <span className="text-gray-500 text-xs capitalize">{outlier.tier}</span>
                    </div>
                    <div className="text-right ml-2">
                      <span className={`text-sm font-medium ${
                        outlier.type === 'over-exposed' ? 'text-yellow-400' : 'text-red-400'
                      }`}>
                        {outlier.type === 'over-exposed' ? '+' : ''}{Math.round((outlier.ratio - 1) * 100)}%
                      </span>
                      <p className="text-gray-500 text-xs">
                        {outlier.impressions.toLocaleString()} imps
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Sales Tool: Top by Impressions */}
          <Card className="p-4 md:p-6 lg:col-span-2">
            <h3 className="text-lg md:text-xl font-semibold text-white mb-4 md:mb-6">Top Restaurants by Visibility (7d)</h3>
            <p className="text-gray-500 text-xs mb-4">Use this data in sales conversations to show the value of paid tiers</p>
            {analytics.topByImpressions.length === 0 ? (
              <p className="text-gray-500 text-center py-8 text-sm">No impression data yet</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-tastelanc-surface-light">
                      <th className="text-left text-gray-400 font-medium py-2 pr-4">#</th>
                      <th className="text-left text-gray-400 font-medium py-2 pr-4">Restaurant</th>
                      <th className="text-left text-gray-400 font-medium py-2 pr-4">Tier</th>
                      <th className="text-right text-gray-400 font-medium py-2 pr-4">Impressions</th>
                      <th className="text-right text-gray-400 font-medium py-2 pr-4">Avg Pos</th>
                      <th className="text-right text-gray-400 font-medium py-2">CTR</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analytics.topByImpressions.map((r, i) => {
                      const tierColors: Record<string, string> = {
                        elite: 'text-yellow-400',
                        premium: 'text-blue-400',
                        basic: 'text-gray-400',
                      };
                      return (
                        <tr key={i} className="border-b border-tastelanc-surface-light/50">
                          <td className="text-gray-500 py-2 pr-4">{i + 1}</td>
                          <td className="text-white py-2 pr-4">{r.name}</td>
                          <td className={`py-2 pr-4 capitalize ${tierColors[r.tier] || 'text-gray-400'}`}>{r.tier}</td>
                          <td className="text-white text-right py-2 pr-4">{r.impressions.toLocaleString()}</td>
                          <td className="text-gray-300 text-right py-2 pr-4">#{r.avgPosition}</td>
                          <td className="text-gray-300 text-right py-2">{r.ctr}%</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
