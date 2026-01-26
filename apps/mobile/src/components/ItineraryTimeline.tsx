/**
 * Vertical timeline component for itinerary display
 * Renders a sequence of ItineraryTimeSlotCards with visual connectors
 */

import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography } from '../constants/colors';
import ItineraryTimeSlotCard, { EmptyTimeSlotCard } from './ItineraryTimeSlotCard';
import { ALL_TIME_SLOTS, TIME_SLOT_CONFIG } from '../types/itinerary';
import type { TimeSlot, ItineraryItemWithReason } from '../types/itinerary';

interface ItineraryTimelineProps {
  items: ItineraryItemWithReason[];
  skippedSlots: TimeSlot[];
  onItemPress?: (item: ItineraryItemWithReason) => void;
  onSwapItem?: (item: ItineraryItemWithReason) => void;
  onRemoveItem?: (item: ItineraryItemWithReason) => void;
  onAddToSlot?: (slot: TimeSlot) => void;
  showEmptySlots?: boolean;
}

export default function ItineraryTimeline({
  items,
  skippedSlots,
  onItemPress,
  onSwapItem,
  onRemoveItem,
  onAddToSlot,
  showEmptySlots = true,
}: ItineraryTimelineProps) {
  // Build a map of slot -> item for quick lookup
  const itemsBySlot = new Map<TimeSlot, ItineraryItemWithReason>();
  for (const item of items) {
    itemsBySlot.set(item.time_slot as TimeSlot, item);
  }

  // Determine which slots to display
  const slotsToShow = showEmptySlots
    ? ALL_TIME_SLOTS
    : ALL_TIME_SLOTS.filter(s => itemsBySlot.has(s));

  if (slotsToShow.length === 0) {
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

  let isFirstRendered = true;

  return (
    <View style={styles.container}>
      {slotsToShow.map(slot => {
        const item = itemsBySlot.get(slot);
        const isFirst = isFirstRendered;
        if (isFirst) isFirstRendered = false;

        if (item) {
          return (
            <ItineraryTimeSlotCard
              key={slot}
              item={item}
              isFirst={isFirst}
              onPress={onItemPress ? () => onItemPress(item) : undefined}
              onSwap={onSwapItem ? () => onSwapItem(item) : undefined}
              onRemove={onRemoveItem ? () => onRemoveItem(item) : undefined}
            />
          );
        }

        if (showEmptySlots && skippedSlots.includes(slot)) {
          return (
            <EmptyTimeSlotCard
              key={slot}
              slot={slot}
              onAdd={onAddToSlot ? () => onAddToSlot(slot) : undefined}
            />
          );
        }

        return null;
      })}
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
});
