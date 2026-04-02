import { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRewardsBalance } from '../hooks/useRewards';
import { useMarket } from '../context/MarketContext';
import HowToEarnSection from '../components/rewards/HowToEarnSection';
import { getColors, getSupabase } from '../config/theme';
import { createLazyStyles } from '../utils/lazyStyles';
import { radius, spacing } from '../constants/spacing';
import { useAuth } from '../hooks/useAuth';
import LockedFeatureCard from '../components/LockedFeatureCard';
import ProfileStatsRow from '../components/ProfileStatsRow';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface ActivityItem {
  id: string;
  type: 'checkin' | 'video_recommendation' | 'review';
  label: string;
  sublabel: string;
  icon: string;
  points: number | null;
  date: string;
}

function useRecentActivity(limit = 10) {
  const { userId } = useAuth();
  const { marketId } = useMarket();
  const supabase = getSupabase();

  return useQuery({
    queryKey: ['recentActivity', userId, marketId],
    queryFn: async (): Promise<ActivityItem[]> => {
      if (!userId) return [];

      let checkinsQuery = supabase
        .from('checkins')
        .select('id, restaurant_name, points_earned, created_at, restaurants!inner(market_id)')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      let pointsQuery = supabase
        .from('point_transactions')
        .select('id, action_type, points, restaurant_id, created_at, restaurants!inner(name, market_id)')
        .eq('user_id', userId)
        .in('action_type', ['video_recommendation', 'review'])
        .order('created_at', { ascending: false })
        .limit(limit);

      if (marketId) {
        checkinsQuery = checkinsQuery.eq('restaurants.market_id', marketId);
        pointsQuery = pointsQuery.eq('restaurants.market_id', marketId);
      }

      const [checkinsRes, pointsRes] = await Promise.all([
        checkinsQuery,
        pointsQuery,
      ]);

      const items: ActivityItem[] = [];

      (checkinsRes.data || []).forEach((c: any) => {
        items.push({
          id: `checkin-${c.id}`,
          type: 'checkin',
          label: "I'm Here",
          sublabel: c.restaurant_name || 'Restaurant',
          icon: 'location',
          points: c.points_earned || 5,
          date: c.created_at,
        });
      });

      (pointsRes.data || []).forEach((p: any) => {
        const isVideo = p.action_type === 'video_recommendation';
        items.push({
          id: `points-${p.id}`,
          type: p.action_type,
          label: isVideo ? 'Video Recommendation' : 'Review',
          sublabel: p.restaurants?.name || 'Restaurant',
          icon: isVideo ? 'videocam' : 'star',
          points: p.points,
          date: p.created_at,
        });
      });

      items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      return items.slice(0, limit);
    },
    enabled: !!userId,
    staleTime: 60 * 1000,
  });
}

