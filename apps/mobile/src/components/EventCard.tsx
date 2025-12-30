import { View, Text, StyleSheet, TouchableOpacity, ImageBackground, Dimensions, ImageSourcePropType } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing } from '../constants/colors';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH * 0.75;
const CARD_HEIGHT = 180;

interface EventCardProps {
  name: string;
  date: string; // e.g., "Dec 7, 2024" or "Every Friday"
  time?: string; // e.g., "8pm-12am"
  venue?: string; // Optional - for venue-specific events
  description?: string;
  imageUrl?: string; // Remote URL
  imageSource?: ImageSourcePropType; // Local require() image
  isCityWide?: boolean; // For events like Santa's Stumble
  onPress?: () => void;
}

export default function EventCard({
  name,
  date,
  time,
  venue,
  description,
  imageUrl,
  imageSource,
  isCityWide = false,
  onPress,
}: EventCardProps) {
  const cardContent = (
    <View style={styles.overlay}>
          {/* Badge for city-wide events */}
          {isCityWide && (
            <View style={styles.badge}>
              <Ionicons name="location" size={12} color={colors.text} />
              <Text style={styles.badgeText}>City Event</Text>
            </View>
          )}

          {/* Content at bottom */}
          <View style={styles.content}>
            <Text style={styles.name} numberOfLines={2}>
              {name}
            </Text>

            {venue && (
              <View style={styles.venueRow}>
                <Ionicons name="business-outline" size={14} color={colors.textMuted} />
                <Text style={styles.venue} numberOfLines={1}>
                  {venue}
                </Text>
              </View>
            )}

            <View style={styles.dateTimeRow}>
              <View style={styles.dateContainer}>
                <Ionicons name="calendar-outline" size={14} color={colors.accent} />
                <Text style={styles.date}>{date}</Text>
              </View>
              {time && (
                <View style={styles.timeContainer}>
                  <Ionicons name="time-outline" size={14} color={colors.accent} />
                  <Text style={styles.time}>{time}</Text>
                </View>
              )}
            </View>
          </View>
        </View>
  );

  // Determine image source - prefer local imageSource, fall back to URL
  const hasImage = imageSource || imageUrl;
  const source = imageSource || (imageUrl ? { uri: imageUrl } : undefined);

  if (hasImage && source) {
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={onPress}
        activeOpacity={0.9}
        disabled={!onPress}
      >
        <ImageBackground
          source={source}
          style={styles.imageBackground}
          imageStyle={styles.imageStyle}
        >
          {cardContent}
        </ImageBackground>
      </TouchableOpacity>
    );
  }

  // Fallback without image - solid gradient-like background
  return (
    <TouchableOpacity
      style={[styles.card, styles.solidCard]}
      onPress={onPress}
      activeOpacity={0.9}
      disabled={!onPress}
    >
      {cardContent}
    </TouchableOpacity>
  );
}

export { CARD_WIDTH as EVENT_CARD_WIDTH, CARD_HEIGHT as EVENT_CARD_HEIGHT };

const styles = StyleSheet.create({
  card: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    marginRight: spacing.md,
    borderRadius: radius.lg,
    overflow: 'hidden',
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  solidCard: {
    backgroundColor: colors.cardBgElevated,
  },
  imageBackground: {
    flex: 1,
  },
  imageStyle: {
    borderRadius: radius.lg,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: spacing.md,
    justifyContent: 'space-between',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    backgroundColor: colors.accent,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.sm,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.text,
  },
  content: {
    gap: 6,
  },
  name: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    lineHeight: 24,
  },
  venueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  venue: {
    fontSize: 14,
    color: colors.textMuted,
    flex: 1,
  },
  dateTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  date: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.accent,
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  time: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.accent,
  },
});
