import { useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import type { Restaurant } from '../types/database';
import type { OnboardingData } from '../types/onboarding';
import {
  getRecommendations,
  getUserPreferences,
  getPersonalizedGreeting,
  getRecommendationReason,
} from '../lib/recommendations';
import { useAuth } from '../hooks/useAuth';
import { useFavorites, useToggleFavorite } from '../hooks';
import { useMarket } from '../context/MarketContext';
import { trackVisibleItems } from '../lib/impressions';
import { colors, radius } from '../constants/colors';
import OpenStatusBadge from './OpenStatusBadge';

interface RecommendedSectionProps {
  onRestaurantPress: (restaurant: Restaurant) => void;
  onSeeAllPress?: () => void;
}

export default function RecommendedSection({
  onRestaurantPress,
  onSeeAllPress,
}: RecommendedSectionProps) {
  const { userId } = useAuth();
  const { marketId, isLoading: marketLoading } = useMarket();
  const { data: favorites = [] } = useFavorites();
  const toggleFavoriteMutation = useToggleFavorite();

  // React Query — reads from splash prefetch cache instantly
  const { data: recommendations = [], isLoading: recsLoading, isError: recsError } = useQuery({
    queryKey: ['recommendations', userId ?? 'anon', marketId],
    queryFn: () => getRecommendations(8, userId ?? undefined, undefined, marketId),
    staleTime: 5 * 60 * 1000,
    enabled: !marketLoading,
  });

  const { data: preferences = null } = useQuery<OnboardingData | null>({
    queryKey: ['userPreferences'],
    queryFn: getUserPreferences,
    staleTime: 10 * 60 * 1000,
  });

  const greeting = useMemo(
    () => getPersonalizedGreeting(preferences),
    [preferences]
  );

  // Track impressions when recommendations load
  useEffect(() => {
    if (recommendations.length > 0) {
      trackVisibleItems(
        recommendations.map((r, i) => ({ restaurantId: r.id, index: i })),
        'recommended',
      );
    }
  }, [recommendations]);

  const handleFavoritePress = useCallback(
    (restaurantId: string) => {
      toggleFavoriteMutation.mutate(restaurantId);
    },
    [toggleFavoriteMutation]
  );

  if (recsLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <Ionicons name="sparkles" size={20} color={colors.accent} />
            <Text style={styles.title}>Recommended for You</Text>
          </View>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={colors.accent} />
        </View>
      </View>
    );
  }

  // Don't show section on error or if no recommendations
  if (recsError || recommendations.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Ionicons name="sparkles" size={20} color={colors.accent} />
          <Text style={styles.title}>Recommended for You</Text>
        </View>
        {onSeeAllPress && (
          <TouchableOpacity onPress={onSeeAllPress}>
            <Text style={styles.seeAll}>See All</Text>
          </TouchableOpacity>
        )}
      </View>

      <Text style={styles.greeting}>{greeting}</Text>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {recommendations.map((restaurant) => {
          const reason = getRecommendationReason(restaurant, preferences);
          return (
            <TouchableOpacity
              key={restaurant.id}
              style={styles.card}
              onPress={() => onRestaurantPress(restaurant)}
              activeOpacity={0.9}
            >
              <View style={styles.imageContainer}>
                {restaurant.cover_image_url ? (
                  <Image
                    source={{ uri: restaurant.cover_image_url, cache: 'reload' }}
                    style={styles.image}
                  />
                ) : (
                  <View style={styles.imagePlaceholder}>
                    <Ionicons name="restaurant-outline" size={24} color={colors.textSecondary} />
                  </View>
                )}
                <TouchableOpacity
                  style={styles.favoriteButton}
                  onPress={(e) => {
                    e.stopPropagation();
                    handleFavoritePress(restaurant.id);
                  }}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons
                    name={favorites.includes(restaurant.id) ? 'heart' : 'heart-outline'}
                    size={18}
                    color={favorites.includes(restaurant.id) ? colors.accent : colors.text}
                  />
                </TouchableOpacity>
                {reason && (
                  <View style={styles.reasonBadge}>
                    <Text style={styles.reasonText}>{reason}</Text>
                  </View>
                )}
              </View>

              <View style={styles.content}>
                <Text style={styles.name} numberOfLines={1}>
                  {restaurant.name}
                </Text>
                <OpenStatusBadge restaurantId={restaurant.id} size="small" style={{ marginBottom: 4 }} />
                <View style={styles.infoRow}>
                  <Ionicons name="location-outline" size={12} color={colors.textMuted} />
                  <Text style={styles.address} numberOfLines={1}>
                    {restaurant.address?.split(',')[0]}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  seeAll: {
    fontSize: 14,
    color: colors.accent,
    fontWeight: '600',
  },
  greeting: {
    fontSize: 14,
    color: colors.textMuted,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  loadingContainer: {
    height: 180,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingHorizontal: 12,
    gap: 12,
  },
  card: {
    width: 160,
    backgroundColor: colors.cardBg,
    borderRadius: radius.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
    overflow: 'hidden',
  },
  imageContainer: {
    height: 100,
    backgroundColor: colors.cardBgElevated,
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
  favoriteButton: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  reasonBadge: {
    position: 'absolute',
    bottom: 6,
    left: 6,
    backgroundColor: colors.accent,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  reasonText: {
    color: colors.text,
    fontSize: 10,
    fontWeight: '600',
  },
  content: {
    padding: 10,
  },
  name: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  address: {
    fontSize: 12,
    color: colors.textMuted,
    flex: 1,
  },
});
