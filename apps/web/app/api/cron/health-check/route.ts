/**
 * Health Check Cron Route
 *
 * Runs every 15 minutes (triggered by Netlify scheduled function).
 * Checks connectivity to all critical external services, stores results,
 * and sends email alerts when services go down or recover.
 */

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getStripe } from '@/lib/stripe';
import { resend } from '@/lib/resend';
import { renderHealthAlertEmail, renderHealthAlertPlainText } from '@/lib/email-templates/health-alert';

const CRON_SECRET = process.env.CRON_SECRET;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const ALERT_EMAIL = process.env.HEALTH_ALERT_EMAIL || 'leandertoney@gmail.com';
const DASHBOARD_URL = process.env.NEXT_PUBLIC_APP_URL
  ? `${process.env.NEXT_PUBLIC_APP_URL}/admin/system-health`
  : 'https://tastelanc.com/admin/system-health';

// Alert cooldown: don't re-alert for the same service within 6 hours
const ALERT_COOLDOWN_MINUTES = 360;

interface CheckResult {
  name: string;
  status: 'ok' | 'warning' | 'error';
  latencyMs: number;
  message: string;
}

// ─── Individual Health Checks ────────────────────────────────────────

async function checkSupabaseDb(): Promise<CheckResult> {
  const start = Date.now();
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { error } = await supabase.from('markets').select('id').limit(1);
    const latency = Date.now() - start;
    if (error) {
      return { name: 'Supabase Database', status: 'error', latencyMs: latency, message: error.message };
    }
    if (latency > 3000) {
      return { name: 'Supabase Database', status: 'warning', latencyMs: latency, message: `Slow response: ${latency}ms` };
    }
    return { name: 'Supabase Database', status: 'ok', latencyMs: latency, message: 'Connected' };
  } catch (err) {
    return { name: 'Supabase Database', status: 'error', latencyMs: Date.now() - start, message: String(err) };
  }
}

async function checkSupabaseAuth(): Promise<CheckResult> {
  const start = Date.now();
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    // List users (limit 1) as a lightweight auth service check
    const { error } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1 });
    const latency = Date.now() - start;
    if (error) {
      return { name: 'Supabase Auth', status: 'error', latencyMs: latency, message: error.message };
    }
    return { name: 'Supabase Auth', status: 'ok', latencyMs: latency, message: 'Operational' };
  } catch (err) {
    return { name: 'Supabase Auth', status: 'error', latencyMs: Date.now() - start, message: String(err) };
  }
}

async function checkOpenAI(): Promise<CheckResult> {
  const start = Date.now();
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return { name: 'OpenAI', status: 'error', latencyMs: 0, message: 'OPENAI_API_KEY not set' };
    }
    // Lightweight models list call — no tokens consumed
    const response = await fetch('https://api.openai.com/v1/models', {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(10000),
    });
    const latency = Date.now() - start;
    if (!response.ok) {
      return { name: 'OpenAI', status: 'error', latencyMs: latency, message: `HTTP ${response.status}: ${response.statusText}` };
    }
    return { name: 'OpenAI', status: 'ok', latencyMs: latency, message: 'Operational' };
  } catch (err) {
    return { name: 'OpenAI', status: 'error', latencyMs: Date.now() - start, message: String(err) };
  }
}

async function checkStripe(): Promise<CheckResult> {
  const start = Date.now();
  try {
    const stripe = getStripe();
    await stripe.balance.retrieve();
    const latency = Date.now() - start;
    return { name: 'Stripe', status: 'ok', latencyMs: latency, message: 'Operational' };
  } catch (err: any) {
    const latency = Date.now() - start;
    // Stripe auth errors mean the key is bad, but network is fine
    if (err?.type === 'StripeAuthenticationError') {
      return { name: 'Stripe', status: 'error', latencyMs: latency, message: 'Invalid API key' };
    }
    return { name: 'Stripe', status: 'error', latencyMs: latency, message: String(err) };
  }
}

async function checkResend(): Promise<CheckResult> {
  const start = Date.now();
  try {
    const { data, error } = await resend.domains.list();
    const latency = Date.now() - start;
    if (error) {
      return { name: 'Resend', status: 'error', latencyMs: latency, message: String(error) };
    }
    return { name: 'Resend', status: 'ok', latencyMs: latency, message: `${data?.data?.length || 0} domains` };
  } catch (err) {
    return { name: 'Resend', status: 'error', latencyMs: Date.now() - start, message: String(err) };
  }
}

