import { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/types';
import type { VoteCategory } from '../../types/voting';
import { useUserVotes } from '../../hooks/useVotes';
import { useRestaurants } from '../../hooks/useRestaurants';
import { colors, radius } from '../../constants/colors';
import { BRAND } from '../../config/brand';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const VOTING_CATEGORIES: Record<VoteCategory, { label: string; emoji: string }> = {
  best_wings: { label: 'Best Wings', emoji: '🍗' },
  best_burgers: { label: 'Best Burgers', emoji: '🍔' },
  best_pizza: { label: 'Best Pizza', emoji: '🍕' },
  best_cocktails: { label: 'Best Cocktails', emoji: '🍸' },
  best_happy_hour: { label: 'Best Happy Hour', emoji: '🍻' },
  best_brunch: { label: 'Best Brunch', emoji: '🥞' },
  best_late_night: { label: 'Best Late Night', emoji: '🌙' },
  best_live_music: { label: 'Best Live Music', emoji: '🎵' },
};

interface VoteHistoryItem {
  id: string;
  restaurant_id: string;
  category: VoteCategory;
  month: string;
  created_at: string;
}

function VoteCard({
  vote,
  restaurantName,
  onPress,
}: {
  vote: VoteHistoryItem;
  restaurantName: string;
  onPress: () => void;
}) {
  const categoryInfo = VOTING_CATEGORIES[vote.category];
  const voteDate = new Date(vote.created_at);
  const formattedDate = voteDate.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  // Parse month (format: "2024-12")
  const [year, month] = vote.month.split('-');
  const monthName = new Date(parseInt(year), parseInt(month) - 1).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  return (
    <TouchableOpacity style={styles.voteCard} onPress={onPress} activeOpacity={0.8}>
      <View style={styles.voteLeft}>
        <Text style={styles.voteEmoji}>{categoryInfo?.emoji || '🏆'}</Text>
        <View style={styles.voteInfo}>
          <Text style={styles.voteCategory}>{categoryInfo?.label || 'Vote'}</Text>
          <Text style={styles.voteRestaurant} numberOfLines={1}>
            {restaurantName}
          </Text>
          <Text style={styles.voteDate}>{formattedDate}</Text>
        </View>
      </View>
      <View style={styles.votePeriod}>
        <Text style={styles.votePeriodText}>{monthName}</Text>
        <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
      </View>
    </TouchableOpacity>
  );
}

function EmptyHistory() {
  const navigation = useNavigation<NavigationProp>();

  return (
    <View style={styles.emptyState}>
      <View style={styles.emptyIconContainer}>
        <Ionicons name="time-outline" size={48} color={colors.textSecondary} />
      </View>
      <Text style={styles.emptyTitle}>No Votes Yet</Text>
      <Text style={styles.emptySubtitle}>
        {`Your voting history will appear here once you start voting for ${BRAND.cityPossessive} best!`}
      </Text>
      <TouchableOpacity
        style={styles.startVotingButton}
        onPress={() => navigation.navigate('VoteCenter')}
      >
        <Ionicons name="checkbox-outline" size={18} color={colors.text} />
        <Text style={styles.startVotingText}>Start Voting</Text>
      </TouchableOpacity>
    </View>
  );
}

export default function VoteHistoryScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { votes, isLoading, refetch } = useUserVotes();
  const { data: restaurants = [] } = useRestaurants({ limit: 100 });

  const getRestaurantName = useCallback(
    (restaurantId: string) => {
      const restaurant = restaurants.find((r) => r.id === restaurantId);
      return restaurant?.name || 'Unknown Restaurant';
    },
    [restaurants]
  );

  const handleVotePress = (vote: VoteHistoryItem) => {
    navigation.navigate('RestaurantDetail', { id: vote.restaurant_id });
  };

  // Group votes by month
  const groupedVotes = votes.reduce(
    (acc, vote) => {
      const monthYear = vote.month;
      if (!acc[monthYear]) {
        acc[monthYear] = [];
      }
      acc[monthYear].push(vote);
      return acc;
    },
    {} as Record<string, VoteHistoryItem[]>
  );

  // Sort months in descending order
  const sortedMonths = Object.keys(groupedVotes).sort((a, b) => b.localeCompare(a));

  // Flatten into sections for FlatList
  const flattenedData: (string | VoteHistoryItem)[] = [];
  sortedMonths.forEach((month) => {
    flattenedData.push(month); // Section header
    flattenedData.push(...groupedVotes[month]);
  });

  const renderItem = ({ item }: { item: string | VoteHistoryItem }) => {
    if (typeof item === 'string') {
      // Section header
      const [year, month] = item.split('-');
      const monthName = new Date(parseInt(year), parseInt(month) - 1).toLocaleDateString('en-US', {
        month: 'long',
        year: 'numeric',
      });
      return (
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{monthName}</Text>
          <Text style={styles.sectionCount}>
            {groupedVotes[item].length} vote{groupedVotes[item].length !== 1 ? 's' : ''}
          </Text>
        </View>
      );
    }

    return (
      <VoteCard
        vote={item}
        restaurantName={getRestaurantName(item.restaurant_id)}
        onPress={() => handleVotePress(item)}
      />
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={styles.headerTitle}>Vote History</Text>
          <Text style={styles.headerSubtitle}>
            {votes.length} total vote{votes.length !== 1 ? 's' : ''}
          </Text>
        </View>
      </View>

      {isLoading ? (
        <View style={styles.loadingState}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={styles.loadingText}>Loading your votes...</Text>
        </View>
      ) : votes.length === 0 ? (
        <EmptyHistory />
      ) : (
        <FlatList
          data={flattenedData}
          keyExtractor={(item, index) =>
            typeof item === 'string' ? `header-${item}` : item.id
          }
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isLoading}
              onRefresh={refetch}
              tintColor={colors.accent}
            />
          }
        />
      )}
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
  loadingState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 16,
    color: colors.textMuted,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.cardBg,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 15,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  startVotingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.accent,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: radius.full,
    gap: 8,
  },
  startVotingText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  listContent: {
    paddingBottom: 40,
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
  sectionCount: {
    fontSize: 14,
    color: colors.textMuted,
  },
  voteCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.cardBg,
    marginHorizontal: 16,
    marginBottom: 10,
    padding: 16,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  voteLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 14,
  },
  voteEmoji: {
    fontSize: 32,
  },
  voteInfo: {
    flex: 1,
  },
  voteCategory: {
    fontSize: 12,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  voteRestaurant: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginTop: 2,
  },
  voteDate: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 4,
  },
  votePeriod: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  votePeriodText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
});
