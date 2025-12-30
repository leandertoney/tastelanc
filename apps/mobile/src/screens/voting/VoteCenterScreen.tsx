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
import type { RootStackParamList } from '../../navigation/types';
import type { VoteCategory, LeaderboardEntry } from '../../types/voting';
import {
  useVoteBalance,
  useCurrentWinners,
  useCurrentMonthVotes,
} from '../../hooks/useVotes';
import { useRestaurants } from '../../hooks/useRestaurants';
import { colors, radius } from '../../constants/colors';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_SIZE = (SCREEN_WIDTH - 48 - 24) / 4;

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

function WinnerCard({
  entry,
  restaurantName,
  onPress,
}: {
  entry: LeaderboardEntry;
  restaurantName: string;
  onPress: () => void;
}) {
  const categoryInfo = VOTING_CATEGORIES.find((c) => c.id === entry.category);

  return (
    <TouchableOpacity style={styles.winnerCard} onPress={onPress} activeOpacity={0.8}>
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
        <Text style={styles.winnerBadgeText}>WINNER</Text>
      </View>
    </TouchableOpacity>
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

export default function VoteCenterScreen() {
  const navigation = useNavigation<NavigationProp>();

  const { votesAvailable, nextReset, isLoading: isLoadingBalance, refetch: refetchBalance } = useVoteBalance();
  const { winners, isLoading: isLoadingWinners, refetch: refetchWinners } = useCurrentWinners();
  const { votes: monthVotes, refetch: refetchVotes } = useCurrentMonthVotes();
  const { data: restaurants = [] } = useRestaurants({ limit: 100 });

  const currentMonth = new Date().toLocaleDateString('en-US', { month: 'long' });
  const resetDate = nextReset
    ? new Date(nextReset).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    : 'Next month';

  const getRestaurantName = useCallback(
    (restaurantId: string) => {
      const restaurant = restaurants.find((r) => r.id === restaurantId);
      return restaurant?.name || 'Unknown Restaurant';
    },
    [restaurants]
  );

  const votedCategories = new Set(monthVotes.map((v) => v.category));

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

  const handleViewHistory = () => {
    navigation.navigate('VoteHistory');
  };

  const isLoading = isLoadingBalance || isLoadingWinners;

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={styles.headerTitle}>Vote Center</Text>
          <Text style={styles.headerSubtitle}>Lancaster's Best</Text>
        </View>
        <TouchableOpacity style={styles.historyButton} onPress={handleViewHistory}>
          <Ionicons name="time-outline" size={24} color={colors.text} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={handleRefresh}
            tintColor={colors.accent}
          />
        }
      >
        {/* Vote Balance Card */}
        <View style={styles.balanceCard}>
          <View style={styles.balanceIconContainer}>
            <Ionicons name="checkbox" size={28} color={colors.accent} />
          </View>
          <View style={styles.balanceContent}>
            <Text style={styles.balanceNumber}>{votesAvailable}</Text>
            <Text style={styles.balanceLabel}>
              vote{votesAvailable !== 1 ? 's' : ''} remaining
            </Text>
            <Text style={styles.balanceReset}>Resets {resetDate}</Text>
          </View>
        </View>

        {/* Categories Section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Cast Your Vote</Text>
          <Text style={styles.sectionSubtitle}>Choose a category</Text>
        </View>

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

        {/* Current Winners */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{currentMonth} Winners</Text>
          <TouchableOpacity onPress={handleViewLeaderboard}>
            <Text style={styles.viewAllLink}>View All</Text>
          </TouchableOpacity>
        </View>

        {isLoadingWinners ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color={colors.accent} />
          </View>
        ) : winners.length === 0 ? (
          <View style={styles.emptyWinners}>
            <Ionicons name="trophy-outline" size={32} color={colors.textSecondary} />
            <Text style={styles.emptyText}>No winners yet this month</Text>
          </View>
        ) : (
          <View style={styles.winnersSection}>
            {winners.slice(0, 4).map((winner) => (
              <WinnerCard
                key={`${winner.category}-${winner.restaurant_id}`}
                entry={winner}
                restaurantName={getRestaurantName(winner.restaurant_id)}
                onPress={() => navigation.navigate('RestaurantDetail', { id: winner.restaurant_id })}
              />
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    padding: 4,
    marginRight: 12,
  },
  headerText: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  headerSubtitle: {
    fontSize: 14,
    color: colors.textMuted,
    marginTop: 2,
  },
  historyButton: {
    padding: 4,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  balanceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardBg,
    margin: 16,
    padding: 20,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 16,
  },
  balanceIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: `${colors.accent}20`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  balanceContent: {
    flex: 1,
  },
  balanceNumber: {
    fontSize: 36,
    fontWeight: '700',
    color: colors.text,
  },
  balanceLabel: {
    fontSize: 16,
    color: colors.textMuted,
    marginTop: -4,
  },
  balanceReset: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 4,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: colors.textMuted,
  },
  viewAllLink: {
    fontSize: 14,
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
  loadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyWinners: {
    backgroundColor: colors.cardBg,
    marginHorizontal: 16,
    padding: 32,
    borderRadius: radius.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    gap: 8,
  },
  emptyText: {
    fontSize: 14,
    color: colors.textMuted,
  },
  winnersSection: {
    paddingHorizontal: 16,
    gap: 10,
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
});
