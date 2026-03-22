import { AppState } from 'react-native';
import { getSupabase } from '../config/theme';

export type BehavioralFeedItemKind =
  | 'video'
  | 'photo'
  | 'buzz'
  | 'special'
  | 'happy_hour'
  | 'event'
  | 'new_restaurant'
  | 'coupon_claim';

type UserEventType = 'dwell' | 'detail_view' | 'quick_skip';

interface PendingUserEvent {
  user_id: string;
  restaurant_id: string;
  event_type: UserEventType;
  value_ms: number | null;
  feed_item_kind: BehavioralFeedItemKind | null;
  market_id: string | null;
}

const DWELL_MIN_MS = 2500;
const QUICK_SKIP_MAX_MS = 1200;
const FLUSH_DELAY_MS = 5000;
const MAX_BUFFER_SIZE = 20;

let buffer: PendingUserEvent[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;
let cachedUserId: string | null = null;
let userIdExpiry = 0;
let isFlushing = false;
let hasLifecycleFlushListener = false;

async function getUserId(): Promise<string | null> {
  const now = Date.now();
  if (cachedUserId && now < userIdExpiry) return cachedUserId;

  try {
    const { data } = await getSupabase().auth.getUser();
    cachedUserId = data?.user?.id ?? null;
  } catch {
    cachedUserId = null;
  }

  userIdExpiry = now + 5 * 60 * 1000;
  return cachedUserId;
}

function ensureLifecycleFlushListener() {
  if (hasLifecycleFlushListener) return;

  AppState.addEventListener('change', (nextState) => {
    if (nextState !== 'active') {
      void flushUserEvents();
    }
  });

  hasLifecycleFlushListener = true;
}

export async function flushUserEvents() {
  if (isFlushing || buffer.length === 0) return;

  isFlushing = true;
  const batch = [...buffer];
  buffer = [];

  try {
    const { error } = await getSupabase()
      .from('user_events')
      .insert(batch);
    if (error) throw error;
  } catch {
    buffer = [...batch, ...buffer];
  } finally {
    isFlushing = false;

    if (buffer.length > 0) {
      scheduleFlush();
    }
  }
}

function scheduleFlush(immediate = false) {
  if (flushTimer) {
    if (!immediate) return;
    clearTimeout(flushTimer);
  }

  flushTimer = setTimeout(() => {
    flushTimer = null;
    void flushUserEvents();
  }, immediate ? 0 : FLUSH_DELAY_MS);
}

function trackUserEvent({
  restaurantId,
  eventType,
  feedItemKind,
  marketId = null,
  valueMs = null,
}: {
  restaurantId: string;
  eventType: UserEventType;
  feedItemKind: BehavioralFeedItemKind;
  marketId?: string | null;
  valueMs?: number | null;
}) {
  if (!restaurantId) return;

  ensureLifecycleFlushListener();

  (async () => {
    try {
      const userId = await getUserId();
      if (!userId) return;

      buffer.push({
        user_id: userId,
        restaurant_id: restaurantId,
        event_type: eventType,
        value_ms: valueMs,
        feed_item_kind: feedItemKind,
        market_id: marketId,
      });

      if (buffer.length >= MAX_BUFFER_SIZE) {
        scheduleFlush(true);
      } else {
        scheduleFlush();
      }
    } catch {
      // Silent fail.
    }
  })();
}

export function trackDetailView(
  restaurantId: string,
  feedItemKind: BehavioralFeedItemKind,
  marketId?: string | null,
) {
  trackUserEvent({
    restaurantId,
    eventType: 'detail_view',
    feedItemKind,
    marketId,
  });
}

export function trackDwell(
  restaurantId: string,
  feedItemKind: BehavioralFeedItemKind,
  valueMs: number,
  marketId?: string | null,
) {
  if (valueMs < DWELL_MIN_MS) return;

  trackUserEvent({
    restaurantId,
    eventType: 'dwell',
    feedItemKind,
    marketId,
    valueMs: Math.round(valueMs),
  });
}

export function trackQuickSkip(
  restaurantId: string,
  feedItemKind: BehavioralFeedItemKind,
  valueMs: number,
  marketId?: string | null,
) {
  if (valueMs > QUICK_SKIP_MAX_MS) return;

  trackUserEvent({
    restaurantId,
    eventType: 'quick_skip',
    feedItemKind,
    marketId,
    valueMs: Math.round(valueMs),
  });
}
