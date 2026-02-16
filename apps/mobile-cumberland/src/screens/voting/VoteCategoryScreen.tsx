import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/types';
import type { VoteCategory } from '../../types/voting';
import { useCurrentMonthVotes, useLeaderboard } from '../../hooks/useVotes';
import { useRestaurants } from '../../hooks/useRestaurants';
import { colors, radius } from '../../constants/colors';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const VOTING_CATEGORIES: { id: VoteCategory; label: string; emoji: string; description: string }[] = [
  { id: 'best_wings', label: 'Best Wings', emoji: '🍗', description: 'Crispy, saucy, and finger-lickin good' },
  { id: 'best_burgers', label: 'Best Burgers', emoji: '🍔', description: 'Juicy patties and perfect buns' },
  { id: 'best_pizza', label: 'Best Pizza', emoji: '🍕', description: 'Cheese pulls and crispy crusts' },
  { id: 'best_cocktails', label: 'Best Cocktails', emoji: '🍸', description: 'Craft drinks and creative mixes' },
  { id: 'best_happy_hour', label: 'Best Happy Hour', emoji: '🍻', description: 'Great deals on drinks and apps' },
  { id: 'best_brunch', label: 'Best Brunch', emoji: '🥞', description: 'Weekend vibes and mimosas' },
  { id: 'best_late_night', label: 'Best Late Night', emoji: '🌙', description: 'Open late when you need a bite' },
  { id: 'best_live_music', label: 'Best Live Music', emoji: '🎵', description: 'Local bands and good acoustics' },
];

function CategoryRow({
  category,
  hasVoted,
  currentLeader,
  onVote,
  onViewLeaderboard,
}: {
  category: (typeof VOTING_CATEGORIES)[number];
  hasVoted: boolean;
  currentLeader: string | null;
  onVote: () => void;
  onViewLeaderboard: () => void;
}) {
  return (
    <View style={styles.categoryRow}>
      <View style={styles.categoryHeader}>
        <Text style={styles.categoryEmoji}>{category.emoji}</Text>
        <View style={styles.categoryInfo}>
          <Text style={styles.categoryLabel}>{category.label}</Text>
          <Text style={styles.categoryDescription}>{category.description}</Text>
        </View>
        {hasVoted && (
          <View style={styles.votedIndicator}>
            <Ionicons name="checkmark-circle" size={20} color={colors.success} />
          </View>
        )}
      </View>

      {currentLeader && (
        <View style={styles.leaderPreview}>
          <Ionicons name="trophy" size={14} color="#FFD700" />
          <Text style={styles.leaderText}>Current leader: {currentLeader}</Text>
        </View>
      )}

      <View style={styles.categoryActions}>
        <TouchableOpacity
          style={[styles.voteButton, hasVoted && styles.voteButtonDisabled]}
          onPress={onVote}
          disabled={hasVoted}
          activeOpacity={0.7}
        >
          <Ionicons
            name={hasVoted ? 'checkmark' : 'checkbox-outline'}
            size={16}
            color={colors.text}
          />
          <Text style={styles.voteButtonText}>
            {hasVoted ? 'Voted' : 'Vote'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.leaderboardButton}
          onPress={onViewLeaderboard}
          activeOpacity={0.7}
        >
          <Ionicons name="podium-outline" size={16} color={colors.accent} />
          <Text style={styles.leaderboardButtonText}>Leaderboard</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function VoteCategoryScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { votes: monthVotes } = useCurrentMonthVotes();
  const { data: restaurants = [] } = useRestaurants({ limit: 100 });

  // Get current leaders for each category
  const getLeaderForCategory = (categoryId: VoteCategory) => {
    // This is simplified - in reality you'd want to fetch this from the leaderboard
    return null;
  };

  const votedCategories = new Set(monthVotes.map((v) => v.category));

  const handleVote = (category: VoteCategory) => {
    navigation.navigate('VoteRestaurant', { category });
  };

  const handleViewLeaderboard = (category: VoteCategory) => {
    navigation.navigate('VoteLeaderboard', { category });
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={styles.headerTitle}>Categories</Text>
          <Text style={styles.headerSubtitle}>Choose a category to vote in</Text>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {VOTING_CATEGORIES.map((category) => (
          <CategoryRow
            key={category.id}
            category={category}
            hasVoted={votedCategories.has(category.id)}
            currentLeader={getLeaderForCategory(category.id)}
            onVote={() => handleVote(category.id)}
            onViewLeaderboard={() => handleViewLeaderboard(category.id)}
          />
        ))}

        {/* Info Card */}
        <View style={styles.infoCard}>
          <Ionicons name="information-circle" size={20} color={colors.accent} />
          <Text style={styles.infoText}>
            You can vote once per category each month. Winners earn badges displayed on their restaurant listing!
          </Text>
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
    gap: 12,
  },
  categoryRow: {
    backgroundColor: colors.cardBg,
    borderRadius: radius.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  categoryEmoji: {
    fontSize: 32,
  },
  categoryInfo: {
    flex: 1,
  },
  categoryLabel: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.text,
  },
  categoryDescription: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 2,
  },
  votedIndicator: {
    padding: 4,
  },
  leaderPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.md,
    gap: 6,
  },
  leaderText: {
    fontSize: 13,
    color: colors.textMuted,
    flex: 1,
  },
  categoryActions: {
    flexDirection: 'row',
    marginTop: 14,
    gap: 10,
  },
  voteButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accent,
    paddingVertical: 12,
    borderRadius: radius.full,
    gap: 6,
  },
  voteButtonDisabled: {
    backgroundColor: colors.success,
  },
  voteButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  leaderboardButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.cardBgElevated,
    paddingVertical: 12,
    borderRadius: radius.full,
    gap: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  leaderboardButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.accent,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: `${colors.accent}10`,
    padding: 16,
    borderRadius: radius.lg,
    gap: 12,
    marginTop: 8,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: colors.textMuted,
    lineHeight: 20,
  },
});
