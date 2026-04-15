import { useState, useEffect, useCallback } from 'react';
import * as Location from 'expo-location';
import { getMarketCenter } from '../config/theme';

interface LocationCoords {
  latitude: number;
  longitude: number;
}

interface UseUserLocationResult {
  location: LocationCoords | null;
  isLoading: boolean;
  error: string | null;
  permissionStatus: Location.PermissionStatus | null;
  requestPermission: () => Promise<boolean>;
  refreshLocation: () => Promise<void>;
}

/**
 * @deprecated Use `getMarketCenter()` from `../config/theme` instead.
 * Kept for backward compatibility with existing imports.
 */
export const LANCASTER_CENTER: LocationCoords = {
  latitude: 40.0379,
  longitude: -76.3055,
};

/**
 * Hook to get user's current location with permission handling
 */
export function useUserLocation(): UseUserLocationResult {
  const [location, setLocation] = useState<LocationCoords | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [permissionStatus, setPermissionStatus] = useState<Location.PermissionStatus | null>(null);

  /**
   * Request location permission from the user
   */
  const requestPermission = useCallback(async (): Promise<boolean> => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      setPermissionStatus(status);
      return status === 'granted';
    } catch (err) {
      console.error('Error requesting location permission:', err);
      return false;
    }
  }, []);

  /**
   * Get the current location
   */
  const refreshLocation = useCallback(async (): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);

      // Check current permission status
      const { status } = await Location.getForegroundPermissionsAsync();
      setPermissionStatus(status);

      if (status !== 'granted') {
        setError('Location permission not granted');
        setIsLoading(false);
        return;
      }

      // Get current position
      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      setLocation({
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
      });
    } catch (err) {
      console.error('Error getting location:', err);
      setError('Unable to get current location');
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Initial permission check and location fetch
   */
  useEffect(() => {
    const init = async () => {
      try {
        const { status } = await Location.getForegroundPermissionsAsync();
        setPermissionStatus(status);

        if (status === 'granted') {
          await refreshLocation();
        } else {
          setIsLoading(false);
        }
      } catch (err) {
        console.error('Error initializing location:', err);
        setIsLoading(false);
      }
    };

    init();
  }, [refreshLocation]);

  return {
    location,
    isLoading,
    error,
    permissionStatus,
    requestPermission,
    refreshLocation,
  };
}

const MARKET_RADIUS_MILES = 10;

/**
 * Check if coordinates are within the market area.
 * Uses the market center from theme config (set via initTheme).
 */
export function isNearMarketCenter(coords: LocationCoords): boolean {
  const center = getMarketCenter();
  return (
    calculateDistance(
      coords.latitude,
      coords.longitude,
      center.latitude,
      center.longitude
    ) <= MARKET_RADIUS_MILES
  );
}

/**
 * Calculate distance between two coordinates in miles
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 3959; // Earth's radius in miles
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

/**
 * Format distance for display
 */
export function formatDistance(miles: number): string {
  if (miles < 0.1) {
    return 'Nearby';
  } else if (miles < 1) {
    return `${(miles * 5280).toFixed(0)} ft`;
  } else {
    return `${miles.toFixed(1)} mi`;
  }
}

/**
 * Point-in-polygon test using ray casting algorithm
 * Returns true if the point is inside the polygon
 */
function isPointInPolygon(
  point: LocationCoords,
  polygon: LocationCoords[]
): boolean {
  let inside = false;
  const { latitude: x, longitude: y } = point;

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].latitude;
    const yi = polygon[i].longitude;
    const xj = polygon[j].latitude;
    const yj = polygon[j].longitude;

    const intersect =
      yi > y !== yj > y &&
      x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;

    if (intersect) inside = !inside;
  }

  return inside;
}

/**
 * Find which neighborhood boundary contains the given coordinates
 * Returns the boundary object if found, null otherwise
 */
export function findContainingArea(
  coords: LocationCoords,
  boundaries: Array<{
    slug: string;
    name: string;
    labelCoordinate: LocationCoords;
    coordinates: LocationCoords[];
    fillColor: string;
    strokeColor: string;
  }>
): {
  slug: string;
  name: string;
  labelCoordinate: LocationCoords;
  coordinates: LocationCoords[];
} | null {
  for (const boundary of boundaries) {
    if (isPointInPolygon(coords, boundary.coordinates)) {
      return boundary;
    }
  }
  return null;
}

/**
 * Get the appropriate initial region for the map based on user location
 * If user is within Lancaster County, zoom to their specific area
 * Otherwise, show the entire market view
 */
export function getInitialMapRegion(
  userLocation: LocationCoords | null,
  boundaries: Array<{
    slug: string;
    name: string;
    labelCoordinate: LocationCoords;
    coordinates: LocationCoords[];
    fillColor: string;
    strokeColor: string;
  }>
): {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
} {
  const marketCenter = getMarketCenter();

  // If no user location, return market center with wide view
  if (!userLocation) {
    return {
      ...marketCenter,
      latitudeDelta: 0.3, // Wide view of entire county
      longitudeDelta: 0.3,
    };
  }

  // Check if user is within any specific area boundary
  const containingArea = findContainingArea(userLocation, boundaries);
  if (containingArea) {
    // Zoom to the user's specific area
    return {
      ...userLocation,
      latitudeDelta: 0.05, // Closer zoom for specific area
      longitudeDelta: 0.05,
    };
  }

  // Check if user is within the broader market area
  if (isNearMarketCenter(userLocation)) {
    // User is in Lancaster County but not in a specific defined area
    // Center on their location with medium zoom
    return {
      ...userLocation,
      latitudeDelta: 0.1,
      longitudeDelta: 0.1,
    };
  }

  // User is outside Lancaster County - show full market view
  return {
    ...marketCenter,
    latitudeDelta: 0.3,
    longitudeDelta: 0.3,
  };
}
