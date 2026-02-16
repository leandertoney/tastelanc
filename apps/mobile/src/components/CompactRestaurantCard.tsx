import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Restaurant } from '../types/database';
import { formatCategoryName } from '../lib/formatters';
import { colors, radius, spacing } from '../constants/colors';
import TrendingBadge, { type BadgeType } from './TrendingBadge';
import OpenStatusBadge from './OpenStatusBadge';

interface CompactRestaurantCardProps {
  restaurant: Restaurant;
  onPress?: () => void;
  isFavorite?: boolean;
  onFavoritePress?: () => void;
  trendingBadge?: BadgeType | null;
  isElite?: boolean;
}

export default function CompactRestaurantCard({
  restaurant,
  onPress,
  isFavorite = false,
  onFavoritePress,
  trendingBadge,
  isElite = false,
}: CompactRestaurantCardProps) {
  const primaryCategory = restaurant.categories?.[0];

  return (
    <TouchableOpacity style={[styles.card, isElite && styles.cardElite]} onPress={onPress} activeOpacity={0.8}>
      {/* Thumbnail image */}
      <View style={styles.imageContainer}>
        {restaurant.cover_image_url ? (
          <Image source={{ uri: restaurant.cover_image_url, cache: 'reload' }} style={styles.image} />
        ) : (
          <View style={styles.imagePlaceholder}>
            <Ionicons name="restaurant-outline" size={24} color={colors.textSecondary} />
          </View>
        )}
        {/* Trending badge overlay */}
        {trendingBadge && (
          <View style={styles.badgeOverlay}>
            <TrendingBadge type={trendingBadge} size="small" />
          </View>
        )}
      </View>

      {/* Content */}
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={[styles.name, isElite && styles.nameElite]} numberOfLines={1}>
            {restaurant.name}
          </Text>
          {restaurant.is_verified && (
            <Ionicons name="checkmark-circle" size={14} color={colors.accent} />
          )}
        </View>

        <View style={styles.metaRow}>
          <OpenStatusBadge restaurantId={restaurant.id} size="small" />
          <Text style={styles.dot}>•</Text>
          {isElite && (
            <>
              <View style={styles.pickBadge}>
                <Ionicons name="star" size={8} color={colors.gold} />
                <Text style={styles.pickBadgeText}>TasteLanc Pick</Text>
              </View>
              <Text style={styles.dot}>•</Text>
            </>
          )}
          {primaryCategory && (
            <Text style={styles.category}>{formatCategoryName(primaryCategory)}</Text>
          )}
          <Text style={styles.dot}>•</Text>
          <Ionicons name="location-outline" size={12} color={colors.textSecondary} />
          <Text style={styles.address} numberOfLines={1}>
            {restaurant.address}
          </Text>
        </View>
      </View>

      {/* Favorite button */}
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
            size={20}
            color={isFavorite ? colors.accent : colors.textMuted}
          />
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardBg,
    borderRadius: radius.sm,
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    padding: spacing.sm,
    // Subtle shadow (less prominent than featured cards)
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  imageContainer: {
    width: 56,
    height: 56,
    borderRadius: radius.sm,
    overflow: 'hidden',
    backgroundColor: colors.cardBgElevated,
    position: 'relative',
  },
  badgeOverlay: {
    position: 'absolute',
    bottom: 2,
    left: 2,
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
  },
  content: {
    flex: 1,
    marginLeft: spacing.sm,
    justifyContent: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 2,
  },
  name: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    flex: 1,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  category: {
    fontSize: 12,
    color: colors.textMuted,
    fontWeight: '500',
  },
  dot: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  address: {
    fontSize: 12,
    color: colors.textSecondary,
    flex: 1,
  },
  favoriteButton: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Elite subtle refinements
  cardElite: {
    borderLeftWidth: 2,
    borderLeftColor: colors.goldBorder,
    shadowOpacity: 0.25,
    shadowRadius: 6,
  },
  nameElite: {
    fontWeight: '700',
  },
  pickBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  pickBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.gold,
  },
});
