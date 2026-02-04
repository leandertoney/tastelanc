import { View, Text, StyleSheet, TouchableOpacity, ImageBackground } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import type { EventType } from '../types/database';
import { colors, radius, spacing } from '../constants/colors';

const CARD_SIZE = 140;

const EVENT_TYPE_ICONS: Record<EventType, keyof typeof Ionicons.glyphMap> = {
  live_music: 'musical-notes',
  dj: 'disc',
  trivia: 'help-circle',
  karaoke: 'mic',
  comedy: 'happy',
  sports: 'football',
  bingo: 'grid',
  other: 'calendar',
  promotion: 'megaphone',
};

const EVENT_TYPE_LABELS: Record<EventType, string> = {
  live_music: 'Live Music',
  dj: 'DJ',
  trivia: 'Trivia',
  karaoke: 'Karaoke',
  comedy: 'Comedy',
  sports: 'Sports',
  bingo: 'Bingo',
  other: 'Event',
  promotion: 'Promo',
};

interface EntertainmentCardProps {
  name: string;
  eventType: EventType;
  time: string;
  venue?: string;
  imageUrl?: string;
  onPress?: () => void;
}

export default function EntertainmentCard({
  name,
  eventType,
  imageUrl,
  onPress,
}: EntertainmentCardProps) {
  const icon = EVENT_TYPE_ICONS[eventType] || 'calendar';
  const typeLabel = EVENT_TYPE_LABELS[eventType] || 'Event';

  const cardContent = (
    <View style={styles.overlay}>
      {/* Event type badge - top left */}
      <View style={styles.badge}>
        <Text style={styles.badgeText}>{typeLabel}</Text>
      </View>

      {/* Gradient at bottom for name */}
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.85)']}
        style={styles.bottomGradient}
      >
        <Text style={styles.name} numberOfLines={2}>
          {name}
        </Text>
      </LinearGradient>
    </View>
  );

  if (imageUrl) {
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={onPress}
        activeOpacity={0.9}
        disabled={!onPress}
      >
        <ImageBackground
          source={{ uri: imageUrl, cache: 'reload' }}
          style={styles.imageBackground}
          imageStyle={styles.imageStyle}
          resizeMode="cover"
        >
          {cardContent}
        </ImageBackground>
      </TouchableOpacity>
    );
  }

  // Fallback without image - icon centered
  return (
    <TouchableOpacity
      style={[styles.card, styles.solidCard]}
      onPress={onPress}
      activeOpacity={0.9}
      disabled={!onPress}
    >
      <View style={styles.solidOverlay}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{typeLabel}</Text>
        </View>
        <View style={styles.iconContainer}>
          <Ionicons name={icon} size={36} color={colors.accent} />
        </View>
        <Text style={styles.name} numberOfLines={2}>
          {name}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

export { CARD_SIZE as ENTERTAINMENT_CARD_SIZE };

const styles = StyleSheet.create({
  card: {
    width: CARD_SIZE,
    height: CARD_SIZE,
    marginRight: spacing.md,
    borderRadius: radius.lg,
    overflow: 'hidden',
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
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
    justifyContent: 'space-between',
  },
  solidOverlay: {
    flex: 1,
    padding: spacing.sm,
    justifyContent: 'space-between',
  },
  iconContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.sm,
    margin: spacing.xs,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.text,
  },
  bottomGradient: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    paddingTop: 20,
  },
  name: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
    lineHeight: 16,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
});
