import { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import type { VoteCategory, LeaderboardEntry } from '../types/voting';
import {
  useVoteBalance,
  useCurrentWinners,
  useCurrentMonthVotes,
} from '../hooks/useVotes';
import { useRestaurants } from '../hooks/useRestaurants';
import { colors, radius } from '../constants/colors';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_SIZE = (SCREEN_WIDTH - 48 - 36) / 4; // 4 cards per row with gaps

const VOTING_CATEGORIES: { id: VoteCategory; label: string; emoji: string; color: string }[] = [
  { id: 'best_wings', label: 'Wings', emoji: '🍗', color: '#FF6B35' },
  { id: 'best_burgers', label: 'Burgers', emoji: '🍔', color: '#E63946' },
  { id: 'best_pizza', label: 'Pizza', emoji: '🍕', color: '#F4A261' },
  { id: 'best_cocktails', label: 'Cocktails', emoji: '🍸', color: '#9B5DE5' },
  { id: 'best_happy_hour', label: 'Happy Hour', emoji: '🍻', color: '#FFD700' },
  { id: 'best_brunch', label: 'Brunch', emoji: '🥞', color: '#F8961E' },
  { id: 'best_late_night', label: 'Late Night', emoji: '🌙', color: '#577590' },
  { id: 'best_live_music', label: 'Live Music', emoji: '🎵', color: '#43AA8B' },
];

function VoteBalanceCard({
  votesRemaining,
  nextReset,
}: {
  votesRemaining: number;
  nextReset: string | null;
}) {
  const resetDate = nextReset
    ? new Date(nextReset).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    : 'Next month';

  return (
    <View style={styles.balanceCard}>
      <View style={styles.balanceIconContainer}>
        <Ionicons name="checkbox" size={24} color={colors.accent} />
      </View>
      <View style={styles.balanceContent}>
        <Text style={styles.balanceTitle}>
          {votesRemaining} vote{votesRemaining !== 1 ? 's' : ''} remaining
        </Text>
        <Text style={styles.balanceSubtitle}>Resets {resetDate}</Text>
      </View>
    </View>
  );
}

function WinnerCard({
  entry,
  restaurantName,
}: {
  entry: LeaderboardEntry;
  restaurantName: string;
}) {
  const categoryInfo = VOTING_CATEGORIES.find((c) => c.id === entry.category);
  const badge = entry.tier.replace('_', ' ').toUpperCase();

  return (
    <View style={styles.winnerCard}>
      <View style={styles.winnerLeft}>
        <Text style={styles.winnerEmoji}>{categoryInfo?.emoji || '🏆'}</Text>
        <View style={styles.winnerInfo}>
          <Text style={styles.winnerCategory}>{categoryInfo?.label || 'Best'}</Text>
          <Text style={styles.winnerRestaurant} numberOfLines={1}>
            {restaurantName}
          </Text>
        </View>
      </View>
      <View style={styles.winnerBadge}>
        <Ionicons name="trophy" size={12} color="#FFD700" />
        <Text style={styles.winnerBadgeText}>{badge}</Text>
      </View>
    </View>
  );
}

function EmptyWinners() {
  return (
    <View style={styles.emptyWinners}>
      <Ionicons name="trophy-outline" size={40} color={colors.textSecondary} />
      <Text style={styles.emptyWinnersTitle}>No Winners Yet</Text>
      <Text style={styles.emptyWinnersText}>
        Be the first to vote and crown this month's winners!
      </Text>
    </View>
  );
}

function CategoryCard({
  category,
  onPress,
  hasVoted,
}: {
  category: (typeof VOTING_CATEGORIES)[number];
  onPress: () => void;
  hasVoted: boolean;
}) {
  return (
    <TouchableOpacity
      style={[styles.badge, hasVoted && styles.badgeVoted]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      {/* Ribbon top - colored section with emoji */}
      <View style={[styles.ribbonTop, { backgroundColor: category.color }]}>
        <Text style={styles.badgeEmoji}>{category.emoji}</Text>
      </View>
      {/* Badge body - gray section with label */}
      <View style={styles.badgeBody}>
        <Text style={styles.badgeLabel}>{category.label}</Text>
      </View>
      {/* Ribbon tails - skewed colored elements */}
      <View style={styles.ribbonTails}>
        <View style={[styles.ribbonTail, styles.ribbonTailLeft, { backgroundColor: category.color }]} />
        <View style={[styles.ribbonTail, styles.ribbonTailRight, { backgroundColor: category.color }]} />
      </View>
      {/* Voted badge */}
      {hasVoted && (
        <View style={styles.votedBadge}>
          <Ionicons name="checkmark" size={10} color={colors.text} />
        </View>
      )}
    </TouchableOpacity>
  );
}

function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {subtitle && <Text style={styles.sectionSubtitle}>{subtitle}</Text>}
    </View>
  );
}

