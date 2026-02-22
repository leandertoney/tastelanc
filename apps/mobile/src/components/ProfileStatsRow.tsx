/**
 * ProfileStatsRow — Shows user's key stats on the profile page
 * Queries checkins, votes, favorites, and points in real time
 */
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { useFavorites } from '../hooks/useFavorites';
import { colors, spacing, radius, typography } from '../constants/colors';

interface Stat {
  label: string;
  value: number | string;
  icon: string;
  onPress?: () => void;
}

interface Props {
  onVisitsPress?: () => void;
  onWishlistPress?: () => void;
}

function useProfileStats() {
  const { userId } = useAuth();
  const { data: favorites = [] } = useFavorites();

  const { data } = useQuery({
    queryKey: ['profileStats', userId],
    queryFn: async () => {
      if (!userId) return { checkinCount: 0, voteCount: 0, points: 0 };

      const now = new Date();
      const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

      const [checkinRes, voteRes] = await Promise.all([
        supabase
          .from('checkins')
          .select('id, points_earned', { count: 'exact' })
          .eq('user_id', userId),
        supabase
          .from('votes')
          .select('id', { count: 'exact' })
          .eq('user_id', userId)
          .eq('month', month),
      ]);

      const checkinRows = checkinRes.data || [];
      const points = checkinRows.reduce(
        (sum: number, r: { points_earned: number }) => sum + (r.points_earned || 0),
        0
      );

      return {
        checkinCount: checkinRes.count || 0,
        voteCount: voteRes.count || 0,
        points,
      };
    },
    enabled: !!userId,
    staleTime: 60 * 1000,
  });

  return {
    checkinCount: data?.checkinCount ?? 0,
    voteCount: data?.voteCount ?? 0,
    favoritesCount: favorites.length,
    points: data?.points ?? 0,
  };
}

export default function ProfileStatsRow({ onVisitsPress, onWishlistPress }: Props) {
  const { checkinCount, voteCount, favoritesCount, points } = useProfileStats();

  const stats: Stat[] = [
    {
      label: 'Visited',
      value: checkinCount,
      icon: 'location',
      onPress: onVisitsPress,
    },
    {
      label: 'Saved',
      value: favoritesCount,
      icon: 'heart',
    },
    {
      label: 'Votes',
      value: voteCount,
      icon: 'trophy',
    },
    {
      label: 'Points',
      value: points,
      icon: 'star',
      onPress: onWishlistPress,
    },
  ];

  return (
    <View style={styles.row}>
      {stats.map((stat, i) => (
        <TouchableOpacity
          key={stat.label}
          style={[styles.stat, i < stats.length - 1 && styles.statBorder]}
          onPress={stat.onPress}
          activeOpacity={stat.onPress ? 0.7 : 1}
          disabled={!stat.onPress}
        >
          <Ionicons name={stat.icon as any} size={16} color={colors.accent} style={styles.icon} />
          <Text style={styles.value}>{stat.value}</Text>
          <Text style={styles.label}>{stat.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    backgroundColor: colors.cardBg,
    borderRadius: radius.lg,
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  stat: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.md,
    gap: 2,
  },
  statBorder: {
    borderRightWidth: 1,
    borderRightColor: colors.border,
  },
  icon: {
    marginBottom: 2,
  },
  value: {
    fontSize: typography.title3,
    fontWeight: '700',
    color: colors.text,
  },
  label: {
    fontSize: typography.caption1,
    color: colors.textMuted,
  },
});
