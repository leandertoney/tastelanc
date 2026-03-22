import { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as ImagePicker from 'expo-image-picker';
import { getColors, getBrand, getSupabase } from '../config/theme';
import { createLazyStyles } from '../utils/lazyStyles';
import { radius, spacing } from '../constants/spacing';
import { useAuth } from '../hooks/useAuth';
import { useSignUpModal } from '../context/SignUpModalContext';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useMarket } from '../context/MarketContext';
import { useRewardsBalance } from '../hooks/useRewards';
import { useUploadAvatar } from '../hooks/useProfile';
import { useUserRecommendations } from '../hooks/useVideoRecommendations';
import type { RootStackParamList } from '../navigation/types';
import ProfileStatsRow from '../components/ProfileStatsRow';
import HowToEarnSection from '../components/rewards/HowToEarnSection';
import OtherCitiesSection from '../components/OtherCitiesSection';
import { CAPTION_TAG_LABELS } from '../types/database';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

// Dynamic title based on check-in count
function getExplorerTitle(checkinCount: number, cityName: string): string {
  if (checkinCount === 0) return `${cityName} Newcomer`;
  if (checkinCount < 5) return `${cityName} Explorer`;
  if (checkinCount < 15) return `${cityName} Regular`;
  if (checkinCount < 30) return 'Local Insider';
  if (checkinCount < 50) return `${cityName} Expert`;
  return 'Local Legend';
}

function useCheckinCount() {
  const { userId } = useAuth();
  const { marketId } = useMarket();
  const supabase = getSupabase();
  return useQuery({
    queryKey: ['checkinCount', userId, marketId],
    queryFn: async () => {
      if (!userId) return 0;
      let query = supabase
        .from('checkins')
        .select('restaurant_id, restaurants!inner(market_id)')
        .eq('user_id', userId);
      if (marketId) {
        query = query.eq('restaurants.market_id', marketId);
      }
      const { data } = await query;
      return new Set((data || []).map((r: any) => r.restaurant_id)).size;
    },
    enabled: !!userId,
    staleTime: 60 * 1000,
  });
}

function useProfileHeader() {
  const { userId, isAnonymous } = useAuth();
  const supabase = getSupabase();
  return useQuery({
    queryKey: ['displayName', userId],
    queryFn: async () => {
      if (!userId) return { display_name: null, avatar_url: null };
      const { data } = await supabase
        .from('profiles')
        .select('display_name, avatar_url')
        .eq('id', userId)
        .single();
      return {
        display_name: data?.display_name || null,
        avatar_url: data?.avatar_url || null,
      };
    },
    enabled: !!userId && !isAnonymous,
    staleTime: 5 * 60 * 1000,
  });
}

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
          label: 'Check-in',
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

