import { useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Linking,
  Platform,
  Dimensions,
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius } from '../constants/colors';

const MAP_HEIGHT = 180;

interface MapPreviewProps {
  latitude: number | null;
  longitude: number | null;
  address: string;
  name: string;
}

// Dark map style
const darkMapStyle = [
  { elementType: 'geometry', stylers: [{ color: '#212121' }] },
  { elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#757575' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#212121' }] },
  { featureType: 'administrative', elementType: 'geometry', stylers: [{ color: '#757575' }] },
  { featureType: 'poi', elementType: 'labels.text.fill', stylers: [{ color: '#757575' }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#181818' }] },
  { featureType: 'road', elementType: 'geometry.fill', stylers: [{ color: '#2c2c2c' }] },
  { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#8a8a8a' }] },
  { featureType: 'road.arterial', elementType: 'geometry', stylers: [{ color: '#373737' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#3c3c3c' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#000000' }] },
];

export default function MapPreview({
  latitude,
  longitude,
  address,
  name,
}: MapPreviewProps) {
  const mapRef = useRef<MapView>(null);

  // No coordinates available
  if (!latitude || !longitude) {
    return (
      <View style={styles.noMapContainer}>
        <Ionicons name="location-outline" size={32} color={colors.textSecondary} />
        <Text style={styles.noMapText}>Map not available</Text>
      </View>
    );
  }

  const handleOpenMaps = () => {
    const url = Platform.select({
      ios: `maps:0,0?q=${encodeURIComponent(address)}`,
      android: `geo:0,0?q=${encodeURIComponent(address)}`,
      default: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`,
    });

    Linking.openURL(url);
  };

  const handleGetDirections = () => {
    const url = Platform.select({
      ios: `maps:0,0?daddr=${encodeURIComponent(address)}`,
      android: `google.navigation:q=${encodeURIComponent(address)}`,
      default: `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`,
    });

    Linking.openURL(url);
  };

  return (
    <View style={styles.container}>
      {/* Map */}
      <TouchableOpacity
        style={styles.mapContainer}
        onPress={handleOpenMaps}
        activeOpacity={0.9}
      >
        <MapView
          ref={mapRef}
          style={styles.map}
          provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
          initialRegion={{
            latitude,
            longitude,
            latitudeDelta: 0.005,
            longitudeDelta: 0.005,
          }}
          scrollEnabled={false}
          zoomEnabled={false}
          rotateEnabled={false}
          pitchEnabled={false}
          showsUserLocation={false}
          showsMyLocationButton={false}
          showsCompass={false}
          showsScale={false}
          showsBuildings={false}
          showsTraffic={false}
          showsIndoors={false}
          customMapStyle={darkMapStyle}
          pointerEvents="none"
        >
          <Marker
            coordinate={{ latitude, longitude }}
            title={name}
          >
            <View style={styles.markerContainer}>
              <Ionicons name="location" size={32} color={colors.accent} />
            </View>
          </Marker>
        </MapView>
      </TouchableOpacity>

      {/* Address */}
      <View style={styles.addressContainer}>
        <Ionicons name="location-outline" size={18} color={colors.textMuted} />
        <Text style={styles.addressText}>{address}</Text>
      </View>

      {/* Action Buttons */}
      <View style={styles.actionsRow}>
        <TouchableOpacity style={styles.actionButton} onPress={handleOpenMaps}>
          <Ionicons name="map-outline" size={18} color={colors.accent} />
          <Text style={styles.actionText}>View Map</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.directionsButton]}
          onPress={handleGetDirections}
        >
          <Ionicons name="navigate" size={18} color={colors.text} />
          <Text style={styles.directionsText}>Get Directions</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 8,
  },
  mapContainer: {
    width: '100%',
    height: MAP_HEIGHT,
    borderRadius: radius.md,
    overflow: 'hidden',
    backgroundColor: colors.cardBgElevated,
  },
  map: {
    width: '100%',
    height: '100%',
  },
  markerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  addressContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 12,
    gap: 8,
  },
  addressText: {
    flex: 1,
    fontSize: 14,
    color: colors.textMuted,
    lineHeight: 20,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.accent,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.accent,
  },
  directionsButton: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  directionsText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  noMapContainer: {
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.cardBgElevated,
    borderRadius: radius.md,
  },
  noMapText: {
    marginTop: 8,
    fontSize: 14,
    color: colors.textMuted,
  },
});
