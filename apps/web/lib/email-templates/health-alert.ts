// Health alert email template — minimal HTML for inbox primary tab
import { BRAND } from '@/config/market';

export interface HealthAlertEmailProps {
  overallStatus: 'degraded' | 'down' | 'recovered';
  failedServices: Array<{
    name: string;
    status: string;
    message: string;
    latencyMs?: number;
  }>;
  checkedAt: string;
  dashboardUrl: string;
}

export function renderHealthAlertEmail({
  overallStatus,
  failedServices,
  checkedAt,
  dashboardUrl,
}: HealthAlertEmailProps): string {
  const statusLabel = overallStatus === 'recovered' ? 'Recovered' : overallStatus === 'down' ? 'DOWN' : 'Degraded';
  const statusColor = overallStatus === 'recovered' ? '#22c55e' : overallStatus === 'down' ? '#ef4444' : '#f59e0b';

  const serviceRows = failedServices
    .map(
      (s) =>
        `<tr>
          <td style="padding:8px 12px; border-bottom:1px solid #eee; font-weight:600;">${s.name}</td>
          <td style="padding:8px 12px; border-bottom:1px solid #eee; color:${s.status === 'ok' ? '#22c55e' : s.status === 'warning' ? '#f59e0b' : '#ef4444'};">${s.status.toUpperCase()}</td>
          <td style="padding:8px 12px; border-bottom:1px solid #eee; color:#666; font-size:13px;">${s.message}</td>
        </tr>`
    )
    .join('\n');

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${BRAND.name} System Alert</title>
</head>
<body style="margin:0; padding:20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size:15px; line-height:1.5; color:#333; background:#fff;">
  <div style="display:none; max-height:0; overflow:hidden;">System status: ${statusLabel} — ${failedServices.length} service(s) affected</div>

  <div style="max-width:560px; margin:0 auto;">
    <div style="background:${statusColor}; color:#fff; padding:16px 20px; border-radius:8px 8px 0 0; font-size:18px; font-weight:700;">
      ${statusLabel === 'Recovered' ? 'All Systems Recovered' : `System ${statusLabel}`}
    </div>

    <div style="border:1px solid #eee; border-top:none; border-radius:0 0 8px 8px; padding:20px;">
      <p style="margin:0 0 16px 0; color:#666; font-size:13px;">
        Checked at ${new Date(checkedAt).toLocaleString('en-US', { timeZone: 'America/New_York', dateStyle: 'medium', timeStyle: 'short' })} ET
      </p>

      <table style="width:100%; border-collapse:collapse; margin-bottom:20px;">
        <thead>
          <tr style="background:#f9f9f9;">
            <th style="padding:8px 12px; text-align:left; font-size:12px; text-transform:uppercase; color:#888;">Service</th>
            <th style="padding:8px 12px; text-align:left; font-size:12px; text-transform:uppercase; color:#888;">Status</th>
            <th style="padding:8px 12px; text-align:left; font-size:12px; text-transform:uppercase; color:#888;">Details</th>
          </tr>
        </thead>
        <tbody>
          ${serviceRows}
        </tbody>
      </table>

      <p style="margin:0;">
        <a href="${dashboardUrl}" style="display:inline-block; background:#1a1a2e; color:#fff; padding:10px 20px; border-radius:6px; text-decoration:none; font-weight:600;">View Dashboard</a>
      </p>
    </div>

    <p style="margin:16px 0 0; font-size:12px; color:#999; text-align:center;">
      ${BRAND.name} Monitoring System
    </p>
  </div>
</body>
</html>
  `.trim();
}

export function renderHealthAlertPlainText({
  overallStatus,
  failedServices,
  checkedAt,
  dashboardUrl,
}: HealthAlertEmailProps): string {
  const statusLabel = overallStatus === 'recovered' ? 'RECOVERED' : overallStatus === 'down' ? 'DOWN' : 'DEGRADED';
  const lines = failedServices.map(
    (s) => `  - ${s.name}: ${s.status.toUpperCase()} — ${s.message}`
  );

  return `
${BRAND.name} System Alert: ${statusLabel}

Checked at: ${checkedAt}

Services:
${lines.join('\n')}

Dashboard: ${dashboardUrl}
  `.trim();
}
