import { createClient } from '@/lib/supabase/server';
import { verifyAdminAccess } from '@/lib/auth/admin-access';
import { redirect } from 'next/navigation';
import { Card, CardContent, CardHeader } from '@/components/ui';
import {
  Activity,
  Database,
  Shield,
  Brain,
  CreditCard,
  Mail,
  Bell,
  Cpu,
  Clock,
  CheckCircle,
  AlertTriangle,
  XCircle,
  RefreshCw,
} from 'lucide-react';

// Map service names to icons
const SERVICE_ICONS: Record<string, typeof Activity> = {
  'Supabase Database': Database,
  'Supabase Auth': Shield,
  'OpenAI': Brain,
  'Stripe': CreditCard,
  'Resend': Mail,
  'Expo Push': Bell,
  'Rosie Edge Function': Cpu,
  "Cron: Today's Pick": Clock,
  'Cron: Expansion Agent': Clock,
};

function StatusDot({ status }: { status: string }) {
  const colors: Record<string, string> = {
    ok: 'bg-green-500',
    warning: 'bg-yellow-500',
    error: 'bg-red-500',
  };
  return (
    <span className={`inline-block w-2.5 h-2.5 rounded-full ${colors[status] || 'bg-gray-500'}`} />
  );
}

function OverallStatusBanner({ status }: { status: string }) {
  const config: Record<string, { bg: string; icon: typeof CheckCircle; label: string }> = {
    healthy: { bg: 'bg-green-500/10 border-green-500/30', icon: CheckCircle, label: 'All Systems Operational' },
    degraded: { bg: 'bg-yellow-500/10 border-yellow-500/30', icon: AlertTriangle, label: 'System Degraded' },
    down: { bg: 'bg-red-500/10 border-red-500/30', icon: XCircle, label: 'System Issues Detected' },
  };
  const c = config[status] || config.down;
  const Icon = c.icon;

  return (
    <div className={`${c.bg} border rounded-xl p-5 flex items-center gap-4`}>
      <Icon className={`w-8 h-8 ${status === 'healthy' ? 'text-green-500' : status === 'degraded' ? 'text-yellow-500' : 'text-red-500'}`} />
      <div>
        <h2 className="text-xl font-bold text-white">{c.label}</h2>
        <p className="text-sm text-gray-400">Last checked just now (refresh for latest)</p>
      </div>
    </div>
  );
}

