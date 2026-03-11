/**
 * Push Notification Gateway Client
 *
 * This is the ONLY way Node.js code should send push notifications.
 * Routes all sends through the edge function gateway, which enforces:
 * - Quiet hours (10 AM – 9 PM ET)
 * - Dedup (atomic via unique dedup_key)
 * - Throttle (90-min cooldown per market)
 * - Logging (every send recorded in notification_logs)
 *
 * NEVER call the Expo Push API directly from Node.js code.
 */

interface PushMessage {
  to: string;
  sound?: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

export interface GatewayRequest {
  notificationType: string;
  marketSlug: string | null;
  messages: PushMessage[];
  dedupKey?: string;
  skipThrottle?: boolean;
  details?: Record<string, unknown>;
}

export interface GatewayResponse {
  sent: number;
  total: number;
  blocked: boolean;
  blockReason?: string;
}

/**
 * Send push notifications through the centralized gateway.
 *
 * @example
 * // Daily notification with dedup
 * await sendNotification({
 *   notificationType: 'todays_pick',
 *   marketSlug: 'lancaster-pa',
 *   messages: tokens.map(t => ({ to: t, title: '...', body: '...' })),
 *   dedupKey: `todays_pick:lancaster-pa:2026-03-10`,
 * });
 *
 * @example
 * // Transactional alert (skips throttle, exempt from quiet hours if configured)
 * await sendNotification({
 *   notificationType: 'sales_team_alert',
 *   marketSlug: null,
 *   messages: [...],
 *   skipThrottle: true,
 * });
 */
export async function sendNotification(params: GatewayRequest): Promise<GatewayResponse> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    console.error('[Gateway Client] Missing SUPABASE_URL or SERVICE_ROLE_KEY');
    return { sent: 0, total: params.messages.length, blocked: true, blockReason: 'Missing credentials' };
  }

  try {
    const res = await fetch(
      `${supabaseUrl}/functions/v1/send-notifications/gateway`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${serviceKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
      }
    );

    if (!res.ok) {
      const text = await res.text();
      console.error(`[Gateway Client] Edge function error (${res.status}):`, text);
      return { sent: 0, total: params.messages.length, blocked: true, blockReason: `Gateway error: ${res.status}` };
    }

    return await res.json();
  } catch (error) {
    console.error('[Gateway Client] Failed to reach gateway:', error);
    return { sent: 0, total: params.messages.length, blocked: true, blockReason: `Gateway unreachable: ${error}` };
  }
}
