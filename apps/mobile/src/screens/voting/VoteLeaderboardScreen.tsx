import { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackScreenProps, NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/types';
import type { VoteCategory, LeaderboardEntry } from '../../types/voting';
import { useLeaderboard } from '../../hooks/useVotes';
import { useRestaurants } from '../../hooks/useRestaurants';
import { colors, radius } from '../../constants/colors';

type Props = NativeStackScreenProps<RootStackParamList, 'VoteLeaderboard'>;

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

const TIER_STYLES: Record<string, { color: string; bg: string; icon: string }> = {
  top_pick: { color: '#FFD700', bg: 'rgba(255, 215, 0, 0.15)', icon: 'trophy' },
  leading_pick: { color: '#C0C0C0', bg: 'rgba(192, 192, 192, 0.15)', icon: 'medal' },
  local_favorite: { color: colors.accent, bg: `${colors.accent}20`, icon: 'star' },
  on_the_board: { color: colors.textMuted, bg: colors.cardBgElevated, icon: 'ribbon' },
};

function CategoryPill({
  category,
  isSelected,
  onPress,
}: {
  category: (typeof VOTING_CATEGORIES)[number];
  isSelected: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.categoryPill, isSelected && styles.categoryPillSelected]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={styles.categoryPillEmoji}>{category.emoji}</Text>
      <Text style={[styles.categoryPillLabel, isSelected && styles.categoryPillLabelSelected]}>
        {category.label}
      </Text>
    </TouchableOpacity>
  );
}

function LeaderboardItem({
  entry,
  rank,
  restaurantName,
  onPress,
}: {
  entry: LeaderboardEntry & { vote_count?: number };
  rank: number;
  restaurantName: string;
  onPress: () => void;
}) {
  const tierStyle = TIER_STYLES[entry.tier] || TIER_STYLES.on_the_board;

  return (
    <TouchableOpacity style={styles.leaderboardItem} onPress={onPress} activeOpacity={0.8}>
      <View style={styles.rankContainer}>
        <Text style={[styles.rankText, rank <= 3 && { color: tierStyle.color }]}>
          {rank}
        </Text>
      </View>

      <View style={styles.itemContent}>
        <Text style={styles.restaurantName} numberOfLines={1}>
          {restaurantName}
        </Text>
        <View style={styles.itemMeta}>
          <View style={[styles.tierBadge, { backgroundColor: tierStyle.bg }]}>
            <Ionicons name={tierStyle.icon as any} size={12} color={tierStyle.color} />
            <Text style={[styles.tierText, { color: tierStyle.color }]}>
              {entry.tier.replace('_', ' ').toUpperCase()}
            </Text>
          </View>
          {entry.vote_count !== undefined && (
            <Text style={styles.voteCount}>
              {entry.vote_count} vote{entry.vote_count !== 1 ? 's' : ''}
            </Text>
          )}
        </View>
      </View>

      <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
    </TouchableOpacity>
  );
}

function EmptyLeaderboard({ category }: { category: VoteCategory }) {
  const categoryInfo = VOTING_CATEGORIES.find((c) => c.id === category);

  return (
    <View style={styles.emptyState}>
      <Text style={styles.emptyEmoji}>{categoryInfo?.emoji || '🏆'}</Text>
      <Text style={styles.emptyTitle}>No Votes Yet</Text>
      <Text style={styles.emptySubtitle}>
        Be the first to vote for{'\n'}Best {categoryInfo?.label || 'in this category'}!
      </Text>
    </View>
  );
}

export default function VoteLeaderboardScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<Props['route']>();
  const initialCategory = route.params?.category || 'best_wings';

  const [selectedCategory, setSelectedCategory] = useState<VoteCategory>(initialCategory);
  const { entries, isLoading } = useLeaderboard(selectedCategory);
  const { data: restaurants = [] } = useRestaurants({ limit: 100 });

  const currentMonth = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const getRestaurantName = useCallback(
    (restaurantId: string) => {
      const restaurant = restaurants.find((r) => r.id === restaurantId);
      return restaurant?.name || 'Unknown Restaurant';
    },
    [restaurants]
  );

  const handleRestaurantPress = useCallback(
    (restaurantId: string) => {
      navigation.navigate('RestaurantDetail', { id: restaurantId });
    },
    [navigation]
  );

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={styles.headerTitle}>Leaderboard</Text>
          <Text style={styles.headerSubtitle}>{currentMonth}</Text>
        </View>
      </View>

      {/* Category Pills */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoryList}
      >
        {VOTING_CATEGORIES.map((category) => (
          <CategoryPill
            key={category.id}
            category={category}
            isSelected={selectedCategory === category.id}
            onPress={() => setSelectedCategory(category.id)}
          />
        ))}
      </ScrollView>

      {/* Leaderboard Content */}
      {isLoading ? (
        <View style={styles.loadingState}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      ) : entries.length === 0 ? (
        <EmptyLeaderboard category={selectedCategory} />
      ) : (
        <FlatList
          data={entries}
          keyExtractor={(item) => `${item.restaurant_id}-${item.category}`}
          renderItem={({ item, index }) => (
            <LeaderboardItem
              entry={item}
              rank={index + 1}
              restaurantName={getRestaurantName(item.restaurant_id)}
              onPress={() => handleRestaurantPress(item.restaurant_id)}
            />
          )}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
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
  categoryList: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 10,
  },
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardBg,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: radius.full,
    gap: 6,
    marginRight: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  categoryPillSelected: {
    backgroundColor: `${colors.accent}20`,
    borderColor: colors.accent,
  },
  categoryPillEmoji: {
    fontSize: 16,
  },
  categoryPillLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textMuted,
  },
  categoryPillLabelSelected: {
    color: colors.text,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  leaderboardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardBg,
    borderRadius: radius.md,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  rankContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.cardBgElevated,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  rankText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  itemContent: {
    flex: 1,
  },
  restaurantName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 6,
  },
  itemMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  tierBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.sm,
    gap: 4,
  },
  tierText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  voteCount: {
    fontSize: 13,
    color: colors.textMuted,
  },
  loadingState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyEmoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 16,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 24,
  },
});