async function checkExpoPush(): Promise<CheckResult> {
  const start = Date.now();
  try {
    // Lightweight check — get receipts for empty array returns 200
    const response = await fetch('https://exp.host/--/api/v2/push/getReceipts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: [] }),
      signal: AbortSignal.timeout(10000),
    });
    const latency = Date.now() - start;
    if (!response.ok) {
      return { name: 'Expo Push', status: 'error', latencyMs: latency, message: `HTTP ${response.status}` };
    }
    return { name: 'Expo Push', status: 'ok', latencyMs: latency, message: 'Operational' };
  } catch (err) {
    return { name: 'Expo Push', status: 'error', latencyMs: Date.now() - start, message: String(err) };
  }
}

async function checkRosieEdgeFunction(): Promise<CheckResult> {
  const start = Date.now();
  try {
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!anonKey) {
      return { name: 'Rosie Edge Function', status: 'warning', latencyMs: 0, message: 'Anon key not set — cannot check' };
    }
    // Invoke with health_check flag — the function should return quickly
    const response = await fetch(`${SUPABASE_URL}/functions/v1/rosie-chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${anonKey}`,
      },
      body: JSON.stringify({ health_check: true }),
      signal: AbortSignal.timeout(10000),
    });
    const latency = Date.now() - start;
    // Edge functions may not support health_check yet — treat non-500 as ok
    if (response.status >= 500) {
      return { name: 'Rosie Edge Function', status: 'error', latencyMs: latency, message: `HTTP ${response.status}` };
    }
    return { name: 'Rosie Edge Function', status: 'ok', latencyMs: latency, message: 'Reachable' };
  } catch (err) {
    return { name: 'Rosie Edge Function', status: 'error', latencyMs: Date.now() - start, message: String(err) };
  }
}

async function checkCronTodaysPick(supabase: any): Promise<CheckResult> {
  const start = Date.now();
  try {
    // Check if today's pick ran within the last 26 hours
    const cutoff = new Date(Date.now() - 26 * 60 * 60 * 1000).toISOString();
    const { data, error } = await supabase
      .from('notification_logs')
      .select('id, created_at, status')
      .eq('job_type', 'todays_pick')
      .gte('created_at', cutoff)
      .order('created_at', { ascending: false })
      .limit(1);
    const latency = Date.now() - start;
    if (error) {
      return { name: 'Cron: Today\'s Pick', status: 'warning', latencyMs: latency, message: error.message };
    }
    if (!data || data.length === 0) {
      return { name: 'Cron: Today\'s Pick', status: 'warning', latencyMs: latency, message: 'No run in last 26 hours' };
    }
    const lastRun = data[0];
    if (lastRun.status === 'error') {
      return { name: 'Cron: Today\'s Pick', status: 'warning', latencyMs: latency, message: `Last run errored at ${lastRun.created_at}` };
    }
    return { name: 'Cron: Today\'s Pick', status: 'ok', latencyMs: latency, message: `Last run: ${lastRun.created_at}` };
  } catch (err) {
    return { name: 'Cron: Today\'s Pick', status: 'warning', latencyMs: Date.now() - start, message: String(err) };
  }
}

async function checkCronExpansionAgent(supabase: any): Promise<CheckResult> {
  const start = Date.now();
  try {
    // Check if expansion agent ran within the last 7 hours
    const cutoff = new Date(Date.now() - 7 * 60 * 60 * 1000).toISOString();
    const { data, error } = await supabase
      .from('expansion_activity_log')
      .select('id, created_at')
      .gte('created_at', cutoff)
      .order('created_at', { ascending: false })
      .limit(1);
    const latency = Date.now() - start;
    if (error) {
      return { name: 'Cron: Expansion Agent', status: 'warning', latencyMs: latency, message: error.message };
    }
    if (!data || data.length === 0) {
      return { name: 'Cron: Expansion Agent', status: 'warning', latencyMs: latency, message: 'No run in last 7 hours' };
    }
    return { name: 'Cron: Expansion Agent', status: 'ok', latencyMs: latency, message: `Last run: ${data[0].created_at}` };
  } catch (err) {
    return { name: 'Cron: Expansion Agent', status: 'warning', latencyMs: Date.now() - start, message: String(err) };
  }
}

// ─── Supabase Usage Monitor ─────────────────────────────────────────

