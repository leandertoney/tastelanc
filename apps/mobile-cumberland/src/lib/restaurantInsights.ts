/**
 * Restaurant Insights Service
 *
 * Provides analytics data for restaurant visit insights dashboard.
 * Optimized with caching and efficient queries for time-series data.
 */

import { supabase } from './supabase';

// Types
export interface VisitMetrics {
  totalVisits: number;
  uniqueVisitors: number;
  repeatVisitors: number;
  repeatRate: number; // percentage
  conversionRate: number; // visitors who became repeat visitors
}

export interface TimeRangeMetrics {
  last7Days: VisitMetrics;
  last30Days: VisitMetrics;
  allTime: VisitMetrics;
}

export interface DailyVisitTrend {
  date: string;
  visits: number;
  uniqueVisitors: number;
}

export interface HourlyDistribution {
  hour: number; // 0-23
  visits: number;
  percentage: number;
}

export interface RepeatVisitorBreakdown {
  oneVisit: number;
  twoToThreeVisits: number;
  fourToSixVisits: number;
  sevenPlusVisits: number;
}

export interface ScoreLiftData {
  baseScore: number;
  visitBoostAvg: number;
  totalLift: number;
  visitorsWithBoost: number;
}

export interface NearbyDensity {
  radiusMeters: number;
  recentVisitors: number; // visitors in area last 24h
  potentialReach: number; // estimated nearby users
  densityLevel: 'low' | 'medium' | 'high';
}

export interface RestaurantInsights {
  restaurantId: string;
  restaurantName: string;
  metrics: TimeRangeMetrics;
  visitTrends: DailyVisitTrend[];
  peakHours: HourlyDistribution[];
  repeatBreakdown: RepeatVisitorBreakdown;
  scoreLift: ScoreLiftData;
  nearbyDensity: NearbyDensity;
  lastUpdated: string;
}

// Cache for insights (5 minute TTL)
const insightsCache = new Map<string, { data: RestaurantInsights; timestamp: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Get cached insights or fetch fresh data
 */
export async function getRestaurantInsights(
  restaurantId: string
): Promise<{ data: RestaurantInsights | null; error: Error | null }> {
  // Check cache first
  const cached = insightsCache.get(restaurantId);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return { data: cached.data, error: null };
  }

  try {
    // Fetch all data in parallel
    const [
      restaurantResult,
      metricsResult,
      trendsResult,
      hourlyResult,
      repeatResult,
      scoreLiftResult,
      densityResult,
    ] = await Promise.all([
      getRestaurantName(restaurantId),
      fetchTimeRangeMetrics(restaurantId),
      fetchVisitTrends(restaurantId, 30),
      fetchHourlyDistribution(restaurantId),
      fetchRepeatBreakdown(restaurantId),
      fetchScoreLift(restaurantId),
      fetchNearbyDensity(restaurantId),
    ]);

    if (!restaurantResult.name) {
      return { data: null, error: new Error('Restaurant not found') };
    }

    const insights: RestaurantInsights = {
      restaurantId,
      restaurantName: restaurantResult.name,
      metrics: metricsResult,
      visitTrends: trendsResult,
      peakHours: hourlyResult,
      repeatBreakdown: repeatResult,
      scoreLift: scoreLiftResult,
      nearbyDensity: densityResult,
      lastUpdated: new Date().toISOString(),
    };

    // Cache the result
    insightsCache.set(restaurantId, { data: insights, timestamp: Date.now() });

    return { data: insights, error: null };
  } catch (error) {
    console.error('[RestaurantInsights] Error fetching insights:', error);
    return { data: null, error: error as Error };
  }
}

/**
 * Clear cached insights for a restaurant
 */
export function invalidateInsightsCache(restaurantId?: string): void {
  if (restaurantId) {
    insightsCache.delete(restaurantId);
  } else {
    insightsCache.clear();
  }
}

// Helper: Get restaurant name
async function getRestaurantName(restaurantId: string): Promise<{ name: string | null }> {
  const { data, error } = await supabase
    .from('restaurants')
    .select('name')
    .eq('id', restaurantId)
    .single();

  if (error) {
    console.error('[RestaurantInsights] Error fetching restaurant:', error);
    return { name: null };
  }

  return { name: data?.name || null };
}

