import React, { useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useBasicTierAlternatives, RestaurantWithTierName } from '../hooks/useBasicTierAlternatives';
import { trackClick } from '../lib/analytics';
import { getColors, getBrand } from '../config/theme';
import { createLazyStyles } from '../utils/lazyStyles';
import { spacing, radius } from '../constants/spacing';
import { formatCategoryName } from '../lib/formatters';
import type { RestaurantCategory, CuisineType } from '../types/database';

const CARD_WIDTH = 150;
const CARD_HEIGHT = 200;

interface BasicTierAlternativesSectionProps {
  categories: RestaurantCategory[];
  cuisine: CuisineType | null;
  marketId: string | null;
  excludeId: string;
  featureName: string;
  onRestaurantPress: (restaurantId: string) => void;
}

function MiniAlternativeCard({
  restaurant,
  onPress,
}: {
  restaurant: RestaurantWithTierName;
  onPress: () => void;
}) {
  const styles = useStyles();
  const colors = getColors();
  const brand = getBrand();
  const isElite = restaurant.tierName === 'elite';
  const firstCategory = restaurant.categories?.[0];

  return (
    <TouchableOpacity
      style={[styles.card, isElite && styles.cardElite]}
      onPress={onPress}
      activeOpacity={0.88}
    >
      {/* Cover image */}
      {restaurant.cover_image_url ? (
        <Image source={{ uri: restaurant.cover_image_url }} style={styles.cardImage} />
      ) : (
        <View style={styles.cardImagePlaceholder}>
          <Ionicons name="restaurant-outline" size={28} color={colors.textSecondary} />
        </View>
      )}

      {/* Tier badge — top left */}
      {isElite ? (
        <View style={styles.eliteBadge}>
          <Ionicons name="star" size={9} color="#FFF" />
          <Text style={styles.eliteBadgeText}>{brand.pickBadgeLabel}</Text>
        </View>
      ) : (
        <View style={styles.premiumBadge}>
          <Text style={styles.premiumBadgeText}>Premium</Text>
        </View>
      )}

      {/* Bottom overlay */}
      <View style={styles.overlay}>
        <Text style={styles.cardName} numberOfLines={2}>
          {restaurant.name}
        </Text>
        {firstCategory ? (
          <Text style={styles.cardCategory} numberOfLines={1}>
            {formatCategoryName(firstCategory)}
          </Text>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

export default function BasicTierAlternativesSection({
  categories,
  cuisine,
  marketId,
  excludeId,
  featureName,
  onRestaurantPress,
}: BasicTierAlternativesSectionProps) {
  const styles = useStyles();
  const { data = [] } = useBasicTierAlternatives(categories, cuisine, marketId, excludeId);

  // Track impressions once when data loads
  useEffect(() => {
    if (data.length > 0) {
      data.forEach((r) => trackClick('alternatives_impression', r.id));
    }
  }, [data.length]);

  if (data.length === 0) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        They may not have {featureName.toLowerCase()}, but check out these:
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {data.map((restaurant) => (
          <MiniAlternativeCard
            key={restaurant.id}
            restaurant={restaurant}
            onPress={() => onRestaurantPress(restaurant.id)}
          />
        ))}
      </ScrollView>
    </View>
  );
}

const useStyles = createLazyStyles((colors) => ({
  container: {
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  title: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  scrollContent: {
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  card: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: radius.md,
    overflow: 'hidden',
    backgroundColor: colors.cardBgElevated,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 5,
  },
  cardElite: {
    borderWidth: 1.5,
    borderColor: colors.goldBorder,
  },
  cardImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
    position: 'absolute',
  },
  cardImagePlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.cardBgElevated,
  },
  eliteBadge: {
    position: 'absolute',
    top: 7,
    left: 7,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderWidth: 1,
    borderColor: colors.goldBorder,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: radius.xs,
  },
  eliteBadgeText: {
    color: '#FFF',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  premiumBadge: {
    position: 'absolute',
    top: 7,
    left: 7,
    backgroundColor: colors.accent,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: radius.xs,
  },
  premiumBadgeText: {
    color: '#FFF',
    fontSize: 9,
    fontWeight: '700',
  },
  overlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 9,
    paddingVertical: 8,
    backgroundColor: 'rgba(0,0,0,0.62)',
    borderBottomLeftRadius: radius.md,
    borderBottomRightRadius: radius.md,
  },
  cardName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFF',
    lineHeight: 17,
    marginBottom: 2,
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  cardCategory: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '500',
  },
}));