export default function VotingHubScreen() {
  const navigation = useNavigation<NavigationProp>();

  // Real data from hooks
  const { votesAvailable, nextReset, isLoading: isLoadingBalance, refetch: refetchBalance } = useVoteBalance();
  const { winners, isLoading: isLoadingWinners, refetch: refetchWinners } = useCurrentWinners();
  const { votes: monthVotes, refetch: refetchVotes } = useCurrentMonthVotes();
  const { data: restaurants = [] } = useRestaurants({ limit: 100 });


  const currentMonth = new Date().toLocaleDateString('en-US', { month: 'long' });

  const getRestaurantName = useCallback(
    (restaurantId: string) => {
      const restaurant = restaurants.find((r) => r.id === restaurantId);
      return restaurant?.name || 'Unknown Restaurant';
    },
    [restaurants]
  );

  const getVotedCategories = useCallback(() => {
    return new Set(monthVotes.map((v) => v.category));
  }, [monthVotes]);

  const votedCategories = getVotedCategories();

  const handleRefresh = useCallback(() => {
    refetchBalance();
    refetchWinners();
    refetchVotes();
  }, [refetchBalance, refetchWinners, refetchVotes]);

  const handleCategoryPress = (category: VoteCategory) => {
    navigation.navigate('VoteRestaurant', { category });
  };

  const handleViewLeaderboard = () => {
    navigation.navigate('VoteLeaderboard', {});
  };

  const isLoading = isLoadingBalance || isLoadingWinners;

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={handleRefresh}
            tintColor={colors.accent}
            colors={[colors.accent]}
          />
        }
      >
        {/* Hero Section */}
        <View style={styles.hero}>
          <View style={styles.heroIconContainer}>
            <Ionicons name="trophy" size={36} color="#FFD700" />
          </View>
          <Text style={styles.heroTitle}>Lancaster's Best</Text>
          <Text style={styles.heroSubtitle}>Vote for your favorite spots</Text>
        </View>

        {/* Vote Balance */}
        <View style={styles.section}>
          <VoteBalanceCard
            votesRemaining={votesAvailable}
            nextReset={nextReset}
          />
        </View>

        {/* Current Winners */}
        <SectionHeader
          title={`${currentMonth} Winners`}
          subtitle="Top picks crowned by the community"
        />
        <View style={styles.winnersSection}>
          {isLoadingWinners ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={colors.accent} />
            </View>
          ) : winners.length === 0 ? (
            <EmptyWinners />
          ) : (
            winners.map((winner) => (
              <WinnerCard
                key={`${winner.category}-${winner.restaurant_id}`}
                entry={winner}
                restaurantName={getRestaurantName(winner.restaurant_id)}
              />
            ))
          )}
          <TouchableOpacity style={styles.viewAllButton} onPress={handleViewLeaderboard}>
            <Text style={styles.viewAllText}>View Full Leaderboard</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.accent} />
          </TouchableOpacity>
        </View>

        {/* Vote Categories */}
        <SectionHeader title="Categories" subtitle="Cast your vote in any category" />
        <View style={styles.categoriesGrid}>
          {VOTING_CATEGORIES.map((category) => (
            <CategoryCard
              key={category.id}
              category={category}
              onPress={() => handleCategoryPress(category.id)}
              hasVoted={votedCategories.has(category.id)}
            />
          ))}
        </View>

        {/* How It Works */}
        <View style={styles.howItWorks}>
          <Text style={styles.howItWorksTitle}>How Voting Works</Text>
          <View style={styles.howItWorksSteps}>
            <View style={styles.step}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>1</Text>
              </View>
              <Text style={styles.stepText}>You get 4 votes per month</Text>
            </View>
            <View style={styles.step}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>2</Text>
              </View>
              <Text style={styles.stepText}>Vote for your favorites in each category</Text>
            </View>
            <View style={styles.step}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>3</Text>
              </View>
              <Text style={styles.stepText}>Winners earn badges on their listing</Text>
            </View>
          </View>
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
    backgroundColor: 'rgba(255, 215, 0, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 2,
    borderColor: 'rgba(255, 215, 0, 0.3)',
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
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  balanceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardBg,
    borderRadius: radius.lg,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  balanceIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: `${colors.accent}20`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  balanceContent: {
    flex: 1,
  },
  balanceTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 2,
  },
  balanceSubtitle: {
    fontSize: 13,
    color: colors.textMuted,
  },
  upgradeButton: {
    backgroundColor: colors.accent,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: radius.full,
  },
  upgradeButtonText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  sectionHeader: {
    paddingHorizontal: 16,
    paddingTop: 28,
    paddingBottom: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 2,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: colors.textMuted,
  },
  winnersSection: {
    paddingHorizontal: 16,
    gap: 10,
  },
  loadingContainer: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  emptyWinners: {
    backgroundColor: colors.cardBg,
    borderRadius: radius.lg,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  emptyWinnersTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginTop: 12,
    marginBottom: 4,
  },
  emptyWinnersText: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
  },
  winnerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.cardBg,
    borderRadius: radius.md,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  winnerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  winnerEmoji: {
    fontSize: 28,
  },
  winnerInfo: {
    flex: 1,
  },
  winnerCategory: {
    fontSize: 12,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  winnerRestaurant: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  winnerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 215, 0, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.sm,
    gap: 4,
  },
  winnerBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFD700',
    letterSpacing: 0.5,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 4,
  },
  viewAllText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.accent,
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    paddingHorizontal: 16,
    gap: 10,
  },
  badge: {
    width: CARD_SIZE,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
    borderRadius: radius.md,
    position: 'relative',
    overflow: 'hidden',
  },
  badgeVoted: {
    borderColor: colors.accent,
  },
  ribbonTop: {
    width: '100%',
    height: 40,
    borderTopLeftRadius: radius.md - 2,
    borderTopRightRadius: radius.md - 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeEmoji: {
    fontSize: 22,
  },
  badgeBody: {
    backgroundColor: colors.cardBg,
    width: '100%',
    paddingVertical: 8,
    paddingHorizontal: 4,
    alignItems: 'center',
  },
  badgeLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  ribbonTails: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-between',
  },
  ribbonTail: {
    width: '45%',
    height: 12,
  },
  ribbonTailLeft: {
    borderBottomLeftRadius: 6,
    transform: [{ skewY: '-10deg' }],
  },
  ribbonTailRight: {
    borderBottomRightRadius: 6,
    transform: [{ skewY: '10deg' }],
  },
  votedBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.primary,
  },
  howItWorks: {
    marginHorizontal: 16,
    marginTop: 32,
    backgroundColor: colors.cardBg,
    borderRadius: radius.lg,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  howItWorksTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 16,
    textAlign: 'center',
  },
  howItWorksSteps: {
    gap: 14,
  },
  step: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: `${colors.accent}30`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepNumberText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.accent,
  },
  stepText: {
    flex: 1,
    fontSize: 14,
    color: colors.textMuted,
  },
});