// Helper: Calculate metrics for a time range
async function calculateMetricsForRange(
  restaurantId: string,
  startDate: Date | null
): Promise<VisitMetrics> {
  let query = supabase
    .from('visits')
    .select('user_id, visited_at')
    .eq('restaurant_id', restaurantId);

  if (startDate) {
    query = query.gte('visited_at', startDate.toISOString());
  }

  const { data, error } = await query;

  if (error || !data) {
    return {
      totalVisits: 0,
      uniqueVisitors: 0,
      repeatVisitors: 0,
      repeatRate: 0,
      conversionRate: 0,
    };
  }

  const totalVisits = data.length;
  const visitorCounts = new Map<string, number>();

  data.forEach((visit) => {
    const count = visitorCounts.get(visit.user_id) || 0;
    visitorCounts.set(visit.user_id, count + 1);
  });

  const uniqueVisitors = visitorCounts.size;
  let repeatVisitors = 0;

  visitorCounts.forEach((count) => {
    if (count > 1) repeatVisitors++;
  });

  const repeatRate = uniqueVisitors > 0 ? (repeatVisitors / uniqueVisitors) * 100 : 0;
  const conversionRate = uniqueVisitors > 0 ? (repeatVisitors / uniqueVisitors) * 100 : 0;

  return {
    totalVisits,
    uniqueVisitors,
    repeatVisitors,
    repeatRate: Math.round(repeatRate * 10) / 10,
    conversionRate: Math.round(conversionRate * 10) / 10,
  };
}

// Fetch metrics for all time ranges
async function fetchTimeRangeMetrics(restaurantId: string): Promise<TimeRangeMetrics> {
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [last7Days, last30Days, allTime] = await Promise.all([
    calculateMetricsForRange(restaurantId, sevenDaysAgo),
    calculateMetricsForRange(restaurantId, thirtyDaysAgo),
    calculateMetricsForRange(restaurantId, null),
  ]);

  return { last7Days, last30Days, allTime };
}

// Fetch daily visit trends
async function fetchVisitTrends(
  restaurantId: string,
  days: number
): Promise<DailyVisitTrend[]> {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  startDate.setHours(0, 0, 0, 0);

  const { data, error } = await supabase
    .from('visits')
    .select('user_id, visited_at')
    .eq('restaurant_id', restaurantId)
    .gte('visited_at', startDate.toISOString())
    .order('visited_at', { ascending: true });

  if (error || !data) {
    return [];
  }

  // Group by date
  const dailyData = new Map<string, { visits: number; visitors: Set<string> }>();

  // Initialize all days
  for (let i = 0; i < days; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    const dateStr = date.toISOString().split('T')[0];
    dailyData.set(dateStr, { visits: 0, visitors: new Set() });
  }

  // Populate with actual data
  data.forEach((visit) => {
    const dateStr = visit.visited_at.split('T')[0];
    const dayData = dailyData.get(dateStr);
    if (dayData) {
      dayData.visits++;
      dayData.visitors.add(visit.user_id);
    }
  });

  // Convert to array
  const trends: DailyVisitTrend[] = [];
  dailyData.forEach((value, date) => {
    trends.push({
      date,
      visits: value.visits,
      uniqueVisitors: value.visitors.size,
    });
  });

  return trends.sort((a, b) => a.date.localeCompare(b.date));
}

// Fetch hourly distribution
async function fetchHourlyDistribution(restaurantId: string): Promise<HourlyDistribution[]> {
  // Get last 30 days of data for hourly patterns
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 30);

  const { data, error } = await supabase
    .from('visits')
    .select('visited_at')
    .eq('restaurant_id', restaurantId)
    .gte('visited_at', startDate.toISOString());

  if (error || !data) {
    // Return empty distribution
    return Array.from({ length: 24 }, (_, hour) => ({
      hour,
      visits: 0,
      percentage: 0,
    }));
  }

  // Count visits per hour
  const hourCounts = new Array(24).fill(0);
  let totalVisits = 0;

  data.forEach((visit) => {
    const hour = new Date(visit.visited_at).getHours();
    hourCounts[hour]++;
    totalVisits++;
  });

  // Convert to distribution
  return hourCounts.map((visits, hour) => ({
    hour,
    visits,
    percentage: totalVisits > 0 ? Math.round((visits / totalVisits) * 1000) / 10 : 0,
  }));
}

