/**
 * Notification Market Isolation Audit Script
 *
 * Scans notification-related code for cross-market data leaks.
 * Run with: npx tsx scripts/audit-notifications.ts
 *
 * Checks:
 * 1. All notification functions filter by market_id
 * 2. Push token queries filter by app_slug
 * 3. No use of sendToAllTokens() for market-specific content
 * 4. Recent notification_logs include market_slug in details
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join } from 'path';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

interface AuditResult {
  check: string;
  status: 'PASS' | 'FAIL' | 'WARN';
  detail: string;
}

const results: AuditResult[] = [];

function pass(check: string, detail: string) {
  results.push({ check, status: 'PASS', detail });
}
function fail(check: string, detail: string) {
  results.push({ check, status: 'FAIL', detail });
}
function warn(check: string, detail: string) {
  results.push({ check, status: 'WARN', detail });
}

// ── 1. Static code analysis ─────────────────────────────────────────────────

function auditFile(filePath: string, label: string) {
  let content: string;
  try {
    content = readFileSync(filePath, 'utf-8');
  } catch {
    fail(`${label}: File exists`, `File not found: ${filePath}`);
    return;
  }

  // Check for market_id filtering
  if (content.includes('market_id') || content.includes('marketId')) {
    pass(`${label}: market_id filter`, 'Found market_id filtering in queries');
  } else if (content.includes('happy_hours') || content.includes('restaurants') || content.includes('events')) {
    fail(`${label}: market_id filter`, 'File queries restaurants/happy_hours/events but has NO market_id filter');
  }

  // Check for app_slug token filtering
  if (content.includes('app_slug') || content.includes('appSlug')) {
    pass(`${label}: app_slug token filter`, 'Found app_slug filtering for push tokens');
  } else if (content.includes('push_tokens') || content.includes('sendPushNotifications') || content.includes('EXPO_PUSH_URL')) {
    fail(`${label}: app_slug token filter`, 'File sends push notifications but has NO app_slug token filter');
  }

  // Check for dangerous sendToAllTokens usage
  if (content.includes('sendToAllTokens')) {
    // Check if it's for broadcast (acceptable) or market-specific content (not acceptable)
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes('sendToAllTokens')) {
        // Check context — is it inside a broadcast/admin function?
        const context = lines.slice(Math.max(0, i - 10), i + 1).join('\n');
        if (context.includes('broadcast') || context.includes('admin')) {
          pass(`${label}: sendToAllTokens`, `sendToAllTokens used in broadcast context (line ${i + 1}) — OK`);
        } else {
          warn(`${label}: sendToAllTokens`, `sendToAllTokens used at line ${i + 1} — verify this is not for market-specific content`);
        }
      }
    }
  }

  // Check for validateMarketScope usage
  if (content.includes('validateMarketScope')) {
    pass(`${label}: market guard`, 'Uses validateMarketScope() runtime guard');
  } else if (content.includes('sendPushNotifications') && !content.includes('broadcast')) {
    warn(`${label}: market guard`, 'Sends notifications but does not use validateMarketScope() guard');
  }
}

// Audit all notification files
const projectRoot = join(__dirname, '..');
auditFile(join(projectRoot, 'netlify/functions/happy-hour-alerts.ts'), 'Netlify HH Alerts');
auditFile(join(projectRoot, '../supabase/functions/send-notifications/index.ts'), 'Edge Function');

// ── 2. Database audit ───────────────────────────────────────────────────────

async function auditDatabase() {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    warn('DB Audit', 'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY — skipping database checks');
    return;
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

  // Check recent notification logs for market_slug
  const { data: logs } = await supabase
    .from('notification_logs')
    .select('job_type, details, created_at')
    .eq('job_type', 'happy_hour_daily_digest')
    .eq('status', 'completed')
    .order('created_at', { ascending: false })
    .limit(5);

  if (!logs?.length) {
    warn('Recent logs', 'No recent happy_hour_daily_digest logs found');
  } else {
    for (const log of logs) {
      const details = log.details as any;
      if (details?.market_slug) {
        pass('Log market tracking', `Log from ${log.created_at} includes market_slug: ${details.market_slug}`);
      } else {
        warn('Log market tracking', `Log from ${log.created_at} is MISSING market_slug in details — was sent before the fix`);
      }
    }
  }

  // Check push token distribution
  const { data: tokenCounts } = await supabase
    .from('push_tokens')
    .select('app_slug');

  if (tokenCounts) {
    const counts = new Map<string, number>();
    for (const t of tokenCounts) {
      const slug = t.app_slug || '(null)';
      counts.set(slug, (counts.get(slug) || 0) + 1);
    }

    for (const [slug, count] of counts) {
      if (slug === '(null)') {
        fail('Token app_slug', `${count} push tokens have NULL app_slug — these could leak across markets`);
      } else {
        pass('Token app_slug', `${slug}: ${count} tokens properly tagged`);
      }
    }
  }

  // Check for restaurants without market_id
  const { data: orphanRestaurants } = await supabase
    .from('restaurants')
    .select('id, name')
    .is('market_id', null)
    .eq('is_active', true)
    .limit(5);

  if (orphanRestaurants?.length) {
    fail('Restaurant market_id', `${orphanRestaurants.length} active restaurants have NULL market_id: ${orphanRestaurants.map(r => r.name).join(', ')}`);
  } else {
    pass('Restaurant market_id', 'All active restaurants have a market_id assigned');
  }
}

// ── Run ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n=== NOTIFICATION MARKET ISOLATION AUDIT ===\n');

  // Static checks
  console.log('--- Static Code Analysis ---');
  auditFile(join(projectRoot, 'netlify/functions/happy-hour-alerts.ts'), 'Netlify HH Alerts');
  auditFile(join(projectRoot, '../supabase/functions/send-notifications/index.ts'), 'Edge Function');

  // Database checks
  console.log('\n--- Database Checks ---');
  await auditDatabase();

  // Print results
  console.log('\n--- Results ---\n');

  const passes = results.filter(r => r.status === 'PASS');
  const warnings = results.filter(r => r.status === 'WARN');
  const failures = results.filter(r => r.status === 'FAIL');

  for (const r of results) {
    const icon = r.status === 'PASS' ? 'PASS' : r.status === 'WARN' ? 'WARN' : 'FAIL';
    console.log(`[${icon}] ${r.check}: ${r.detail}`);
  }

  console.log(`\n--- Summary ---`);
  console.log(`PASS: ${passes.length} | WARN: ${warnings.length} | FAIL: ${failures.length}`);

  if (failures.length > 0) {
    console.log('\nCRITICAL: There are market isolation failures that must be fixed immediately.');
    process.exit(1);
  } else if (warnings.length > 0) {
    console.log('\nThere are warnings to review.');
    process.exit(0);
  } else {
    console.log('\nAll checks passed.');
    process.exit(0);
  }
}

main().catch(err => {
  console.error('Audit failed:', err);
  process.exit(1);
});
