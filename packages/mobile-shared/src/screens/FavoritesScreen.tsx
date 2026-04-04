import { useCallback, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useFavorites, useToggleFavorite, usePromoCard } from '../hooks';
import { useMarket } from '../context/MarketContext';
import { getColors, getSupabase } from '../config/theme';
import { createLazyStyles } from '../utils/lazyStyles';
import { queryKeys } from '../lib/queryKeys';
import { injectPromoIntoList, type ListItem } from '../lib/listUtils';
import CompactRestaurantCard from '../components/CompactRestaurantCard';
import { PromoCard } from '../components';
import type { Restaurant } from '../types/database';
import type { RootStackParamList } from '../navigation/types';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

function useFavoriteRestaurants(favoriteIds: string[]) {
  const supabase = getSupabase();
  const { marketId } = useMarket();
  return useQuery({
    queryKey: [...queryKeys.favorites, 'restaurants', favoriteIds, marketId],
    queryFn: async (): Promise<Restaurant[]> => {
      if (favoriteIds.length === 0) return [];

      const { data, error } = await supabase
        .from('restaurants')
        .select('*')
        .in('id', favoriteIds)
        .eq('is_active', true)
        .eq('market_id', marketId);

      if (error) throw new Error(error.message);

      // Sort by the order they were favorited (most recent first)
      const sortedData = favoriteIds
        .map((id) => data?.find((r) => r.id === id))
        .filter((r): r is Restaurant => r !== undefined);

      return sortedData;
    },
    enabled: favoriteIds.length > 0,
    retry: 2,
  });
}

function EmptyState() {
  const styles = useStyles();
  const colors = getColors();

  return (
    <View style={styles.emptyState}>
      <View style={styles.emptyIconContainer}>
        <Ionicons name="heart-outline" size={64} color={colors.textSecondary} />
      </View>
      <Text style={styles.emptyTitle}>No Favorites Yet</Text>
      <Text style={styles.emptySubtitle}>
        Tap the heart icon on any restaurant{'\n'}to save it here for quick access
      </Text>
    </View>
  );
}

function LoadingState() {
  const styles = useStyles();
  const colors = getColors();

  return (
    <View style={styles.loadingState}>
      <ActivityIndicator size="large" color={colors.accent} />
      <Text style={styles.loadingText}>Loading your favorites...</Text>
    </View>
  );
}

export default function FavoritesScreen() {
  const styles = useStyles();
  const colors = getColors();
  const navigation = useNavigation<NavigationProp>();
  const { data: favoriteIds = [], isLoading: isLoadingIds, refetch: refetchIds } = useFavorites();
  const {
    data: restaurants = [],
    isLoading: isLoadingRestaurants,
    isError: isRestaurantsError,
    refetch: refetchRestaurants,
  } = useFavoriteRestaurants(favoriteIds);
  const toggleFavorite = useToggleFavorite();
  const { isVisible: showPromo, dismiss: dismissPromo } = usePromoCard();

  // Inject promo card into the list
  const listData = useMemo(() => {
    return injectPromoIntoList(restaurants, showPromo, 3);
  }, [restaurants, showPromo]);

  const isLoading = isLoadingIds || (favoriteIds.length > 0 && isLoadingRestaurants);

  const handleRefresh = useCallback(() => {
    refetchIds();
    refetchRestaurants();
  }, [refetchIds, refetchRestaurants]);

  const handleRestaurantPress = useCallback(
    (restaurant: Restaurant) => {
      navigation.navigate('RestaurantDetail', { id: restaurant.id });
    },
    [navigation]
  );

  const handleFavoritePress = useCallback(
    (restaurantId: string) => {
      toggleFavorite.mutate(restaurantId);
    },
    [toggleFavorite]
  );

  const renderItem = useCallback(
    ({ item }: { item: ListItem<Restaurant> }) => {
      if (item.type === 'promo') {
        return <PromoCard variant="full" onDismiss={dismissPromo} />;
      }

      const restaurant = item.data!;
      return (
        <CompactRestaurantCard
          restaurant={restaurant}
          onPress={() => handleRestaurantPress(restaurant)}
          isFavorite={true}
          onFavoritePress={() => handleFavoritePress(restaurant.id)}
        />
      );
    },
    [handleRestaurantPress, handleFavoritePress, dismissPromo]
  );

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <LoadingState />
      </SafeAreaView>
    );
  }

  if (isRestaurantsError && favoriteIds.length > 0) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.emptyState}>
          <View style={styles.emptyIconContainer}>
            <Ionicons name="cloud-offline-outline" size={64} color={colors.textSecondary} />
          </View>
          <Text style={styles.emptyTitle}>Couldn't Load Favorites</Text>
          <Text style={styles.emptySubtitle}>Check your connection and try again.</Text>
          <TouchableOpacity style={styles.retryButton} onPress={handleRefresh} activeOpacity={0.8}>
            <Text style={styles.retryText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {favoriteIds.length === 0 ? (
        <EmptyState />
      ) : (
        <FlatList
          data={listData}
          keyExtractor={(item) => item.key}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={false}
              onRefresh={handleRefresh}
              tintColor={colors.accent}
              colors={[colors.accent]}
            />
          }
        />
      )}
    </SafeAreaView>
  );
}

const useStyles = createLazyStyles((colors) => ({
  container: {
    flex: 1,
    backgroundColor: colors.primary,
  },
  listContent: {
    paddingTop: 16,
    paddingBottom: 24,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    paddingHorizontal: 40,
    paddingBottom: 80,
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.cardBg,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '700' as const,
    color: colors.text,
    marginBottom: 12,
    textAlign: 'center' as const,
  },
  emptySubtitle: {
    fontSize: 16,
    color: colors.textMuted,
    textAlign: 'center' as const,
    lineHeight: 24,
  },
  loadingState: {
    flex: 1,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    color: colors.textMuted,
  },
  retryButton: {
    marginTop: 20,
    paddingHorizontal: 32,
    paddingVertical: 12,
    backgroundColor: colors.accent,
    borderRadius: 24,
  },
  retryText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: colors.textOnAccent,
  },
}));