// Fetch repeat visitor breakdown
async function fetchRepeatBreakdown(restaurantId: string): Promise<RepeatVisitorBreakdown> {
  const { data, error } = await supabase
    .from('visits')
    .select('user_id')
    .eq('restaurant_id', restaurantId);

  if (error || !data) {
    return {
      oneVisit: 0,
      twoToThreeVisits: 0,
      fourToSixVisits: 0,
      sevenPlusVisits: 0,
    };
  }

  // Count visits per user
  const userVisitCounts = new Map<string, number>();
  data.forEach((visit) => {
    const count = userVisitCounts.get(visit.user_id) || 0;
    userVisitCounts.set(visit.user_id, count + 1);
  });

  // Categorize
  let oneVisit = 0;
  let twoToThreeVisits = 0;
  let fourToSixVisits = 0;
  let sevenPlusVisits = 0;

  userVisitCounts.forEach((count) => {
    if (count === 1) oneVisit++;
    else if (count >= 2 && count <= 3) twoToThreeVisits++;
    else if (count >= 4 && count <= 6) fourToSixVisits++;
    else sevenPlusVisits++;
  });

  return { oneVisit, twoToThreeVisits, fourToSixVisits, sevenPlusVisits };
}

// Fetch score lift data
async function fetchScoreLift(restaurantId: string): Promise<ScoreLiftData> {
  // Get restaurant's base tier score
  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('tier')
    .eq('id', restaurantId)
    .single();

  const tierScores: Record<string, number> = {
    starter: 2,
    premium: 4,
    elite: 6,
  };

  const baseScore = tierScores[restaurant?.tier || 'starter'] || 2;

  // Get visit data for score calculation
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const { data: visits } = await supabase
    .from('visits')
    .select('user_id')
    .eq('restaurant_id', restaurantId)
    .gte('visited_at', thirtyDaysAgo.toISOString());

  if (!visits || visits.length === 0) {
    return {
      baseScore,
      visitBoostAvg: 0,
      totalLift: 0,
      visitorsWithBoost: 0,
    };
  }

  // Count visits per user
  const userVisitCounts = new Map<string, number>();
  visits.forEach((visit) => {
    const count = userVisitCounts.get(visit.user_id) || 0;
    userVisitCounts.set(visit.user_id, count + 1);
  });

  // Calculate average boost (5 points per visit, max 20)
  let totalBoost = 0;
  let visitorsWithBoost = 0;

  userVisitCounts.forEach((count) => {
    const boost = Math.min(count * 5, 20);
    totalBoost += boost;
    visitorsWithBoost++;
  });

  const visitBoostAvg = visitorsWithBoost > 0 ? totalBoost / visitorsWithBoost : 0;

  return {
    baseScore,
    visitBoostAvg: Math.round(visitBoostAvg * 10) / 10,
    totalLift: Math.round(visitBoostAvg * 10) / 10,
    visitorsWithBoost,
  };
}

// Fetch nearby customer density
async function fetchNearbyDensity(restaurantId: string): Promise<NearbyDensity> {
  // Get restaurant location
  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('latitude, longitude')
    .eq('id', restaurantId)
    .single();

  if (!restaurant?.latitude || !restaurant?.longitude) {
    return {
      radiusMeters: 500,
      recentVisitors: 0,
      potentialReach: 0,
      densityLevel: 'low',
    };
  }

  // For now, estimate based on total visits in the area
  // In a real implementation, this would use Radar's SDK data
  const oneDayAgo = new Date();
  oneDayAgo.setDate(oneDayAgo.getDate() - 1);

  // Get recent visits to nearby restaurants (within ~500m)
  // This is a simplified approach - real implementation would use PostGIS
  const { data: nearbyVisits } = await supabase
    .from('visits')
    .select('user_id')
    .gte('visited_at', oneDayAgo.toISOString());

  const recentVisitors = new Set(nearbyVisits?.map((v) => v.user_id) || []).size;

  // Estimate potential reach based on historical data
  const potentialReach = Math.round(recentVisitors * 2.5);

  // Determine density level
  let densityLevel: 'low' | 'medium' | 'high' = 'low';
  if (recentVisitors >= 50) densityLevel = 'high';
  else if (recentVisitors >= 20) densityLevel = 'medium';

  return {
    radiusMeters: 500,
    recentVisitors,
    potentialReach,
    densityLevel,
  };
}

/**
 * Get insights for multiple restaurants (for dashboard list view)
 */
export async function getMultipleRestaurantInsights(
  restaurantIds: string[]
): Promise<{ data: RestaurantInsights[]; errors: string[] }> {
  const results: RestaurantInsights[] = [];
  const errors: string[] = [];

  // Fetch in batches of 5 to avoid overwhelming the database
  const batchSize = 5;
  for (let i = 0; i < restaurantIds.length; i += batchSize) {
    const batch = restaurantIds.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map((id) => getRestaurantInsights(id))
    );

    batchResults.forEach(({ data, error }, index) => {
      if (data) {
        results.push(data);
      } else if (error) {
        errors.push(`${batch[index]}: ${error.message}`);
      }
    });
  }

  return { data: results, errors };
}
