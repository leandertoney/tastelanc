import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getSupabase } from '../config/theme';
import { useAuth } from './useAuth';
import { useMarket } from '../context/MarketContext';
import type { ChallengeWithProgress, UserChallengeProgress } from '../types/retention';

export function getCurrentWeekStart(): string {
  const d = new Date();
  const day = d.getDay(); // 0=Sun, 1=Mon...
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(d);
  monday.setDate(d.getDate() + diff);
  return monday.toISOString().split('T')[0];
}

export function useChallenges() {
  const { userId } = useAuth();
  const { marketId } = useMarket();
  const supabase = getSupabase();
  const weekStart = getCurrentWeekStart();

  return useQuery({
    queryKey: ['challenges', userId, marketId, weekStart],
    queryFn: async (): Promise<ChallengeWithProgress[]> => {
      if (!userId || !marketId) return [];

      // Fetch active challenges for this market (or global)
      const { data: challenges } = await supabase
        .from('challenges')
        .select('*, sponsor_restaurant:restaurants(id, name)')
        .eq('is_active', true)
        .or(`market_id.eq.${marketId},market_id.is.null`);

      if (!challenges || challenges.length === 0) return [];

      const challengeIds = challenges.map((c: any) => c.id);

      // Fetch user progress: weekly rows for this week + non-weekly rows
      const { data: progressRows } = await supabase
        .from('user_challenge_progress')
        .select('*')
        .eq('user_id', userId)
        .in('challenge_id', challengeIds);

      const progressMap = new Map<string, UserChallengeProgress>();
      for (const row of progressRows || []) {
        // Weekly: key by challenge_id + week_start; non-weekly: key by challenge_id only
        const key = row.week_start ? `${row.challenge_id}:${row.week_start}` : row.challenge_id;
        progressMap.set(key, row as UserChallengeProgress);
      }

      return challenges.map((c: any) => {
        const key = c.resets_weekly ? `${c.id}:${weekStart}` : c.id;
        return {
          ...c,
          progress: progressMap.get(key) ?? null,
        } as ChallengeWithProgress;
      });
    },
    enabled: !!userId && !!marketId,
    staleTime: 5 * 60 * 1000,
  });
}

interface UpdateProgressInput {
  challengeId: string;
  targetCount: number;
  resetsWeekly: boolean;
}

export function useUpdateChallengeProgress() {
  const { userId } = useAuth();
  const { marketId } = useMarket();
  const supabase = getSupabase();
  const queryClient = useQueryClient();
  const weekStart = getCurrentWeekStart();

  return useMutation({
    mutationFn: async ({ challengeId, targetCount, resetsWeekly }: UpdateProgressInput) => {
      if (!userId) return;

      const weekStartVal = resetsWeekly ? weekStart : null;

      // Fetch current progress
      let existingQuery = supabase
        .from('user_challenge_progress')
        .select('*')
        .eq('user_id', userId)
        .eq('challenge_id', challengeId);

      if (weekStartVal) {
        existingQuery = existingQuery.eq('week_start', weekStartVal);
      } else {
        existingQuery = existingQuery.is('week_start', null);
      }

      const { data: existing } = await existingQuery.maybeSingle();

      const currentCount: number = existing?.progress_count ?? 0;
      const newCount = currentCount + 1;
      const completedAt = newCount >= targetCount && !existing?.completed_at
        ? new Date().toISOString()
        : (existing?.completed_at ?? null);

      if (existing) {
        await supabase
          .from('user_challenge_progress')
          .update({ progress_count: newCount, completed_at: completedAt, updated_at: new Date().toISOString() })
          .eq('id', existing.id);
      } else {
        await supabase
          .from('user_challenge_progress')
          .insert({
            user_id: userId,
            challenge_id: challengeId,
            progress_count: newCount,
            completed_at: completedAt,
            week_start: weekStartVal,
          });
      }
    },
    onSuccess: () => {
      if (userId && marketId) {
        queryClient.invalidateQueries({ queryKey: ['challenges', userId, marketId] });
      }
    },
  });
}
