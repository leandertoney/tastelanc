/**
 * Notification Throttle
 *
 * Prevents notification stacking by enforcing a cooldown window between
 * push notifications sent to the same market. Query notification_logs for
 * the most recent completed notification and block if it was sent too recently.
 */

import { createClient } from '@supabase/supabase-js';

const COOLDOWN_MINUTES = 90;

export interface ThrottleResult {
  throttled: boolean;
  lastJobType?: string;
  lastSentAt?: string;
  minutesSinceLast?: number;
}

/**
 * Check whether a notification should be throttled for a given market.
 *
 * @param supabase - Supabase client (service role)
 * @param marketSlug - Market to check (e.g. 'lancaster-pa')
 * @returns ThrottleResult indicating whether to suppress the notification
 */
export async function checkNotificationThrottle(
  supabase: ReturnType<typeof createClient>,
  marketSlug: string,
): Promise<ThrottleResult> {
  const cooldownAgo = new Date(Date.now() - COOLDOWN_MINUTES * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from('notification_logs')
    .select('job_type, created_at')
    .eq('status', 'completed')
    .eq('market_slug', marketSlug)
    .gte('created_at', cooldownAgo)
    .order('created_at', { ascending: false })
    .limit(1);

  if (error) {
    // If we can't check, don't block — fail open
    console.warn('[Throttle] Error checking notification_logs, allowing send:', error.message);
    return { throttled: false };
  }

  if (data && data.length > 0) {
    const last = data[0];
    const minutesSinceLast = Math.round(
      (Date.now() - new Date(last.created_at).getTime()) / 60000,
    );
    console.log(
      `[Throttle] Last notification for ${marketSlug}: ${last.job_type} ${minutesSinceLast}min ago (cooldown: ${COOLDOWN_MINUTES}min)`,
    );
    return {
      throttled: true,
      lastJobType: last.job_type,
      lastSentAt: last.created_at,
      minutesSinceLast,
    };
  }

  return { throttled: false };
}
