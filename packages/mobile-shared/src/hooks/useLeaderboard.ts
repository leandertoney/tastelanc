import { useQuery } from '@tanstack/react-query';
import { getSupabase } from '../config/theme';
import { useAuth } from './useAuth';
import { useMarket } from '../context/MarketContext';
import type { LeaderboardEntry } from '../types/retention';

function getWeekBounds(): { start: string; end: string } {
  const now = new Date();
  const day = now.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;

  const monday = new Date(now);
  monday.setDate(now.getDate() + diffToMonday);
  monday.setHours(0, 0, 0, 0);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);

  return {
    start: monday.toISOString(),
    end: sunday.toISOString(),
  };
}

export function useLeaderboard() {
  const { userId } = useAuth();
  const { marketId } = useMarket();
  const supabase = getSupabase();

  return useQuery({
    queryKey: ['leaderboard', marketId],
    queryFn: async (): Promise<{ top10: LeaderboardEntry[]; currentUserEntry: LeaderboardEntry | null }> => {
      if (!marketId) return { top10: [], currentUserEntry: null };

      const { start, end } = getWeekBounds();

      // Fetch all checkins for the week, market-scoped via restaurants!inner join
      const { data: checkins } = await supabase
        .from('checkins')
        .select('user_id, restaurant_id, restaurants!inner(market_id)')
        .eq('restaurants.market_id', marketId)
        .gte('created_at', start)
        .lte('created_at', end)
        .limit(500);

      if (!checkins || checkins.length === 0) {
        return { top10: [], currentUserEntry: null };
      }

      // Aggregate client-side
      const userMap = new Map<string, { count: number; uniqueRestaurants: Set<string> }>();
      for (const row of checkins) {
        const uid = (row as any).user_id;
        if (!userMap.has(uid)) {
          userMap.set(uid, { count: 0, uniqueRestaurants: new Set() });
        }
        const entry = userMap.get(uid)!;
        entry.count++;
        entry.uniqueRestaurants.add((row as any).restaurant_id);
      }

      // Sort by check-in count descending
      const sorted = [...userMap.entries()].sort((a, b) => b[1].count - a[1].count);

      // Fetch display names for top 15
      const top15Ids = sorted.slice(0, 15).map(([id]) => id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, display_name')
        .in('id', top15Ids);

      const nameMap = new Map<string, string | null>(
        (profiles || []).map((p: any) => [p.id, p.display_name])
      );

      const entries: LeaderboardEntry[] = sorted.slice(0, 15).map(([uid, stats], idx) => ({
        rank: idx + 1,
        user_id: uid,
        display_name: nameMap.get(uid) ?? null,
        checkin_count: stats.count,
        unique_restaurants: stats.uniqueRestaurants.size,
        is_current_user: uid === userId,
      }));

      const top10 = entries.slice(0, 10);

      // Find current user entry (may be outside top 10)
      const currentUserEntry = entries.find((e) => e.is_current_user) ?? null;

      // If current user is not in top 15, still show their rank
      if (!currentUserEntry && userId && userMap.has(userId)) {
        const userStats = userMap.get(userId)!;
        const rank = sorted.findIndex(([id]) => id === userId) + 1;
        const { data: myProfile } = await supabase
          .from('profiles')
          .select('display_name')
          .eq('id', userId)
          .single();

        return {
          top10,
          currentUserEntry: {
            rank,
            user_id: userId,
            display_name: myProfile?.display_name ?? null,
            checkin_count: userStats.count,
            unique_restaurants: userStats.uniqueRestaurants.size,
            is_current_user: true,
          },
        };
      }

      return { top10, currentUserEntry: currentUserEntry ?? null };
    },
    enabled: !!marketId,
    staleTime: 5 * 60 * 1000,
  });
}
