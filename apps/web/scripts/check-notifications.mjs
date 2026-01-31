#!/usr/bin/env node
/**
 * Check push notification stats
 * Run: node apps/web/scripts/check-notifications.mjs
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '../.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function main() {
  console.log('\n📱 PUSH TOKEN BREAKDOWN BY PLATFORM\n');
  console.log('='.repeat(40));

  // Get token counts by platform
  const { data: tokens, error: tokenError } = await supabase
    .from('push_tokens')
    .select('platform');

  if (tokenError) {
    console.error('Error fetching tokens:', tokenError);
    return;
  }

  const platformCounts = tokens.reduce((acc, t) => {
    acc[t.platform] = (acc[t.platform] || 0) + 1;
    return acc;
  }, {});

  console.log(`Total registered tokens: ${tokens.length}`);
  console.log('');
  Object.entries(platformCounts).forEach(([platform, count]) => {
    console.log(`  ${platform.toUpperCase().padEnd(10)} ${count}`);
  });

  console.log('\n📋 RECENT NOTIFICATION LOGS\n');
  console.log('='.repeat(40));

  // Get recent notification logs
  const { data: logs, error: logError } = await supabase
    .from('notification_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(10);

  if (logError) {
    console.error('Error fetching logs:', logError);
    return;
  }

  if (!logs || logs.length === 0) {
    console.log('No notification logs found.');
  } else {
    logs.forEach(log => {
      const date = new Date(log.created_at).toLocaleString();
      console.log(`\n${date}`);
      console.log(`  Type: ${log.job_type}`);
      console.log(`  Status: ${log.status}`);
      if (log.details) {
        console.log(`  Details: ${JSON.stringify(log.details, null, 2)}`);
      }
    });
  }

  console.log('\n');
}

main().catch(console.error);
