import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Event, Restaurant, EventType } from '../types/database';
import { colors, radius, spacing, typography } from '../constants/colors';

const THUMBNAIL_SIZE = 60;

const EVENT_TYPE_ICONS: Record<EventType, keyof typeof Ionicons.glyphMap> = {
  live_music: 'musical-notes',
  dj: 'disc',
  trivia: 'help-circle',
  karaoke: 'mic',
  comedy: 'happy',
  sports: 'football',
  other: 'calendar',
};

export interface EventWithRestaurant extends Event {
  restaurant?: Pick<Restaurant, 'id' | 'name' | 'cover_image_url'>;
}

interface EntertainmentListItemProps {
  event: EventWithRestaurant;
  onPress: () => void;
}

function formatEventTime(startTime: string, endTime: string | null): string {
  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    const h = parseInt(hours, 10);
    const suffix = h >= 12 ? 'pm' : 'am';
    const displayHour = h > 12 ? h - 12 : h === 0 ? 12 : h;
    return minutes === '00' ? `${displayHour}${suffix}` : `${displayHour}:${minutes}${suffix}`;
  };

  if (endTime) {
    return `${formatTime(startTime)} - ${formatTime(endTime)}`;
  }
  return formatTime(startTime);
}

export default function EntertainmentListItem({ event, onPress }: EntertainmentListItemProps) {
  const imageUrl = event.image_url || event.restaurant?.cover_image_url;
  const icon = EVENT_TYPE_ICONS[event.event_type] || 'calendar';
  const venueName = event.restaurant?.name || 'City-wide Event';
  const timeDisplay = formatEventTime(event.start_time, event.end_time);

  return (
    <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.7}>
      {/* Square thumbnail */}
      {imageUrl ? (
        <Image source={{ uri: imageUrl }} style={styles.thumbnail} />
      ) : (
        <View style={[styles.thumbnail, styles.thumbnailPlaceholder]}>
          <Ionicons name={icon} size={24} color={colors.textMuted} />
        </View>
      )}

      {/* Content - name, venue, time */}
      <View style={styles.content}>
        <Text style={styles.name} numberOfLines={1}>
          {event.name}
        </Text>
        <Text style={styles.details} numberOfLines={1}>
          {venueName} &bull; {timeDisplay}
        </Text>
      </View>

      {/* Chevron */}
      <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.cardBg,
    borderRadius: radius.md,
    gap: spacing.md,
  },
  thumbnail: {
    width: THUMBNAIL_SIZE,
    height: THUMBNAIL_SIZE,
    borderRadius: radius.md,
  },
  thumbnailPlaceholder: {
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    gap: 4,
  },
  name: {
    fontSize: typography.body,
    fontWeight: '600',
    color: colors.text,
  },
  details: {
    fontSize: typography.footnote,
    color: colors.textMuted,
  },
});
