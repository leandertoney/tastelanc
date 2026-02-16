import { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import { useVoteBalance, useCurrentMonthVotes } from '../hooks';
import { useRewardsBalance, useRewardsHistoryFlat } from '../hooks/useRewards';
import PointsBalanceCard from '../components/rewards/PointsBalanceCard';
import PointsHistoryList from '../components/rewards/PointsHistoryList';
import HowToEarnSection from '../components/rewards/HowToEarnSection';
import LockedFeatureCard from '../components/LockedFeatureCard';
import { colors, radius, spacing } from '../constants/colors';
import { BRAND } from '../config/brand';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function RewardsScreen() {
  const navigation = useNavigation<NavigationProp>();
  const voteBalanceData = useVoteBalance();
  const monthVotesData = useCurrentMonthVotes();

  // Rewards hooks
  const {
    totalPoints,
    lifetimePoints,
    isLoading: isLoadingBalance,
    refetch: refetchBalance,
  } = useRewardsBalance();

  // History hooks
  const {
    items: historyItems,
    isLoading: isLoadingHistory,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    refetch: refetchHistory,
  } = useRewardsHistoryFlat(10);

  const votesAvailable = voteBalanceData.votesAvailable;
  const monthVotesCount = monthVotesData.votes.length;

  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await Promise.all([
      refetchBalance(),
      refetchHistory(),
    ]);
    setIsRefreshing(false);
  }, [refetchBalance, refetchHistory]);

  const handleFeaturePress = (featureName: string) => {
    if (featureName === 'voting') {
      navigation.navigate('VoteCenter');
    }
  };

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

        {/* Points Balance Card */}
        <View style={styles.section}>
          <PointsBalanceCard
            totalPoints={totalPoints}
            lifetimePoints={lifetimePoints}
            isLoading={isLoadingBalance}
          />
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
            title="Vote"
            description={`Vote for ${BRAND.cityPossessive} Best`}
            icon="trophy"
            isLocked={false}
            onPress={() => handleFeaturePress('voting')}
          />
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

        {/* Voting Summary */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Your Votes</Text>
        </View>
        <View style={styles.votingSummary}>
          <View style={styles.voteStat}>
            <Text style={styles.voteStatNumber}>{votesAvailable}</Text>
            <Text style={styles.voteStatLabel}>Votes Left</Text>
          </View>
          <View style={styles.voteDivider} />
          <View style={styles.voteStat}>
            <Text style={styles.voteStatNumber}>{monthVotesCount}</Text>
            <Text style={styles.voteStatLabel}>Cast This Month</Text>
          </View>
          <TouchableOpacity
            style={styles.viewVotesButton}
            onPress={() => navigation.navigate('VoteCenter')}
          >
            <Text style={styles.viewVotesText}>Vote Now</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.accent} />
          </TouchableOpacity>
        </View>

        {/* Recent Activity */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Activity</Text>
        </View>
        <View style={styles.historyContainer}>
          <PointsHistoryList
            items={historyItems.slice(0, 5)}
            isLoading={isLoadingHistory}
            hasMore={false}
            isFetchingMore={false}
            onLoadMore={() => {}}
          />
          {historyItems.length > 5 && (
            <TouchableOpacity style={styles.viewAllButton}>
              <Text style={styles.viewAllText}>View All Activity</Text>
              <Ionicons name="chevron-forward" size={16} color={colors.accent} />
            </TouchableOpacity>
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

const styles = StyleSheet.create({
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
    alignItems: 'center',
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
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 2,
    borderColor: `${colors.accent}40`,
  },
  heroTitle: {
    fontSize: 26,
    fontWeight: '700',
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
    fontWeight: '700',
    color: colors.text,
    marginBottom: 2,
  },
  featuresRow: {
    paddingHorizontal: spacing.md,
    gap: 12,
  },
  votingSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardBg,
    borderRadius: radius.lg,
    marginHorizontal: spacing.md,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  voteStat: {
    alignItems: 'center',
    flex: 1,
  },
  voteStatNumber: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
  },
  voteStatLabel: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 4,
  },
  voteDivider: {
    width: 1,
    height: 40,
    backgroundColor: colors.border,
  },
  viewVotesButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    gap: 4,
  },
  viewVotesText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.accent,
  },
  historyContainer: {
    paddingHorizontal: spacing.md,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    gap: 4,
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.accent,
  },
});
