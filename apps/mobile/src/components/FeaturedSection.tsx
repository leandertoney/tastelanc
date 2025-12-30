import { useRef, useCallback, useEffect, useState, useMemo } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  Dimensions,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import FeaturedCard, { CARD_WIDTH } from './FeaturedCard';
import SectionHeader from './SectionHeader';
import Spacer from './Spacer';
import { getFeaturedRestaurants } from '../lib/recommendations';
import { useFavorites, useToggleFavorite } from '../hooks';
import type { Restaurant } from '../types/database';
import { colors, spacing } from '../constants/colors';
import { ENABLE_MOCK_DATA, MOCK_FEATURED_RESTAURANTS } from '../config/mockData';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Horizontal padding to center items and show partial cards on edges
const SIDE_PADDING = (SCREEN_WIDTH - CARD_WIDTH) / 2;
const ITEM_SPACING = spacing.sm * 2; // Gap between cards

interface FeaturedSectionProps {
  onRestaurantPress: (restaurant: Restaurant) => void;
}

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function FeaturedSection({ onRestaurantPress }: FeaturedSectionProps) {
  const navigation = useNavigation<NavigationProp>();
  const flatListRef = useRef<FlatList>(null);
  const [extendedData, setExtendedData] = useState<Restaurant[]>([]);

  // Fetch featured restaurants
  const {
    data: restaurants = [],
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['featuredRestaurants'],
    queryFn: () => getFeaturedRestaurants(16),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const { data: favorites = [] } = useFavorites();
  const toggleFavoriteMutation = useToggleFavorite();

  // Use real data, or mock data if enabled and no real data
  // useMemo gives stable reference for useEffect dependency
  const displayRestaurants = useMemo<Restaurant[]>(() => {
    if (restaurants.length > 0) return restaurants;
    if (ENABLE_MOCK_DATA) return MOCK_FEATURED_RESTAURANTS;
    return [];
  }, [restaurants]);

  // Create extended data for infinite scroll effect
  // Only triple data if we have more than 1 restaurant, otherwise just show single item
  useEffect(() => {
    if (displayRestaurants.length > 1) {
      // Triple the data for seamless infinite scroll
      setExtendedData([...displayRestaurants, ...displayRestaurants, ...displayRestaurants]);
    } else if (displayRestaurants.length === 1) {
      // With only 1 restaurant, don't duplicate
      setExtendedData(displayRestaurants);
    } else {
      // No restaurants, clear the data
      setExtendedData([]);
    }
  }, [displayRestaurants]);

  // Initialize scroll position to middle set (only for infinite scroll with multiple items)
  useEffect(() => {
    if (extendedData.length > 1 && displayRestaurants.length > 1 && flatListRef.current) {
      const middleIndex = displayRestaurants.length;
      setTimeout(() => {
        flatListRef.current?.scrollToIndex({
          index: middleIndex,
          animated: false,
        });
      }, 100);
    }
  }, [extendedData.length, displayRestaurants.length]);

  const handleFavoritePress = useCallback(
    (restaurantId: string) => {
      toggleFavoriteMutation.mutate(restaurantId);
    },
    [toggleFavoriteMutation]
  );

  // Handle scroll to loop back when reaching edges
  const handleScrollEnd = useCallback(
    (event: { nativeEvent: { contentOffset: { x: number } } }) => {
      if (displayRestaurants.length === 0) return;

      const offsetX = event.nativeEvent.contentOffset.x;
      const totalWidth = (CARD_WIDTH + ITEM_SPACING) * displayRestaurants.length;

      // If scrolled to the last set, jump back to middle
      if (offsetX >= totalWidth * 2 - CARD_WIDTH) {
        flatListRef.current?.scrollToOffset({
          offset: totalWidth + offsetX - totalWidth * 2,
          animated: false,
        });
      }
      // If scrolled to the first set, jump to middle
      else if (offsetX <= 0) {
        flatListRef.current?.scrollToOffset({
          offset: totalWidth,
          animated: false,
        });
      }
    },
    [displayRestaurants.length]
  );

  const renderItem = useCallback(
    ({ item, index }: { item: Restaurant; index: number }) => (
      <FeaturedCard
        restaurant={item}
        onPress={() => onRestaurantPress(item)}
        isFavorite={favorites.includes(item.id)}
        onFavoritePress={() => handleFavoritePress(item.id)}
      />
    ),
    [favorites, handleFavoritePress, onRestaurantPress]
  );

  const getItemLayout = useCallback(
    (_: unknown, index: number) => ({
      length: CARD_WIDTH + ITEM_SPACING,
      offset: (CARD_WIDTH + ITEM_SPACING) * index,
      index,
    }),
    []
  );

  // No loading state - data is prefetched during splash screen
  if (isError || displayRestaurants.length === 0) {
    return null; // Don't show section if no data
  }

  return (
    <View style={styles.container}>
      <SectionHeader
        title="Featured for You"
        actionText="View All"
        onActionPress={() => navigation.navigate('FeaturedViewAll')}
      />
      <Spacer size="sm" />

      <FlatList
        ref={flatListRef}
        data={extendedData}
        renderItem={renderItem}
        keyExtractor={(item, index) => `${item.id}-${index}`}
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={CARD_WIDTH + ITEM_SPACING}
        snapToAlignment="center"
        decelerationRate="fast"
        contentContainerStyle={styles.listContent}
        getItemLayout={getItemLayout}
        onMomentumScrollEnd={handleScrollEnd}
        initialNumToRender={3}
        maxToRenderPerBatch={5}
        windowSize={5}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.lg,
  },
  listContent: {
    paddingHorizontal: SIDE_PADDING,
    paddingVertical: spacing.sm,
  },
});
