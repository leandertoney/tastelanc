import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing } from '../../constants/colors';
import { ACTION_ICONS, ACTION_LABELS, type RewardsHistoryItem } from '../../lib/rewards';

interface PointsHistoryListProps {
  items: RewardsHistoryItem[];
  isLoading: boolean;
  hasMore: boolean;
  isFetchingMore: boolean;
  onLoadMore: () => void;
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days === 0) {
    return 'Today';
  } else if (days === 1) {
    return 'Yesterday';
  } else if (days < 7) {
    return `${days} days ago`;
  } else {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  }
}

function HistoryItem({ item }: { item: RewardsHistoryItem }) {
  const iconName = ACTION_ICONS[item.action_type] || 'star';
  const actionLabel = ACTION_LABELS[item.action_type] || item.action_type;
  const hasMultiplier = item.multiplier > 1;

  return (
    <View style={styles.itemContainer}>
      <View style={styles.iconContainer}>
        <Ionicons
          name={iconName as any}
          size={20}
          color={colors.accent}
        />
      </View>

      <View style={styles.itemContent}>
        <Text style={styles.actionType}>{actionLabel}</Text>
        <Text style={styles.restaurantName} numberOfLines={1}>
          {item.restaurant_name}
        </Text>
      </View>

      <View style={styles.pointsContainer}>
        <Text style={styles.pointsEarned}>+{item.points_earned}</Text>
        {hasMultiplier && (
          <View style={styles.multiplierBadge}>
            <Text style={styles.multiplierText}>{item.multiplier}x</Text>
          </View>
        )}
      </View>

      <Text style={styles.date}>{formatDate(item.created_at)}</Text>
    </View>
  );
}

export default function PointsHistoryList({
  items,
  isLoading,
  hasMore,
  isFetchingMore,
  onLoadMore,
}: PointsHistoryListProps) {
  if (isLoading && items.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  if (items.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="receipt-outline" size={48} color={colors.textMuted} />
        <Text style={styles.emptyTitle}>No Activity Yet</Text>
        <Text style={styles.emptySubtitle}>
          Check in at restaurants to start earning points!
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      data={items}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => <HistoryItem item={item} />}
      contentContainerStyle={styles.listContent}
      showsVerticalScrollIndicator={false}
      onEndReached={hasMore ? onLoadMore : undefined}
      onEndReachedThreshold={0.5}
      ListFooterComponent={
        isFetchingMore ? (
          <View style={styles.footerLoader}>
            <ActivityIndicator size="small" color={colors.accent} />
          </View>
        ) : null
      }
    />
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  emptyContainer: {
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.sm,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginTop: spacing.sm,
  },
  emptySubtitle: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
  },
  listContent: {
    gap: spacing.xs,
  },
  itemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardBg,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: `${colors.accent}20`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemContent: {
    flex: 1,
  },
  actionType: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  restaurantName: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 2,
  },
  pointsContainer: {
    alignItems: 'flex-end',
    gap: 2,
  },
  pointsEarned: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.success,
  },
  multiplierBadge: {
    backgroundColor: colors.goldLight,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.xs,
  },
  multiplierText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.gold,
  },
  date: {
    fontSize: 12,
    color: colors.textSecondary,
    width: 70,
    textAlign: 'right',
  },
  footerLoader: {
    padding: spacing.md,
    alignItems: 'center',
  },
});
