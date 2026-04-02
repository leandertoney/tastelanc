/**
 * ProfileStatsRow — Shows user's key stats on the profile page
 * Queries checkins, favorites, and points in real time
 */
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { getColors, getSupabase } from '../config/theme';
import { createLazyStyles } from '../utils/lazyStyles';
import { spacing, radius, typography } from '../constants/spacing';
import { useAuth } from '../hooks/useAuth';
import { useFavorites } from '../hooks/useFavorites';
import { useMarket } from '../context/MarketContext';

interface Stat {
  label: string;
  value: number | string;
  icon: string;
  onPress?: () => void;
}

interface Props {
  onVisitsPress?: () => void;
}

function useProfileStats() {
  const { userId } = useAuth();
  const { data: favorites = [] } = useFavorites();
  const { marketId } = useMarket();

  const { data } = useQuery({
    queryKey: ['profileStats', userId, marketId],
    queryFn: async () => {
      if (!userId) return { checkinCount: 0, points: 0 };

      const supabase = getSupabase();

      let checkinQuery = supabase
        .from('checkins')
        .select('id, restaurant_id, points_earned, restaurants!inner(market_id)')
        .eq('user_id', userId);

      if (marketId) {
        checkinQuery = checkinQuery.eq('restaurants.market_id', marketId);
      }

      const checkinRes = await checkinQuery;
      const checkinRows = checkinRes.data || [];
      const uniqueRestaurants = new Set(checkinRows.map((r: any) => r.restaurant_id)).size;
      const points = checkinRows.reduce(
        (sum: number, r: { points_earned: number }) => sum + (r.points_earned || 0),
        0
      );

      return { checkinCount: uniqueRestaurants, points };
    },
    enabled: !!userId,
    staleTime: 60 * 1000,
  });

  return {
    checkinCount: data?.checkinCount ?? 0,
    favoritesCount: favorites.length,
    points: data?.points ?? 0,
  };
}

export default function ProfileStatsRow({ onVisitsPress, onWishlistPress }: Props) {
  const styles = useStyles();
  const colors = getColors();
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

const useStyles = createLazyStyles((colors) => ({
  row: {
    flexDirection: 'row',
    backgroundColor: colors.cardBg,
    borderRadius: radius.lg,
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden' as const,
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
    fontWeight: '700' as const,
    color: colors.text,
  },
  label: {
    fontSize: typography.caption1,
    color: colors.textMuted,
  },
}));
