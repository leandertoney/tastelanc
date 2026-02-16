import React, { useCallback, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp, NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import type { Restaurant, CuisineType } from '../types/database';
import { CUISINE_LABELS } from '../types/database';
import { supabase } from '../lib/supabase';
import { useFavorites, useToggleFavorite, usePromoCard } from '../hooks';
import { injectPromoIntoList, type ListItem } from '../lib/listUtils';
import CompactRestaurantCard from '../components/CompactRestaurantCard';
import { PromoCard } from '../components';
import { colors, spacing } from '../constants/colors';
import { useMarket } from '../context/MarketContext';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type RouteProps = NativeStackScreenProps<RootStackParamList, 'CuisineDetail'>['route'];

// These cuisines are stored in the categories array, not the cuisine column
const CATEGORY_BASED_CUISINES: CuisineType[] = ['breakfast', 'brunch', 'desserts'];

async function getRestaurantsByCuisine(cuisine: CuisineType, marketId: string | null = null): Promise<Restaurant[]> {
  let query = supabase
    .from('restaurants')
    .select('*')
    .eq('is_active', true);

  if (marketId) {
    query = query.eq('market_id', marketId);
  }

  // Check if this cuisine is stored in categories array vs cuisine column
  if (CATEGORY_BASED_CUISINES.includes(cuisine)) {
    query = query.contains('categories', [cuisine]);
  } else {
    query = query.eq('cuisine', cuisine);
  }

  const { data, error } = await query.order('name', { ascending: true });

  if (error) {
    console.warn('getRestaurantsByCuisine query failed:', error.message);
    return [];
  }
  return data || [];
}

export default function CuisineDetailScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const { cuisine } = route.params;
  const { marketId } = useMarket();

  const cuisineLabel = CUISINE_LABELS[cuisine];

  const { data: restaurants = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['restaurantsByCuisine', cuisine, marketId],
    queryFn: () => getRestaurantsByCuisine(cuisine, marketId),
    staleTime: 5 * 60 * 1000,
  });

  const { data: favorites = [] } = useFavorites();
  const toggleFavoriteMutation = useToggleFavorite();
  const { isVisible: showPromo, dismiss: dismissPromo } = usePromoCard();

  // Inject promo card into the list
  const listData = useMemo(() => {
    return injectPromoIntoList(restaurants, showPromo, 3);
  }, [restaurants, showPromo]);

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

  // Set navigation title
  useEffect(() => {
    navigation.setOptions({ title: cuisineLabel });
  }, [navigation, cuisineLabel]);

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
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={colors.accent}
          />
        }
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.headerTitle}>{cuisineLabel} Restaurants</Text>
            <Text style={styles.headerSubtitle}>
              {restaurants.length} restaurant{restaurants.length !== 1 ? 's' : ''} found
            </Text>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="restaurant-outline" size={48} color={colors.textMuted} />
            <Text style={styles.emptyText}>No {cuisineLabel.toLowerCase()} restaurants yet</Text>
            <Text style={styles.emptySubtext}>Check back soon!</Text>
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
  emptySubtext: {
    marginTop: 4,
    fontSize: 14,
    color: colors.textSecondary,
  },
});
