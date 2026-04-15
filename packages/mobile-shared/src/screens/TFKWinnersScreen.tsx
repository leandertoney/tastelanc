import { View, Text, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';

import type { RootStackParamList } from '../navigation/types';
import { getColors } from '../config/theme';
import { createLazyStyles } from '../utils/lazyStyles';
import { spacing, radius } from '../constants/spacing';
import { useMarket } from '../context/MarketContext';
import { getSupabase } from '../config/theme';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface TriviaWinner {
  id: string;
  player_name: string;
  venue_name: string;
  nightly_date: string;
  prize_description: string | null;
  email_verified: boolean;
  week_start: string;
  score: number;
  is_winner: boolean;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00');
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${days[date.getDay()]}, ${months[date.getMonth()]} ${date.getDate()}`;
}

function WinnerRow({ winner, rank }: { winner: TriviaWinner; rank: number }) {
  const styles = useStyles();
  const colors = getColors();

  return (
    <View style={styles.row}>
      <View style={styles.rankContainer}>
        <Text style={styles.rankText}>#{rank}</Text>
      </View>
      {winner.is_winner && (
        <View style={styles.trophyIcon}>
          <Ionicons name="trophy" size={20} color="#FFD700" />
        </View>
      )}
      <View style={styles.rowContent}>
        <Text style={styles.teamName} numberOfLines={1}>
          {winner.player_name}
        </Text>
        <Text style={styles.scoreText}>{winner.score} pts</Text>
        <Text style={styles.venueText} numberOfLines={1}>
          {winner.venue_name} · {formatDate(winner.nightly_date)}
        </Text>
      </View>
      {winner.is_winner && (
        <View style={styles.statusBadge}>
          {winner.email_verified ? (
            <View style={styles.claimedBadge}>
              <Ionicons name="checkmark-circle" size={14} color="#10b981" />
              <Text style={styles.claimedText}>Claimed</Text>
            </View>
          ) : (
            <View style={styles.pendingBadge}>
              <Ionicons name="time-outline" size={14} color="#f59e0b" />
              <Text style={styles.pendingText}>Pending</Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

export default function TFKWinnersScreen() {
  const navigation = useNavigation<NavigationProp>();
  const styles = useStyles();
  const colors = getColors();
  const { marketSlug } = useMarket();

  const { data: winners = [], isLoading } = useQuery({
    queryKey: ['tfk-winners', marketSlug],
    queryFn: async () => {
      const supabase = getSupabase();
      const { data: market } = await supabase
        .from('markets')
        .select('id')
        .eq('slug', marketSlug)
        .single();

      if (!market) return [];

      const { data, error } = await supabase
        .from('trivia_leaderboard_entries')
        .select('id, player_name, venue_name, nightly_date, prize_description, email_verified, week_start, score, is_winner')
        .eq('market_id', market.id)
        .eq('is_active', true)
        .order('score', { ascending: false })
        .order('nightly_date', { ascending: false });

      if (error) {
        console.error('TFK winners error:', error);
        return [];
      }

      return data as TriviaWinner[];
    },
    enabled: !!marketSlug,
  });

  // Winners are already sorted by score (highest first)
  // No need to group by week - just show as a ranked list

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>TFK Trivia Winners</Text>
      </View>

      {/* Subtitle */}
      <View style={styles.subtitleContainer}>
        <Ionicons name="trophy" size={20} color="#FFD700" />
        <Text style={styles.subtitle}>Best Scores - Nightly Winners Marked with 🏆</Text>
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.accent} />
        </View>
      ) : winners.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="beer-outline" size={48} color={colors.textSecondary} />
          <Text style={styles.emptyText}>No winners yet!</Text>
          <Text style={styles.emptySubtext}>
            Play Thirsty for Knowledge trivia to be the first
          </Text>
        </View>
      ) : (
        <>
          <FlatList
            data={winners}
            keyExtractor={(item) => item.id}
            renderItem={({ item, index }) => <WinnerRow winner={item} rank={index + 1} />}
            contentContainerStyle={{ paddingHorizontal: spacing.md, paddingBottom: spacing.xl }}
          />

          {/* Info Banner */}
          {winners.some(w => w.is_winner) && (
            <View style={styles.infoBanner}>
              <Ionicons name="trophy" size={20} color="#FFD700" />
              <Text style={styles.infoText}>
                🏆 Winners: Your $25 prize automatically appears in "My Deals" when you sign up!
              </Text>
            </View>
          )}
        </>
      )}
    </SafeAreaView>
  );
}

const useStyles = createLazyStyles(() => {
  const colors = getColors();
  return {
    container: {
      flex: 1,
      backgroundColor: colors.primary,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      gap: spacing.sm,
    },
    backBtn: {
      padding: 4,
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.text,
      flex: 1,
    },
    subtitleContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.xs,
      paddingBottom: spacing.md,
    },
    subtitle: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: spacing.md,
      gap: spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: colors.cardBg,
    },
    rankContainer: {
      width: 36,
      alignItems: 'center',
    },
    rankText: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.textSecondary,
    },
    trophyIcon: {
      width: 24,
      alignItems: 'center',
    },
    rowContent: {
      flex: 1,
      gap: 3,
    },
    teamName: {
      fontSize: 16,
      color: colors.text,
      fontWeight: '700',
    },
    scoreText: {
      fontSize: 15,
      color: colors.accent,
      fontWeight: '700',
    },
    venueText: {
      fontSize: 12,
      color: colors.textSecondary,
    },
    statusBadge: {
      flexShrink: 0,
    },
    claimedBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: '#10b98115',
      paddingHorizontal: spacing.sm,
      paddingVertical: 4,
      borderRadius: radius.sm,
    },
    claimedText: {
      fontSize: 11,
      fontWeight: '600',
      color: '#10b981',
    },
    pendingBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: '#f59e0b15',
      paddingHorizontal: spacing.sm,
      paddingVertical: 4,
      borderRadius: radius.sm,
    },
    pendingText: {
      fontSize: 11,
      fontWeight: '600',
      color: '#f59e0b',
    },
    center: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: spacing.xl,
      gap: spacing.sm,
    },
    emptyText: {
      fontSize: 16,
      color: colors.text,
      fontWeight: '600',
      marginTop: spacing.sm,
    },
    emptySubtext: {
      fontSize: 14,
      color: colors.textSecondary,
      textAlign: 'center',
    },
    infoBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      backgroundColor: `${colors.accent}15`,
      padding: spacing.md,
      margin: spacing.md,
      borderRadius: radius.md,
      borderLeftWidth: 3,
      borderLeftColor: colors.accent,
    },
    infoText: {
      flex: 1,
      fontSize: 12,
      color: colors.text,
      lineHeight: 16,
    },
  };
});
