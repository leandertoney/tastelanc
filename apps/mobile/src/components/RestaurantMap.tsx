import { useState, useRef, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Dimensions,
  Platform,
  ActivityIndicator,
} from 'react-native';
import MapView, { Marker, Callout, Region, PROVIDER_GOOGLE } from 'react-native-maps';
import ClusteredMapView from 'react-native-map-clustering';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RestaurantWithTier } from '../types/database';
import type { RootStackParamList } from '../navigation/types';
import { colors, radius, spacing } from '../constants/colors';
import {
  useUserLocation,
  LANCASTER_CENTER,
  calculateDistance,
  formatDistance,
} from '../hooks/useUserLocation';
import { formatCuisineName } from '../lib/formatters';

// Import marker icon
const markerIcon = require('../../assets/images/map/marker.png');

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface RestaurantMapProps {
  restaurants: RestaurantWithTier[];
  radiusFilter: number | null; // Miles, null = no filter
  onRadiusChange?: (radius: number | null) => void;
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Radius filter options in miles
const RADIUS_OPTIONS = [
  { value: null, label: 'Any Distance' },
  { value: 0.5, label: '0.5 mi' },
  { value: 1, label: '1 mi' },
  { value: 2, label: '2 mi' },
  { value: 5, label: '5 mi' },
];

const INITIAL_REGION: Region = {
  ...LANCASTER_CENTER,
  latitudeDelta: 0.05,
  longitudeDelta: 0.05,
};

export default function RestaurantMap({
  restaurants,
  radiusFilter,
  onRadiusChange,
}: RestaurantMapProps) {
  const navigation = useNavigation<NavigationProp>();
  const mapRef = useRef<MapView>(null);
  const { location, permissionStatus, requestPermission } = useUserLocation();
  const [showRadiusSelector, setShowRadiusSelector] = useState(false);
  const [selectedRestaurant, setSelectedRestaurant] = useState<RestaurantWithTier | null>(null);

  // Filter restaurants by radius and add distance
  const filteredRestaurants = useMemo(() => {
    const userLat = location?.latitude ?? LANCASTER_CENTER.latitude;
    const userLng = location?.longitude ?? LANCASTER_CENTER.longitude;

    return restaurants
      .filter((r) => r.latitude && r.longitude) // Must have coords
      .map((r) => ({
        ...r,
        distance: calculateDistance(userLat, userLng, r.latitude!, r.longitude!),
      }))
      .filter((r) => {
        if (radiusFilter === null) return true;
        return r.distance <= radiusFilter;
      })
      .sort((a, b) => a.distance - b.distance); // Sort by distance
  }, [restaurants, location, radiusFilter]);

  // Handle marker press
  const handleMarkerPress = useCallback((restaurant: RestaurantWithTier & { distance: number }) => {
    setSelectedRestaurant(restaurant);
  }, []);

  // Navigate to restaurant detail
  const handleViewDetails = useCallback((restaurant: RestaurantWithTier) => {
    navigation.navigate('RestaurantDetail', { id: restaurant.id });
  }, [navigation]);

  // Center map on user location
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

  // Render custom cluster - with defensive checks to prevent crashes
  const renderCluster = useCallback((cluster: any) => {
    // Early return with empty fragment if cluster is invalid
    if (!cluster) {
      return <></>;
    }

    const { id, geometry, onPress, properties } = cluster;

    // Defensive check: ensure we have valid coordinates
    if (!geometry?.coordinates || geometry.coordinates.length < 2) {
      return <></>;
    }

    const longitude = geometry.coordinates[0];
    const latitude = geometry.coordinates[1];

    // Ensure coordinates are valid numbers
    if (typeof longitude !== 'number' || typeof latitude !== 'number' ||
        isNaN(longitude) || isNaN(latitude)) {
      return <></>;
    }

    const points = properties?.point_count ?? 0;

    return (
      <Marker
        key={`cluster-${id}`}
        coordinate={{ latitude, longitude }}
        onPress={onPress}
        tracksViewChanges={false}
      >
        <View style={styles.clusterMarker}>
          <Text style={styles.clusterText}>{points}</Text>
        </View>
      </Marker>
    );
  }, []);

  // Get valid restaurants for rendering
  const validRestaurants = useMemo(() => {
    return filteredRestaurants.filter((restaurant) =>
      restaurant.latitude != null &&
      restaurant.longitude != null &&
      typeof restaurant.latitude === 'number' &&
      typeof restaurant.longitude === 'number' &&
      !isNaN(restaurant.latitude) &&
      !isNaN(restaurant.longitude)
    );
  }, [filteredRestaurants]);

  return (
    <View style={styles.container}>
      {/* Map */}
      <ClusteredMapView
        ref={mapRef}
        style={styles.map}
        provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
        initialRegion={INITIAL_REGION}
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
        {validRestaurants.map((restaurant) => {
          // Show logo for restaurants that have one
          const showLogo = !!restaurant.logo_url;

          return (
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
                {showLogo ? (
                  <View style={styles.logoMarkerContainer}>
                    <Image
                      source={{ uri: restaurant.logo_url!, cache: 'reload' }}
                      style={styles.logoMarker}
                      resizeMode="cover"
                    />
                  </View>
                ) : (
                  <Image source={markerIcon} style={styles.markerImage} resizeMode="contain" />
                )}
              </View>
              <Callout tooltip onPress={() => handleViewDetails(restaurant)}>
                <View style={styles.calloutContainer}>
                  <Text style={styles.calloutTitle} numberOfLines={1}>
                    {restaurant.name}
                  </Text>
                  <Text style={styles.calloutSubtitle}>
                    {restaurant.cuisine ? formatCuisineName(restaurant.cuisine) : 'Restaurant'} · {formatDistance(restaurant.distance)}
                  </Text>
                  <TouchableOpacity style={styles.calloutButton}>
                    <Text style={styles.calloutButtonText}>View Details</Text>
                  </TouchableOpacity>
                </View>
              </Callout>
            </Marker>
          );
        })}
      </ClusteredMapView>

      {/* Location Button */}
      <TouchableOpacity style={styles.locationButton} onPress={centerOnUser}>
        <Ionicons
          name={permissionStatus === 'granted' ? 'locate' : 'locate-outline'}
          size={22}
          color={colors.text}
        />
      </TouchableOpacity>

      {/* Radius Filter Button */}
      <TouchableOpacity
        style={styles.radiusButton}
        onPress={() => setShowRadiusSelector(!showRadiusSelector)}
      >
        <Ionicons name="options-outline" size={18} color={colors.text} />
        <Text style={styles.radiusButtonText}>
          {radiusFilter ? `${radiusFilter} mi` : 'Distance'}
        </Text>
      </TouchableOpacity>

      {/* Radius Selector */}
      {showRadiusSelector && (
        <View style={styles.radiusSelector}>
          {RADIUS_OPTIONS.map((option) => (
            <TouchableOpacity
              key={option.label}
              style={[
                styles.radiusOption,
                radiusFilter === option.value && styles.radiusOptionSelected,
              ]}
              onPress={() => {
                onRadiusChange?.(option.value);
                setShowRadiusSelector(false);
              }}
            >
              <Text
                style={[
                  styles.radiusOptionText,
                  radiusFilter === option.value && styles.radiusOptionTextSelected,
                ]}
              >
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Results Count */}
      <View style={styles.resultsCount}>
        <Text style={styles.resultsCountText}>
          {validRestaurants.length} {validRestaurants.length === 1 ? 'place' : 'places'}
          {radiusFilter && ` within ${radiusFilter} mi`}
        </Text>
      </View>
    </View>
  );
}

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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primary,
  },
  map: {
    flex: 1,
  },
  markerWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  markerImage: {
    width: 36,
    height: 36,
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
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.text,
  },
  clusterText: {
    color: colors.text,
    fontWeight: 'bold',
    fontSize: 14,
  },
  calloutContainer: {
    backgroundColor: colors.cardBg,
    borderRadius: radius.md,
    padding: spacing.md,
    minWidth: 180,
    maxWidth: 250,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  calloutTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  calloutSubtitle: {
    fontSize: 13,
    color: colors.textMuted,
    marginBottom: 12,
  },
  calloutButton: {
    backgroundColor: colors.accent,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: radius.sm,
    alignItems: 'center',
  },
  calloutButtonText: {
    color: colors.text,
    fontWeight: '600',
    fontSize: 14,
  },
  locationButton: {
    position: 'absolute',
    bottom: 100,
    right: 16,
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
  },
  radiusButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardBg,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: radius.full,
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  radiusButtonText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '500',
  },
  radiusSelector: {
    position: 'absolute',
    top: 60,
    right: 16,
    backgroundColor: colors.cardBg,
    borderRadius: radius.md,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  radiusOption: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  radiusOptionSelected: {
    backgroundColor: colors.accent,
  },
  radiusOptionText: {
    color: colors.text,
    fontSize: 14,
  },
  radiusOptionTextSelected: {
    fontWeight: '600',
  },
  resultsCount: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    backgroundColor: colors.cardBg,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: radius.full,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  resultsCountText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '500',
  },
});
