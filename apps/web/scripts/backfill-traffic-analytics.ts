/**
 * Backfill script for web traffic analytics.
 *
 * Run ONCE after pushing the migration to populate:
 * - traffic_source (parsed from referrer)
 * - device_type & browser (parsed from user_agent)
 * - market_id (from restaurant_id join or default to Lancaster)
 * - session_id (synthetic — group by visitor_id within 30-min windows)
 * - is_landing (first view per synthetic session)
 * Then computes rollups for all historical dates.
 *
 * Usage:
 *   cd apps/web
 *   npx tsx scripts/backfill-traffic-analytics.ts
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://kufcxxynjvyharhtfptd.supabase.co',
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

const BATCH_SIZE = 500;
const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

// ===================== Parsers (same logic as API route) =====================

function parseTrafficSource(referrer: string | null): string {
  if (!referrer) return 'direct';
  try {
    const hostname = new URL(referrer).hostname.toLowerCase();
    if (hostname.includes('google.')) return 'google';
    if (hostname.includes('facebook.com') || hostname.includes('l.facebook.com') || hostname === 'fb.com') return 'facebook';
    if (hostname.includes('instagram.com') || hostname.includes('l.instagram.com')) return 'instagram';
    if (hostname === 'linktr.ee' || hostname.includes('linktree.')) return 'linktree';
    if (hostname.includes('bing.com')) return 'bing';
    if (hostname === 't.co' || hostname.includes('twitter.com') || hostname.includes('x.com')) return 'twitter';
    if (hostname.includes('mail.') || hostname.includes('outlook.') || hostname.includes('gmail.')) return 'email';
    return 'other';
  } catch {
    return 'direct';
  }
}

function parseDeviceType(ua: string | null): string {
  if (!ua) return 'desktop';
  if (/ipad|tablet|kindle|silk/i.test(ua)) return 'tablet';
  if (/mobile|iphone|ipod|android.*mobile|opera mini|opera mobi/i.test(ua)) return 'mobile';
  return 'desktop';
}

function parseBrowser(ua: string | null): string {
  if (!ua) return 'Other';
  if (/edg\//i.test(ua)) return 'Edge';
  if (/opr\//i.test(ua) || /opera/i.test(ua)) return 'Opera';
  if (/firefox|fxios/i.test(ua)) return 'Firefox';
  if (/crios/i.test(ua)) return 'Chrome';
  if (/chrome/i.test(ua) && !/edg\//i.test(ua)) return 'Chrome';
  if (/safari/i.test(ua) && !/chrome/i.test(ua)) return 'Safari';
  return 'Other';
}

async function main() {
  console.log('=== Backfill Traffic Analytics ===\n');

  // 1. Get Lancaster market ID (default for historical data)
  const { data: lancasterMarket } = await supabase
    .from('markets').select('id').eq('slug', 'lancaster-pa').single();
  if (!lancasterMarket) {
    console.error('Lancaster market not found!');
    process.exit(1);
  }
  const defaultMarketId = lancasterMarket.id;
  console.log(`Default market (Lancaster): ${defaultMarketId}`);

  // 2. Build restaurant_id -> market_id map
  console.log('Building restaurant -> market map...');
  const { data: restaurants } = await supabase
    .from('restaurants').select('id, market_id');
  const restaurantMarketMap = new Map<string, string>();
  for (const r of restaurants || []) {
    if (r.market_id) restaurantMarketMap.set(r.id, r.market_id);
  }
  console.log(`  ${restaurantMarketMap.size} restaurants mapped\n`);

  // 3. Fetch all page views that need backfill (no traffic_source set)
  console.log('Fetching page views to backfill...');
  let offset = 0;
  let totalUpdated = 0;

  // Track sessions per visitor for synthetic session IDs
  const visitorSessions = new Map<string, { sessionId: string; lastTime: number }>();
  let sessionCounter = 0;

  while (true) {
    const { data: rows, error } = await supabase
      .from('analytics_page_views')
      .select('id, referrer, user_agent, restaurant_id, visitor_id, viewed_at, traffic_source')
      .is('traffic_source', null)
      .order('viewed_at', { ascending: true })
      .range(offset, offset + BATCH_SIZE - 1);

    if (error) {
      console.error('Error fetching rows:', error);
      break;
    }
    if (!rows || rows.length === 0) break;

    const updates: {
      id: string;
      traffic_source: string;
      device_type: string;
      browser: string;
      market_id: string;
      session_id: string;
      is_landing: boolean;
    }[] = [];

    for (const row of rows) {
      const traffic_source = parseTrafficSource(row.referrer);
      const device_type = parseDeviceType(row.user_agent);
      const browser = parseBrowser(row.user_agent);
      const market_id = row.restaurant_id
        ? restaurantMarketMap.get(row.restaurant_id) || defaultMarketId
        : defaultMarketId;

      // Compute synthetic session
      const viewedAtMs = new Date(row.viewed_at).getTime();
      const visitorKey = row.visitor_id || row.id;
      const existing = visitorSessions.get(visitorKey);
      let session_id: string;
      let is_landing = false;

      if (!existing || viewedAtMs - existing.lastTime > SESSION_TIMEOUT_MS) {
        session_id = `backfill-${++sessionCounter}`;
        is_landing = true;
        visitorSessions.set(visitorKey, { sessionId: session_id, lastTime: viewedAtMs });
      } else {
        session_id = existing.sessionId;
        existing.lastTime = viewedAtMs;
      }

      updates.push({ id: row.id, traffic_source, device_type, browser, market_id, session_id, is_landing });
    }

    // Batch update
    for (const upd of updates) {
      await supabase.from('analytics_page_views').update({
        traffic_source: upd.traffic_source,
        device_type: upd.device_type,
        browser: upd.browser,
        market_id: upd.market_id,
        session_id: upd.session_id,
        is_landing: upd.is_landing,
      }).eq('id', upd.id);
    }

    totalUpdated += updates.length;
    console.log(`  Updated ${totalUpdated} rows...`);

    if (rows.length < BATCH_SIZE) break;
    // Don't increment offset — we're filtering by traffic_source IS NULL, so processed rows won't appear again
  }

  console.log(`\nBackfill complete: ${totalUpdated} rows updated\n`);

  // 4. Compute rollups for all historical dates
  console.log('Computing daily rollups for all dates...');

  const { data: dateRows } = await supabase
    .from('analytics_page_views')
    .select('viewed_at')
    .order('viewed_at', { ascending: true })
    .limit(1);

  if (!dateRows || dateRows.length === 0) {
    console.log('No page views found. Done.');
    return;
  }

  const startDate = new Date(dateRows[0].viewed_at);
  startDate.setHours(0, 0, 0, 0);
  const endDate = new Date();
  endDate.setHours(0, 0, 0, 0);

  let currentDate = new Date(startDate);
  let daysProcessed = 0;

  while (currentDate <= endDate) {
    const dateStr = currentDate.toISOString().split('T')[0];

    const { error } = await supabase.rpc('rollup_analytics_daily', {
      target_date: dateStr,
      target_market: null,
    });

    if (error) {
      console.error(`  Error rolling up ${dateStr}:`, error.message);
    } else {
      daysProcessed++;
      if (daysProcessed % 10 === 0) console.log(`  Processed ${daysProcessed} days (current: ${dateStr})...`);
    }

    currentDate.setDate(currentDate.getDate() + 1);
  }

  console.log(`\nRollup complete: ${daysProcessed} days processed`);
  console.log('\n=== Done ===');
}

main().catch(console.error);
