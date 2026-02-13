import { NextResponse } from 'next/server';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { verifyRestaurantAccess } from '@/lib/auth/restaurant-access';

interface ContentMetrics {
  menuItemCount: number;
  happyHourCount: number;
  activeSpecialsCount: number;
  upcomingEventsCount: number;
  photoCount: number;
  hasDescription: boolean;
  rating: number | null;
}

interface Recommendation {
  priority: 'high' | 'medium' | 'low';
  message: string;
  action: string;
  actionLabel: string;
}

interface TrendingRestaurant {
  name: string;
  badge: 'trending' | 'rising' | 'most_favorited';
  badgeLabel: string;
}

// Visibility score weights
const WEIGHTS = {
  views: 0.30,
  ctr: 0.15,
  favorites: 0.15,
  rating: 0.15,
  contentCompleteness: 0.20,
  freshness: 0.05,
};

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const restaurantId = searchParams.get('restaurant_id');

    if (!restaurantId) {
      return NextResponse.json({ error: 'restaurant_id required' }, { status: 400 });
    }

    const supabase = await createClient();
    const accessResult = await verifyRestaurantAccess(supabase, restaurantId);

    if (!accessResult.canAccess) {
      return NextResponse.json(
        { error: accessResult.error || 'Access denied' },
        { status: accessResult.userId ? 403 : 401 }
      );
    }

    const serviceClient = createServiceRoleClient();
    const restaurant = accessResult.restaurant!;

    // Need at least one category to find competitive set
    const primaryCategory = restaurant.categories?.[0];
    const city = restaurant.city;

    if (!primaryCategory || !city) {
      return NextResponse.json({
        visibilityScore: 0,
        percentile: 0,
        comparisonText: 'Complete your profile with a category and city to see Market Insights.',
        competitiveSet: { category: '', city: '', totalCount: 0 },
        benchmarks: null,
        trending: [],
        recommendations: [{
          priority: 'high' as const,
          message: 'Add your restaurant category and city to unlock Market Insights and see how you compare.',
          action: '/dashboard/profile',
          actionLabel: 'Complete Profile',
        }],
      });
    }

    // Date ranges
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const fourWeeksAgo = new Date(now.getTime() - 28 * 24 * 60 * 60 * 1000);
    const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    // --- Query 1: Get competitive set with content scores ---
    const { data: competitiveSetRaw } = await serviceClient
      .from('restaurant_content_scores')
      .select('*')
      .eq('city', city)
      .overlaps('categories', [primaryCategory]);

    const competitiveSet = competitiveSetRaw || [];

    if (competitiveSet.length < 2) {
      // Not enough data for meaningful comparison
      const you = competitiveSet.find(r => r.restaurant_id === restaurantId);
      return NextResponse.json({
        visibilityScore: you ? 50 : 0,
        percentile: 50,
        comparisonText: `Not enough ${primaryCategory} restaurants in ${city} for comparison yet.`,
        competitiveSet: { category: primaryCategory, city, totalCount: competitiveSet.length },
        benchmarks: you ? {
          you: buildContentMetrics(you),
          topTenAvg: buildContentMetrics(you),
        } : null,
        trending: [],
        recommendations: [],
      });
    }

    const competitiveSetIds = competitiveSet.map(r => r.restaurant_id);

    // --- Queries 2-5: Engagement metrics (in parallel) ---
    const [
      viewsResult,
      favoritesResult,
      impressionsResult,
      clicksResult,
      // Trending: this week impressions
      thisWeekImpressionsResult,
      // Trending: last 4 weeks impressions (for avg)
      fourWeekImpressionsResult,
      // Trending: this week views
      thisWeekViewsResult,
      // Trending: last week views
      lastWeekViewsResult,
      // Trending: this week favorites
      thisWeekFavsResult,
    ] = await Promise.all([
      // 30-day page views per restaurant
      serviceClient
        .from('analytics_page_views')
        .select('restaurant_id')
        .in('restaurant_id', competitiveSetIds)
        .gte('viewed_at', thirtyDaysAgo.toISOString()),

      // Favorites per restaurant (all time)
      serviceClient
        .from('favorites')
        .select('restaurant_id')
        .in('restaurant_id', competitiveSetIds),

      // 30-day impressions per restaurant
      serviceClient
        .from('section_impressions')
        .select('restaurant_id')
        .in('restaurant_id', competitiveSetIds)
        .gte('impressed_at', thirtyDaysAgo.toISOString()),

      // 30-day clicks per restaurant
      serviceClient
        .from('analytics_clicks')
        .select('restaurant_id')
        .in('restaurant_id', competitiveSetIds)
        .gte('clicked_at', thirtyDaysAgo.toISOString()),

      // Trending: this week impressions
      serviceClient
        .from('section_impressions')
        .select('restaurant_id')
        .in('restaurant_id', competitiveSetIds)
        .gte('impressed_at', sevenDaysAgo.toISOString()),

      // Trending: last 4 weeks impressions
      serviceClient
        .from('section_impressions')
        .select('restaurant_id')
        .in('restaurant_id', competitiveSetIds)
        .gte('impressed_at', fourWeeksAgo.toISOString())
        .lt('impressed_at', sevenDaysAgo.toISOString()),

      // Trending: this week views
      serviceClient
        .from('analytics_page_views')
        .select('restaurant_id')
        .in('restaurant_id', competitiveSetIds)
        .gte('viewed_at', sevenDaysAgo.toISOString()),

      // Trending: last week views
      serviceClient
        .from('analytics_page_views')
        .select('restaurant_id')
        .in('restaurant_id', competitiveSetIds)
        .gte('viewed_at', twoWeeksAgo.toISOString())
        .lt('viewed_at', sevenDaysAgo.toISOString()),

      // Trending: this week favorites gained
      serviceClient
        .from('favorites')
        .select('restaurant_id')
        .in('restaurant_id', competitiveSetIds)
        .gte('created_at', sevenDaysAgo.toISOString()),
    ]);

    // --- Group counts by restaurant_id ---
    const viewCounts = groupCount(viewsResult.data || []);
    const favCounts = groupCount(favoritesResult.data || []);
    const impressionCounts = groupCount(impressionsResult.data || []);
    const clickCounts = groupCount(clicksResult.data || []);

    // --- Compute visibility score for each restaurant ---
    interface RestaurantScore {
      id: string;
      views: number;
      ctr: number;
      favorites: number;
      rating: number;
      contentCompleteness: number;
      freshness: number;
      compositeScore: number;
    }

    const scores: RestaurantScore[] = competitiveSet.map(r => {
      const views = viewCounts[r.restaurant_id] || 0;
      const impressions = impressionCounts[r.restaurant_id] || 0;
      const clicks = clickCounts[r.restaurant_id] || 0;
      const ctr = impressions > 0 ? clicks / impressions : 0;
      const favorites = favCounts[r.restaurant_id] || 0;
      const rating = r.average_rating || 0;

      // Content completeness: 6 factors, each worth ~16.7 points
      const contentFactors = [
        r.menu_item_count > 0,
        r.happy_hour_count > 0,
        r.active_specials_count > 0,
        r.upcoming_events_count > 0,
        r.photo_count > 0,
        !!(r.description && r.description.length > 10),
      ];
      const contentCompleteness = contentFactors.filter(Boolean).length / contentFactors.length;

      // Freshness: days since last content update (lower is better)
      const lastUpdate = new Date(r.last_content_update || '1970-01-01');
      const daysSinceUpdate = Math.max(0, (now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24));
      // Score: 1.0 if updated today, decays to 0 over 90 days
      const freshness = Math.max(0, 1 - (daysSinceUpdate / 90));

      return {
        id: r.restaurant_id,
        views,
        ctr,
        favorites,
        rating,
        contentCompleteness,
        freshness,
        compositeScore: 0, // Will be computed after percentile normalization
      };
    });

    // --- Percentile normalization ---
    // For each factor, rank restaurants and assign percentile scores (0-100)
    const factors: (keyof Omit<RestaurantScore, 'id' | 'compositeScore'>)[] = [
      'views', 'ctr', 'favorites', 'rating', 'contentCompleteness', 'freshness',
    ];
    const weightMap: Record<string, number> = {
      views: WEIGHTS.views,
      ctr: WEIGHTS.ctr,
      favorites: WEIGHTS.favorites,
      rating: WEIGHTS.rating,
      contentCompleteness: WEIGHTS.contentCompleteness,
      freshness: WEIGHTS.freshness,
    };

    // Compute percentile for each factor
    const percentileScores: Record<string, Record<string, number>> = {};
    for (const factor of factors) {
      const sorted = [...scores].sort((a, b) => a[factor] - b[factor]);
      for (let i = 0; i < sorted.length; i++) {
        if (!percentileScores[sorted[i].id]) percentileScores[sorted[i].id] = {};
        // Percentile: what % of restaurants you're better than
        percentileScores[sorted[i].id][factor] = (i / Math.max(sorted.length - 1, 1)) * 100;
      }
    }

    // Compute composite score
    for (const score of scores) {
      const pScores = percentileScores[score.id];
      score.compositeScore = factors.reduce((sum, factor) => {
        return sum + (pScores[factor] || 0) * weightMap[factor];
      }, 0);
    }

    // Sort by composite score descending
    scores.sort((a, b) => b.compositeScore - a.compositeScore);

    // --- Find current restaurant's position ---
    const myScore = scores.find(s => s.id === restaurantId);
    const myRankIndex = scores.findIndex(s => s.id === restaurantId);
    const totalCount = scores.length;

    // If restaurant not found in competitive set (e.g., inactive), return gracefully
    if (myRankIndex === -1) {
      return NextResponse.json({
        visibilityScore: 0,
        percentile: 0,
        comparisonText: `Your restaurant isn't appearing in the competitive set yet. Make sure your listing is active.`,
        competitiveSet: { category: primaryCategory, city, totalCount },
        benchmarks: null,
        trending: [],
        recommendations: [{
          priority: 'high' as const,
          message: 'Ensure your restaurant listing is active to appear in Market Insights.',
          action: '/dashboard/profile',
          actionLabel: 'Check Profile',
        }],
      });
    }

    // Percentile: what % of restaurants you're performing better than
    const percentile = totalCount > 1
      ? Math.round(((totalCount - 1 - myRankIndex) / (totalCount - 1)) * 100)
      : 50;

    const visibilityScore = Math.round(myScore?.compositeScore || 0);

    const comparisonText = percentile >= 50
      ? `Performing better than ${percentile}% of ${primaryCategory} in ${city}`
      : `Top ${100 - percentile}% of ${primaryCategory} in ${city} — room to grow`;

    // --- Content benchmarks ---
    const myContent = competitiveSet.find(r => r.restaurant_id === restaurantId);
    const top10 = scores.slice(0, Math.min(10, scores.length));
    const top10Restaurants = top10.map(s => competitiveSet.find(r => r.restaurant_id === s.id)!).filter(Boolean);

    const youMetrics: ContentMetrics = myContent
      ? buildContentMetrics(myContent)
      : { menuItemCount: 0, happyHourCount: 0, activeSpecialsCount: 0, upcomingEventsCount: 0, photoCount: 0, hasDescription: false, rating: null };

    const topTenAvg = {
      menuItemCount: avg(top10Restaurants.map(r => r.menu_item_count)),
      happyHourCount: avg(top10Restaurants.map(r => r.happy_hour_count)),
      activeSpecialsCount: avg(top10Restaurants.map(r => r.active_specials_count)),
      upcomingEventsCount: avg(top10Restaurants.map(r => r.upcoming_events_count)),
      photoCount: avg(top10Restaurants.map(r => r.photo_count)),
      descriptionRate: top10Restaurants.filter(r => r.description && r.description.length > 10).length / Math.max(top10Restaurants.length, 1),
      rating: avg(top10Restaurants.map(r => r.average_rating).filter(Boolean)),
    };

    // --- Trending detection ---
    const thisWeekImpCounts = groupCount(thisWeekImpressionsResult.data || []);
    const fourWeekImpCounts = groupCount(fourWeekImpressionsResult.data || []);
    const thisWeekViewCounts = groupCount(thisWeekViewsResult.data || []);
    const lastWeekViewCounts = groupCount(lastWeekViewsResult.data || []);
    const thisWeekFavsCounts = groupCount(thisWeekFavsResult.data || []);

    const trending: TrendingRestaurant[] = [];
    const usedIds = new Set<string>();

    // Most Favorited This Week (pick top 1)
    const favEntries = Object.entries(thisWeekFavsCounts)
      .filter(([id]) => id !== restaurantId)
      .sort((a, b) => b[1] - a[1]);
    if (favEntries.length > 0 && favEntries[0][1] > 0) {
      const [id] = favEntries[0];
      const name = competitiveSet.find(r => r.restaurant_id === id)?.name;
      if (name) {
        trending.push({ name, badge: 'most_favorited', badgeLabel: 'Most Favorited This Week' });
        usedIds.add(id);
      }
    }

    // Trending: impressions this week > 1.5x their 4-week weekly average
    for (const r of competitiveSet) {
      if (usedIds.has(r.restaurant_id) || r.restaurant_id === restaurantId) continue;
      const thisWeek = thisWeekImpCounts[r.restaurant_id] || 0;
      const fourWeekTotal = fourWeekImpCounts[r.restaurant_id] || 0;
      const weeklyAvg = fourWeekTotal / 3; // 3 weeks (4 weeks minus current week)
      if (thisWeek > 0 && weeklyAvg > 0 && thisWeek > weeklyAvg * 1.5) {
        const name = r.name;
        trending.push({ name, badge: 'trending', badgeLabel: 'Trending' });
        usedIds.add(r.restaurant_id);
        if (trending.length >= 5) break;
      }
    }

    // Rising: week-over-week views increased > 50%
    if (trending.length < 5) {
      for (const r of competitiveSet) {
        if (usedIds.has(r.restaurant_id) || r.restaurant_id === restaurantId) continue;
        const thisWeek = thisWeekViewCounts[r.restaurant_id] || 0;
        const lastWeek = lastWeekViewCounts[r.restaurant_id] || 0;
        if (thisWeek > 0 && lastWeek > 0 && thisWeek > lastWeek * 1.5) {
          trending.push({ name: r.name, badge: 'rising', badgeLabel: 'Rising' });
          usedIds.add(r.restaurant_id);
          if (trending.length >= 5) break;
        }
      }
    }

    // --- Recommendations ---
    const recommendations: Recommendation[] = [];

    const gaps: Array<{
      metric: string;
      yours: number;
      topAvg: number;
      gapRatio: number;
      action: string;
      actionLabel: string;
      messageTemplate: (yours: number, topAvg: number) => string;
    }> = [
      {
        metric: 'happyHours',
        yours: youMetrics.happyHourCount,
        topAvg: topTenAvg.happyHourCount,
        gapRatio: 0,
        action: '/dashboard/happy-hours',
        actionLabel: 'Add Happy Hours',
        messageTemplate: (y, t) =>
          `Top performers average ${Math.round(t)} happy hours. You have ${y}. Adding more could increase your visibility in the Happy Hour section.`,
      },
      {
        metric: 'events',
        yours: youMetrics.upcomingEventsCount,
        topAvg: topTenAvg.upcomingEventsCount,
        gapRatio: 0,
        action: '/dashboard/events',
        actionLabel: 'Add Events',
        messageTemplate: (y, t) =>
          `Top performers average ${Math.round(t)} upcoming events. You have ${y}. Events help you appear in the Entertainment section.`,
      },
      {
        metric: 'specials',
        yours: youMetrics.activeSpecialsCount,
        topAvg: topTenAvg.activeSpecialsCount,
        gapRatio: 0,
        action: '/dashboard/specials',
        actionLabel: 'Add Specials',
        messageTemplate: (y, t) =>
          `Top performers average ${Math.round(t)} active specials. You have ${y}. Specials drive repeat visits.`,
      },
      {
        metric: 'photos',
        yours: youMetrics.photoCount,
        topAvg: topTenAvg.photoCount,
        gapRatio: 0,
        action: '/dashboard/profile',
        actionLabel: 'Upload Photos',
        messageTemplate: (y, t) =>
          `Your photo count (${y}) is below the top performer average (${Math.round(t)}). More photos help your listing stand out.`,
      },
      {
        metric: 'menuItems',
        yours: youMetrics.menuItemCount,
        topAvg: topTenAvg.menuItemCount,
        gapRatio: 0,
        action: '/dashboard/menu',
        actionLabel: 'Update Menu',
        messageTemplate: (y, t) =>
          `Top performers average ${Math.round(t)} menu items. You have ${y}. A complete menu builds trust with diners.`,
      },
    ];

    // Add description recommendation if missing
    if (!youMetrics.hasDescription && topTenAvg.descriptionRate > 0.5) {
      recommendations.push({
        priority: 'high',
        message: `${Math.round(topTenAvg.descriptionRate * 100)}% of top performers have a description. Adding one helps users discover what makes you unique.`,
        action: '/dashboard/profile',
        actionLabel: 'Add Description',
      });
    }

    // Calculate gap ratios and generate recommendations
    for (const gap of gaps) {
      if (gap.topAvg <= 0) continue;
      gap.gapRatio = Math.max(0, (gap.topAvg - gap.yours) / gap.topAvg);
      if (gap.gapRatio <= 0) continue;

      const priority: Recommendation['priority'] =
        gap.gapRatio > 0.6 ? 'high' : gap.gapRatio > 0.3 ? 'medium' : 'low';

      recommendations.push({
        priority,
        message: gap.messageTemplate(gap.yours, gap.topAvg),
        action: gap.action,
        actionLabel: gap.actionLabel,
      });
    }

    // Sort by priority (high first)
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    recommendations.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

    return NextResponse.json({
      visibilityScore,
      percentile,
      comparisonText,
      competitiveSet: {
        category: primaryCategory,
        city,
        totalCount,
      },
      benchmarks: {
        you: youMetrics,
        topTenAvg,
      },
      trending,
      recommendations,
    });
  } catch (error) {
    console.error('Error fetching market insights:', error);
    return NextResponse.json(
      { error: 'Failed to fetch market insights' },
      { status: 500 }
    );
  }
}

// --- Helper functions ---

function groupCount(rows: Array<{ restaurant_id: string }>): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const row of rows) {
    counts[row.restaurant_id] = (counts[row.restaurant_id] || 0) + 1;
  }
  return counts;
}

function avg(values: number[]): number {
  if (values.length === 0) return 0;
  return Math.round((values.reduce((s, v) => s + v, 0) / values.length) * 10) / 10;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildContentMetrics(r: any): ContentMetrics {
  return {
    menuItemCount: r.menu_item_count || 0,
    happyHourCount: r.happy_hour_count || 0,
    activeSpecialsCount: r.active_specials_count || 0,
    upcomingEventsCount: r.upcoming_events_count || 0,
    photoCount: r.photo_count || 0,
    hasDescription: !!(r.description && r.description.length > 10),
    rating: r.average_rating || null,
  };
}
