import { View, Text, TouchableOpacity, ImageBackground } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const TFK_NAVY = '#0D1B2A';
const TFK_GOLD = '#FCD34D';
import type { EventType } from '../types/database';
import { getColors } from '../config/theme';
import { createLazyStyles } from '../utils/lazyStyles';
import { radius, spacing } from '../constants/spacing';

const CARD_SIZE = 140;

const EVENT_TYPE_ICONS: Record<EventType, keyof typeof Ionicons.glyphMap> = {
  live_music: 'musical-notes',
  dj: 'disc',
  trivia: 'help-circle',
  karaoke: 'mic',
  comedy: 'happy',
  sports: 'football',
  bingo: 'grid',
  music_bingo: 'musical-notes',
  poker: 'diamond',
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
  music_bingo: 'Music Bingo',
  poker: 'Poker',
  other: 'Event',
  promotion: 'Promo',
};

interface EntertainmentCardProps {
  name: string;
  eventType: EventType;
  time: string;
  venue?: string;
  imageUrl?: string;
  isTFK?: boolean;
  onPress?: () => void;
}

export default function EntertainmentCard({
  name,
  eventType,
  imageUrl,
  isTFK,
  onPress,
}: EntertainmentCardProps) {
  const styles = useStyles();
  const colors = getColors();
  const icon = EVENT_TYPE_ICONS[eventType] || 'calendar';
  const typeLabel = EVENT_TYPE_LABELS[eventType] || 'Event';

  const TFK_LIVE = true;
  const tfkBadge = isTFK && TFK_LIVE ? (
    <View style={styles.tfkBadge}>
      <Ionicons name="bulb" size={10} color={TFK_GOLD} />
      <Text style={styles.tfkBadgeText}>TFK</Text>
    </View>
  ) : null;

  const cardContent = (
    <View style={styles.overlay}>
      {/* Event type badge - top left */}
      <View style={styles.badge}>
        <Text style={styles.badgeText}>{typeLabel}</Text>
      </View>
      {/* TFK partner badge - bottom right */}
      {tfkBadge}
    </View>
  );

  if (imageUrl) {
    return (
      <TouchableOpacity
        style={[styles.card, isTFK && styles.tfkCardBorder]}
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

  // Fallback without image - icon centered, badge at top
  return (
    <TouchableOpacity
      style={[styles.card, styles.solidCard, isTFK && styles.tfkCardBorder]}
      onPress={onPress}
      activeOpacity={0.9}
      disabled={!onPress}
    >
      <View style={styles.solidOverlay}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{typeLabel}</Text>
        </View>
        <View style={styles.iconContainer}>
          <Ionicons name={icon} size={48} color={colors.accent} />
        </View>
        {tfkBadge}
      </View>
    </TouchableOpacity>
  );
}

export { CARD_SIZE as ENTERTAINMENT_CARD_SIZE };

const useStyles = createLazyStyles((colors) => ({
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
    justifyContent: 'flex-start',
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
    backgroundColor: colors.accent,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.sm,
    margin: spacing.xs,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  tfkCardBorder: {
    borderWidth: 1,
    borderColor: TFK_GOLD,
  },
  tfkBadge: {
    position: 'absolute' as const,
    bottom: spacing.xs,
    right: spacing.xs,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 3,
    backgroundColor: TFK_NAVY,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: TFK_GOLD,
    paddingHorizontal: 5,
    paddingVertical: 3,
  },
  tfkBadgeText: {
    fontSize: 9,
    fontWeight: '800' as const,
    color: TFK_GOLD,
    letterSpacing: 0.5,
  },
}));
