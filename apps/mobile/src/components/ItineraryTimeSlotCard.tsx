/**
 * Individual time slot card in an itinerary timeline
 * Shows a restaurant/event/activity for a specific time slot
 */

import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing, typography } from '../constants/colors';
import { TIME_SLOT_CONFIG } from '../types/itinerary';
import type { TimeSlot, ItineraryItemWithReason } from '../types/itinerary';

interface ItineraryTimeSlotCardProps {
  item: ItineraryItemWithReason;
  onPress?: () => void;
  onSwap?: () => void;
  onRemove?: () => void;
  isFirst?: boolean;
  isLast?: boolean;
  stopNumber?: number;
}

export default function ItineraryTimeSlotCard({
  item,
  onPress,
  onSwap,
  onRemove,
  isFirst = false,
  isLast = false,
  stopNumber,
}: ItineraryTimeSlotCardProps) {
  const config = TIME_SLOT_CONFIG[item.time_slot as TimeSlot];

  return (
    <View style={styles.container}>
      {/* Timeline column with stop number */}
      <View style={styles.timelineColumn}>
        <View style={styles.timelineDot}>
          {stopNumber != null ? (
            <Text style={styles.stopNumber}>{stopNumber}</Text>
          ) : (
            <Ionicons name={config.icon as any} size={16} color={colors.text} />
          )}
        </View>
      </View>

      {/* Card content */}
      <TouchableOpacity
        style={styles.card}
        onPress={onPress}
        activeOpacity={0.8}
        disabled={!onPress}
      >
        {/* Time slot label */}
        <View style={styles.slotHeader}>
          <Text style={styles.slotLabel}>{config.label}</Text>
          <Text style={styles.slotTime}>{config.defaultTimeRange}</Text>
        </View>

        {/* Restaurant/venue info */}
        <View style={styles.venueRow}>
          {item.display_image_url ? (
            <Image
              source={{ uri: item.display_image_url }}
              style={styles.venueImage}
            />
          ) : (
            <View style={styles.venueImagePlaceholder}>
              <Ionicons name="restaurant" size={20} color={colors.textMuted} />
            </View>
          )}

          <View style={styles.venueInfo}>
            <Text style={styles.venueName} numberOfLines={1}>
              {item.display_name}
            </Text>
            {item.display_address && (
              <Text style={styles.venueAddress} numberOfLines={1}>
                {item.display_address}
              </Text>
            )}
            <Text style={styles.reason} numberOfLines={1}>
              {item.reason}
            </Text>
          </View>
        </View>

        {/* Action buttons */}
        <View style={styles.actions}>
          {onSwap && (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={onSwap}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="swap-horizontal" size={14} color={colors.accent} />
              <Text style={styles.actionText}>Swap</Text>
            </TouchableOpacity>
          )}
          {onRemove && (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={onRemove}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="close-circle-outline" size={14} color={colors.textSecondary} />
              <Text style={[styles.actionText, { color: colors.textSecondary }]}>Remove</Text>
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    </View>
  );
}


const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
  },
  // Timeline column
  timelineColumn: {
    width: 40,
    alignItems: 'center',
    paddingTop: 2,
  },
  timelineDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stopNumber: {
    fontSize: typography.subhead,
    fontWeight: '700',
    color: colors.text,
  },
  // Card
  card: {
    flex: 1,
    backgroundColor: colors.cardBg,
    borderRadius: radius.md,
    padding: spacing.md,
    marginLeft: spacing.sm,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  emptyCard: {
    borderStyle: 'dashed',
    borderColor: colors.border,
    backgroundColor: 'transparent',
  },
  slotHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  slotLabel: {
    fontSize: typography.subhead,
    fontWeight: '600',
    color: colors.text,
  },
  slotTime: {
    fontSize: typography.caption1,
    color: colors.textSecondary,
  },
  // Venue row
  venueRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  venueImage: {
    width: 48,
    height: 48,
    borderRadius: radius.sm,
    backgroundColor: colors.cardBgElevated,
  },
  venueImagePlaceholder: {
    width: 48,
    height: 48,
    borderRadius: radius.sm,
    backgroundColor: colors.cardBgElevated,
    justifyContent: 'center',
    alignItems: 'center',
  },
  venueInfo: {
    flex: 1,
    gap: 2,
  },
  venueName: {
    fontSize: typography.callout,
    fontWeight: '600',
    color: colors.text,
  },
  venueAddress: {
    fontSize: typography.caption1,
    color: colors.textSecondary,
  },
  reason: {
    fontSize: typography.caption1,
    color: colors.accent,
    fontStyle: 'italic',
  },
  // Actions
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionText: {
    fontSize: typography.caption1,
    color: colors.accent,
    fontWeight: '500',
  },
});
