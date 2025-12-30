import { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackScreenProps, NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/types';
import type { VoteCategory } from '../../types/voting';
import type { Restaurant } from '../../types/database';
import { useRestaurants } from '../../hooks/useRestaurants';
import {
  useVoteBalance,
  useSubmitVote,
  useCurrentMonthVotes,
} from '../../hooks/useVotes';
import { useBatchVotingEligibility } from '../../hooks/useVotingEligibility';
import { colors, radius } from '../../constants/colors';

type Props = NativeStackScreenProps<RootStackParamList, 'VoteRestaurant'>;

const VOTING_CATEGORIES: { id: VoteCategory; label: string; emoji: string }[] = [
  { id: 'best_wings', label: 'Wings', emoji: '🍗' },
  { id: 'best_burgers', label: 'Burgers', emoji: '🍔' },
  { id: 'best_pizza', label: 'Pizza', emoji: '🍕' },
  { id: 'best_cocktails', label: 'Cocktails', emoji: '🍸' },
  { id: 'best_happy_hour', label: 'Happy Hour', emoji: '🍻' },
  { id: 'best_brunch', label: 'Brunch', emoji: '🥞' },
  { id: 'best_late_night', label: 'Late Night', emoji: '🌙' },
  { id: 'best_live_music', label: 'Live Music', emoji: '🎵' },
];

function RestaurantVoteCard({
  restaurant,
  onVote,
  isVoting,
  isVoted,
  isEligible,
  isCheckingEligibility,
}: {
  restaurant: Restaurant;
  onVote: () => void;
  isVoting: boolean;
  isVoted: boolean;
  isEligible: boolean;
  isCheckingEligibility: boolean;
}) {
  const isDisabled = isVoting || isVoted || !isEligible || isCheckingEligibility;

  return (
    <View style={styles.restaurantCard}>
      <View style={styles.restaurantInfo}>
        <Text style={styles.restaurantName} numberOfLines={1}>
          {restaurant.name}
        </Text>
        <Text style={styles.restaurantAddress} numberOfLines={1}>
          {restaurant.address}
        </Text>
        {!isCheckingEligibility && !isEligible && !isVoted && (
          <Text style={styles.eligibilityMessage} numberOfLines={2}>
            You need to have visited {restaurant.name} this month to vote for them.
          </Text>
        )}
      </View>

      <TouchableOpacity
        style={[
          styles.voteButton,
          isVoted && styles.voteButtonVoted,
          isVoting && styles.voteButtonVoting,
          !isEligible && !isVoted && styles.voteButtonDisabled,
        ]}
        onPress={onVote}
        disabled={isDisabled}
        activeOpacity={0.7}
      >
        {isVoting || isCheckingEligibility ? (
          <ActivityIndicator size="small" color={colors.text} />
        ) : isVoted ? (
          <>
            <Ionicons name="checkmark" size={16} color={colors.text} />
            <Text style={styles.voteButtonText}>Voted</Text>
          </>
        ) : !isEligible ? (
          <>
            <Ionicons name="lock-closed" size={16} color={colors.textMuted} />
            <Text style={[styles.voteButtonText, styles.voteButtonTextDisabled]}>Visit</Text>
          </>
        ) : (
          <>
            <Ionicons name="checkbox-outline" size={16} color={colors.text} />
            <Text style={styles.voteButtonText}>Vote</Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );
}

export default function VoteRestaurantScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<Props['route']>();
  const { category } = route.params;

  const categoryInfo = VOTING_CATEGORIES.find((c) => c.id === category);
  const [votingRestaurantId, setVotingRestaurantId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const { data: restaurants = [], isLoading: isLoadingRestaurants } = useRestaurants({ limit: 50 });
  const { votesAvailable } = useVoteBalance();
  const { votes: monthVotes } = useCurrentMonthVotes();
  const submitVote = useSubmitVote();

  // Get all restaurant IDs for batch eligibility check
  const restaurantIds = useMemo(() => restaurants.map((r) => r.id), [restaurants]);
  const { eligibilityMap, isLoading: isCheckingEligibility } = useBatchVotingEligibility(restaurantIds);

  // Check if already voted in this category
  const hasVotedInCategory = monthVotes.some((v) => v.category === category);
  const votedRestaurantId = monthVotes.find((v) => v.category === category)?.restaurant_id;

  const handleVote = useCallback(
    async (restaurantId: string) => {
      // Check eligibility first
      const isEligible = eligibilityMap.get(restaurantId) ?? false;
      if (!isEligible) {
        const restaurant = restaurants.find((r) => r.id === restaurantId);
        Alert.alert(
          'Visit Required',
          `You need to have visited ${restaurant?.name || 'this restaurant'} this month to vote for them.`,
          [{ text: 'OK' }]
        );
        return;
      }

      if (votesAvailable <= 0) {
        Alert.alert(
          'No Votes Remaining',
          "You've used all your votes this month. Come back next month!",
          [{ text: 'OK' }]
        );
        return;
      }

      if (hasVotedInCategory) {
        Alert.alert(
          'Already Voted',
          `You've already voted in the ${categoryInfo?.label || 'this'} category this month.`,
          [{ text: 'OK' }]
        );
        return;
      }

      const restaurant = restaurants.find((r) => r.id === restaurantId);

      Alert.alert(
        'Confirm Vote',
        `Vote for ${restaurant?.name || 'this restaurant'} as Best ${categoryInfo?.label}?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Vote',
            onPress: async () => {
              setVotingRestaurantId(restaurantId);
              try {
                await submitVote.mutateAsync({ restaurantId, category });
                Alert.alert(
                  'Vote Submitted!',
                  `Thanks for voting! You have ${votesAvailable - 1} vote${votesAvailable - 1 !== 1 ? 's' : ''} remaining this month.`,
                  [{ text: 'OK', onPress: () => navigation.goBack() }]
                );
              } catch (error) {
                Alert.alert(
                  'Vote Failed',
                  error instanceof Error ? error.message : 'Failed to submit vote',
                  [{ text: 'OK' }]
                );
              } finally {
                setVotingRestaurantId(null);
              }
            },
          },
        ]
      );
    },
    [votesAvailable, hasVotedInCategory, category, categoryInfo, restaurants, submitVote, navigation, eligibilityMap]
  );

  const renderItem = useCallback(
    ({ item }: { item: Restaurant }) => (
      <RestaurantVoteCard
        restaurant={item}
        onVote={() => handleVote(item.id)}
        isVoting={votingRestaurantId === item.id}
        isVoted={votedRestaurantId === item.id}
        isEligible={eligibilityMap.get(item.id) ?? false}
        isCheckingEligibility={isCheckingEligibility}
      />
    ),
    [handleVote, votingRestaurantId, votedRestaurantId, eligibilityMap, isCheckingEligibility]
  );

  const filteredRestaurants = restaurants.filter((restaurant) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.trim().toLowerCase();
    return (
      restaurant.name.toLowerCase().includes(query) ||
      (restaurant.address?.toLowerCase().includes(query) ?? false)
    );
  });

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <View style={styles.headerTitleRow}>
            <Text style={styles.headerEmoji}>{categoryInfo?.emoji}</Text>
            <Text style={styles.headerTitle}>Best {categoryInfo?.label}</Text>
          </View>
          <Text style={styles.headerSubtitle}>
            {hasVotedInCategory
              ? 'You already voted in this category'
              : `Select a restaurant to vote • ${votesAvailable} vote${votesAvailable !== 1 ? 's' : ''} left`}
          </Text>
        </View>
      </View>

      {/* Status Banner */}
      {hasVotedInCategory && (
        <View style={styles.statusBanner}>
          <Ionicons name="checkmark-circle" size={20} color={colors.success} />
          <Text style={styles.statusText}>
            Your vote has been recorded for this category!
          </Text>
        </View>
      )}

      {/* Restaurant List */}
      {isLoadingRestaurants ? (
        <View style={styles.loadingState}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={styles.loadingText}>Loading restaurants...</Text>
        </View>
      ) : (
        <>
          <View style={styles.searchBar}>
            <Ionicons name="search" size={18} color={colors.textMuted} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search restaurants"
              placeholderTextColor={colors.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="search"
              clearButtonMode="while-editing"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={10}>
                <Ionicons name="close-circle" size={18} color={colors.textMuted} />
              </TouchableOpacity>
            )}
          </View>

          <FlatList
            data={filteredRestaurants}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Text style={styles.emptyTitle}>No Restaurants</Text>
                <Text style={styles.emptySubtitle}>
                  {searchQuery.trim()
                    ? 'No matches found. Try a different name.'
                    : 'No restaurants available for voting'}
                </Text>
              </View>
            }
          />
        </>
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
    paddingVertical: 16,
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
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerEmoji: {
    fontSize: 24,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  headerSubtitle: {
    fontSize: 14,
    color: colors.textMuted,
    marginTop: 4,
  },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${colors.success}15`,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  statusText: {
    fontSize: 14,
    color: colors.success,
    fontWeight: '500',
  },
  listContent: {
    padding: 16,
    paddingBottom: 24,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.inputBg,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 4,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    color: colors.text,
    fontSize: 15,
  },
  restaurantCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardBg,
    borderRadius: radius.md,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  restaurantInfo: {
    flex: 1,
    marginRight: 12,
  },
  restaurantName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  restaurantAddress: {
    fontSize: 13,
    color: colors.textMuted,
  },
  eligibilityMessage: {
    fontSize: 11,
    color: colors.warning || '#FFA500',
    marginTop: 4,
    fontStyle: 'italic',
  },
  voteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.accent,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: radius.full,
    gap: 6,
    minWidth: 90,
    justifyContent: 'center',
  },
  voteButtonVoted: {
    backgroundColor: colors.success,
  },
  voteButtonVoting: {
    backgroundColor: colors.cardBgElevated,
  },
  voteButtonDisabled: {
    backgroundColor: colors.cardBgElevated,
    opacity: 0.6,
  },
  voteButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  voteButtonTextDisabled: {
    color: colors.textMuted,
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
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
  },
});
