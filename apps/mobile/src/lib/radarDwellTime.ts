/**
 * Radar Dwell Time Service
 * Queries Radar SDK for user's location history to verify restaurant visits
 * Used for voting eligibility - users must have spent time at a restaurant to vote
 */

import { isRadarSDKAvailable } from './radar';

// Minimum dwell time required (in minutes) - NOT exposed to users
const MINIMUM_DWELL_TIME_MINUTES = 30;

// Radar SDK reference
let Radar: any = null;
try {
  Radar = require('react-native-radar').default;
} catch {
  // Not available in Expo Go
}

export interface DwellTimeResult {
  eligible: boolean;
  totalMinutes: number;
  visitCount: number;
  lastVisit: string | null;
}

export interface VotingEligibility {
  canVote: boolean;
  reason?: string;
  dwellTimeResult?: DwellTimeResult;
}

/**
 * Get the start of the current calendar month in ISO format
 */
function getMonthStartISO(): string {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
}

/**
 * Query Radar SDK for trips at a specific restaurant geofence
 * Calculates total dwell time from trips within the current month
 *
 * @param restaurantId - The restaurant UUID (used as externalId in Radar geofences)
 * @returns Dwell time result with eligibility
 */
export async function getRestaurantDwellTime(
  restaurantId: string
): Promise<DwellTimeResult> {
  if (!isRadarSDKAvailable() || !Radar) {
    console.log('[RadarDwellTime] SDK not available');
    return { eligible: false, totalMinutes: 0, visitCount: 0, lastVisit: null };
  }

  const monthStart = new Date(getMonthStartISO());

  try {
    // Get trips from Radar SDK
    // Trips contain geofence visits with dwell time information
    const result = await Radar.getTrips();

    if (!result || !result.trips) {
      return { eligible: false, totalMinutes: 0, visitCount: 0, lastVisit: null };
    }

    let totalMinutes = 0;
    let visitCount = 0;
    let lastVisit: string | null = null;

    // Process trips to find visits to this restaurant
    for (const trip of result.trips) {
      // Check if trip has geofence events
      if (trip.geofenceEvents) {
        for (const event of trip.geofenceEvents) {
          // Match by externalId (restaurant UUID)
          if (event.geofence?.externalId === restaurantId) {
            const eventDate = new Date(event.createdAt || event.timestamp);

            // Only count visits from current month
            if (eventDate >= monthStart) {
              // Dwell time is typically in seconds, convert to minutes
              const dwellMinutes = event.duration ? event.duration / 60 : 0;
              totalMinutes += dwellMinutes;
              visitCount++;

              if (!lastVisit || eventDate.toISOString() > lastVisit) {
                lastVisit = eventDate.toISOString();
              }
            }
          }
        }
      }

      // Also check trip destinations
      if (trip.destinationGeofence?.externalId === restaurantId) {
        const tripDate = new Date(trip.createdAt || trip.startedAt);

        if (tripDate >= monthStart && trip.duration) {
          // Trip duration at destination
          const dwellMinutes = trip.duration / 60;
          totalMinutes += dwellMinutes;

          // Don't double count - only increment if not already counted from events
          if (visitCount === 0) {
            visitCount++;
          }

          if (!lastVisit || tripDate.toISOString() > lastVisit) {
            lastVisit = tripDate.toISOString();
          }
        }
      }
    }

    return {
      eligible: totalMinutes >= MINIMUM_DWELL_TIME_MINUTES,
      totalMinutes: Math.round(totalMinutes),
      visitCount,
      lastVisit,
    };
  } catch (error) {
    console.error('[RadarDwellTime] Error fetching trips:', error);
    return { eligible: false, totalMinutes: 0, visitCount: 0, lastVisit: null };
  }
}

/**
 * Alternative method: Query Radar for recent location context
 * This checks if user is currently near or was recently at the restaurant
 */
