/**
 * Vertical timeline component for itinerary display
 * Renders a sequence of ItineraryTimeSlotCards with walk-time connectors
 */

import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography } from '../constants/colors';
import ItineraryTimeSlotCard from './ItineraryTimeSlotCard';
import type { TimeSlot, ItineraryItemWithReason } from '../types/itinerary';

interface ItineraryTimelineProps {
  items: ItineraryItemWithReason[];
  skippedSlots: TimeSlot[];
  /** Walk minutes between consecutive items (parallel array to items) */
  walkMinutes?: (number | null)[];
  onItemPress?: (item: ItineraryItemWithReason) => void;
  onSwapItem?: (item: ItineraryItemWithReason) => void;
  onRemoveItem?: (item: ItineraryItemWithReason) => void;
  showEmptySlots?: boolean;
}

export default function ItineraryTimeline({
  items,
  onItemPress,
  onSwapItem,
  onRemoveItem,
  walkMinutes = [],
}: ItineraryTimelineProps) {
  if (items.length === 0) {
    return (
      <View style={styles.emptyState}>
        <Ionicons name="calendar-outline" size={48} color={colors.textSecondary} />
        <Text style={styles.emptyStateText}>No stops planned yet</Text>
        <Text style={styles.emptyStateSubtext}>
          Tap "Generate My Day" to get started
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {items.map((item, index) => (
        <View key={item.id}>
          <ItineraryTimeSlotCard
            item={item}
            isFirst={index === 0}
            isLast={index === items.length - 1}
            stopNumber={index + 1}
            onPress={onItemPress ? () => onItemPress(item) : undefined}
            onSwap={onSwapItem ? () => onSwapItem(item) : undefined}
            onRemove={onRemoveItem ? () => onRemoveItem(item) : undefined}
          />

          {/* Walk-time connector between stops */}
          {index < items.length - 1 && (
            <View style={styles.walkConnector}>
              <View style={styles.walkLine} />
              {walkMinutes[index] != null && (
                <View style={styles.walkBadge}>
                  <Ionicons name="walk-outline" size={12} color={colors.textSecondary} />
                  <Text style={styles.walkText}>{walkMinutes[index]} min walk</Text>
                </View>
              )}
              <View style={styles.walkLine} />
            </View>
          )}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: spacing.sm,
    paddingBottom: spacing.lg,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
    gap: spacing.sm,
  },
  emptyStateText: {
    fontSize: typography.headline,
    fontWeight: '600',
    color: colors.textMuted,
  },
  emptyStateSubtext: {
    fontSize: typography.subhead,
    color: colors.textSecondary,
  },
  // Walk connector
  walkConnector: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md + 20, // indent to align with timeline dot
    paddingVertical: 2,
    gap: spacing.xs,
  },
  walkLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
    opacity: 0.5,
  },
  walkBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: 99,
    backgroundColor: colors.cardBg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  walkText: {
    fontSize: typography.caption2,
    color: colors.textSecondary,
    fontWeight: '500',
  },
});
