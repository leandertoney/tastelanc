import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { getFavorites, toggleFavorite } from '../lib/favorites';
import { useAuth } from '../hooks/useAuth';
import { usePromoCard } from '../hooks';
import { injectPromoIntoList, type ListItem } from '../lib/listUtils';
import type { Restaurant, RestaurantCategory, RestaurantWithTier } from '../types/database';
import type { RootStackParamList } from '../navigation/types';
import { SearchBar, CategoryChip, RestaurantCard, PromoCard } from '../components';
import RestaurantMap from '../components/RestaurantMap';
import { colors, radius } from '../constants/colors';

type ViewMode = 'list' | 'map';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

// All categories from architecture
const CATEGORIES: { key: RestaurantCategory | 'all'; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'bars', label: 'Bars' },
  { key: 'nightlife', label: 'Nightlife' },
  { key: 'rooftops', label: 'Rooftops' },
  { key: 'brunch', label: 'Brunch' },
  { key: 'lunch', label: 'Lunch' },
  { key: 'dinner', label: 'Dinner' },
  { key: 'outdoor_dining', label: 'Outdoor' },
];

export default function SearchScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { userId } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<RestaurantCategory | 'all'>('all');
  const [restaurants, setRestaurants] = useState<RestaurantWithTier[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [radiusFilter, setRadiusFilter] = useState<number | null>(null);
  const { isVisible: showPromo, dismiss: dismissPromo } = usePromoCard();

  // Inject promo card into the list
  const listData = useMemo(() => {
    return injectPromoIntoList(restaurants, showPromo, 3);
  }, [restaurants, showPromo]);

  // Load favorites and initial restaurants on mount
  useEffect(() => {
    const loadInitialData = async () => {
      if (userId) {
        const favs = await getFavorites(userId);
        setFavorites(favs);
      }
      // Load all restaurants on mount
      loadAllRestaurants();
    };
    loadInitialData();
  }, [userId]);

  const loadAllRestaurants = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('restaurants')
        .select('*')
        .order('name', { ascending: true });

      if (error) {
        console.error('Load error:', error);
      } else {
        setRestaurants(data || []);
        setHasSearched(true);
      }
    } catch (err) {
      console.error('Load error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery.trim().length >= 2 || selectedCategory !== 'all') {
        performSearch();
      } else if (searchQuery.trim().length === 0 && selectedCategory === 'all') {
        // Reload all restaurants when search is cleared
        loadAllRestaurants();
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, selectedCategory]);

  const performSearch = useCallback(async () => {
    setLoading(true);
    setHasSearched(true);

    try {
      let query = supabase
        .from('restaurants')
        .select('*');

      // Apply text search if query exists
      if (searchQuery.trim().length >= 2) {
        query = query.ilike('name', `%${searchQuery.trim()}%`);
      }

      // Apply category filter
      if (selectedCategory !== 'all') {
        query = query.contains('categories', [selectedCategory]);
      }

      // Order by name
      query = query.order('name', { ascending: true });

      const { data, error } = await query;

      if (error) {
        console.error('Search error:', error);
        setRestaurants([]);
      } else {
        setRestaurants(data || []);
      }
    } catch (err) {
      console.error('Search error:', err);
      setRestaurants([]);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, selectedCategory]);

  const handleFavoritePress = useCallback(async (restaurantId: string) => {
    if (!userId) return;
    const newState = await toggleFavorite(userId, restaurantId);
    setFavorites((prev) =>
      newState ? [...prev, restaurantId] : prev.filter((id) => id !== restaurantId)
    );
  }, [userId]);

  const handleRestaurantPress = (restaurant: RestaurantWithTier) => {
    // Save to recent searches if searching by name
    if (searchQuery.trim().length >= 2) {
      saveRecentSearch(searchQuery.trim());
    }
    navigation.navigate('RestaurantDetail', { id: restaurant.id });
  };

  const saveRecentSearch = (query: string) => {
    setRecentSearches((prev) => {
      const filtered = prev.filter((s) => s.toLowerCase() !== query.toLowerCase());
      return [query, ...filtered].slice(0, 5);
    });
  };

  const handleRecentSearchPress = (query: string) => {
    setSearchQuery(query);
  };

  const clearRecentSearches = () => {
    setRecentSearches([]);
  };

  const handleCategoryPress = (category: RestaurantCategory | 'all') => {
    setSelectedCategory(category);
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    // Will trigger loadAllRestaurants via the debounced useEffect
  };

  const renderRestaurant = ({ item }: { item: ListItem<RestaurantWithTier> }) => {
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

  const renderEmptyState = () => {
    if (loading) return null;

    if (!hasSearched) {
      return (
        <View style={styles.emptyContainer}>
          <Ionicons name="search" size={64} color={colors.textSecondary} />
          <Text style={styles.emptyTitle}>Discover Lancaster</Text>
          <Text style={styles.emptySubtitle}>
            Search for restaurants, bars, and more{'\n'}or select a category to browse
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="restaurant-outline" size={64} color={colors.textSecondary} />
        <Text style={styles.emptyTitle}>No Results Found</Text>
        <Text style={styles.emptySubtitle}>
          Try adjusting your search or{'\n'}selecting a different category
        </Text>
      </View>
    );
  };

  const renderRecentSearches = () => {
    if (recentSearches.length === 0 || searchQuery.length > 0 || hasSearched) return null;

    return (
      <View style={styles.recentContainer}>
        <View style={styles.recentHeader}>
          <Text style={styles.recentTitle}>Recent Searches</Text>
          <TouchableOpacity onPress={clearRecentSearches}>
            <Text style={styles.clearText}>Clear</Text>
          </TouchableOpacity>
        </View>
        {recentSearches.map((search, index) => (
          <TouchableOpacity
            key={index}
            style={styles.recentItem}
            onPress={() => handleRecentSearchPress(search)}
          >
            <Ionicons name="time-outline" size={18} color={colors.textMuted} />
            <Text style={styles.recentItemText}>{search}</Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {/* Search Header */}
      <View style={styles.header}>
        <View style={styles.searchRow}>
          <View style={styles.searchBarWrapper}>
            <SearchBar
              value={searchQuery}
              onChangeText={setSearchQuery}
              onClear={handleClearSearch}
              placeholder="Search restaurants, bars..."
              autoFocus={false}
            />
          </View>
          <View style={styles.viewToggle}>
            <TouchableOpacity
              style={[styles.toggleButton, viewMode === 'list' && styles.toggleButtonActive]}
              onPress={() => setViewMode('list')}
            >
              <Ionicons
                name="list"
                size={20}
                color={viewMode === 'list' ? colors.text : colors.textMuted}
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.toggleButton, viewMode === 'map' && styles.toggleButtonActive]}
              onPress={() => setViewMode('map')}
            >
              <Ionicons
                name="map"
                size={20}
                color={viewMode === 'map' ? colors.text : colors.textMuted}
              />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Category Chips */}
      <View style={styles.categoriesWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoriesContainer}
        >
          {CATEGORIES.map((cat) => (
            <CategoryChip
              key={cat.key}
              label={cat.label}
              selected={selectedCategory === cat.key}
              onPress={() => handleCategoryPress(cat.key)}
            />
          ))}
        </ScrollView>
      </View>

      {/* Results Count */}
      {hasSearched && !loading && (
        <View style={styles.resultsHeader}>
          <Text style={styles.resultsCount}>
            {restaurants.length} {restaurants.length === 1 ? 'result' : 'results'}
            {searchQuery.trim() && ` for "${searchQuery.trim()}"`}
            {selectedCategory !== 'all' && ` in ${CATEGORIES.find(c => c.key === selectedCategory)?.label}`}
          </Text>
        </View>
      )}

      {/* Loading State */}
      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={styles.loadingText}>Searching...</Text>
        </View>
      )}

      {/* Recent Searches (only in list view) */}
      {viewMode === 'list' && renderRecentSearches()}

      {/* Results - List or Map View */}
      {viewMode === 'list' ? (
        // List View
        !loading && (
          <FlatList
            data={listData}
            renderItem={renderRestaurant}
            keyExtractor={(item) => item.key}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={renderEmptyState}
          />
        )
      ) : (
        // Map View
        <RestaurantMap
          restaurants={restaurants}
          radiusFilter={radiusFilter}
          onRadiusChange={setRadiusFilter}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primary,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: colors.primaryLight,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  searchBarWrapper: {
    flex: 1,
  },
  viewToggle: {
    flexDirection: 'row',
    backgroundColor: colors.cardBg,
    borderRadius: radius.sm,
    padding: 4,
  },
  toggleButton: {
    padding: 8,
    borderRadius: radius.xs,
  },
  toggleButtonActive: {
    backgroundColor: colors.accent,
  },
  categoriesWrapper: {
    backgroundColor: colors.primaryLight,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  categoriesContainer: {
    paddingHorizontal: 16,
  },
  resultsHeader: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.primary,
  },
  resultsCount: {
    fontSize: 14,
    color: colors.textMuted,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 100,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: colors.textMuted,
  },
  listContent: {
    paddingTop: 8,
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
    color: colors.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 15,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 22,
  },
  recentContainer: {
    backgroundColor: colors.cardBg,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: radius.md,
    padding: 16,
  },
  recentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  recentTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  clearText: {
    fontSize: 14,
    color: colors.accent,
  },
  recentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 10,
  },
  recentItemText: {
    fontSize: 15,
    color: colors.textMuted,
  },
});
