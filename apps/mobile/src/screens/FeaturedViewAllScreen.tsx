import { useState, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  ViewToken,
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
import { injectPromoIntoList, type ListItem } from '../lib/listUtils';
import CompactRestaurantCard from '../components/CompactRestaurantCard';
import { PromoCard } from '../components';
import SearchBar from '../components/SearchBar';
import { colors, spacing } from '../constants/colors';
import { useMarket } from '../context/MarketContext';
import { trackImpression } from '../lib/impressions';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function FeaturedViewAllScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { marketId } = useMarket();
  const [searchQuery, setSearchQuery] = useState('');

  const { data: restaurants = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['allFeaturedRestaurants', marketId],
    queryFn: () => getFeaturedRestaurants(50, marketId), // Get more for the full list
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
      r.cuisine_type?.toLowerCase().includes(query) ||
      r.categories?.some(cat => cat.toLowerCase().includes(query)) ||
      r.neighborhood?.toLowerCase().includes(query)
    );
  }, [restaurants, searchQuery]);

  // Inject promo card into the list
  const listData = useMemo(() => {
    return injectPromoIntoList(filteredRestaurants, showPromo, 3);
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
      const item = token.item as ListItem<Restaurant>;
      if (item?.type !== 'promo' && item?.data?.id) {
        trackImpression(item.data.id, 'featured_view_all', token.index ?? 0);
      }
    }
  }).current;

  const renderItem = ({ item }: { item: ListItem<Restaurant> }) => {
    if (item.type === 'promo') {
      return <PromoCard variant="compact" onDismiss={dismissPromo} />;
    }

    const restaurant = item.data!;
    return (
      <CompactRestaurantCard
        restaurant={restaurant}
        onPress={() => handlePress(restaurant)}
        isFavorite={favorites.includes(restaurant.id)}
        onFavoritePress={() => handleFavoritePress(restaurant.id)}
      />
    );
  };

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
        data={listData}
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

const styles = StyleSheet.create({
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
});
