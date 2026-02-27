/**
 * RecentActivityFeed — Shows user's last 5 actions on their profile
 * Pulls from checkins, votes, and favorites, merges and sorts by date
 */
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { colors, spacing, radius, typography } from '../constants/colors';

interface ActivityItem {
  id: string;
  type: 'visit' | 'vote' | 'favorite';
  label: string;
  sublabel: string;
  timestamp: string;
}

const TYPE_META: Record<ActivityItem['type'], { icon: string; color: string }> = {
  visit: { icon: 'location', color: colors.success },
  vote: { icon: 'trophy', color: colors.gold },
  favorite: { icon: 'heart', color: colors.accent },
};

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

  return useQuery({
    queryKey: ['recentActivity', userId],
    queryFn: async (): Promise<ActivityItem[]> => {
      if (!userId) return [];

      const [checkinRes, voteRes] = await Promise.all([
        supabase
          .from('checkins')
          .select('id, restaurant_name, created_at')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(5),
        supabase
          .from('votes')
          .select('id, restaurant_id, category, created_at, restaurants(name)')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(5),
      ]);

      const items: ActivityItem[] = [];

      (checkinRes.data || []).forEach((c: any) => {
        items.push({
          id: `visit-${c.id}`,
          type: 'visit',
          label: `Visited ${c.restaurant_name}`,
          sublabel: 'Check-in · +10 pts',
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

      // Sort by most recent, take top 5
      items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      return items.slice(0, 5);
    },
    enabled: !!userId,
    staleTime: 2 * 60 * 1000,
  });
}

export default function RecentActivityFeed() {
  const { data: items = [], isLoading } = useRecentActivity();

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

const styles = StyleSheet.create({
  container: {
    marginHorizontal: spacing.md,
    marginTop: spacing.lg,
  },
  sectionTitle: {
    fontSize: typography.footnote,
    fontWeight: '600',
    color: colors.textMuted,
    textTransform: 'uppercase',
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
    fontWeight: '500',
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
});
