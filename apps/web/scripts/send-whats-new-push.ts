/**
 * "What's New" push notification — Lancaster app users
 *
 * Test (your token only):
 *   cd apps/web && TEST=1 npx tsx scripts/send-whats-new-push.ts
 *
 * Send to all Lancaster tokens:
 *   cd apps/web && npx tsx scripts/send-whats-new-push.ts
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const TITLE = "What's new in TasteLanc 🍽️";
const BODY = "Coupons, push alerts from your favorite spots, video recommendations & more. Check it out.";
const DATA = { screen: 'Home' };

// Expo Push API supports up to 100 per batch, all tokens must share the same experience
const BATCH_SIZE = 100;

async function getTokens(): Promise<string[]> {
  const { data, error } = await supabase
    .from('push_tokens')
    .select('token')
    .eq('app_slug', 'tastelanc');

  if (error) throw new Error('Failed to fetch tokens: ' + error.message);
  return (data ?? []).map((r: any) => r.token).filter(Boolean);
}

function getExperienceId(token: string): string {
  // ExponentPushToken format encodes the experience slug in some tokens
  // Group by prefix pattern — standalone app tokens vs Expo Go tokens differ
  if (token.startsWith('ExponentPushToken')) return 'expo';
  return 'native';
}

async function sendBatch(tokens: string[]): Promise<number> {
  // Group tokens by experience to avoid PUSH_TOO_MANY_EXPERIENCE_IDS error
  const groups: Record<string, string[]> = {};
  for (const token of tokens) {
    const key = getExperienceId(token);
    if (!groups[key]) groups[key] = [];
    groups[key].push(token);
  }

  let sent = 0;

  for (const [experience, groupTokens] of Object.entries(groups)) {
    for (let i = 0; i < groupTokens.length; i += BATCH_SIZE) {
      const batch = groupTokens.slice(i, i + BATCH_SIZE);
      const messages = batch.map(token => ({
        to: token,
        sound: 'default',
        title: TITLE,
        body: BODY,
        data: DATA,
      }));

      const response = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Accept-encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(messages),
      });

      const result = await response.json();

      if (result.errors?.length) {
        console.error('Expo error:', result.errors[0].message);
        // Log the conflicting token groups for debugging
        const details = result.errors[0].details;
        if (details) {
          const experiences = Object.keys(details);
          console.error('Experience IDs in this batch:', experiences);
        }
        continue;
      }

      const items = result.data ?? [];
      for (const r of items) {
        if (r.status === 'ok') sent++;
        else console.error('FAILED token:', r.message);
      }
    }
  }

  return sent;
}

async function main() {
  const isTest = !!process.env.TEST;

  if (isTest) {
    const { data } = await supabase
      .from('push_tokens')
      .select('token, platform')
      .eq('app_slug', 'tastelanc')
      .order('updated_at', { ascending: false })
      .limit(1)
      .single();

    if (!data) { console.error('No tokens found.'); return; }

    console.log('TEST MODE — sending to:', data.token.substring(0, 35) + '...');
    const sent = await sendBatch([data.token]);
    console.log('Result:', sent === 1 ? 'delivered' : 'failed');
    return;
  }

  const tokens = await getTokens();
  console.log('Sending to', tokens.length, 'Lancaster tokens...');

  const sent = await sendBatch(tokens);
  console.log('Done.', sent, 'sent.');
}

main().catch(console.error);
