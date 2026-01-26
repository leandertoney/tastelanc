/**
 * Radar SDK Wrapper
 *
 * This module provides a safe wrapper around react-native-radar that gracefully
 * handles the case where native modules aren't available (e.g., in Expo Go).
 *
 * The Radar SDK requires a dev build (EAS Build or expo prebuild) to work.
 * When running in Expo Go, all functions will safely no-op.
 */

// Types
export interface RadarVisit {
  restaurantId: string;
  timestamp: string;
  confidence: 'high' | 'medium' | 'low';
}

export interface RadarAreaVisit {
  areaId: string;
  areaName: string;
  timestamp: string;
  confidence: 'high' | 'medium' | 'low';
}

export type GeofenceType = 'restaurant' | 'area';

type VisitCallback = (visit: RadarVisit) => void;
type AreaVisitCallback = (visit: RadarAreaVisit) => void;

// Track if Radar is available and initialized
let isRadarAvailable = false;
let isInitialized = false;
let eventCallback: VisitCallback | null = null;
let areaEventCallback: AreaVisitCallback | null = null;
let Radar: any = null;

// Try to load Radar - will fail gracefully in Expo Go
try {
  Radar = require('react-native-radar').default;
  isRadarAvailable = true;
} catch (error) {
  console.log('[Radar] Native module not available (running in Expo Go?)');
  isRadarAvailable = false;
}

/**
 * Check if Radar SDK is available
 */
export function isRadarSDKAvailable(): boolean {
  return isRadarAvailable;
}

/**
 * Convert Radar confidence enum to string
 */
function confidenceToString(confidence: number): 'high' | 'medium' | 'low' {
  // RadarEventConfidence enum: none=0, low=1, medium=2, high=3
  if (confidence >= 3) return 'high';
  if (confidence >= 2) return 'medium';
  return 'low';
}

/**
 * Initialize Radar SDK with publishable key
 * Should be called once when app starts
 */
export function initRadar(publishableKey: string): void {
  if (!isRadarAvailable) {
    console.log('[Radar] Skipping init - native module not available');
    return;
  }

  if (isInitialized) {
    console.log('[Radar] Already initialized');
    return;
  }

  if (!publishableKey) {
    console.warn('[Radar] No publishable key provided, skipping initialization');
    return;
  }

  try {
    Radar.initialize(publishableKey);
    isInitialized = true;
    console.log('[Radar] Initialized successfully');
  } catch (error) {
    console.error('[Radar] Initialization failed:', error);
  }
}

/**
 * Start foreground tracking (responsive mode)
 * Note: Only foreground tracking for policy compliance - no background tracking
 */
export function startTracking(): void {
  if (!isRadarAvailable || !isInitialized) {
    return;
  }

  try {
    Radar.startTrackingResponsive();
    console.log('[Radar] Tracking started (responsive mode)');
  } catch (error) {
    console.error('[Radar] Failed to start tracking:', error);
  }
}

/**
 * Stop location tracking
 */
export function stopTracking(): void {
  if (!isRadarAvailable) return;

  try {
    Radar.stopTracking();
    console.log('[Radar] Tracking stopped');
  } catch (error) {
    console.error('[Radar] Failed to stop tracking:', error);
  }
}

/**
 * Handle Radar events internally
 * Differentiates between restaurant and area geofences based on tag
 */
function handleRadarEvents(update: { events?: Array<any> }): void {
  if (!update?.events) return;

  for (const event of update.events) {
    // Only handle geofence entry events
    if (event.type === 'user.entered_geofence' && event.geofence?.externalId) {
      const tag = event.geofence.tag;
      const timestamp = event.createdAt || new Date().toISOString();
      const confidence = confidenceToString(event.confidence);

      if (tag === 'area' && areaEventCallback) {
        // Area geofence entry
        areaEventCallback({
          areaId: event.geofence.externalId,
          areaName: event.geofence.description || 'Unknown Area',
          timestamp,
          confidence,
        });
      } else if (tag === 'restaurant' && eventCallback) {
        // Restaurant geofence entry (default behavior)
        eventCallback({
          restaurantId: event.geofence.externalId,
          timestamp,
          confidence,
        });
      } else if (!tag && eventCallback) {
        // Legacy geofences without tag - treat as restaurant
        eventCallback({
          restaurantId: event.geofence.externalId,
          timestamp,
          confidence,
        });
      }
    }
  }
}

/**
 * Listen for restaurant geofence entry events
 * The externalId on the geofence should be the restaurant UUID
 * Returns a cleanup function
 */
export function onGeofenceEntry(callback: VisitCallback): () => void {
  if (!isRadarAvailable) {
    return () => {}; // No-op cleanup
  }

  eventCallback = callback;

  // Register the event listener (shared between restaurant and area)
  try {
    Radar.onEventsReceived(handleRadarEvents);
  } catch (error) {
    console.error('[Radar] Failed to register event listener:', error);
  }

  // Return cleanup function
  return () => {
    eventCallback = null;
    // Only clear event listener if both callbacks are null
    if (!areaEventCallback) {
      try {
        Radar.onEventsReceived(null);
      } catch (error) {
        // Ignore cleanup errors
      }
    }
  };
}

/**
 * Listen for area geofence entry events
 * Used for neighborhood/district-level geofencing
 * Returns a cleanup function
 */
export function onAreaGeofenceEntry(callback: AreaVisitCallback): () => void {
  if (!isRadarAvailable) {
    return () => {}; // No-op cleanup
  }

  areaEventCallback = callback;

  // Register the event listener (shared between restaurant and area)
  try {
    Radar.onEventsReceived(handleRadarEvents);
  } catch (error) {
    console.error('[Radar] Failed to register area event listener:', error);
  }

  // Return cleanup function
  return () => {
    areaEventCallback = null;
    // Only clear event listener if both callbacks are null
    if (!eventCallback) {
      try {
        Radar.onEventsReceived(null);
      } catch (error) {
        // Ignore cleanup errors
      }
    }
  };
}

/**
 * Set user ID for Radar analytics
 * Should be called after user authenticates
 */
export function setRadarUserId(userId: string): void {
  if (!isRadarAvailable || !isInitialized) {
    return;
  }

  try {
    Radar.setUserId(userId);
    console.log('[Radar] User ID set');
  } catch (error) {
    console.error('[Radar] Failed to set user ID:', error);
  }
}

/**
 * Get current location (for debug/testing)
 */
export async function getCurrentLocation(): Promise<{
  status: string;
  location?: { latitude: number; longitude: number };
}> {
  if (!isRadarAvailable) {
    return { status: 'unavailable' };
  }

  try {
    const result = await Radar.getLocation();

    if (result.status === 'SUCCESS' && result.location) {
      return {
        status: 'success',
        location: {
          latitude: result.location.latitude,
          longitude: result.location.longitude,
        },
      };
    }

    return { status: result.status || 'unknown' };
  } catch (error) {
    console.error('[Radar] Failed to get location:', error);
    return { status: 'error' };
  }
}

/**
 * Check if tracking is currently active
 */
export async function isTrackingActive(): Promise<boolean> {
  if (!isRadarAvailable) {
    return false;
  }

  try {
    return await Radar.isTracking();
  } catch (error) {
    console.error('[Radar] Failed to check tracking status:', error);
    return false;
  }
}
