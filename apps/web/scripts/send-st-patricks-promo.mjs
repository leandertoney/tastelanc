/**
 * St. Patrick's Day 2026 — Video Recommendation Promo Push Notification
 *
 * Sends to Android users only in Lancaster + Cumberland markets.
 *
 * Usage:
 *   node scripts/send-st-patricks-promo.mjs --dry-run   # Preview token counts
 *   node scripts/send-st-patricks-promo.mjs              # Send for real
 *   node scripts/send-st-patricks-promo.mjs <token>      # Send to one token (test)
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const DEDUP_KEY = 'st_patricks_video_promo:2026-03-17';
const TARGET_APP_SLUGS = ['tastelanc', 'taste-cumberland'];
const TARGET_PLATFORM = 'android';

const NOTIFICATION = {
  title: '☘️ Cheers to great taste! Record your first video review',
  body: 'Know a spot worth sharing? Drop a 60-second video recommendation and help your community discover something new.',
  sound: 'default',
  data: {},
};

async function sendBatch(tokens) {
  const messages = tokens.map((token) => ({
    to: token,
    sound: NOTIFICATION.sound,
    title: NOTIFICATION.title,
    body: NOTIFICATION.body,
    data: NOTIFICATION.data,
  }));

  const response = await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Accept-encoding': 'gzip, deflate',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(messages),
  });

  return response.json();
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const singleToken = args.find((a) => a.startsWith('ExponentPushToken'));

  // Single token test mode
  if (singleToken) {
    console.log(`\nSending test to: ${singleToken.substring(0, 30)}...`);
    const result = await sendBatch([singleToken]);
    console.log('Result:', JSON.stringify(result, null, 2));
    return;
  }

  // Check dedup
  const { data: existing } = await supabase
    .from('notification_logs')
    .select('id')
    .eq('dedup_key', DEDUP_KEY)
    .eq('status', 'completed')
    .limit(1);

  if (existing && existing.length > 0) {
    console.error('⚠️  Already sent today! Dedup key found:', DEDUP_KEY);
    console.error('If you need to re-send, manually delete the log entry first.');
    process.exit(1);
  }

  // Fetch Android tokens for Lancaster + Cumberland
  const { data: tokens, error } = await supabase
    .from('push_tokens')
    .select('token, app_slug')
    .eq('platform', TARGET_PLATFORM)
    .in('app_slug', TARGET_APP_SLUGS);

  if (error) {
    console.error('Error fetching tokens:', error.message);
    process.exit(1);
  }

  if (!tokens || tokens.length === 0) {
    console.log('No Android tokens found for Lancaster + Cumberland.');
    process.exit(0);
  }

  // Group by app_slug
  const grouped = {};
  for (const t of tokens) {
    const slug = t.app_slug || 'unknown';
    if (!grouped[slug]) grouped[slug] = [];
    grouped[slug].push(t.token);
  }

  console.log('\n📊 Token counts (Android only):');
  for (const [slug, tks] of Object.entries(grouped)) {
    console.log(`   ${slug}: ${tks.length} tokens`);
  }
  console.log(`   Total: ${tokens.length} tokens\n`);

  if (dryRun) {
    console.log('🏃 Dry run — no notifications sent.');
    console.log('\nNotification preview:');
    console.log(`   Title: ${NOTIFICATION.title}`);
    console.log(`   Body: ${NOTIFICATION.body}`);
    return;
  }

  // Send per app_slug in batches of 100
  let totalSent = 0;
  let totalErrors = 0;

  for (const [slug, tks] of Object.entries(grouped)) {
    console.log(`\n📤 Sending to ${slug} (${tks.length} tokens)...`);

    for (let i = 0; i < tks.length; i += 100) {
      const batch = tks.slice(i, i + 100);
      const result = await sendBatch(batch);

      if (result.data) {
        const ok = result.data.filter((r) => r.status === 'ok').length;
        const err = result.data.filter((r) => r.status === 'error').length;
        totalSent += ok;
        totalErrors += err;
        console.log(`   Batch ${Math.floor(i / 100) + 1}: ${ok} sent, ${err} errors`);

        // Log any errors
        result.data.forEach((r, idx) => {
          if (r.status === 'error') {
            console.log(`   ⚠️  Error for token ${idx}: ${r.message}`);
          }
        });
      } else {
        console.log(`   ⚠️  Unexpected response:`, JSON.stringify(result));
      }
    }
  }

  // Log to notification_logs
  const { error: logError } = await supabase.from('notification_logs').insert({
    job_type: 'promotional',
    status: 'completed',
    dedup_key: DEDUP_KEY,
    market_slug: 'all',
    details: {
      campaign: 'st_patricks_video_promo',
      platform: TARGET_PLATFORM,
      app_slugs: TARGET_APP_SLUGS,
      total_sent: totalSent,
      total_errors: totalErrors,
    },
  });

  if (logError) {
    console.log(`\n⚠️  Failed to log to notification_logs: ${logError.message}`);
  }

  console.log(`\n✅ Done! ${totalSent} sent, ${totalErrors} errors.`);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
