import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Platform,
  Keyboard,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import BottomSheet, { BottomSheetFlatList } from '@gorhom/bottom-sheet';
import MapView, { Marker, Region, PROVIDER_GOOGLE } from 'react-native-maps';
import ClusteredMapView from 'react-native-map-clustering';
import { supabase } from '../lib/supabase';
import { getFavorites, toggleFavorite } from '../lib/favorites';
import { tieredFairRotate, getTierName } from '../lib/fairRotation';
import { useAuth } from '../hooks/useAuth';
import {
  useUserLocation,
  LANCASTER_CENTER,
  calculateDistance,
  isNearLancaster,
} from '../hooks/useUserLocation';
import type { RestaurantCategory, RestaurantWithTier } from '../types/database';
import type { RootStackParamList } from '../navigation/types';
import { SearchBar, CategoryChip, CompactRestaurantCard, MapRestaurantCard } from '../components';
import { colors, radius } from '../constants/colors';
import { trackImpression } from '../lib/impressions';

const tasteLancLogo = require('../../assets/icon.png');

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

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

const INITIAL_REGION: Region = {
  ...LANCASTER_CENTER,
  latitudeDelta: 0.05,
  longitudeDelta: 0.05,
};

// Dark map style for Google Maps
const darkMapStyle = [
  { elementType: 'geometry', stylers: [{ color: '#212121' }] },
  { elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#757575' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#212121' }] },
  { featureType: 'administrative', elementType: 'geometry', stylers: [{ color: '#757575' }] },
  { featureType: 'poi', elementType: 'labels.text.fill', stylers: [{ color: '#757575' }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#181818' }] },
  { featureType: 'poi.park', elementType: 'labels.text.fill', stylers: [{ color: '#616161' }] },
  { featureType: 'road', elementType: 'geometry.fill', stylers: [{ color: '#2c2c2c' }] },
  { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#8a8a8a' }] },
  { featureType: 'road.arterial', elementType: 'geometry', stylers: [{ color: '#373737' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#3c3c3c' }] },
  { featureType: 'road.highway.controlled_access', elementType: 'geometry', stylers: [{ color: '#4e4e4e' }] },
  { featureType: 'road.local', elementType: 'labels.text.fill', stylers: [{ color: '#616161' }] },
  { featureType: 'transit', elementType: 'labels.text.fill', stylers: [{ color: '#757575' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#000000' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#3d3d3d' }] },
];

export default function SearchScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { userId } = useAuth();
  const { location, permissionStatus, requestPermission } = useUserLocation();

  // Search & filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<RestaurantCategory | 'all'>('all');
  const [restaurants, setRestaurants] = useState<RestaurantWithTier[]>([]);
  const [loading, setLoading] = useState(false);
  const [favorites, setFavorites] = useState<string[]>([]);

  // Map state
  const mapRef = useRef<MapView>(null);
  const bottomSheetRef = useRef<BottomSheet>(null);
  const hasCenteredOnUser = useRef(false);
  const [mapReady, setMapReady] = useState(false);
  const [selectedRestaurant, setSelectedRestaurant] = useState<
    (RestaurantWithTier & { distance: number }) | null
  >(null);

  const snapPoints = useMemo(() => ['12%', '50%', '90%'], []);

  // Clear card overlay on tab blur
  useFocusEffect(
    useCallback(() => {
      return () => {
        setSelectedRestaurant(null);
      };
    }, [])
  );

  // Auto-center on user location when in Lancaster area
  useEffect(() => {
    if (!location || !mapRef.current || !mapReady || hasCenteredOnUser.current) return;
    hasCenteredOnUser.current = true;

    if (isNearLancaster(location)) {
      mapRef.current.animateToRegion({
        ...location,
        latitudeDelta: 0.02,
        longitudeDelta: 0.02,
      });
    }
  }, [location, mapReady]);

  // Load favorites and initial restaurants on mount
  useEffect(() => {
    const loadInitialData = async () => {
      if (userId) {
        const favs = await getFavorites(userId);
        setFavorites(favs);
      }
      loadAllRestaurants();
    };
    loadInitialData();
  }, [userId]);

  const loadAllRestaurants = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('restaurants')
        .select('*, tiers(name)');

      if (error) {
        console.error('Load error:', error);
      } else {
        // Apply tiered fair rotation: Elite first, Premium second, Basic third
        setRestaurants(tieredFairRotate(data || []));
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
        loadAllRestaurants();
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, selectedCategory]);

  // Dismiss card on search/filter change
  useEffect(() => {
    setSelectedRestaurant(null);
  }, [searchQuery, selectedCategory]);

  const performSearch = useCallback(async () => {
    setLoading(true);

    try {
      let query = supabase.from('restaurants').select('*, tiers(name)');

      if (searchQuery.trim().length >= 2) {
        query = query.ilike('name', `%${searchQuery.trim()}%`);
      }

      if (selectedCategory !== 'all') {
        query = query.contains('categories', [selectedCategory]);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Search error:', error);
        setRestaurants([]);
      } else {
        // Apply tiered fair rotation: Elite first, Premium second, Basic third
        setRestaurants(tieredFairRotate(data || []));
      }
    } catch (err) {
      console.error('Search error:', err);
      setRestaurants([]);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, selectedCategory]);

  // Filter restaurants by distance and add distance field
  const filteredRestaurants = useMemo(() => {
    const userLat = location?.latitude ?? LANCASTER_CENTER.latitude;
    const userLng = location?.longitude ?? LANCASTER_CENTER.longitude;

    return restaurants
      .filter((r) => r.latitude && r.longitude)
      .map((r) => ({
        ...r,
        distance: calculateDistance(userLat, userLng, r.latitude!, r.longitude!),
      }))
      .sort((a, b) => a.distance - b.distance);
  }, [restaurants, location]);

  // Valid restaurants for map markers
  const validRestaurants = useMemo(() => {
    return filteredRestaurants.filter(
      (r) =>
        r.latitude != null &&
        r.longitude != null &&
        typeof r.latitude === 'number' &&
        typeof r.longitude === 'number' &&
        !isNaN(r.latitude) &&
        !isNaN(r.longitude)
    );
  }, [filteredRestaurants]);

  const handleFavoritePress = useCallback(
    async (restaurantId: string) => {
      if (!userId) return;
      const newState = await toggleFavorite(userId, restaurantId);
      setFavorites((prev) =>
        newState ? [...prev, restaurantId] : prev.filter((id) => id !== restaurantId)
      );
    },
    [userId]
  );

  const handleRestaurantPress = useCallback(
    (restaurant: RestaurantWithTier) => {
      navigation.navigate('RestaurantDetail', { id: restaurant.id });
    },
    [navigation]
  );

  const handleCategoryPress = (category: RestaurantCategory | 'all') => {
    setSelectedCategory(category);
  };

  const handleClearSearch = () => {
    setSearchQuery('');
  };

  // Track impressions when items become visible in search results
  const searchViewabilityConfig = useRef({ itemVisiblePercentThreshold: 50 }).current;
  const onSearchViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: { item: RestaurantWithTier & { distance: number }; index: number | null }[] }) => {
    for (const token of viewableItems) {
      if (token.item?.id) {
        trackImpression(token.item.id, 'search', token.index ?? 0);
      }
    }
  }).current;

  const handleMarkerPress = useCallback(
    (restaurant: RestaurantWithTier & { distance: number }) => {
      setSelectedRestaurant(restaurant);
      bottomSheetRef.current?.snapToIndex(0);
      mapRef.current?.animateToRegion(
        {
          latitude: restaurant.latitude!,
          longitude: restaurant.longitude!,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        },
        300
      );
    },
    []
  );

  const handleCardClose = useCallback(() => {
    setSelectedRestaurant(null);
  }, []);

  const handleMapPress = useCallback(() => {
    if (selectedRestaurant) {
      setSelectedRestaurant(null);
    }
    Keyboard.dismiss();
  }, [selectedRestaurant]);

  const handleSheetChange = useCallback(
    (index: number) => {
      if (index > 0 && selectedRestaurant) {
        setSelectedRestaurant(null);
      }
    },
    [selectedRestaurant]
  );

  const centerOnUser = useCallback(async () => {
    if (permissionStatus !== 'granted') {
      const granted = await requestPermission();
      if (!granted) return;
    }

    if (location && mapRef.current) {
      mapRef.current.animateToRegion({
        ...location,
        latitudeDelta: 0.02,
        longitudeDelta: 0.02,
      });
    }
  }, [location, permissionStatus, requestPermission]);

  // Render custom cluster
  const renderCluster = useCallback((cluster: any) => {
    if (!cluster) return <></>;

    const { id, geometry, onPress } = cluster;

    if (!geometry?.coordinates || geometry.coordinates.length < 2) return <></>;

    const longitude = geometry.coordinates[0];
    const latitude = geometry.coordinates[1];

    if (
      typeof longitude !== 'number' ||
      typeof latitude !== 'number' ||
      isNaN(longitude) ||
      isNaN(latitude)
    )
      return <></>;

    return (
      <Marker
        key={`cluster-${id}`}
        coordinate={{ latitude, longitude }}
        onPress={onPress}
        tracksViewChanges={false}
      >
        <View style={styles.clusterMarker} />
      </Marker>
    );
  }, []);

  return (
    <GestureHandlerRootView style={styles.root}>
      <View style={styles.container}>
        {/* Full-screen map */}
        <ClusteredMapView
          ref={mapRef}
          style={StyleSheet.absoluteFillObject}
          provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
          initialRegion={INITIAL_REGION}
          onMapReady={() => setMapReady(true)}
          onPress={handleMapPress}
          showsUserLocation={permissionStatus === 'granted'}
          showsMyLocationButton={false}
          showsCompass={false}
          clusterColor={colors.accent}
          clusterTextColor={colors.text}
          renderCluster={renderCluster}
          radius={50}
          minZoom={1}
          maxZoom={20}
          customMapStyle={darkMapStyle}
        >
          {validRestaurants.map((restaurant) => (
              <Marker
                key={restaurant.id}
                coordinate={{
                  latitude: restaurant.latitude!,
                  longitude: restaurant.longitude!,
                }}
                onPress={() => handleMarkerPress(restaurant)}
                tracksViewChanges={false}
              >
                <View style={styles.markerWrapper}>
                  <View style={styles.logoMarkerContainer}>
                    <Image source={tasteLancLogo} style={styles.logoMarker} resizeMode="cover" />
                  </View>
                </View>
              </Marker>
          ))}
        </ClusteredMapView>

        {/* Floating search bar + filter chips */}
        <SafeAreaView edges={['top']} style={styles.floatingHeader}>
          <View style={styles.searchBarContainer}>
            <SearchBar
              value={searchQuery}
              onChangeText={setSearchQuery}
              onClear={handleClearSearch}
              placeholder="Search restaurants, bars..."
              autoFocus={false}
            />
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipsContent}
            style={styles.chipsScroll}
            keyboardShouldPersistTaps="handled"
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
        </SafeAreaView>

        {/* Loading indicator */}
        {loading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="small" color={colors.accent} />
          </View>
        )}

        {/* Location button */}
        <TouchableOpacity style={styles.locationButton} onPress={centerOnUser}>
          <Ionicons
            name={permissionStatus === 'granted' ? 'locate' : 'locate-outline'}
            size={22}
            color={colors.text}
          />
        </TouchableOpacity>

        {/* Map restaurant card overlay */}
        {selectedRestaurant && (
          <MapRestaurantCard
            restaurant={selectedRestaurant}
            isFavorite={favorites.includes(selectedRestaurant.id)}
            onFavoritePress={() => handleFavoritePress(selectedRestaurant.id)}
            onPress={() => handleRestaurantPress(selectedRestaurant)}
            onClose={handleCardClose}
          />
        )}

        {/* Bottom sheet restaurant list */}
        <BottomSheet
          ref={bottomSheetRef}
          index={0}
          snapPoints={snapPoints}
          onChange={handleSheetChange}
          backgroundStyle={styles.sheetBackground}
          handleIndicatorStyle={styles.handleIndicator}
          enablePanDownToClose={false}
        >
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetHeaderText}>
              {filteredRestaurants.length}{' '}
              {filteredRestaurants.length === 1 ? 'place' : 'places'}
              {searchQuery.trim() ? ` for "${searchQuery.trim()}"` : ''}
            </Text>
          </View>
          <BottomSheetFlatList
            data={filteredRestaurants}
            keyExtractor={(item: RestaurantWithTier & { distance: number }) => item.id}
            renderItem={({ item }: { item: RestaurantWithTier & { distance: number } }) => (
              <CompactRestaurantCard
                restaurant={item}
                onPress={() => handleRestaurantPress(item)}
                isFavorite={favorites.includes(item.id)}
                onFavoritePress={() => handleFavoritePress(item.id)}
              />
            )}
            contentContainerStyle={styles.sheetListContent}
            showsVerticalScrollIndicator={false}
            onViewableItemsChanged={onSearchViewableItemsChanged}
            viewabilityConfig={searchViewabilityConfig}
            ListEmptyComponent={
              !loading ? (
                <View style={styles.sheetEmpty}>
                  <Ionicons name="restaurant-outline" size={32} color={colors.textSecondary} />
                  <Text style={styles.sheetEmptyText}>No restaurants found</Text>
                </View>
              ) : null
            }
          />
        </BottomSheet>
      </View>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: colors.primary,
  },

  // Floating search overlay
  floatingHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  searchBarContainer: {
    marginHorizontal: 16,
    marginTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  chipsScroll: {
    marginTop: 10,
  },
  chipsContent: {
    paddingHorizontal: 16,
  },

  // Loading overlay
  loadingOverlay: {
    position: 'absolute',
    top: 140,
    alignSelf: 'center',
    backgroundColor: colors.cardBg,
    borderRadius: radius.full,
    padding: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },

  // Location button
  locationButton: {
    position: 'absolute',
    right: 16,
    bottom: 140,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.cardBg,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    zIndex: 5,
  },

  // Map markers
  markerWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoMarkerContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.cardBg,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: colors.accent,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  logoMarker: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  clusterMarker: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.accent,
  },

  // Bottom sheet
  sheetBackground: {
    backgroundColor: colors.primary,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  handleIndicator: {
    backgroundColor: colors.textSecondary,
    width: 40,
  },
  sheetHeader: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  sheetHeaderText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textMuted,
  },
  sheetListContent: {
    paddingTop: 8,
    paddingBottom: 24,
  },
  sheetEmpty: {
    paddingVertical: 32,
    alignItems: 'center',
    gap: 8,
  },
  sheetEmptyText: {
    fontSize: 15,
    color: colors.textMuted,
  },
});
