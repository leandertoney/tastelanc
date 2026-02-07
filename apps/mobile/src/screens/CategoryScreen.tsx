import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { getFavorites, toggleFavorite } from '../lib/favorites';
import { tieredFairRotate, getTierName } from '../lib/fairRotation';
import { useAuth, usePromoCard } from '../hooks';
import { injectPromoIntoList, type ListItem } from '../lib/listUtils';
import type { Restaurant, RestaurantCategory } from '../types/database';
import type { RootStackParamList } from '../navigation/types';
import { RestaurantCard, PromoCard } from '../components';
import { colors } from '../constants/colors';

type Props = NativeStackScreenProps<RootStackParamList, 'Category'>;

// Category metadata for display
const CATEGORY_INFO: Record<RestaurantCategory, { title: string; icon: string; description: string }> = {
  bars: {
    title: 'Bars',
    icon: 'beer-outline',
    description: 'Lancaster\'s best bars and pubs',
  },
  nightlife: {
    title: 'Nightlife',
    icon: 'moon-outline',
    description: 'Dance clubs, lounges & late-night spots',
  },
  rooftops: {
    title: 'Rooftops',
    icon: 'sunny-outline',
    description: 'Scenic rooftop dining & drinks',
  },
  brunch: {
    title: 'Brunch',
    icon: 'cafe-outline',
    description: 'Weekend brunch favorites',
  },
  lunch: {
    title: 'Lunch',
    icon: 'restaurant-outline',
    description: 'Great spots for midday meals',
  },
  dinner: {
    title: 'Dinner',
    icon: 'wine-outline',
    description: 'Fine dining & dinner destinations',
  },
  outdoor_dining: {
    title: 'Outdoor Dining',
    icon: 'leaf-outline',
    description: 'Patios, terraces & al fresco dining',
  },
};

export default function CategoryScreen({ route, navigation }: Props) {
  const { category } = route.params;
  const { userId } = useAuth();
  const categoryInfo = CATEGORY_INFO[category];

  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [favorites, setFavorites] = useState<string[]>([]);
  const { isVisible: showPromo, dismiss: dismissPromo } = usePromoCard();

  // Inject promo card into the list
  const listData = useMemo(() => {
    return injectPromoIntoList(restaurants, showPromo, 3);
  }, [restaurants, showPromo]);

  // Set navigation title
  useEffect(() => {
    navigation.setOptions({
      title: categoryInfo.title,
    });
  }, [navigation, categoryInfo.title]);

  // Load favorites
  useEffect(() => {
    const loadFavorites = async () => {
      if (!userId) return;
      const favs = await getFavorites(userId);
      setFavorites(favs);
    };
    loadFavorites();
  }, [userId]);

  // Fetch restaurants for this category
  useEffect(() => {
    fetchRestaurants();
  }, [category]);

  const fetchRestaurants = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('restaurants')
        .select('*, tiers(name)')
        .eq('is_active', true)
        .contains('categories', [category]);

      if (error) {
        console.error('Error fetching category restaurants:', error);
        setRestaurants([]);
      } else {
        // Apply tiered fair rotation: Elite first, Premium second, Basic third
        setRestaurants(tieredFairRotate(data || []));
      }
    } catch (err) {
      console.error('Error:', err);
      setRestaurants([]);
    } finally {
      setLoading(false);
    }
  };

  const handleFavoritePress = useCallback(async (restaurantId: string) => {
    if (!userId) return;
    const newState = await toggleFavorite(userId, restaurantId);
    setFavorites((prev) =>
      newState ? [...prev, restaurantId] : prev.filter((id) => id !== restaurantId)
    );
  }, [userId]);

  const handleRestaurantPress = (restaurant: Restaurant) => {
    navigation.navigate('RestaurantDetail', { id: restaurant.id });
  };

  const renderRestaurant = ({ item }: { item: ListItem<Restaurant> }) => {
    if (item.type === 'promo') {
      return <PromoCard variant="full" onDismiss={dismissPromo} />;
    }

    const restaurant = item.data!;
    return (
      <RestaurantCard
        restaurant={restaurant}
        onPress={() => handleRestaurantPress(restaurant)}
        isFavorite={favorites.includes(restaurant.id)}
        onFavoritePress={() => handleFavoritePress(restaurant.id)}
      />
    );
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.iconContainer}>
        <Ionicons name={categoryInfo.icon as any} size={32} color={colors.primary} />
      </View>
      <Text style={styles.description}>{categoryInfo.description}</Text>
      <Text style={styles.count}>
        {restaurants.length} {restaurants.length === 1 ? 'spot' : 'spots'}
      </Text>
    </View>
  );

  const renderEmpty = () => {
    if (loading) return null;

    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="restaurant-outline" size={64} color="#E5E7EB" />
        <Text style={styles.emptyTitle}>No Restaurants Found</Text>
        <Text style={styles.emptySubtitle}>
          We're still adding spots to this category.{'\n'}Check back soon!
        </Text>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading {categoryInfo.title}...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <FlatList
        data={listData}
        renderItem={renderRestaurant}
        keyExtractor={(item) => item.key}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6B7280',
  },
  header: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 16,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    marginBottom: 8,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: `${colors.primary}15`,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  description: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 8,
  },
  count: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  listContent: {
    paddingBottom: 24,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingTop: 60,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 15,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
  },
});
