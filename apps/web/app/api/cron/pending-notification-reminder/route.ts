/**
 * Pending Notification Reminder Cron Route
 *
 * Called daily at 8 AM ET by the Netlify scheduled function.
 * Finds today's scheduled_notifications that are still 'pending'
 * and sends an email to the admin listing what needs approval before 11 AM.
 */

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { resend } from '@/lib/resend';

const CRON_SECRET = process.env.CRON_SECRET;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const ADMIN_EMAIL = 'leandertoney@gmail.com';
const DASHBOARD_URL = 'https://tastelanc.com/admin/notifications';

export async function POST(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // Get today's ET date
  const todayET = new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' });

  const { data: pending, error } = await supabase
    .from('scheduled_notifications')
    .select('id, market_slug, title, body, restaurant_name, strategy')
    .eq('scheduled_date', todayET)
    .eq('status', 'pending')
    .order('market_slug', { ascending: true });

  if (error) {
    console.error('[Reminder] DB error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!pending || pending.length === 0) {
    console.log('[Reminder] No pending notifications for today.');
    return NextResponse.json({ sent: false, reason: 'No pending notifications today' });
  }

  // Format date for display: "Mar 20"
  const dateDisplay = new Date(todayET + 'T12:00:00').toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });

  const rowsHtml = pending
    .map(
      (n) => `
    <tr>
      <td style="padding:8px 12px;border-bottom:1px solid #333;color:#ccc;text-transform:capitalize;">${n.market_slug.replace('-pa', '').replace('-nc', '')}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #333;color:#ccc;">${n.restaurant_name}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #333;color:#ccc;">${n.title}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #333;color:#aaa;font-size:12px;">${n.strategy ?? '—'}</td>
    </tr>`,
    )
    .join('');

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:600px;margin:40px auto;background:#111;border-radius:12px;overflow:hidden;border:1px solid #222;">
    <div style="background:#1a1a1a;padding:24px 32px;border-bottom:1px solid #222;">
      <h1 style="margin:0;font-size:20px;color:#fff;">🔔 Notifications need approval</h1>
      <p style="margin:8px 0 0;color:#888;font-size:14px;">${dateDisplay} · Send time: 11:00 AM ET</p>
    </div>
    <div style="padding:24px 32px;">
      <p style="color:#ccc;font-size:14px;margin-top:0;">
        The following ${pending.length} notification${pending.length > 1 ? 's' : ''} for today haven't been approved yet.
        If not approved by <strong style="color:#fff;">11 AM ET</strong>, they will be skipped.
      </p>
      <table style="width:100%;border-collapse:collapse;font-size:14px;">
        <thead>
          <tr style="background:#1a1a1a;">
            <th style="padding:8px 12px;text-align:left;color:#666;font-weight:500;font-size:12px;text-transform:uppercase;letter-spacing:.05em;">Market</th>
            <th style="padding:8px 12px;text-align:left;color:#666;font-weight:500;font-size:12px;text-transform:uppercase;letter-spacing:.05em;">Restaurant</th>
            <th style="padding:8px 12px;text-align:left;color:#666;font-weight:500;font-size:12px;text-transform:uppercase;letter-spacing:.05em;">Notification</th>
            <th style="padding:8px 12px;text-align:left;color:#666;font-weight:500;font-size:12px;text-transform:uppercase;letter-spacing:.05em;">Strategy</th>
          </tr>
        </thead>
        <tbody>${rowsHtml}</tbody>
      </table>
      <div style="margin-top:24px;text-align:center;">
        <a href="${DASHBOARD_URL}"
           style="display:inline-block;background:#e8b84b;color:#000;font-weight:600;font-size:14px;padding:12px 28px;border-radius:8px;text-decoration:none;">
          Review &amp; Approve →
        </a>
      </div>
    </div>
  </div>
</body>
</html>`;

  const text = `Notifications need approval — ${dateDisplay}

${pending.length} notification${pending.length > 1 ? 's' : ''} for today haven't been approved.
If not approved by 11 AM ET, they will be skipped.

${pending.map((n) => `• ${n.market_slug}: ${n.restaurant_name} — "${n.title}"`).join('\n')}

Review & Approve: ${DASHBOARD_URL}`;

  const { error: emailError } = await resend.emails.send({
    from: 'TasteLanc Monitor <noreply@tastelanc.com>',
    to: ADMIN_EMAIL,
    subject: `[Action Required] ${pending.length} notification${pending.length > 1 ? 's' : ''} need approval for today (${dateDisplay})`,
    html,
    text,
  });

  if (emailError) {
    console.error('[Reminder] Resend error:', emailError);
    return NextResponse.json({ error: String(emailError) }, { status: 500 });
  }

  console.log(`[Reminder] Sent email — ${pending.length} pending for ${todayET}`);
  return NextResponse.json({ sent: true, count: pending.length, date: todayET });
}
