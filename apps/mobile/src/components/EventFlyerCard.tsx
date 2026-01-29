import { View, Text, StyleSheet, ImageBackground, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import type { ApiEvent } from '../lib/events';
import { isSelfPromoterEvent, getEventVenueName } from '../lib/events';
import type { EventType } from '../types/database';
import { colors, radius } from '../constants/colors';

interface EventFlyerCardProps {
  event: ApiEvent;
  width: number;
  height: number;
  onPress: () => void;
  onRestaurantPress?: () => void;
  onArtistPress?: (artistId: string, artistName: string) => void;
}

const EVENT_TYPE_LABELS: Record<EventType, string> = {
  live_music: 'Live Music',
  dj: 'DJ Night',
  trivia: 'Trivia',
  karaoke: 'Karaoke',
  comedy: 'Comedy',
  sports: 'Sports',
  other: 'Event',
  promotion: 'Promo',
};

function formatEventTime(startTime: string, endTime: string | null): string {
  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    const h = parseInt(hours, 10);
    const suffix = h >= 12 ? 'PM' : 'AM';
    const displayHour = h > 12 ? h - 12 : h === 0 ? 12 : h;
    return minutes === '00' ? `${displayHour}${suffix}` : `${displayHour}:${minutes}${suffix}`;
  };

  if (endTime) {
    return `${formatTime(startTime)} - ${formatTime(endTime)}`;
  }
  return formatTime(startTime);
}

export default function EventFlyerCard({ event, width, height, onPress, onRestaurantPress, onArtistPress }: EventFlyerCardProps) {
  const typeLabel = EVENT_TYPE_LABELS[event.event_type] || 'Event';
  const isFromSelfPromoter = isSelfPromoterEvent(event);
  const venueName = getEventVenueName(event);

  return (
    <TouchableOpacity activeOpacity={0.95} onPress={onPress} style={{ width, height }}>
      <ImageBackground
        source={{ uri: event.image_url }}
        style={[styles.imageBackground, { width, height }]}
        resizeMode="cover"
      >
        <LinearGradient
          colors={['rgba(0,0,0,0.4)', 'transparent', 'transparent', 'rgba(0,0,0,0.85)']}
          locations={[0, 0.2, 0.5, 1]}
          style={StyleSheet.absoluteFill}
        >
          {/* Top badges */}
          <View style={styles.topRow}>
            {/* Time badge - top left */}
            <View style={styles.timeBadge}>
              <Ionicons name="time-outline" size={14} color={colors.text} />
              <Text style={styles.timeBadgeText}>
                {formatEventTime(event.start_time, event.end_time)}
              </Text>
            </View>

            {/* Event type badge - top right */}
            <View style={styles.typeBadge}>
              <Text style={styles.typeBadgeText}>{typeLabel}</Text>
            </View>
          </View>

          {/* Bottom content */}
          <View style={styles.bottomContent}>
            <Text style={styles.eventName} numberOfLines={2}>
              {event.name}
            </Text>
            {event.performer_name && (
              <Text style={styles.performerName} numberOfLines={1}>
                {event.performer_name}
              </Text>
            )}

            {/* Restaurant or Artist link */}
            {venueName && (event.restaurant && onRestaurantPress) || (event.self_promoter && onArtistPress) ? (
              <TouchableOpacity
                style={styles.restaurantLink}
                onPress={(e) => {
                  e.stopPropagation();
                  if (isFromSelfPromoter && onArtistPress && event.self_promoter) {
                    onArtistPress(event.self_promoter.id, event.self_promoter.name);
                  } else if (onRestaurantPress) {
                    onRestaurantPress();
                  }
                }}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={isFromSelfPromoter ? 'person' : 'location'}
                  size={16}
                  color={colors.accent}
                />
                <Text style={styles.restaurantName}>
                  {isFromSelfPromoter ? `by ${venueName}` : `@ ${venueName}`}
                </Text>
                <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
              </TouchableOpacity>
            ) : null}
          </View>
        </LinearGradient>
      </ImageBackground>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  imageBackground: {
    backgroundColor: colors.surface,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingTop: 16,
    paddingHorizontal: 16,
  },
  timeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.md,
  },
  timeBadgeText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  typeBadge: {
    backgroundColor: colors.accent,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.sm,
  },
  typeBadgeText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '600',
  },
  bottomContent: {
    position: 'absolute',
    bottom: 20,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
  },
  eventName: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.text,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  performerName: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.accent,
    marginTop: 6,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  restaurantLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: radius.md,
    alignSelf: 'flex-start',
  },
  restaurantName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
});
