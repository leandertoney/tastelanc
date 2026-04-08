import { useQuery } from '@tanstack/react-query';
import { getSupabase } from '../config/theme';
import { useMarket } from '../context/MarketContext';
import type { RightNowItem } from '../types/retention';

function nowTimeString(): string {
  const d = new Date();
  const h = String(d.getHours()).padStart(2, '0');
  const m = String(d.getMinutes()).padStart(2, '0');
  return `${h}:${m}:00`;
}

function todayDOW(): string {
  return new Date().toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
}

function todayDate(): string {
  return new Date().toISOString().split('T')[0];
}

function twentyFourHoursAgo(): string {
  return new Date(Date.now() - 86400 * 1000).toISOString();
}

function formatTimeWindow(startTime: string | null, endTime: string | null): string {
  if (!startTime) return 'Now';
  const fmt = (t: string) => {
    const [h, m] = t.split(':').map(Number);
    const period = h >= 12 ? 'pm' : 'am';
    const hour = h % 12 || 12;
    return m === 0 ? `${hour}${period}` : `${hour}:${String(m).padStart(2, '0')}${period}`;
  };
  return endTime ? `${fmt(startTime)}–${fmt(endTime)}` : fmt(startTime);
}

async function fetchRightNowItems(marketId: string | null): Promise<RightNowItem[]> {
  const supabase = getSupabase();
  const now = nowTimeString();
  const dow = todayDOW();
  const today = todayDate();
  const cutoff = twentyFourHoursAgo();

  // 1. Active happy hours happening right now
  let hhQuery = supabase
    .from('happy_hours')
    .select('id, name, start_time, end_time, restaurant:restaurants!inner(id, name, market_id, tiers(name))')
    .eq('is_active', true)
    .contains('days_of_week', [dow])
    .lte('start_time', now)
    .gte('end_time', now);
  if (marketId) {
    hhQuery = hhQuery.eq('restaurant.market_id', marketId);
  }

  // 2. Events today
  let evtQuery = supabase
    .from('events')
    .select('id, name, start_time, end_time, event_date, is_recurring, days_of_week, restaurant:restaurants!inner(id, name, market_id, tiers(name))')
    .eq('is_active', true);
  if (marketId) {
    evtQuery = evtQuery.eq('restaurant.market_id', marketId);
  }

  // 3. Specials updated in last 24h
  let spQuery = supabase
    .from('specials')
    .select('id, name, start_time, end_time, restaurant:restaurants!inner(id, name, market_id, tiers(name))')
    .eq('is_active', true)
    .gte('updated_at', cutoff);
  if (marketId) {
    spQuery = spQuery.eq('restaurant.market_id', marketId);
  }

  const [hhRes, evtRes, spRes] = await Promise.all([hhQuery, evtQuery, spQuery]);

  const items: RightNowItem[] = [];

  // Happy hours
  for (const hh of hhRes.data || []) {
    const r = (hh as any).restaurant;
    items.push({
      id: `hh-${hh.id}`,
      type: 'happy_hour',
      restaurantId: r?.id ?? '',
      restaurantName: r?.name ?? '',
      itemName: (hh as any).name,
      timeWindow: formatTimeWindow((hh as any).start_time, (hh as any).end_time),
      tierName: r?.tiers?.name ?? null,
    });
  }

  // Events happening today
  for (const evt of evtRes.data || []) {
    const isToday =
      (evt as any).event_date === today ||
      ((evt as any).is_recurring && Array.isArray((evt as any).days_of_week) && (evt as any).days_of_week.includes(dow));
    if (!isToday) continue;
    const r = (evt as any).restaurant;
    items.push({
      id: `evt-${evt.id}`,
      type: 'event',
      restaurantId: r?.id ?? '',
      restaurantName: r?.name ?? '',
      itemName: (evt as any).name,
      timeWindow: formatTimeWindow((evt as any).start_time, (evt as any).end_time),
      tierName: r?.tiers?.name ?? null,
    });
  }

  // Specials updated recently
  for (const sp of spRes.data || []) {
    const r = (sp as any).restaurant;
    items.push({
      id: `sp-${sp.id}`,
      type: 'special',
      restaurantId: r?.id ?? '',
      restaurantName: r?.name ?? '',
      itemName: (sp as any).name,
      timeWindow: formatTimeWindow((sp as any).start_time, (sp as any).end_time),
      tierName: r?.tiers?.name ?? null,
    });
  }

  // Elite first, then the rest
  return items.sort((a, b) => {
    const tierScore = (t: string | null | undefined) => (t === 'elite' ? 0 : t === 'premium' ? 1 : 2);
    return tierScore(a.tierName) - tierScore(b.tierName);
  });
}

export function useRightNow() {
  const { marketId } = useMarket();

  return useQuery({
    queryKey: ['rightNow', marketId],
    queryFn: () => fetchRightNowItems(marketId),
    staleTime: 2 * 60 * 1000,
    enabled: !!marketId,
  });
}
