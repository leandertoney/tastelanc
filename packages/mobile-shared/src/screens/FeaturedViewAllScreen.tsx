import { useState, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  ViewToken,
  TouchableOpacity,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import type { Restaurant } from '../types/database';
import { getFeaturedRestaurants } from '../lib/recommendations';
import { useFavorites, useToggleFavorite, usePromoCard } from '../hooks';
import PromoCard from '../components/PromoCard';
import SearchBar from '../components/SearchBar';
import OpenStatusBadge from '../components/OpenStatusBadge';
import { formatCategoryName } from '../lib/formatters';
import { getColors, getBrand } from '../config/theme';
import { createLazyStyles } from '../utils/lazyStyles';
import { radius, spacing } from '../constants/spacing';
import { useMarket } from '../context/MarketContext';
import { trackImpression } from '../lib/impressions';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

type GridRow =
  | { type: 'row'; key: string; restaurants: [Restaurant] | [Restaurant, Restaurant] }
  | { type: 'promo'; key: string };

export default function FeaturedViewAllScreen() {
  const styles = useStyles();
  const colors = getColors();
  const brand = getBrand();
  const navigation = useNavigation<NavigationProp>();
  const { marketId } = useMarket();
  const [searchQuery, setSearchQuery] = useState('');

  const { data: restaurants = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['allFeaturedRestaurants', marketId],
    queryFn: () => getFeaturedRestaurants(50, marketId),
    staleTime: 5 * 60 * 1000,
  });

  const { data: favorites = [] } = useFavorites();
  const toggleFavoriteMutation = useToggleFavorite();
  const { isVisible: showPromo, dismiss: dismissPromo } = usePromoCard();

  // Filter restaurants by search query
  const filteredRestaurants = useMemo(() => {
    if (!searchQuery.trim()) return restaurants;
    const query = searchQuery.toLowerCase();
    return restaurants.filter((r) =>
      r.name.toLowerCase().includes(query) ||
      r.cuisine?.toLowerCase().includes(query) ||
      r.categories?.some(cat => cat.toLowerCase().includes(query)) ||
      r.neighborhood?.toLowerCase().includes(query)
    );
  }, [restaurants, searchQuery]);

  // Build grid rows (pairs of restaurants) with promo injected ~50% through
  const gridRows = useMemo<GridRow[]>(() => {
    const rows: GridRow[] = [];
    const list = filteredRestaurants;
    const totalRows = Math.ceil(list.length / 2);
    const promoInsertRow = Math.max(1, Math.floor(totalRows * 0.5));

    for (let i = 0; i < list.length; i += 2) {
      const pair: [Restaurant] | [Restaurant, Restaurant] =
        i + 1 < list.length ? [list[i], list[i + 1]] : [list[i]];
      rows.push({ type: 'row', key: `row-${list[i].id}`, restaurants: pair });

      // Inject promo card after ~50% of rows
      if (showPromo && rows.length === promoInsertRow) {
        rows.push({ type: 'promo', key: 'promo' });
      }
    }

    return rows;
  }, [filteredRestaurants, showPromo]);

  const handlePress = useCallback(
    (restaurant: Restaurant) => {
      navigation.navigate('RestaurantDetail', { id: restaurant.id });
    },
    [navigation]
  );

  const handleFavoritePress = useCallback(
    (restaurantId: string) => {
      toggleFavoriteMutation.mutate(restaurantId);
    },
    [toggleFavoriteMutation]
  );

  // Track impressions when items become visible
  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 50 }).current;
  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    for (const token of viewableItems) {
      const row = token.item as GridRow;
      if (row?.type === 'row') {
        for (const r of row.restaurants) {
          trackImpression(r.id, 'featured_view_all', token.index ?? 0);
        }
      }
    }
  }).current;

  const renderGridCard = useCallback(
    (restaurant: Restaurant) => {
      const isElite = (restaurant as any).tiers?.name === 'elite';
      const isFavorite = favorites.includes(restaurant.id);
      const displayCategories = restaurant.categories?.slice(0, 2) || [];

      return (
        <TouchableOpacity
          key={restaurant.id}
          style={[styles.gridCard, isElite && styles.gridCardElite]}
          onPress={() => handlePress(restaurant)}
          activeOpacity={0.85}
        >
          <View style={styles.gridImageContainer}>
            {restaurant.cover_image_url ? (
              <Image
                source={{ uri: restaurant.cover_image_url, cache: 'force-cache' }}
                style={styles.gridImage}
              />
            ) : (
              <View style={styles.gridImagePlaceholder}>
                <Ionicons name="restaurant-outline" size={28} color={colors.textSecondary} />
              </View>
            )}

            {isElite && (
              <View style={styles.eliteBadge}>
                <Ionicons name="star" size={9} color="#FFF" />
                <Text style={styles.eliteBadgeText}>{brand.pickBadgeLabel}</Text>
              </View>
            )}

            <TouchableOpacity
              style={styles.gridFavoriteButton}
              onPress={(e) => {
                e.stopPropagation();
                handleFavoritePress(restaurant.id);
              }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons
                name={isFavorite ? 'heart' : 'heart-outline'}
                size={18}
                color={isFavorite ? colors.accent : '#FFFFFF'}
              />
            </TouchableOpacity>
          </View>

          <View style={styles.gridContent}>
            <Text style={[styles.gridName, isElite && styles.gridNameElite]} numberOfLines={1}>
              {restaurant.name}
            </Text>
            {displayCategories.length > 0 && (
              <View style={styles.gridCategoriesRow}>
                {displayCategories.map((cat) => (
                  <View key={cat} style={styles.gridCategoryBadge}>
                    <Text style={styles.gridCategoryBadgeText}>{formatCategoryName(cat)}</Text>
                  </View>
                ))}
              </View>
            )}
            <View style={styles.gridMetaRow}>
              <OpenStatusBadge restaurantId={restaurant.id} size="small" />
            </View>
          </View>
        </TouchableOpacity>
      );
    },
    [favorites, handlePress, handleFavoritePress, colors, brand, styles]
  );

  const renderItem = useCallback(
    ({ item }: { item: GridRow }) => {
      if (item.type === 'promo') {
        return (
          <View style={styles.promoRow}>
            <PromoCard variant="compact" onDismiss={dismissPromo} />
          </View>
        );
      }

      return (
        <View style={styles.gridRowContainer}>
          {item.restaurants.map((r) => renderGridCard(r))}
          {/* Spacer for odd-count last row */}
          {item.restaurants.length === 1 && <View style={styles.gridCardSpacer} />}
        </View>
      );
    },
    [renderGridCard, dismissPromo, styles]
  );

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <FlatList
        data={gridRows}
        renderItem={renderItem}
        keyExtractor={(item) => item.key}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={colors.accent}
          />
        }
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Featured Restaurants</Text>
            <Text style={styles.headerSubtitle}>
              Curated picks based on your preferences
            </Text>
            <View style={styles.searchContainer}>
              <SearchBar
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search restaurants, cuisines..."
              />
            </View>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="restaurant-outline" size={48} color={colors.textMuted} />
            <Text style={styles.emptyText}>No featured restaurants found</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const useStyles = createLazyStyles((colors) => ({
  container: {
    flex: 1,
    backgroundColor: colors.primary,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    paddingBottom: spacing.md,
  },
  searchContainer: {
    marginTop: spacing.sm,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: colors.textMuted,
  },
  listContent: {
    padding: spacing.md,
  },

  // ── Grid layout ────────────────────────────────────────────────────────
  gridRowContainer: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  gridCard: {
    flex: 1,
    backgroundColor: colors.cardBg,
    borderRadius: radius.md,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  gridCardElite: {
    borderWidth: 1.5,
    borderColor: colors.goldBorder,
    shadowColor: colors.goldBorder,
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 5,
  },
  gridCardSpacer: {
    flex: 1,
  },
  gridImageContainer: {
    height: 120,
    backgroundColor: colors.cardBgElevated,
    position: 'relative',
  },
  gridImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  gridImagePlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  eliteBadge: {
    position: 'absolute',
    top: 6,
    left: 6,
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
  gridFavoriteButton: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  gridContent: {
    padding: spacing.sm,
  },
  gridName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 3,
  },
  gridNameElite: {
    fontWeight: '700',
  },
  gridCategoriesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginBottom: 4,
  },
  gridCategoryBadge: {
    backgroundColor: colors.cardBgElevated,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.xs,
    borderWidth: 1,
    borderColor: colors.accent,
  },
  gridCategoryBadgeText: {
    fontSize: 10,
    color: colors.textMuted,
    fontWeight: '500',
  },
  gridMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  promoRow: {
    marginBottom: spacing.sm,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    marginTop: 12,
    fontSize: 16,
    color: colors.textMuted,
  },
}));
