/**
 * Send a test push notification via Expo Push API
 *
 * Usage:
 *   node scripts/send-test-notification.mjs [push_token]
 *
 * If no token provided, it will fetch from the database
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

async function sendPushNotification(token, message) {
  const response = await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Accept-encoding': 'gzip, deflate',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      to: token,
      sound: 'default',
      title: message.title || 'TasteLanc',
      body: message.body || 'Test notification',
      data: message.data || {},
    }),
  });

  const result = await response.json();
  return result;
}

async function main() {
  let token = process.argv[2];

  // If no token provided, fetch from database
  if (!token) {
    console.log('No token provided, fetching from database...');

    const { data, error } = await supabase
      .from('push_tokens')
      .select('token, platform')
      .order('updated_at', { ascending: false })
      .limit(1)
      .single();

    if (error || !data) {
      console.error('No push tokens found in database.');
      console.log('\nTo test, you need to:');
      console.log('1. Open the app on a physical device (not simulator)');
      console.log('2. Sign in to register your push token');
      console.log('3. Run this script again');
      console.log('\nOr provide a token directly:');
      console.log('  node scripts/send-test-notification.mjs ExponentPushToken[xxxxx]');
      process.exit(1);
    }

    token = data.token;
    console.log(`Found token for ${data.platform}: ${token.substring(0, 30)}...`);
  }

  console.log('\nSending test notification...');

  const result = await sendPushNotification(token, {
    title: 'Happy Hour Alert!',
    body: 'The Imperial has $5 drafts, $8 wine & 50% off bar menu until 7pm!',
    data: {
      screen: 'RestaurantDetail',
      restaurantId: '28b029d8-171b-4e05-9a2e-628e8e1d6f7d',
    },
  });

  console.log('\nResult:', JSON.stringify(result, null, 2));

  if (result.data?.[0]?.status === 'ok') {
    console.log('\n✓ Notification sent successfully!');
  } else if (result.data?.[0]?.status === 'error') {
    console.log('\n✗ Error:', result.data[0].message);
  }
}

main().catch(console.error);