export async function checkRecentVisit(restaurantId: string): Promise<boolean> {
  if (!isRadarSDKAvailable() || !Radar) {
    return false;
  }

  try {
    // Get current context which includes nearby/recent geofences
    const result = await Radar.getContext();

    if (result?.geofences) {
      return result.geofences.some(
        (g: any) => g.externalId === restaurantId && g.dwelled
      );
    }

    return false;
  } catch (error) {
    console.error('[RadarDwellTime] Error checking context:', error);
    return false;
  }
}

/**
 * Check if user can vote for a specific restaurant
 * Returns eligibility status and user-friendly message if ineligible
 *
 * @param userId - User ID (not used directly but kept for consistency)
 * @param restaurantId - Restaurant UUID
 * @param restaurantName - Restaurant name for error message
 */
export async function canVoteForRestaurant(
  _userId: string,
  restaurantId: string,
  restaurantName: string
): Promise<VotingEligibility> {
  try {
    const dwellTimeResult = await getRestaurantDwellTime(restaurantId);

    if (dwellTimeResult.eligible) {
      return {
        canVote: true,
        dwellTimeResult,
      };
    }

    // User hasn't spent enough time at this restaurant
    // NOTE: We do NOT reveal the 30-minute threshold
    return {
      canVote: false,
      reason: `You need to have visited ${restaurantName} this month to vote for them.`,
      dwellTimeResult,
    };
  } catch (error) {
    console.error('[RadarDwellTime] Error checking eligibility:', error);
    // Fail closed for integrity - require verification
    return {
      canVote: false,
      reason: 'Unable to verify your visit. Please try again.',
    };
  }
}

/**
 * Batch check voting eligibility for multiple restaurants
 * Useful for filtering restaurant lists on the voting screen
 *
 * @param userId - User ID (kept for consistency)
 * @param restaurantIds - Array of restaurant UUIDs to check
 */
export async function batchCheckVotingEligibility(
  _userId: string,
  restaurantIds: string[]
): Promise<Map<string, boolean>> {
  const eligibilityMap = new Map<string, boolean>();

  if (!isRadarSDKAvailable() || !Radar || restaurantIds.length === 0) {
    // Return all false if SDK not available
    restaurantIds.forEach((id) => eligibilityMap.set(id, false));
    return eligibilityMap;
  }

  const monthStart = new Date(getMonthStartISO());

  try {
    // Get all trips once and process for all restaurants
    const result = await Radar.getTrips();

    // Initialize all as ineligible
    const dwellTimes = new Map<string, number>();
    restaurantIds.forEach((id) => {
      eligibilityMap.set(id, false);
      dwellTimes.set(id, 0);
    });

    if (!result?.trips) {
      return eligibilityMap;
    }

    // Accumulate dwell time for each restaurant
    for (const trip of result.trips) {
      if (trip.geofenceEvents) {
        for (const event of trip.geofenceEvents) {
          const externalId = event.geofence?.externalId;
          if (externalId && dwellTimes.has(externalId)) {
            const eventDate = new Date(event.createdAt || event.timestamp);

            if (eventDate >= monthStart) {
              const dwellMinutes = event.duration ? event.duration / 60 : 0;
              dwellTimes.set(externalId, (dwellTimes.get(externalId) || 0) + dwellMinutes);
            }
          }
        }
      }

      // Check destination geofence
      const destId = trip.destinationGeofence?.externalId;
      if (destId && dwellTimes.has(destId)) {
        const tripDate = new Date(trip.createdAt || trip.startedAt);

        if (tripDate >= monthStart && trip.duration) {
          const dwellMinutes = trip.duration / 60;
          dwellTimes.set(destId, (dwellTimes.get(destId) || 0) + dwellMinutes);
        }
      }
    }

    // Check eligibility based on accumulated dwell time
    for (const [restaurantId, totalMinutes] of dwellTimes) {
      eligibilityMap.set(restaurantId, totalMinutes >= MINIMUM_DWELL_TIME_MINUTES);
    }

    return eligibilityMap;
  } catch (error) {
    console.error('[RadarDwellTime] Batch check error:', error);
    // Return all false on error
    restaurantIds.forEach((id) => eligibilityMap.set(id, false));
    return eligibilityMap;
  }
}
