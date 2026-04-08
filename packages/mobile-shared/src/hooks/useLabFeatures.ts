import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getSupabase } from '../config/theme';
import { useAuth } from './useAuth';
import type { LabFeature, LabFeatureWithVotes } from '../types/retention';

export const LAB_FEATURES_CATALOG: LabFeature[] = [
  {
    id: 'group-dining',
    title: 'Group Dining Planner',
    description: 'Coordinate a group outing and split the bill at any restaurant.',
    icon_name: 'people',
  },
  {
    id: 'map-view',
    title: 'Map View',
    description: 'Browse restaurants on an interactive map instead of a list.',
    icon_name: 'map',
  },
  {
    id: 'table-reservations',
    title: 'Table Reservations',
    description: 'Reserve a table directly inside the app.',
    icon_name: 'calendar',
  },
  {
    id: 'loyalty-cards',
    title: 'Digital Loyalty Cards',
    description: 'Stamp-card style loyalty tracking at participating restaurants.',
    icon_name: 'card',
  },
];

export function useLabFeatures() {
  const { userId } = useAuth();
  const supabase = getSupabase();

  return useQuery({
    queryKey: ['labFeatures', userId],
    queryFn: async (): Promise<LabFeatureWithVotes[]> => {
      // Fetch all votes (public read)
      const { data: allVotes } = await supabase
        .from('feature_votes')
        .select('feature_id, vote, user_id');

      const votes = allVotes || [];

      // Aggregate counts per feature_id
      const countMap = new Map<string, { up: number; down: number }>();
      for (const v of votes) {
        if (!countMap.has(v.feature_id)) {
          countMap.set(v.feature_id, { up: 0, down: 0 });
        }
        const counts = countMap.get(v.feature_id)!;
        if (v.vote === 1) counts.up++;
        else counts.down++;
      }

      // Find current user's votes
      const userVoteMap = new Map<string, 1 | -1>();
      if (userId) {
        for (const v of votes.filter((v: any) => v.user_id === userId)) {
          userVoteMap.set(v.feature_id, v.vote as 1 | -1);
        }
      }

      return LAB_FEATURES_CATALOG.map((feature) => {
        const counts = countMap.get(feature.id) ?? { up: 0, down: 0 };
        return {
          ...feature,
          upvotes: counts.up,
          downvotes: counts.down,
          userVote: userVoteMap.get(feature.id) ?? null,
        };
      });
    },
    staleTime: 60 * 1000,
  });
}

export function useVoteLabFeature() {
  const { userId } = useAuth();
  const supabase = getSupabase();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ featureId, vote }: { featureId: string; vote: 1 | -1 }) => {
      if (!userId) return;
      await supabase
        .from('feature_votes')
        .upsert(
          { user_id: userId, feature_id: featureId, vote },
          { onConflict: 'user_id,feature_id' }
        );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['labFeatures', userId] });
    },
  });
}
