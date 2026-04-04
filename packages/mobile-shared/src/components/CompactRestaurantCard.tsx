import { View, Text, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { Restaurant } from '../types/database';
import type { RootStackParamList } from '../navigation/types';
import { formatCategoryName } from '../lib/formatters';
import { getColors, getBrand } from '../config/theme';
import { createLazyStyles } from '../utils/lazyStyles';
import { radius, spacing } from '../constants/spacing';
import TrendingBadge, { type BadgeType } from './TrendingBadge';
import OpenStatusBadge from './OpenStatusBadge';
import { useRestaurantWeekIds } from '../hooks/useRestaurantWeekIds';
import { useCoffeeChocolateTrailIds } from '../hooks/useCoffeeChocolateTrailIds';

type NavProp = NativeStackNavigationProp<RootStackParamList>;

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
  const styles = useStyles();
  const colors = getColors();
  const brand = getBrand();
  const navigation = useNavigation<NavProp>();
  const primaryCategory = restaurant.categories?.[0];
  const restaurantWeekIds = useRestaurantWeekIds();
  const isRestaurantWeek = restaurantWeekIds.has(restaurant.id);
  const coffeeTrailIds = useCoffeeChocolateTrailIds();
  const isCoffeeTrail = coffeeTrailIds.has(restaurant.id);

  return (
    <TouchableOpacity style={[styles.card, isElite && styles.cardElite, isRestaurantWeek && styles.cardRW, isCoffeeTrail && !isRestaurantWeek && styles.cardCCT]} onPress={onPress} activeOpacity={0.8}>
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
          {isRestaurantWeek && (
            <TouchableOpacity
              style={styles.rwPill}
              onPress={(e) => { e.stopPropagation(); navigation.navigate('RestaurantWeek'); }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.rwPillText}>RW</Text>
            </TouchableOpacity>
          )}
          {isCoffeeTrail && (
            <TouchableOpacity
              style={styles.cctPill}
              onPress={(e) => { e.stopPropagation(); navigation.navigate('CoffeeChocolateTrail'); }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.cctPillText}>☕🍫</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.metaRow}>
          <OpenStatusBadge restaurantId={restaurant.id} size="small" />
          <Text style={styles.dot}>&bull;</Text>
          {isElite && (
            <>
              <View style={styles.pickBadge}>
                <Ionicons name="star" size={8} color={colors.gold} />
                <Text style={styles.pickBadgeText}>{brand.pickBadgeLabel}</Text>
              </View>
              <Text style={styles.dot}>&bull;</Text>
            </>
          )}
          {primaryCategory && (
            <Text style={styles.category}>{formatCategoryName(primaryCategory)}</Text>
          )}
          <Text style={styles.dot}>&bull;</Text>
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

const useStyles = createLazyStyles((colors) => ({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardBg,
    borderRadius: radius.sm,
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    padding: spacing.sm,
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
  cardElite: {
    borderLeftWidth: 2,
    borderLeftColor: colors.goldBorder,
    shadowOpacity: 0.25,
    shadowRadius: 6,
  },
  cardRW: {
    borderLeftWidth: 2,
    borderLeftColor: '#C8532A',
  },
  cardCCT: {
    borderLeftWidth: 2,
    borderLeftColor: '#5E2077',
  },
  rwPill: {
    backgroundColor: '#C8532A',
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  rwPillText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#F0D060',
    letterSpacing: 0.5,
  },
  cctPill: {
    backgroundColor: '#5E2077',
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderWidth: 1,
    borderColor: '#D4AF37',
  },
  cctPillText: {
    fontSize: 10,
    lineHeight: 13,
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
}));
