import { useState, useEffect, useCallback } from 'react';
import * as Location from 'expo-location';
import { MARKET_CENTER } from '../config/market';

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

// Re-export from market config so existing imports keep working
export const LANCASTER_CENTER: LocationCoords = MARKET_CENTER;

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
 * Check if coordinates are within the market area
 */
export function isNearMarketCenter(coords: LocationCoords): boolean {
  return (
    calculateDistance(
      coords.latitude,
      coords.longitude,
      LANCASTER_CENTER.latitude,
      LANCASTER_CENTER.longitude
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
