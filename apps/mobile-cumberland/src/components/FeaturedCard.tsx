import { View, Text, StyleSheet, TouchableOpacity, Image, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Restaurant } from '../types/database';
import { formatCategoryName } from '../lib/formatters';
import { colors, radius, spacing } from '../constants/colors';
import { BRAND } from '../config/brand';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH * 0.7; // 70% viewport width
const CARD_HEIGHT = CARD_WIDTH * 1.4; // Taller than wide (portrait/flyer aspect)

interface FeaturedCardProps {
  restaurant: Restaurant;
  onPress?: () => void;
  isFavorite?: boolean;
  onFavoritePress?: () => void;
  reasonBadge?: string | null;
  isElite?: boolean;
}

export default function FeaturedCard({
  restaurant,
  onPress,
  isFavorite = false,
  onFavoritePress,
  reasonBadge,
  isElite = false,
}: FeaturedCardProps) {
  const displayCategories = restaurant.categories?.slice(0, 2) || [];

  return (
    <TouchableOpacity
      style={[styles.card, isElite && styles.cardElite]}
      onPress={onPress}
      activeOpacity={0.9}
    >
      {/* Full-height image background */}
      <View style={styles.imageContainer}>
        {restaurant.cover_image_url ? (
          <Image source={{ uri: restaurant.cover_image_url, cache: 'reload' }} style={styles.image} />
        ) : (
          <View style={styles.imagePlaceholder}>
            <Ionicons name="restaurant-outline" size={48} color={colors.textSecondary} />
          </View>
        )}

        {/* Pick badge for elite - top left */}
        {isElite ? (
          <View style={styles.pickBadge}>
            <Ionicons name="star" size={10} color="#FFF" />
            <Text style={styles.pickBadgeText}>{BRAND.pickBadgeLabel}</Text>
          </View>
        ) : reasonBadge ? (
          <View style={styles.reasonBadge}>
            <Text style={styles.reasonText}>{reasonBadge}</Text>
          </View>
        ) : null}

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
              color={isFavorite ? colors.accent : '#FFFFFF'}
            />
          </TouchableOpacity>
        )}

        {/* Content overlay at bottom */}
        <View style={[styles.contentOverlay, isElite && styles.contentOverlayElite]}>
          <View style={styles.header}>
            <Text style={[styles.name, isElite && styles.nameElite]} numberOfLines={2}>
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
            <Ionicons name="location-outline" size={14} color="#FFFFFF" />
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
  cardElite: {
    shadowOpacity: 0,
    elevation: 0,
    borderWidth: 1.5,
    borderColor: colors.goldBorder,
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
  pickBadge: {
    position: 'absolute',
    top: spacing.sm,
    left: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderWidth: 1,
    borderColor: colors.goldBorder,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.sm,
  },
  pickBadgeText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
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
    color: '#FFFFFF',
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
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  contentOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: spacing.md,
    backgroundColor: 'rgba(0,0,0,0.55)',
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
    color: '#FFFFFF',
    flex: 1,
    textShadowColor: 'rgba(0,0,0,0.7)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  categoriesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: spacing.xs,
  },
  categoryBadge: {
    backgroundColor: 'rgba(255,255,255,0.35)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.xs,
    borderWidth: 1,
    borderColor: colors.accent,
  },
  categoryText: {
    fontSize: 11,
    color: '#FFFFFF',
    fontWeight: '700',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  address: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.85)',
    flex: 1,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  // Elite subtle refinements
  contentOverlayElite: {
    padding: spacing.md + 2,
  },
  nameElite: {
    fontWeight: '800',
  },
});