// Free plan limits
const FREE_PLAN_LIMITS = {
  db_size_bytes: 500 * 1024 * 1024,        // 500 MB
  storage_size_bytes: 1 * 1024 * 1024 * 1024, // 1 GB
  mau: 50_000,
  edge_function_invocations: 500_000,
};

// Thresholds (percentage of limit)
const USAGE_WARN_THRESHOLD = 0.70;  // 70%
const USAGE_ERROR_THRESHOLD = 0.90; // 90%

async function checkSupabaseUsage(supabase: any): Promise<CheckResult> {
  const start = Date.now();
  try {
    // Get database size
    const { data: dbSize, error: dbErr } = await supabase.rpc('get_db_size');
    if (dbErr) {
      return { name: 'Supabase Usage', status: 'warning', latencyMs: Date.now() - start, message: `DB size check failed: ${dbErr.message}` };
    }

    // Get storage usage
    const { data: storageData, error: storageErr } = await supabase.rpc('get_storage_usage');
    const storageTotalBytes = storageErr ? 0 :
      (storageData || []).reduce((sum: number, b: any) => sum + (b.total_bytes || 0), 0);
    const storageObjectCount = storageErr ? 0 :
      (storageData || []).reduce((sum: number, b: any) => sum + (b.object_count || 0), 0);

    const latency = Date.now() - start;

    // Calculate usage percentages
    const dbPct = dbSize / FREE_PLAN_LIMITS.db_size_bytes;
    const storagePct = storageTotalBytes / FREE_PLAN_LIMITS.storage_size_bytes;

    // Store snapshot for trend tracking
    await supabase.from('supabase_usage_snapshots').insert({
      db_size_bytes: dbSize,
      storage_size_bytes: storageTotalBytes,
      storage_object_count: storageObjectCount,
      details: {
        buckets: storageData || [],
        db_pct: Math.round(dbPct * 100),
        storage_pct: Math.round(storagePct * 100),
      },
    });

    // Cleanup old snapshots periodically
    await supabase.rpc('cleanup_old_usage_snapshots').catch(() => {});

    // Determine status
    const maxPct = Math.max(dbPct, storagePct);
    const formatBytes = (b: number) => {
      if (b >= 1024 * 1024 * 1024) return `${(b / (1024 * 1024 * 1024)).toFixed(2)} GB`;
      return `${(b / (1024 * 1024)).toFixed(0)} MB`;
    };

    const summary = `DB: ${formatBytes(dbSize)} (${Math.round(dbPct * 100)}%) | Storage: ${formatBytes(storageTotalBytes)} (${Math.round(storagePct * 100)}%)`;

    if (maxPct >= USAGE_ERROR_THRESHOLD) {
      return { name: 'Supabase Usage', status: 'error', latencyMs: latency, message: `CRITICAL — ${summary}` };
    }
    if (maxPct >= USAGE_WARN_THRESHOLD) {
      return { name: 'Supabase Usage', status: 'warning', latencyMs: latency, message: `High usage — ${summary}` };
    }
    return { name: 'Supabase Usage', status: 'ok', latencyMs: latency, message: summary };
  } catch (err) {
    return { name: 'Supabase Usage', status: 'warning', latencyMs: Date.now() - start, message: String(err) };
  }
}

// ─── Alert Logic ─────────────────────────────────────────────────────

async function shouldSendAlert(
  supabase: any,
  serviceName: string,
): Promise<boolean> {
  // Check if we sent an alert for this service within the cooldown period
  const cutoff = new Date(Date.now() - ALERT_COOLDOWN_MINUTES * 60 * 1000).toISOString();
  const { data } = await supabase
    .from('health_alert_log')
    .select('id')
    .eq('service_name', serviceName)
    .in('alert_type', ['down', 'degraded'])
    .gte('sent_at', cutoff)
    .limit(1);

  return !data || data.length === 0;
}

async function wasServicePreviouslyDown(
  supabase: any,
  serviceName: string,
): Promise<boolean> {
  // Check the most recent alert for this service
  const { data } = await supabase
    .from('health_alert_log')
    .select('alert_type')
    .eq('service_name', serviceName)
    .order('sent_at', { ascending: false })
    .limit(1);

  if (!data || data.length === 0) return false;
  return data[0].alert_type === 'down';
}

