import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getSupabase } from '../config/theme';
import { useAuth } from './useAuth';
import { useMarket } from '../context/MarketContext';
import type { Badge, UserBadge, BadgeAwardContext } from '../types/retention';

interface UserBadgesResult {
  allBadges: Badge[];
  earnedBadgeIds: Set<string>;
  userBadges: UserBadge[];
}

async function fetchUserBadges(
  userId: string,
  marketId: string,
  supabase: ReturnType<typeof getSupabase>
): Promise<UserBadgesResult> {
  const [badgesRes, userBadgesRes] = await Promise.all([
    supabase
      .from('badges')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true }),
    supabase
      .from('user_badges')
      .select('*, badge:badges(*)')
      .eq('user_id', userId)
      .eq('market_id', marketId)
      .order('earned_at', { ascending: false }),
  ]);

  const allBadges: Badge[] = (badgesRes.data || []).map((b: any) => ({
    ...b,
    criteria: typeof b.criteria === 'string' ? JSON.parse(b.criteria) : b.criteria,
  }));

  const userBadges: UserBadge[] = userBadgesRes.data || [];
  const earnedBadgeIds = new Set(userBadges.map((ub) => ub.badge_id));

  return { allBadges, earnedBadgeIds, userBadges };
}

export function useUserBadges() {
  const { userId } = useAuth();
  const { marketId } = useMarket();
  const supabase = getSupabase();

  return useQuery({
    queryKey: ['userBadges', userId, marketId],
    queryFn: () => fetchUserBadges(userId!, marketId!, supabase),
    enabled: !!userId && !!marketId,
    staleTime: 60 * 1000,
  });
}

export function useAwardBadges() {
  const { userId } = useAuth();
  const { marketId } = useMarket();
  const supabase = getSupabase();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (context: BadgeAwardContext): Promise<Badge[]> => {
      if (!userId || !marketId) return [];

      const cached = queryClient.getQueryData<UserBadgesResult>(['userBadges', userId, marketId]);
      const { allBadges, earnedBadgeIds } = cached ?? await fetchUserBadges(userId, marketId, supabase);

      const newlyEarned: Badge[] = [];
      for (const badge of allBadges) {
        if (earnedBadgeIds.has(badge.id)) continue;

        const { type, threshold } = badge.criteria;
        let qualifies = false;

        if (type === 'checkin_count') {
          qualifies = context.currentCheckinCount >= threshold;
        } else if (type === 'unique_restaurants') {
          qualifies = context.uniqueRestaurantCount >= threshold;
        } else if (type === 'happy_hour_checkin') {
          qualifies = context.isDuringHappyHour;
        } else if (type === 'weekend_checkin') {
          qualifies = context.isWeekend;
        }

        if (qualifies) {
          newlyEarned.push(badge);
        }
      }

      if (newlyEarned.length === 0) return [];

      // Bulk insert — ignore duplicates (safe due to UNIQUE constraint)
      await supabase.from('user_badges').insert(
        newlyEarned.map((b) => ({
          user_id: userId,
          badge_id: b.id,
          market_id: marketId,
        }))
      );

      return newlyEarned;
    },
    onSuccess: () => {
      if (userId && marketId) {
        queryClient.invalidateQueries({ queryKey: ['userBadges', userId, marketId] });
      }
    },
  });
}
