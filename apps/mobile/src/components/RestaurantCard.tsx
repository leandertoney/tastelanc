import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Restaurant } from '../types/database';
import { formatCategoryName } from '../lib/formatters';
import { colors, radius } from '../constants/colors';
import OpenStatusBadge from './OpenStatusBadge';

interface RestaurantCardProps {
  restaurant: Restaurant;
  onPress?: () => void;
  isFavorite?: boolean;
  onFavoritePress?: () => void;
}

export default function RestaurantCard({
  restaurant,
  onPress,
  isFavorite = false,
  onFavoritePress,
}: RestaurantCardProps) {
  const displayCategories = restaurant.categories?.slice(0, 2) || [];

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.9}>
      <View style={styles.imageContainer}>
        {restaurant.cover_image_url ? (
          <Image source={{ uri: restaurant.cover_image_url, cache: 'reload' }} style={styles.image} />
        ) : (
          <View style={styles.imagePlaceholder}>
            <Ionicons name="restaurant-outline" size={32} color={colors.textSecondary} />
          </View>
        )}
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
      </View>

      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.name} numberOfLines={1}>
            {restaurant.name}
          </Text>
          {restaurant.is_verified && (
            <Ionicons name="checkmark-circle" size={16} color={colors.accent} />
          )}
        </View>

        <View style={styles.categoriesRow}>
          {displayCategories.map((cat) => (
            <View key={cat} style={styles.categoryBadge}>
              <Text style={styles.categoryText}>{formatCategoryName(cat)}</Text>
            </View>
          ))}
        </View>

        <OpenStatusBadge restaurantId={restaurant.id} size="small" style={{ marginBottom: 8 }} />

        <View style={styles.infoRow}>
          <Ionicons name="location-outline" size={14} color={colors.textMuted} />
          <Text style={styles.address} numberOfLines={1}>
            {restaurant.address}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.cardBg,
    borderRadius: radius.md,
    marginHorizontal: 16,
    marginBottom: 12,
    overflow: 'hidden',
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  imageContainer: {
    height: 140,
    backgroundColor: colors.cardBgElevated,
    position: 'relative',
  },
  favoriteButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  premiumBadgeContainer: {
    position: 'absolute',
    top: 8,
    left: 8,
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
  content: {
    padding: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    flex: 1,
  },
  categoriesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
  },
  categoryBadge: {
    backgroundColor: colors.cardBgElevated,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.xs,
    borderWidth: 1,
    borderColor: colors.accent,
  },
  categoryText: {
    fontSize: 12,
    color: colors.textMuted,
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