async function sendAlertEmail(
  overallStatus: 'degraded' | 'down' | 'recovered',
  failedServices: CheckResult[],
  checkedAt: string,
) {
  const statusLabel = overallStatus === 'recovered' ? 'Recovered' : overallStatus === 'down' ? 'DOWN' : 'Degraded';
  const subject = overallStatus === 'recovered'
    ? `[TasteLanc] All Systems Recovered`
    : `[TasteLanc Alert] System ${statusLabel} — ${failedServices.map(s => s.name).join(', ')}`;

  const html = renderHealthAlertEmail({
    overallStatus,
    failedServices,
    checkedAt,
    dashboardUrl: DASHBOARD_URL,
  });

  const text = renderHealthAlertPlainText({
    overallStatus,
    failedServices,
    checkedAt,
    dashboardUrl: DASHBOARD_URL,
  });

  await resend.emails.send({
    from: 'TasteLanc Monitor <noreply@tastelanc.com>',
    to: ALERT_EMAIL,
    subject,
    html,
    text,
  });
}

// ─── Main Handler ────────────────────────────────────────────────────

export async function POST(request: Request) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const startTime = Date.now();
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    // Run all checks in parallel
    const checks = await Promise.all([
      checkSupabaseDb(),
      checkSupabaseAuth(),
      checkOpenAI(),
      checkStripe(),
      checkResend(),
      checkExpoPush(),
      checkRosieEdgeFunction(),
      checkCronTodaysPick(supabase),
      checkCronExpansionAgent(supabase),
      checkSupabaseUsage(supabase),
    ]);

    const durationMs = Date.now() - startTime;
    const hasError = checks.some((c) => c.status === 'error');
    const hasWarning = checks.some((c) => c.status === 'warning');
    const overallStatus = hasError ? 'down' : hasWarning ? 'degraded' : 'healthy';
    const checkedAt = new Date().toISOString();

    // Store results
    await supabase.from('health_check_results').insert({
      checked_at: checkedAt,
      overall_status: overallStatus,
      checks: checks,
      duration_ms: durationMs,
    });

    // Handle alerts
    const failedChecks = checks.filter((c) => c.status === 'error');
    const okChecks = checks.filter((c) => c.status === 'ok');
    let alertsSent = false;

    if (failedChecks.length > 0) {
      // Check if we need to send new alerts (respecting cooldown)
      const alertableServices: CheckResult[] = [];
      for (const check of failedChecks) {
        const canAlert = await shouldSendAlert(supabase, check.name);
        if (canAlert) {
          alertableServices.push(check);
        }
      }

      if (alertableServices.length > 0) {
        const alertType = hasError ? 'down' : 'degraded';
        await sendAlertEmail(alertType, alertableServices, checkedAt);
        alertsSent = true;

        // Log the alerts
        for (const check of alertableServices) {
          await supabase.from('health_alert_log').insert({
            service_name: check.name,
            alert_type: alertType,
            details: { message: check.message, latencyMs: check.latencyMs },
          });
        }
      }
    }

    // Check for recoveries — send recovery email if previously-down services are now ok
    const recoveredServices: CheckResult[] = [];
    for (const check of okChecks) {
      const wasDown = await wasServicePreviouslyDown(supabase, check.name);
      if (wasDown) {
        recoveredServices.push(check);
        await supabase.from('health_alert_log').insert({
          service_name: check.name,
          alert_type: 'recovered',
          details: { message: 'Service recovered', latencyMs: check.latencyMs },
        });
      }
    }

    if (recoveredServices.length > 0) {
      await sendAlertEmail('recovered', recoveredServices, checkedAt);
      alertsSent = true;
    }

    // Update the health check result with alerts_sent flag
    if (alertsSent) {
      // Update the most recent result
      await supabase
        .from('health_check_results')
        .update({ alerts_sent: true })
        .eq('checked_at', checkedAt);
    }

    console.log(
      `[Health Check] Status: ${overallStatus} | Duration: ${durationMs}ms | ` +
      `Services: ${checks.length} | Failed: ${failedChecks.length} | Alerts sent: ${alertsSent}`
    );

    return NextResponse.json({
      status: overallStatus,
      checks,
      durationMs,
      alertsSent,
    });
  } catch (error) {
    console.error('[Health Check] Fatal error:', error);
    return NextResponse.json(
      { error: String(error), status: 'error' },
      { status: 500 }
    );
  }
}

// Also support GET for manual browser-based checks
export async function GET(request: Request) {
  // Proxy to POST handler
  return POST(request);
}
