import { useState, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  Image,
  ViewToken,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useInfiniteQuery, useQueryClient, useQuery } from '@tanstack/react-query';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import type { Restaurant } from '../types/database';
import type { RootStackParamList } from '../navigation/types';
import { useFavorites, useToggleFavorite, useTrendingRestaurants, usePromoCard } from '../hooks';
import { getOtherRestaurants, getFeaturedRestaurants } from '../lib/recommendations';
import { useMarket } from '../context/MarketContext';
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
  SquadPickerCard,
  BlogSection,
  RecommendedSection,
  ErrorBoundary,
} from '../components';
import CuisinesSection from '../components/CuisinesSection';
import { colors, radius, spacing } from '../constants/colors';
import type { BadgeType } from '../components/TrendingBadge';
import { trackImpression } from '../lib/impressions';

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
  const { marketId } = useMarket();

  // Get featured restaurants from cache (prefetched during splash)
  const { data: featuredRestaurants = [] } = useQuery({
    queryKey: ['featuredRestaurants', marketId],
    queryFn: () => getFeaturedRestaurants(16, marketId),
    staleTime: 5 * 60 * 1000,
  });

  // Derive featuredIds from the cached data
  const featuredIds = useMemo(
    () => featuredRestaurants.map((r) => r.id),
    [featuredRestaurants]
  );

  // Helper to determine if a restaurant should show a trending badge
  const getTrendingBadge = useCallback((restaurantId: string): BadgeType | null => {
    if (Array.isArray(trendingIds) && trendingIds.includes(restaurantId)) {
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
    queryKey: ['otherRestaurants', featuredIds, marketId],
    queryFn: ({ pageParam = 0 }) => getOtherRestaurants(featuredIds, pageParam, PAGE_SIZE, marketId),
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
    queryClient.invalidateQueries({ queryKey: ['featuredRestaurants', marketId] });
    queryClient.invalidateQueries({ queryKey: ['socialProof'] });
    queryClient.invalidateQueries({ queryKey: ['activeHappyHours', marketId] });
    queryClient.invalidateQueries({ queryKey: ['entertainmentEvents', marketId] });
    queryClient.invalidateQueries({ queryKey: ['upcomingEvents', marketId] });
    queryClient.invalidateQueries({ queryKey: ['blog'] });
    queryClient.invalidateQueries({ queryKey: ['featuredAds', marketId] });
    refetch();
  }, [queryClient, refetch, marketId]);

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

  // Track impressions for "Other Places Nearby" as items become visible
  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 50 }).current;
  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    for (const token of viewableItems) {
      const item = token.item as ListItem<Restaurant>;
      if (item?.type === 'item' && item.data?.id) {
        trackImpression(item.data.id, 'other_places', token.index ?? 0);
      }
    }
  }).current;

  const renderHeader = () => (
    <View>
      <Spacer size="sm" />

      {/* Social Proof Banner */}
      <ErrorBoundary level="section">
        <SocialProofBanner />
      </ErrorBoundary>

      <Spacer size="lg" />

      {/* Section 1: Happy Hour Specials (Banners) */}
      <ErrorBoundary level="section">
        <HappyHourSection />
      </ErrorBoundary>

      <Spacer size="md" />

      {/* Section 2: Entertainment Tonight */}
      <ErrorBoundary level="section">
        <EntertainmentSection />
      </ErrorBoundary>

      {/* Section 3: Upcoming Events */}
      <ErrorBoundary level="section">
        <EventsSection />
      </ErrorBoundary>

      {/* Plan Your Day + Squad Picker CTAs */}
      <ErrorBoundary level="section">
        <View style={styles.ctaRow}>
          <PlanYourDayCard />
          <SquadPickerCard />
        </View>
      </ErrorBoundary>

      {/* Section 4: Featured for You (PAID — always above Recommended) */}
      <ErrorBoundary level="section">
        <FeaturedSection onRestaurantPress={handleRestaurantPress} />
      </ErrorBoundary>

      <Spacer size="md" />

      {/* Section 5: Recommended for You (personalized, all restaurants) */}
      <ErrorBoundary level="section">
        <RecommendedSection onRestaurantPress={handleRestaurantPress} />
      </ErrorBoundary>

      <Spacer size="md" />

      {/* Section 5: Browse by Cuisine */}
      <ErrorBoundary level="section">
        <CuisinesSection />
      </ErrorBoundary>

      <Spacer size="md" />

      {/* Section 6: From Rosie's Blog */}
      <ErrorBoundary level="section">
        <BlogSection />
      </ErrorBoundary>

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
    const isElite = (restaurant as any).tiers?.name === 'elite';
    return (
      <CompactRestaurantCard
        restaurant={restaurant}
        onPress={() => handleRestaurantPress(restaurant)}
        isFavorite={favorites.includes(restaurant.id)}
        onFavoritePress={() => handleFavoritePress(restaurant.id)}
        trendingBadge={getTrendingBadge(restaurant.id)}
        isElite={isElite}
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
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <FlatList
          data={listData}
          extraData={marketId}
          renderItem={renderListItem}
          keyExtractor={(item) => item.key}
          ListHeaderComponent={renderHeader}
          ListFooterComponent={renderFooter}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewabilityConfig}
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
  ctaRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    gap: spacing.sm,
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
