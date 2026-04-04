import { useRef, useCallback } from 'react';
import { View, FlatList, ViewToken } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { Restaurant } from '../types/database';
import type { RootStackParamList } from '../navigation/types';
import { useNightOffRestaurants } from '../hooks/useNightOffRestaurants';
import { useFavorites, useToggleFavorite } from '../hooks';
import { trackImpression } from '../lib/impressions';
import { createLazyStyles } from '../utils/lazyStyles';
import { spacing } from '../constants/spacing';
import SectionHeader from './SectionHeader';
import Spacer from './Spacer';
import CompactRestaurantCard from './CompactRestaurantCard';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface NightOffSectionProps {
  onRestaurantPress?: (restaurant: Restaurant) => void;
}

export default function NightOffSection({ onRestaurantPress }: NightOffSectionProps) {
  const navigation = useNavigation<NavigationProp>();
  const { data: restaurants = [], isLoading } = useNightOffRestaurants();
  const { data: favorites = [] } = useFavorites();
  const toggleFavoriteMutation = useToggleFavorite();

  const handleRestaurantPress = useCallback(
    (restaurant: Restaurant) => {
      if (onRestaurantPress) {
        onRestaurantPress(restaurant);
      } else {
        navigation.navigate('RestaurantDetail', { restaurantId: restaurant.id });
      }
    },
    [onRestaurantPress, navigation]
  );

  const handleFavoritePress = useCallback(
    (restaurantId: string) => {
      toggleFavoriteMutation.mutate(restaurantId);
    },
    [toggleFavoriteMutation]
  );

  // Track impressions when items scroll into view
  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 50 }).current;
  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    for (const token of viewableItems) {
      const restaurant = token.item as Restaurant;
      if (restaurant?.id) {
        trackImpression(restaurant.id, 'night_off', token.index ?? 0);
      }
    }
  }).current;

  const renderItem = useCallback(
    ({ item }: { item: Restaurant }) => (
      <CompactRestaurantCard
        restaurant={item}
        onPress={() => handleRestaurantPress(item)}
        isFavorite={favorites.includes(item.id)}
        onFavoritePress={() => handleFavoritePress(item.id)}
      />
    ),
    [favorites, handleRestaurantPress, handleFavoritePress]
  );

  // Don't show section while loading or if no results
  if (isLoading || restaurants.length === 0) {
    return null;
  }

  const styles = useStyles();

  return (
    <View style={styles.container}>
      <SectionHeader
        title="Open on Your Night Off"
        subtitle="Great spots open Mondays & Tuesdays"
      />
      <Spacer size="sm" />
      <FlatList
        data={restaurants}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        scrollEnabled={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        initialNumToRender={15}
      />
    </View>
  );
}

const useStyles = createLazyStyles(() => ({
  container: {
    marginBottom: spacing.md,
  },
}));
