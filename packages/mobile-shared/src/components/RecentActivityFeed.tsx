/**
 * RecentActivityFeed — Shows user's last 5 actions on their profile
 * Pulls from checkins, votes, and favorites, merges and sorts by date
 */
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { getColors, getSupabase } from '../config/theme';
import { createLazyStyles } from '../utils/lazyStyles';
import { spacing, radius, typography } from '../constants/spacing';
import { useAuth } from '../hooks/useAuth';
import { useMarket } from '../context/MarketContext';

interface ActivityItem {
  id: string;
  type: 'visit' | 'vote' | 'favorite';
  label: string;
  sublabel: string;
  timestamp: string;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function useRecentActivity() {
  const { userId } = useAuth();
  const { marketId } = useMarket();

  return useQuery({
    queryKey: ['recentActivity', userId, marketId],
    queryFn: async (): Promise<ActivityItem[]> => {
      if (!userId) return [];

      const supabase = getSupabase();

      let checkinsQuery = supabase
        .from('checkins')
        .select('id, restaurant_name, points_earned, created_at, restaurants!inner(market_id)')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(5);

      let votesQuery = supabase
        .from('votes')
        .select('id, restaurant_id, category, created_at, restaurants!inner(name, market_id)')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(5);

      if (marketId) {
        checkinsQuery = checkinsQuery.eq('restaurants.market_id', marketId);
        votesQuery = votesQuery.eq('restaurants.market_id', marketId);
      }

      const [checkinRes, voteRes] = await Promise.all([
        checkinsQuery,
        votesQuery,
      ]);

      const items: ActivityItem[] = [];

      (checkinRes.data || []).forEach((c: any) => {
        items.push({
          id: `visit-${c.id}`,
          type: 'visit',
          label: `Visited ${c.restaurant_name}`,
          sublabel: `Check-in · +${c.points_earned || 5} pts`,
          timestamp: c.created_at,
        });
      });

      (voteRes.data || []).forEach((v: any) => {
        const restaurantName = v.restaurants?.name || 'a restaurant';
        const categoryLabel = v.category
          .replace(/_/g, ' ')
          .replace(/\b\w/g, (l: string) => l.toUpperCase());
        items.push({
          id: `vote-${v.id}`,
          type: 'vote',
          label: `Voted · ${categoryLabel}`,
          sublabel: restaurantName,
          timestamp: v.created_at,
        });
      });

      items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      return items.slice(0, 5);
    },
    enabled: !!userId,
    staleTime: 2 * 60 * 1000,
  });
}

export default function RecentActivityFeed() {
  const styles = useStyles();
  const colors = getColors();
  const { data: items = [], isLoading } = useRecentActivity();

  const TYPE_META: Record<ActivityItem['type'], { icon: string; color: string }> = {
    visit: { icon: 'location', color: colors.success },
    vote: { icon: 'trophy', color: colors.gold },
    favorite: { icon: 'heart', color: colors.accent },
  };

  if (isLoading || items.length === 0) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Recent Activity</Text>
      {items.map((item) => {
        const meta = TYPE_META[item.type];
        return (
          <View key={item.id} style={styles.row}>
            <View style={[styles.iconBubble, { backgroundColor: `${meta.color}20` }]}>
              <Ionicons name={meta.icon as any} size={14} color={meta.color} />
            </View>
            <View style={styles.textCol}>
              <Text style={styles.label} numberOfLines={1}>{item.label}</Text>
              <Text style={styles.sublabel} numberOfLines={1}>{item.sublabel}</Text>
            </View>
            <Text style={styles.time}>{timeAgo(item.timestamp)}</Text>
          </View>
        );
      })}
    </View>
  );
}

const useStyles = createLazyStyles((colors) => ({
  container: {
    marginHorizontal: spacing.md,
    marginTop: spacing.lg,
  },
  sectionTitle: {
    fontSize: typography.footnote,
    fontWeight: '600' as const,
    color: colors.textMuted,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm + 2,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    gap: spacing.sm,
  },
  iconBubble: {
    width: 30,
    height: 30,
    borderRadius: radius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textCol: {
    flex: 1,
  },
  label: {
    fontSize: typography.subhead,
    fontWeight: '500' as const,
    color: colors.text,
  },
  sublabel: {
    fontSize: typography.caption1,
    color: colors.textMuted,
    marginTop: 1,
  },
  time: {
    fontSize: typography.caption1,
    color: colors.textSecondary,
  },
}));