function formatActivityDate(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function RewardsScreen() {
  const styles = useStyles();
  const colors = getColors();
  const navigation = useNavigation<NavigationProp>();
  const queryClient = useQueryClient();
  const { refetch: refetchBalance } = useRewardsBalance();
  const { data: activityItems = [], isLoading: isLoadingActivity, refetch: refetchActivity } = useRecentActivity();

  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await Promise.all([
      refetchBalance(),
      refetchActivity(),
      queryClient.invalidateQueries({ queryKey: ['profileStats'] }),
      queryClient.invalidateQueries({ queryKey: ['checkinCount'] }),
    ]);
    setIsRefreshing(false);
  }, [refetchBalance, refetchActivity]);

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={colors.accent}
          />
        }
      >
        {/* Hero Section */}
        <View style={styles.hero}>
          <View style={styles.heroIconContainer}>
            <Ionicons name="gift" size={36} color={colors.accent} />
          </View>
          <Text style={styles.heroTitle}>Rewards</Text>
          <Text style={styles.heroSubtitle}>Earn points and unlock exclusive perks</Text>
        </View>

        {/* Stats Row */}
        <ProfileStatsRow
          onVisitsPress={() => navigation.navigate('MyRestaurants')}
        />

        {/* Quick links */}
        <View style={styles.quickLinks}>
          <TouchableOpacity
            style={styles.quickLink}
            onPress={() => navigation.navigate('MyRestaurants')}
          >
            <Ionicons name="location" size={18} color={colors.accent} />
            <Text style={styles.quickLinkText}>My Restaurants</Text>
            <Ionicons name="chevron-forward" size={14} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Your Features */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Your Perks</Text>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.featuresRow}
        >
          <LockedFeatureCard
            title="Exclusive Deals"
            description="Member-only discounts"
            icon="pricetag"
            isLocked={false}
            comingSoon
            onPress={() => {}}
          />
          <LockedFeatureCard
            title="Early Access"
            description="First to know about events"
            icon="flash"
            isLocked={false}
            comingSoon
            onPress={() => {}}
          />
        </ScrollView>

        {/* Recent Activity */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Activity</Text>
        </View>
        <View style={styles.historyContainer}>
          {isLoadingActivity && activityItems.length === 0 ? (
            <View style={styles.activityEmpty}>
              <Text style={styles.activityEmptyText}>Loading...</Text>
            </View>
          ) : activityItems.length === 0 ? (
            <View style={styles.activityEmpty}>
              <Ionicons name="receipt-outline" size={36} color={colors.textMuted} />
              <Text style={styles.activityEmptyTitle}>No Activity Yet</Text>
              <Text style={styles.activityEmptyText}>
                Post a video, check in, or rate a restaurant to start earning!
              </Text>
            </View>
          ) : (
            activityItems.slice(0, 5).map((item) => (
              <View key={item.id} style={styles.activityRow}>
                <View style={styles.activityIcon}>
                  <Ionicons name={item.icon as any} size={18} color={colors.accent} />
                </View>
                <View style={styles.activityContent}>
                  <Text style={styles.activityLabel}>{item.label}</Text>
                  <Text style={styles.activitySublabel} numberOfLines={1}>{item.sublabel}</Text>
                </View>
                {item.points != null && (
                  <Text style={styles.activityPoints}>+{item.points} pts</Text>
                )}
                <Text style={styles.activityDate}>{formatActivityDate(item.date)}</Text>
              </View>
            ))
          )}
        </View>

        {/* How to Earn */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Earn More Points</Text>
        </View>
        <View style={styles.section}>
          <HowToEarnSection />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const useStyles = createLazyStyles((colors) => ({
  container: {
    flex: 1,
    backgroundColor: colors.primary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  hero: {
    alignItems: 'center' as const,
    paddingVertical: 32,
    paddingHorizontal: 20,
    backgroundColor: colors.primaryLight,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  heroIconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: `${colors.accent}20`,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: `${colors.accent}40`,
  },
  heroTitle: {
    fontSize: 26,
    fontWeight: '700' as const,
    color: colors.text,
    marginBottom: 4,
  },
  heroSubtitle: {
    fontSize: 15,
    color: colors.textMuted,
  },
  section: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
  },
  sectionHeader: {
    paddingHorizontal: spacing.md,
    paddingTop: 28,
    paddingBottom: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: colors.text,
    marginBottom: 2,
  },
  featuresRow: {
    paddingHorizontal: spacing.md,
    gap: 12,
  },
  historyContainer: {
    paddingHorizontal: spacing.md,
  },
  activityRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    backgroundColor: colors.cardBg,
    borderRadius: radius.md,
    padding: spacing.sm + 4,
    marginBottom: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  activityIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: `${colors.accent}20`,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  activityContent: {
    flex: 1,
  },
  activityLabel: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: colors.text,
  },
  activitySublabel: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 1,
  },
  activityPoints: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: colors.success,
  },
  activityDate: {
    fontSize: 11,
    color: colors.textSecondary,
    width: 55,
    textAlign: 'right' as const,
  },
  activityEmpty: {
    alignItems: 'center' as const,
    padding: spacing.xl,
    gap: spacing.sm,
  },
  activityEmptyTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: colors.text,
  },
  activityEmptyText: {
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center' as const,
  },
  quickLinks: {
    flexDirection: 'row' as const,
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
    backgroundColor: colors.cardBg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden' as const,
  },
  quickLink: {
    flex: 1,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingVertical: spacing.sm + 4,
    paddingHorizontal: spacing.sm + 4,
    gap: 6,
  },
  quickLinkText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600' as const,
    color: colors.text,
  },
  quickLinkDivider: {
    width: 1,
    backgroundColor: colors.border,
  },
}));
