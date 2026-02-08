import { View, Text, StyleSheet, TouchableOpacity, Image, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Restaurant } from '../types/database';
import { formatCategoryName } from '../lib/formatters';
import { colors, radius, spacing } from '../constants/colors';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH * 0.7; // 70% viewport width
const CARD_HEIGHT = CARD_WIDTH * 1.4; // Taller than wide (portrait/flyer aspect)

interface FeaturedCardProps {
  restaurant: Restaurant;
  onPress?: () => void;
  isFavorite?: boolean;
  onFavoritePress?: () => void;
  reasonBadge?: string | null;
}

export default function FeaturedCard({
  restaurant,
  onPress,
  isFavorite = false,
  onFavoritePress,
  reasonBadge,
}: FeaturedCardProps) {
  const displayCategories = restaurant.categories?.slice(0, 2) || [];

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.9}>
      {/* Full-height image background */}
      <View style={styles.imageContainer}>
        {restaurant.cover_image_url ? (
          <Image source={{ uri: restaurant.cover_image_url, cache: 'reload' }} style={styles.image} />
        ) : (
          <View style={styles.imagePlaceholder}>
            <Ionicons name="restaurant-outline" size={48} color={colors.textSecondary} />
          </View>
        )}

        {/* Gradient overlay for text readability */}
        <View style={styles.gradientOverlay} />

        {/* Recommendation reason badge - top left */}
        {reasonBadge && (
          <View style={styles.reasonBadge}>
            <Text style={styles.reasonText}>{reasonBadge}</Text>
          </View>
        )}

        {/* Favorite button - top right */}
        {onFavoritePress && (
          <TouchableOpacity
            style={styles.favoriteButton}
            onPress={(e) => {
              e.stopPropagation();
              onFavoritePress();
            }}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons
              name={isFavorite ? 'heart' : 'heart-outline'}
              size={22}
              color={isFavorite ? colors.accent : colors.text}
            />
          </TouchableOpacity>
        )}

        {/* Content overlay at bottom */}
        <View style={styles.contentOverlay}>
          <View style={styles.header}>
            <Text style={styles.name} numberOfLines={2}>
              {restaurant.name}
            </Text>
            {restaurant.is_verified && (
              <Ionicons name="checkmark-circle" size={18} color={colors.accent} />
            )}
          </View>

          <View style={styles.categoriesRow}>
            {displayCategories.map((cat) => (
              <View key={cat} style={styles.categoryBadge}>
                <Text style={styles.categoryText}>{formatCategoryName(cat)}</Text>
              </View>
            ))}
          </View>

          <View style={styles.infoRow}>
            <Ionicons name="location-outline" size={14} color={colors.text} />
            <Text style={styles.address} numberOfLines={1}>
              {restaurant.address}
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

export { CARD_WIDTH, CARD_HEIGHT };

const styles = StyleSheet.create({
  card: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    backgroundColor: colors.cardBg,
    borderRadius: radius.lg,
    marginHorizontal: spacing.sm,
    overflow: 'hidden',
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 10,
  },
  imageContainer: {
    flex: 1,
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  imagePlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.cardBgElevated,
  },
  gradientOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '50%',
    // Simulated gradient with semi-transparent overlay
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderBottomLeftRadius: radius.lg,
    borderBottomRightRadius: radius.lg,
  },
  reasonBadge: {
    position: 'absolute',
    top: spacing.sm,
    left: spacing.sm,
    backgroundColor: colors.accent,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.sm,
  },
  reasonText: {
    color: colors.text,
    fontSize: 11,
    fontWeight: '600',
  },
  favoriteButton: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  contentOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: spacing.md,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderBottomLeftRadius: radius.lg,
    borderBottomRightRadius: radius.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: spacing.xs,
  },
  name: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    flex: 1,
  },
  categoriesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: spacing.xs,
  },
  categoryBadge: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.xs,
    borderWidth: 1,
    borderColor: colors.accent,
  },
  categoryText: {
    fontSize: 11,
    color: colors.text,
    fontWeight: '500',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  address: {
    fontSize: 13,
    color: colors.textMuted,
    flex: 1,
  },
});