export default async function SystemHealthPage() {
  const supabase = await createClient();

  // Verify admin access
  try {
    await verifyAdminAccess(supabase);
  } catch {
    redirect('/login');
  }

  // Fetch latest health check result
  const { data: latestCheck } = await supabase
    .from('health_check_results')
    .select('*')
    .order('checked_at', { ascending: false })
    .limit(1)
    .single();

  // Fetch last 96 checks (24 hours at 15-min intervals)
  const { data: recentChecks } = await supabase
    .from('health_check_results')
    .select('checked_at, overall_status, duration_ms')
    .order('checked_at', { ascending: false })
    .limit(96);

  // Fetch recent alerts
  const { data: recentAlerts } = await supabase
    .from('health_alert_log')
    .select('*')
    .order('sent_at', { ascending: false })
    .limit(20);

  // Calculate uptime percentages per service (from last 96 checks)
  const uptimeByService: Record<string, { ok: number; total: number }> = {};
  if (recentChecks) {
    for (const check of recentChecks) {
      // We need the full checks array — refetch if needed
    }
  }

  // Fetch full checks data for uptime calculation
  const { data: fullRecentChecks } = await supabase
    .from('health_check_results')
    .select('checks')
    .order('checked_at', { ascending: false })
    .limit(96);

  if (fullRecentChecks) {
    for (const row of fullRecentChecks) {
      const checks = row.checks as Array<{ name: string; status: string }>;
      if (!Array.isArray(checks)) continue;
      for (const check of checks) {
        if (!uptimeByService[check.name]) {
          uptimeByService[check.name] = { ok: 0, total: 0 };
        }
        uptimeByService[check.name].total++;
        if (check.status === 'ok') {
          uptimeByService[check.name].ok++;
        }
      }
    }
  }

  // Overall uptime (24h)
  const overallUptime = recentChecks
    ? Math.round(
        (recentChecks.filter((c) => c.overall_status === 'healthy').length /
          Math.max(recentChecks.length, 1)) *
          100
      )
    : null;

  const checks = latestCheck?.checks as Array<{
    name: string;
    status: string;
    latencyMs: number;
    message: string;
  }> | null;

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">System Health</h1>
          <p className="text-gray-400 text-sm mt-1">
            Monitoring critical services and infrastructure
          </p>
        </div>
        {overallUptime !== null && (
          <div className="text-right">
            <p className="text-3xl font-bold text-white">{overallUptime}%</p>
            <p className="text-xs text-gray-500">24h Uptime</p>
          </div>
        )}
      </div>

      {/* Overall Status Banner */}
      {latestCheck ? (
        <OverallStatusBanner status={latestCheck.overall_status} />
      ) : (
        <div className="bg-tastelanc-surface-light border border-gray-700 rounded-xl p-5 text-center">
          <p className="text-gray-400">No health check data yet. The first check will run within 15 minutes.</p>
        </div>
      )}

      {/* Service Status Grid */}
      {checks && checks.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-3">Services</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {checks.map((check) => {
              const Icon = SERVICE_ICONS[check.name] || Activity;
              const uptime = uptimeByService[check.name];
              const uptimePct = uptime ? Math.round((uptime.ok / uptime.total) * 100) : null;

              return (
                <Card key={check.name}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-tastelanc-surface-light flex items-center justify-center">
                          <Icon className="w-4.5 h-4.5 text-gray-400" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-white">{check.name}</p>
                          <p className="text-xs text-gray-500 mt-0.5">{check.message}</p>
                        </div>
                      </div>
                      <StatusDot status={check.status} />
                    </div>
                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-tastelanc-surface-light">
                      <span className="text-xs text-gray-500">{check.latencyMs}ms</span>
                      {uptimePct !== null && (
                        <span className={`text-xs font-medium ${uptimePct >= 99 ? 'text-green-400' : uptimePct >= 95 ? 'text-yellow-400' : 'text-red-400'}`}>
                          {uptimePct}% uptime
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* 24h Timeline */}
      {recentChecks && recentChecks.length > 0 && (
        <Card>
          <CardHeader>
            <h3 className="text-sm font-medium text-white">24-Hour Status Timeline</h3>
          </CardHeader>
          <CardContent>
            <div className="flex gap-px items-end h-8">
              {[...recentChecks].reverse().map((check, i) => {
                const color =
                  check.overall_status === 'healthy'
                    ? 'bg-green-500'
                    : check.overall_status === 'degraded'
                    ? 'bg-yellow-500'
                    : 'bg-red-500';
                return (
                  <div
                    key={i}
                    className={`${color} flex-1 rounded-sm min-w-[2px]`}
                    style={{ height: '100%' }}
                    title={`${new Date(check.checked_at).toLocaleString()} — ${check.overall_status} (${check.duration_ms}ms)`}
                  />
                );
              })}
            </div>
            <div className="flex justify-between mt-2">
              <span className="text-xs text-gray-500">24h ago</span>
              <span className="text-xs text-gray-500">Now</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Alerts */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-white">Recent Alerts</h3>
            {recentAlerts && (
              <span className="text-xs text-gray-500">{recentAlerts.length} alerts</span>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {!recentAlerts || recentAlerts.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-4">No alerts yet — that&apos;s a good sign!</p>
          ) : (
            <div className="space-y-2">
              {recentAlerts.map((alert: any) => (
                <div
                  key={alert.id}
                  className="flex items-center gap-3 py-2 border-b border-tastelanc-surface-light last:border-0"
                >
                  {alert.alert_type === 'recovered' ? (
                    <RefreshCw className="w-4 h-4 text-green-400 flex-shrink-0" />
                  ) : alert.alert_type === 'down' ? (
                    <XCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-yellow-400 flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white truncate">
                      <span className="font-medium">{alert.service_name}</span>
                      <span className="text-gray-400 ml-2">
                        {alert.alert_type === 'recovered' ? 'recovered' : alert.alert_type}
                      </span>
                    </p>
                    {alert.details?.message && (
                      <p className="text-xs text-gray-500 truncate">{alert.details.message}</p>
                    )}
                  </div>
                  <span className="text-xs text-gray-500 flex-shrink-0">
                    {new Date(alert.sent_at).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Check Details */}
      {latestCheck && (
        <div className="text-xs text-gray-600 text-center">
          Last check: {new Date(latestCheck.checked_at).toLocaleString()} | Duration: {latestCheck.duration_ms}ms |{' '}
          {latestCheck.alerts_sent ? 'Alerts sent' : 'No alerts'}
        </div>
      )}
    </div>
  );
}
