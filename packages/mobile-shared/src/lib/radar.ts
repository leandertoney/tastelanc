/**
 * Radar SDK Wrapper
 *
 * This module provides a safe wrapper around react-native-radar that gracefully
 * handles the case where native modules aren't available (e.g., in Expo Go).
 *
 * The Radar SDK requires a dev build (EAS Build or expo prebuild) to work.
 * When running in Expo Go, all functions will safely no-op.
 *
 * Tracking modes:
 *  - Background ("Always Allow"): startTrackingEfficient() — geofences fire even when app is closed
 *  - Foreground fallback ("While Using"): startTrackingResponsive() — only fires while app is open
 *
 * The app always starts with whatever permission the user has granted and upgrades
 * automatically if they later grant "Always Allow" via the LocationUpgradePrompt.
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
 * Get the current location permission status.
 * Returns 'always' | 'whenInUse' | 'denied' | 'unknown'
 */
export async function getLocationPermissionStatus(): Promise<'always' | 'whenInUse' | 'denied' | 'unknown'> {
  if (!isRadarAvailable) return 'unknown';

  try {
    const status = await Radar.getPermissionsStatus();
    // Radar returns: GRANTED_BACKGROUND, GRANTED_FOREGROUND, DENIED, NOT_DETERMINED
    if (status === 'GRANTED_BACKGROUND') return 'always';
    if (status === 'GRANTED_FOREGROUND') return 'whenInUse';
    if (status === 'DENIED') return 'denied';
    return 'unknown';
  } catch (error) {
    console.error('[Radar] Failed to get permission status:', error);
    return 'unknown';
  }
}

/**
 * Request "Always Allow" (background) location permission.
 * On iOS this shows the OS upgrade dialog if the user previously granted "While Using".
 * Returns true if background permission was granted.
 */
export async function requestBackgroundPermission(): Promise<boolean> {
  if (!isRadarAvailable) return false;

  try {
    await Radar.requestPermissions(true); // true = request always/background
    const status = await getLocationPermissionStatus();
    return status === 'always';
  } catch (error) {
    console.error('[Radar] Failed to request background permission:', error);
    return false;
  }
}

/**
 * Start tracking with the best mode available for the current permission level.
 *  - "Always Allow" → startTrackingEfficient (background, geofences fire when app is closed)
 *  - "While Using"  → startTrackingResponsive (foreground fallback)
 *  - Denied / unknown → no-op
 */
export async function startTracking(): Promise<void> {
  if (!isRadarAvailable || !isInitialized) {
    return;
  }

  try {
    const permission = await getLocationPermissionStatus();

    if (permission === 'always') {
      Radar.startTrackingEfficient();
      console.log('[Radar] Tracking started (efficient/background mode)');
    } else if (permission === 'whenInUse') {
      Radar.startTrackingResponsive();
      console.log('[Radar] Tracking started (responsive/foreground mode — upgrade available)');
    } else {
      console.log('[Radar] Tracking skipped — location permission not granted');
    }
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
