import { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  Image,
} from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useInfiniteQuery, useQueryClient, useQuery } from '@tanstack/react-query';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import type { Restaurant } from '../types/database';
import type { RootStackParamList } from '../navigation/types';
import { useFavorites, useToggleFavorite, useTrendingRestaurants, usePromoCard } from '../hooks';
import { getOtherRestaurants, getFeaturedRestaurants } from '../lib/recommendations';
import { injectPromoIntoList, type ListItem } from '../lib/listUtils';
import {
  SectionHeader,
  Spacer,
  RosieChat,
  FeaturedSection,
  CompactRestaurantCard,
  HappyHourSection,
  EventsSection,
  EntertainmentSection,
  SocialProofBanner,
  PromoCard,
  PlanYourDayCard,
  BlogSection,
} from '../components';
import CuisinesSection from '../components/CuisinesSection';
import { colors, radius, spacing } from '../constants/colors';
import type { BadgeType } from '../components/TrendingBadge';

// Rosie image for FAB
const rosieImage = require('../../assets/images/rosie_121212.png');

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const PAGE_SIZE = 10;

export default function HomeScreen() {
  const navigation = useNavigation<NavigationProp>();
  const queryClient = useQueryClient();
  const [rosieChatVisible, setRosieChatVisible] = useState(false);

  const { data: favorites = [] } = useFavorites();
  const toggleFavoriteMutation = useToggleFavorite();
  const { data: trendingIds } = useTrendingRestaurants();
  const { isVisible: showPromo, dismiss: dismissPromo } = usePromoCard();

  // Get featured restaurants from cache (prefetched during splash)
  const { data: featuredRestaurants = [] } = useQuery({
    queryKey: ['featuredRestaurants'],
    queryFn: () => getFeaturedRestaurants(16),
    staleTime: 5 * 60 * 1000,
  });

  // Derive featuredIds from the cached data
  const featuredIds = useMemo(
    () => featuredRestaurants.map((r) => r.id),
    [featuredRestaurants]
  );

  // Helper to determine if a restaurant should show a trending badge
  const getTrendingBadge = useCallback((restaurantId: string): BadgeType | null => {
    if (trendingIds?.has(restaurantId)) {
      return 'trending';
    }
    return null;
  }, [trendingIds]);

  // Infinite query for "Other Places Nearby" section
  const {
    data: otherPlacesData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
    error,
    refetch,
    isRefetching,
  } = useInfiniteQuery({
    queryKey: ['otherRestaurants', featuredIds],
    queryFn: ({ pageParam = 0 }) => getOtherRestaurants(featuredIds, pageParam, PAGE_SIZE),
    getNextPageParam: (lastPage, pages) => (lastPage.hasMore ? pages.length : undefined),
    initialPageParam: 0,
    enabled: featuredIds.length > 0, // Wait until we have featured IDs
    staleTime: 5 * 60 * 1000,
  });

  const handleFavoritePress = useCallback(
    (restaurantId: string) => {
      toggleFavoriteMutation.mutate(restaurantId);
    },
    [toggleFavoriteMutation]
  );

  const handleRestaurantPress = (restaurant: Restaurant) => {
    navigation.navigate('RestaurantDetail', {
      id: restaurant.id,
    });
  };

  const onRefresh = useCallback(async () => {
    queryClient.invalidateQueries({ queryKey: ['featuredRestaurants'] });
    queryClient.invalidateQueries({ queryKey: ['socialProof'] });
    queryClient.invalidateQueries({ queryKey: ['activeHappyHours'] });
    queryClient.invalidateQueries({ queryKey: ['entertainmentEvents'] });
    queryClient.invalidateQueries({ queryKey: ['upcomingEvents'] });
    queryClient.invalidateQueries({ queryKey: ['blog'] });
    refetch();
  }, [queryClient, refetch]);

  const handleLoadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Flatten paginated data
  const otherRestaurants = otherPlacesData?.pages.flatMap((page) => page.restaurants) ?? [];

  // Inject promo card into the list
  const listData = useMemo(() => {
    return injectPromoIntoList(otherRestaurants, showPromo, 3);
  }, [otherRestaurants, showPromo]);

  const renderHeader = () => (
    <View>
      <Spacer size="sm" />

      {/* Social Proof Banner */}
      <SocialProofBanner variant="voting" />

      <Spacer size="lg" />

      {/* Section 1: Happy Hour Specials (Banners) */}
      <HappyHourSection />

      <Spacer size="md" />

      {/* Section 2: Entertainment Tonight */}
      <EntertainmentSection />

      {/* Section 3: Upcoming Events */}
      <EventsSection />

      {/* Plan Your Day CTA */}
      <PlanYourDayCard />

      {/* Section 4: Featured for You */}
      <FeaturedSection onRestaurantPress={handleRestaurantPress} />

      <Spacer size="md" />

      {/* Section 5: Browse by Cuisine */}
      <CuisinesSection />

      <Spacer size="md" />

      {/* Section 6: From Rosie's Blog */}
      <BlogSection />

      {/* Section 7: Other Places Nearby */}
      <SectionHeader
        title="Other Places Nearby"
        actionText="Search"
        onActionPress={() => navigation.navigate('MainTabs', { screen: 'Search' })}
      />
      <Spacer size="sm" />
    </View>
  );

  const renderListItem = ({ item }: { item: ListItem<Restaurant> }) => {
    if (item.type === 'promo') {
      return <PromoCard variant="compact" onDismiss={dismissPromo} />;
    }

    const restaurant = item.data!;
    return (
      <CompactRestaurantCard
        restaurant={restaurant}
        onPress={() => handleRestaurantPress(restaurant)}
        isFavorite={favorites.includes(restaurant.id)}
        onFavoritePress={() => handleFavoritePress(restaurant.id)}
        trendingBadge={getTrendingBadge(restaurant.id)}
      />
    );
  };

  const renderFooter = () => {
    if (isFetchingNextPage) {
      return (
        <View style={styles.footerLoader}>
          <ActivityIndicator size="small" color={colors.accent} />
        </View>
      );
    }

    if (hasNextPage) {
      return (
        <TouchableOpacity
          style={styles.loadMoreButton}
          onPress={handleLoadMore}
          activeOpacity={0.8}
        >
          <Text style={styles.loadMoreText}>Load More</Text>
        </TouchableOpacity>
      );
    }

    return null;
  };

  // No full-screen loading state - data is prefetched during splash screen
  if (isError && otherRestaurants.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.centered}>
          <Text style={styles.errorText}>
            {error instanceof Error ? error.message : 'Failed to load restaurants. Pull to retry.'}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <GestureHandlerRootView style={styles.gestureRoot}>
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <FlatList
          data={listData}
          renderItem={renderListItem}
          keyExtractor={(item) => item.key}
          ListHeaderComponent={renderHeader}
          ListFooterComponent={renderFooter}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={onRefresh}
              tintColor={colors.accent}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No other places nearby</Text>
            </View>
          }
        />

        {/* Rosie AI FAB */}
        <TouchableOpacity
          style={styles.rosieFab}
          onPress={() => setRosieChatVisible(true)}
          activeOpacity={0.9}
        >
          <Image source={rosieImage} style={styles.rosieAvatar} />
          <Text style={styles.rosieFabText}>Ask Rosie</Text>
        </TouchableOpacity>

        {/* Rosie Chat Bottom Sheet */}
        <RosieChat
          visible={rosieChatVisible}
          onClose={() => setRosieChatVisible(false)}
          onNavigateToRestaurant={(restaurantId) => {
            navigation.navigate('RestaurantDetail', { id: restaurantId });
          }}
        />
      </SafeAreaView>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  gestureRoot: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: colors.primary,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: colors.error,
    textAlign: 'center',
  },
  listContent: {
    paddingBottom: 20,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: colors.textMuted,
  },
  footerLoader: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  loadMoreButton: {
    marginHorizontal: spacing.md,
    marginVertical: spacing.md,
    paddingVertical: 14,
    backgroundColor: colors.cardBg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.accent,
    alignItems: 'center',
  },
  loadMoreText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.accent,
  },
  rosieFab: {
    position: 'absolute',
    bottom: 24,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.accent,
    paddingVertical: 12,
    paddingHorizontal: 16,
    paddingRight: 20,
    borderRadius: radius.full,
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
    gap: 10,
  },
  rosieAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  rosieFabText: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '600',
  },
});
