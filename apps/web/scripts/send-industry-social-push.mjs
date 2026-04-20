#!/usr/bin/env node
/**
 * Send Industry Social push notification — TasteLanc only, excluding RSVPd users.
 *
 * Usage:
 *   node scripts/send-industry-social-push.mjs --dry-run
 *   node scripts/send-industry-social-push.mjs --test=<push_token>
 *   node scripts/send-industry-social-push.mjs --live
 */
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, '../.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const APP_SLUG = 'tastelanc';
const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const live = args.includes('--live');
const testArg = args.find(a => a.startsWith('--test='));

if (!dryRun && !live && !testArg) {
  console.error('Specify --dry-run, --test=<token>, or --live');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

const NOTIFICATION = {
  title: 'Industry Social — tomorrow night',
  body: '6–9:30pm at Hempfield Apothetique. First drink on us. RSVP: tastelanc.com/party/rsvp',
  data: {
    campaign: 'industry-social-2026-04-20',
  },
};

async function getRsvpExclusions() {
  const { data: rsvps, error } = await supabase
    .from('party_rsvps')
    .select('user_id, email')
    .eq('response', 'yes');
  if (error) throw error;

  const excludedUserIds = new Set();
  const excludedEmails = new Set();
  for (const r of rsvps) {
    if (r.user_id) excludedUserIds.add(r.user_id);
    if (r.email) excludedEmails.add(r.email.toLowerCase());
  }
  return { excludedUserIds, excludedEmails };
}

async function getAllUsersEmailMap() {
  // Build user_id -> email map from auth.users for email-based exclusion
  const map = new Map();
  let page = 1;
  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    for (const u of data.users) {
      if (u.email) map.set(u.id, u.email.toLowerCase());
    }
    if (data.users.length < 1000) break;
    page++;
  }
  return map;
}

async function getPushTokens() {
  const all = [];
  let from = 0;
  const pageSize = 1000;
  while (true) {
    const { data, error } = await supabase
      .from('push_tokens')
      .select('token, user_id, platform')
      .eq('app_slug', APP_SLUG)
      .range(from, from + pageSize - 1);
    if (error) throw error;
    if (!data?.length) break;
    all.push(...data);
    if (data.length < pageSize) break;
    from += pageSize;
  }
  return all;
}

async function sendBatch(tokens) {
  // Expo accepts up to 100 messages per request
  const chunks = [];
  for (let i = 0; i < tokens.length; i += 100) {
    chunks.push(tokens.slice(i, i + 100));
  }

  let sent = 0, failed = 0;
  for (const chunk of chunks) {
    const messages = chunk.map(t => ({
      to: t,
      sound: 'default',
      title: NOTIFICATION.title,
      body: NOTIFICATION.body,
      data: NOTIFICATION.data,
      priority: 'high',
      channelId: 'default',
    }));

    try {
      const res = await fetch(EXPO_PUSH_URL, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Accept-encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(messages),
      });
      const body = await res.json();
      if (Array.isArray(body?.data)) {
        for (const r of body.data) {
          if (r.status === 'ok') sent++;
          else { failed++; console.log(`  ✗ ${r.message || JSON.stringify(r)}`); }
        }
      } else {
        failed += chunk.length;
        console.log('Unexpected response:', JSON.stringify(body).slice(0, 200));
      }
    } catch (e) {
      failed += chunk.length;
      console.log(`  ✗ Chunk failed: ${e.message}`);
    }

    // Gentle pacing to avoid rate limiting
    await new Promise(r => setTimeout(r, 600));
  }
  return { sent, failed };
}

async function main() {
  console.log('Loading RSVP exclusions...');
  const { excludedUserIds, excludedEmails } = await getRsvpExclusions();
  console.log(`  ${excludedUserIds.size} user IDs + ${excludedEmails.size} emails already RSVPd`);

  console.log('Loading auth users for email-based exclusion...');
  const userEmailMap = await getAllUsersEmailMap();
  console.log(`  ${userEmailMap.size} auth users`);

  console.log(`Loading TasteLanc push tokens...`);
  const tokens = await getPushTokens();
  console.log(`  ${tokens.length} total TasteLanc push tokens`);

  // Filter: exclude tokens whose user_id is in excludedUserIds, OR whose user's email is in excludedEmails
  const eligible = [];
  let skippedUserId = 0;
  let skippedEmail = 0;
  const seen = new Set();
  for (const t of tokens) {
    if (seen.has(t.token)) continue;
    seen.add(t.token);
    if (t.user_id && excludedUserIds.has(t.user_id)) {
      skippedUserId++;
      continue;
    }
    const email = t.user_id ? userEmailMap.get(t.user_id) : null;
    if (email && excludedEmails.has(email)) {
      skippedEmail++;
      continue;
    }
    eligible.push(t);
  }

  console.log(`\nExclusions:`);
  console.log(`  skipped by user_id match:  ${skippedUserId}`);
  console.log(`  skipped by email match:    ${skippedEmail}`);
  console.log(`Eligible recipients:         ${eligible.length}`);

  if (dryRun) {
    console.log('\n--- DRY RUN ---');
    console.log('Notification:');
    console.log(`  title: ${NOTIFICATION.title}`);
    console.log(`  body:  ${NOTIFICATION.body}`);
    console.log(`  data:  ${JSON.stringify(NOTIFICATION.data)}`);
    console.log('\nSample eligible tokens (first 5):');
    for (const t of eligible.slice(0, 5)) {
      console.log(`  ${t.platform} ${t.token.substring(0, 40)}... user_id=${t.user_id || 'null'}`);
    }
    return;
  }

  if (testArg) {
    const token = testArg.split('=')[1];
    console.log(`\nSending test to ${token.substring(0, 40)}...`);
    const { sent, failed } = await sendBatch([token]);
    console.log(`\nTest result: sent=${sent} failed=${failed}`);
    return;
  }

  if (live) {
    console.log(`\n🚀 LIVE SEND: ${eligible.length} recipients`);
    const tokens = eligible.map(t => t.token);
    const { sent, failed } = await sendBatch(tokens);
    console.log(`\nDone. Sent: ${sent}, Failed: ${failed}, Total: ${tokens.length}`);
  }
}

main().catch(err => { console.error(err); process.exit(1); });
