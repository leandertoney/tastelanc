import { View, Text, StyleSheet, TouchableOpacity, ImageBackground, Dimensions, ImageSourcePropType } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
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
  imageUrl,
  imageSource,
  onPress,
}: EventCardProps) {
  const cardContent = (
    <View style={styles.overlay}>
          {/* Date badge at top */}
          <View style={styles.dateBadge}>
            <Text style={styles.dateBadgeText}>{date}</Text>
          </View>

          {/* Gradient at bottom for name */}
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.8)']}
            style={styles.bottomGradient}
          >
            <Text style={styles.name} numberOfLines={2}>
              {name}
            </Text>
          </LinearGradient>
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
          resizeMode="cover"
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
    justifyContent: 'space-between',
  },
  dateBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.sm,
    margin: spacing.sm,
  },
  dateBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
  },
  bottomGradient: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    paddingTop: 30,
  },
  name: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    lineHeight: 22,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
});
