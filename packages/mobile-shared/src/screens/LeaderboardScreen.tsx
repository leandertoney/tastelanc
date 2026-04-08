import { useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import { useLeaderboard } from '../hooks/useLeaderboard';
import type { LeaderboardEntry } from '../types/retention';
import { getColors } from '../config/theme';
import { createLazyStyles } from '../utils/lazyStyles';
import { spacing, radius } from '../constants/spacing';

type Metric = 'checkin_count' | 'unique_restaurants';

const RANK_COLORS: Record<number, string> = {
  1: '#FFD700',
  2: '#C0C0C0',
  3: '#CD7F32',
};

function RankBadge({ rank }: { rank: number }) {
  const styles = useStyles();
  const bg = RANK_COLORS[rank];
  return (
    <View style={[styles.rankBadge, bg ? { backgroundColor: bg } : null]}>
      <Text style={[styles.rankText, bg ? { color: '#000' } : null]}>#{rank}</Text>
    </View>
  );
}

function LeaderboardRow({ entry, metric }: { entry: LeaderboardEntry; metric: Metric }) {
  const styles = useStyles();
  const colors = getColors();
  const value = metric === 'checkin_count' ? entry.checkin_count : entry.unique_restaurants;
  const displayName = entry.display_name || 'Anonymous';

  return (
    <View style={[styles.row, entry.is_current_user && styles.rowHighlight]}>
      <RankBadge rank={entry.rank} />
      <Text style={styles.displayName} numberOfLines={1}>
        {displayName}
        {entry.is_current_user ? ' (You)' : ''}
      </Text>
      <Text style={styles.metric}>{value}</Text>
    </View>
  );
}

export default function LeaderboardScreen() {
  const navigation = useNavigation();
  const styles = useStyles();
  const colors = getColors();
  const [metric, setMetric] = useState<Metric>('checkin_count');
  const { data, isLoading } = useLeaderboard();

  const sortedTop10 = [...(data?.top10 ?? [])].sort(
    (a, b) =>
      (metric === 'checkin_count' ? b.checkin_count - a.checkin_count : b.unique_restaurants - a.unique_restaurants)
  );

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>This Week's Top Explorers</Text>
      </View>

      {/* Metric tabs */}
      <View style={styles.tabs}>
        {(['checkin_count', 'unique_restaurants'] as Metric[]).map((m) => (
          <TouchableOpacity
            key={m}
            style={[styles.tab, metric === m && styles.tabActive]}
            onPress={() => setMetric(m)}
          >
            <Text style={[styles.tabText, metric === m && styles.tabTextActive]}>
              {m === 'checkin_count' ? 'Visits' : 'Unique Spots'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.accent} />
        </View>
      ) : (
        <FlatList
          data={sortedTop10}
          keyExtractor={(item) => item.user_id}
          renderItem={({ item }) => <LeaderboardRow entry={item} metric={metric} />}
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={styles.emptyText}>No check-ins this week yet. Be first!</Text>
            </View>
          }
          ListFooterComponent={
            data?.currentUserEntry && !sortedTop10.find((e) => e.is_current_user) ? (
              <View>
                <View style={styles.divider} />
                <LeaderboardRow entry={data.currentUserEntry} metric={metric} />
              </View>
            ) : null
          }
          contentContainerStyle={{ paddingHorizontal: spacing.md, paddingBottom: spacing.xl }}
        />
      )}

      <Text style={styles.footnote}>Resets every Monday • Market rankings only</Text>
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
    tabs: {
      flexDirection: 'row',
      marginHorizontal: spacing.md,
      marginBottom: spacing.md,
      backgroundColor: colors.cardBg,
      borderRadius: radius.md,
      padding: 3,
    },
    tab: {
      flex: 1,
      paddingVertical: spacing.xs,
      alignItems: 'center',
      borderRadius: radius.sm,
    },
    tabActive: {
      backgroundColor: colors.accent,
    },
    tabText: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    tabTextActive: {
      color: colors.textOnAccent,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: spacing.sm,
      gap: spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: colors.cardBg,
    },
    rowHighlight: {
      backgroundColor: `${colors.accent}15`,
      borderRadius: radius.sm,
      paddingHorizontal: spacing.xs,
    },
    rankBadge: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.cardBg,
      alignItems: 'center',
      justifyContent: 'center',
    },
    rankText: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.text,
    },
    displayName: {
      flex: 1,
      fontSize: 14,
      color: colors.text,
      fontWeight: '500',
    },
    metric: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.accent,
      minWidth: 30,
      textAlign: 'right',
    },
    divider: {
      height: 1,
      backgroundColor: colors.cardBg,
      marginVertical: spacing.sm,
    },
    center: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: spacing.xl,
    },
    emptyText: {
      fontSize: 14,
      color: colors.textSecondary,
      textAlign: 'center',
    },
    footnote: {
      textAlign: 'center',
      fontSize: 11,
      color: colors.textSecondary,
      paddingBottom: spacing.md,
    },
  };
});