export default function ProfileScreen() {
  const styles = useStyles();
  const colors = getColors();
  const brand = getBrand();
  const navigation = useNavigation<NavigationProp>();
  const { userId, user, isAnonymous } = useAuth();
  const { showSignUpModal } = useSignUpModal();
  const { data: checkinCount = 0 } = useCheckinCount();
  const { data: profileHeader } = useProfileHeader();
  const displayName = profileHeader?.display_name ?? null;
  const avatarUrl = profileHeader?.avatar_url ?? null;
  const queryClient = useQueryClient();
  const uploadAvatarMutation = useUploadAvatar(userId);

  const { refetch: refetchBalance } = useRewardsBalance();
  const { data: activityItems = [], isLoading: isLoadingActivity, refetch: refetchActivity } = useRecentActivity();
  const { data: myRecs = [], refetch: refetchRecs } = useUserRecommendations(userId ?? null);

  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await Promise.all([
      refetchBalance(),
      refetchActivity(),
      refetchRecs(),
      queryClient.invalidateQueries({ queryKey: ['profileStats'] }),
      queryClient.invalidateQueries({ queryKey: ['checkinCount'] }),
      queryClient.invalidateQueries({ queryKey: ['displayName'] }),
    ]);
    setIsRefreshing(false);
  }, [refetchBalance, refetchActivity, refetchRecs]);

  const handleAvatarPress = useCallback(async () => {
    if (isAnonymous) {
      showSignUpModal({ action: 'upload a profile photo' });
      return;
    }

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Allow photo library access to upload a profile photo.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
      base64: true,
    });

    if (result.canceled || !result.assets[0]) return;

    const asset = result.assets[0];
    if (!asset.base64) {
      Alert.alert('Upload failed', 'Could not read image data. Try again.');
      return;
    }

    try {
      const mimeType = asset.mimeType ?? 'image/jpeg';
      await uploadAvatarMutation.mutateAsync({ imageBase64: asset.base64, mimeType });
    } catch (err: any) {
      Alert.alert('Upload failed', err?.message || 'Could not upload photo. Try again.');
    }
  }, [isAnonymous, showSignUpModal, uploadAvatarMutation]);

  const explorerTitle = getExplorerTitle(checkinCount, brand.cityName);

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
        {/* Profile Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.avatarWrapper}
            onPress={handleAvatarPress}
            activeOpacity={0.85}
            disabled={uploadAvatarMutation.isPending}
          >
            <View style={styles.avatarContainer}>
              {uploadAvatarMutation.isPending ? (
                <ActivityIndicator color={colors.textOnAccent} size="small" />
              ) : avatarUrl ? (
                <Image
                  source={{ uri: avatarUrl }}
                  style={styles.avatarImage}
                  resizeMode="cover"
                />
              ) : (
                <Ionicons name="person" size={40} color={colors.textOnAccent} />
              )}
            </View>
            {!uploadAvatarMutation.isPending && (
              <View style={styles.avatarEditBadge}>
                <Ionicons name="camera" size={12} color="#fff" />
              </View>
            )}
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {!isAnonymous && displayName ? displayName : explorerTitle}
          </Text>
          <Text style={styles.headerSubtitle}>
            {!isAnonymous && displayName
              ? `${explorerTitle} · ${checkinCount} visit${checkinCount !== 1 ? 's' : ''}`
              : checkinCount === 0
              ? `Start exploring ${brand.cityName} — check in to earn points`
              : `${checkinCount} restaurant${checkinCount !== 1 ? 's' : ''} visited in ${brand.cityName}`}
          </Text>
          <Text style={styles.headerEmail}>
            {isAnonymous ? 'Guest Account' : user?.email || 'Signed In'}
          </Text>
          {isAnonymous && (
            <TouchableOpacity
              style={styles.signInButton}
              onPress={() => showSignUpModal({ action: 'access your full profile' })}
            >
              <Ionicons name="log-in-outline" size={18} color={colors.textOnAccent} />
              <Text style={styles.signInButtonText}>Sign In</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Stats Row */}
        <ProfileStatsRow
          onVisitsPress={() => navigation.navigate('MyRestaurants')}
          onWishlistPress={() => navigation.navigate('Wishlist')}
        />

        {/* Quick Links */}
        <View style={styles.quickLinks}>
          <TouchableOpacity
            style={styles.quickLink}
            onPress={() => navigation.navigate('MyRestaurants')}
          >
            <Ionicons name="location" size={18} color={colors.accent} />
            <Text style={styles.quickLinkText}>My Restaurants</Text>
            <Ionicons name="chevron-forward" size={14} color={colors.textSecondary} />
          </TouchableOpacity>
          <View style={styles.quickLinkDivider} />
          <TouchableOpacity
            style={styles.quickLink}
            onPress={() => navigation.navigate('Wishlist')}
          >
            <Ionicons name="bookmark" size={18} color={colors.accent} />
            <Text style={styles.quickLinkText}>Bucket List</Text>
            <Ionicons name="chevron-forward" size={14} color={colors.textSecondary} />
          </TouchableOpacity>
          <View style={styles.quickLinkDivider} />
          <TouchableOpacity
            style={styles.quickLink}
            onPress={() => navigation.navigate('MyCoupons')}
          >
            <Ionicons name="ticket" size={18} color={colors.accent} />
            <Text style={styles.quickLinkText}>My Coupons</Text>
            <Ionicons name="chevron-forward" size={14} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Your Recs */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Your Recs</Text>
        </View>
        {myRecs.length === 0 ? (
          <View style={styles.recsEmpty}>
            <Ionicons name="videocam-outline" size={32} color={colors.textMuted} />
            <Text style={styles.recsEmptyTitle}>No Recs Yet</Text>
            <Text style={styles.recsEmptyText}>
              Record a 60-second video rec at any restaurant to see it here!
            </Text>
          </View>
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.recsRow}
          >
            {myRecs.map((rec) => (
              <TouchableOpacity
                key={rec.id}
                style={styles.recCard}
                activeOpacity={0.85}
                onPress={() => navigation.navigate('RestaurantDetail', { id: rec.restaurant_id })}
              >
                {rec.thumbnail_url ? (
                  <Image source={{ uri: rec.thumbnail_url }} style={styles.recThumb} resizeMode="cover" />
                ) : (
                  <View style={[styles.recThumb, styles.recThumbPlaceholder]}>
                    <Ionicons name="videocam" size={28} color={colors.textMuted} />
                  </View>
                )}
                <View style={styles.recOverlay}>
                  {rec.caption_tag && (
                    <View style={styles.recTagBadge}>
                      <Text style={styles.recTagText}>
                        {CAPTION_TAG_LABELS[rec.caption_tag] || rec.caption_tag}
                      </Text>
                    </View>
                  )}
                  <View style={styles.recStats}>
                    <Ionicons name="eye" size={11} color="#fff" />
                    <Text style={styles.recStatText}>{rec.view_count || 0}</Text>
                    <Ionicons name="heart" size={11} color="#fff" style={{ marginLeft: 6 }} />
                    <Text style={styles.recStatText}>{rec.like_count || 0}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

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

        {/* Earn More Points */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Earn More Points</Text>
        </View>
        <View style={styles.earnSection}>
          <HowToEarnSection />
        </View>

        {/* Explore sister apps in other markets */}
        <OtherCitiesSection />
      </ScrollView>
    </SafeAreaView>
  );
}

const useStyles = createLazyStyles((colors) => ({
  container: { flex: 1, backgroundColor: colors.primary },
  scrollView: { flex: 1 },
  scrollContent: { paddingBottom: 40 },
  header: {
    alignItems: 'center' as const,
    paddingVertical: 28,
    paddingHorizontal: 20,
    backgroundColor: colors.primaryLight,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  avatarWrapper: {
    marginBottom: 14,
    position: 'relative' as const,
  },
  avatarContainer: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: colors.accent,
    justifyContent: 'center' as const, alignItems: 'center' as const,
    overflow: 'hidden' as const,
  },
  avatarImage: {
    width: 80, height: 80,
  },
  avatarEditBadge: {
    position: 'absolute' as const,
    bottom: 0, right: 0,
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.60)',
    borderWidth: 2,
    borderColor: colors.primaryLight,
    justifyContent: 'center' as const, alignItems: 'center' as const,
  },
  headerTitle: { fontSize: 22, fontWeight: '700' as const, color: colors.text, marginBottom: 4 },
  headerSubtitle: { fontSize: 14, color: colors.textMuted, textAlign: 'center' as const },
  headerEmail: { fontSize: 13, color: colors.textSecondary, marginTop: 6 },
  signInButton: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 6,
    marginTop: 12,
    backgroundColor: colors.accent,
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: radius.full,
  },
  signInButtonText: { fontSize: 15, fontWeight: '600' as const, color: colors.textOnAccent },
  sectionHeader: {
    paddingHorizontal: spacing.md,
    paddingTop: 28,
    paddingBottom: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: colors.text,
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
  quickLinkDivider: { width: 1, backgroundColor: colors.border },
  recsRow: { paddingHorizontal: spacing.md, gap: 12 },
  recsEmpty: {
    alignItems: 'center' as const,
    paddingVertical: 24,
    paddingHorizontal: spacing.lg,
    gap: 8,
  },
  recsEmptyTitle: { fontSize: 15, fontWeight: '600' as const, color: colors.text },
  recsEmptyText: { fontSize: 13, color: colors.textMuted, textAlign: 'center' as const },
  recCard: {
    width: 120,
    height: 170,
    borderRadius: radius.md,
    overflow: 'hidden' as const,
    backgroundColor: colors.cardBg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  recThumb: {
    width: '100%' as const,
    height: '100%' as const,
  },
  recThumbPlaceholder: {
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    backgroundColor: colors.primaryLight,
  },
  recOverlay: {
    position: 'absolute' as const,
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 6,
    paddingBottom: 6,
    paddingTop: 20,
    background: 'transparent',
  },
  recTagBadge: {
    alignSelf: 'flex-start' as const,
    backgroundColor: colors.accent,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginBottom: 4,
  },
  recTagText: { fontSize: 9, fontWeight: '700' as const, color: colors.textOnAccent },
  recStats: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 3,
  },
  recStatText: { fontSize: 10, fontWeight: '600' as const, color: '#fff' },
  historyContainer: { paddingHorizontal: spacing.md },
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
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: `${colors.accent}20`,
    justifyContent: 'center' as const, alignItems: 'center' as const,
  },
  activityContent: { flex: 1 },
  activityLabel: { fontSize: 14, fontWeight: '600' as const, color: colors.text },
  activitySublabel: { fontSize: 12, color: colors.textMuted, marginTop: 1 },
  activityPoints: { fontSize: 14, fontWeight: '700' as const, color: colors.success },
  activityDate: { fontSize: 11, color: colors.textSecondary, width: 55, textAlign: 'right' as const },
  activityEmpty: { alignItems: 'center' as const, padding: spacing.xl, gap: spacing.sm },
  activityEmptyTitle: { fontSize: 16, fontWeight: '600' as const, color: colors.text },
  activityEmptyText: { fontSize: 13, color: colors.textMuted, textAlign: 'center' as const },
  earnSection: { paddingHorizontal: spacing.md, paddingTop: spacing.md },
}));
