/**
 * Notification Quiet Hours
 *
 * Prevents push notifications from being sent outside acceptable hours.
 * All scheduled and automated notifications MUST check quiet hours before sending.
 *
 * Quiet hours: before 10 AM or after 9 PM Eastern Time.
 * Geofence/area-entry notifications also respect quiet hours — no one wants
 * a push notification at midnight even if they walk past a restaurant.
 */

export interface QuietHoursResult {
  isQuiet: boolean;
  currentTimeET: string;
  currentHourET: number;
}

/**
 * Check if the current time falls within quiet hours (before 10 AM or after 9 PM ET).
 *
 * @returns QuietHoursResult with current ET time info
 */
export function checkQuietHours(): QuietHoursResult {
  const now = new Date();
  const currentTimeET = now.toLocaleTimeString('en-US', {
    timeZone: 'America/New_York',
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  const currentHourET = parseInt(currentTimeET.split(':')[0], 10);
  const isQuiet = currentHourET < 10 || currentHourET >= 21;

  return { isQuiet, currentTimeET, currentHourET };
}
