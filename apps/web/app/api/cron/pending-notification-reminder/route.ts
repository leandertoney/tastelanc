/**
 * Pending Notification Reminder + Weekly Spotlight Digest
 *
 * Called daily at 8 AM ET by the Netlify scheduled function.
 *
 * Every day: Finds today's scheduled_notifications that are still 'pending'
 * and sends an email to the admin listing what needs approval before 11 AM.
 *
 * On Mondays only: Also includes a spotlight pipeline summary —
 *   - Upcoming spotlight posts for the next 14 days (Sat elite, Sun premium)
 *   - Any abandoned spotlight runs from the past 7 days that need attention
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
const INSTAGRAM_URL = 'https://tastelanc.com/admin/instagram-posts';

export async function POST(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // Get today's ET date and day of week
  const now = new Date();
  const todayET = now.toLocaleDateString('en-CA', { timeZone: 'America/New_York' });
  const dayOfWeek = now.toLocaleDateString('en-US', { weekday: 'long', timeZone: 'America/New_York' });
  const isMonday = dayOfWeek === 'Monday';

  // ── Pending push notifications ────────────────────────────────────────────────
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

  // ── Monday: Spotlight pipeline digest ────────────────────────────────────────
  interface SpotlightSlot {
    post_date: string;
    tier: 'elite' | 'premium';
    restaurant_name: string | null;
    post_id: string | null;
    status: string;
    quality_score: number | null;
    retry_count: number;
  }

  let upcomingSpotlights: SpotlightSlot[] = [];
  let abandonedSpotlights: SpotlightSlot[] = [];

  if (isMonday) {
    // Next 14 days of Sat/Sun slots
    const upcomingDates: string[] = [];
    for (let i = 0; i < 14; i++) {
      const d = new Date(now);
      d.setDate(now.getDate() + i);
      const dow = d.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'America/New_York' });
      if (dow === 'Sat' || dow === 'Sun') {
        upcomingDates.push(d.toLocaleDateString('en-CA', { timeZone: 'America/New_York' }));
      }
    }

    if (upcomingDates.length > 0) {
      const { data: spotlightPosts } = await supabase
        .from('instagram_posts')
        .select('id, post_date, status, selected_entity_ids, generation_metadata, retry_count')
        .in('post_date', upcomingDates)
        .eq('content_type', 'restaurant_spotlight')
        .order('post_date', { ascending: true });

      const existingByDate = new Map<string, any>();
      for (const post of spotlightPosts ?? []) {
        existingByDate.set(post.post_date, post);
      }

      // Resolve restaurant names for scheduled posts
      const restaurantIds = [...existingByDate.values()]
        .map(p => p.selected_entity_ids?.[0])
        .filter(Boolean);

      const restaurantNames: Record<string, string> = {};
      if (restaurantIds.length > 0) {
        const { data: restaurants } = await supabase
          .from('restaurants')
          .select('id, name')
          .in('id', restaurantIds);
        for (const r of restaurants ?? []) {
          restaurantNames[r.id] = r.name;
        }
      }

      for (const dateStr of upcomingDates) {
        const d = new Date(dateStr + 'T12:00:00Z');
        const dow = d.getUTCDay();
        const tier = dow === 6 ? 'elite' : 'premium';
        const post = existingByDate.get(dateStr);

        upcomingSpotlights.push({
          post_date: dateStr,
          tier,
          restaurant_name: post
            ? (restaurantNames[post.selected_entity_ids?.[0]] ?? null)
            : null,
          post_id: post?.id ?? null,
          status: post?.status ?? 'not_generated',
          quality_score: (post?.generation_metadata as any)?.quality_score ?? null,
          retry_count: post?.retry_count ?? 0,
        });
      }
    }

    // Abandoned in the past 7 days
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(now.getDate() - 7);
    const sevenDaysAgoStr = sevenDaysAgo.toLocaleDateString('en-CA', { timeZone: 'America/New_York' });

    const { data: abandonedPosts } = await supabase
      .from('instagram_posts')
      .select('id, post_date, selected_entity_ids, retry_count')
      .eq('content_type', 'restaurant_spotlight')
      .eq('status', 'abandoned')
      .gte('post_date', sevenDaysAgoStr)
      .order('post_date', { ascending: false });

    const abandonedRestaurantIds = (abandonedPosts ?? [])
      .map(p => p.selected_entity_ids?.[0])
      .filter(Boolean);

    const abandonedNames: Record<string, string> = {};
    if (abandonedRestaurantIds.length > 0) {
      const { data: rs } = await supabase
        .from('restaurants')
        .select('id, name')
        .in('id', abandonedRestaurantIds);
      for (const r of rs ?? []) abandonedNames[r.id] = r.name;
    }

    for (const post of abandonedPosts ?? []) {
      const d = new Date(post.post_date + 'T12:00:00Z');
      const dow = d.getUTCDay();
      abandonedSpotlights.push({
        post_date: post.post_date,
        tier: dow === 6 ? 'elite' : 'premium',
        restaurant_name: abandonedNames[post.selected_entity_ids?.[0]] ?? null,
        post_id: post.id,
        status: 'abandoned',
        quality_score: null,
        retry_count: post.retry_count ?? 0,
      });
    }
  }

  // ── Decide whether to send ────────────────────────────────────────────────────
  const hasPending = pending && pending.length > 0;
  const hasSpotlightContent = isMonday && (upcomingSpotlights.length > 0 || abandonedSpotlights.length > 0);

  if (!hasPending && !hasSpotlightContent) {
    console.log('[Reminder] Nothing to report today.');
    return NextResponse.json({ sent: false, reason: isMonday ? 'No pending notifications or spotlight content' : 'No pending notifications today' });
  }

  // ── Build email HTML ──────────────────────────────────────────────────────────
  const dateDisplay = new Date(todayET + 'T12:00:00').toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', timeZone: 'UTC',
  });

  // Pending notifications table
  const pendingSection = hasPending ? `
    <div style="margin-bottom:32px;">
      <h2 style="margin:0 0 12px;font-size:16px;color:#fff;">🔔 Push notifications need approval</h2>
      <p style="color:#ccc;font-size:14px;margin:0 0 16px;">
        ${pending!.length} notification${pending!.length > 1 ? 's' : ''} for today haven't been approved.
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
        <tbody>
          ${pending!.map(n => `
          <tr>
            <td style="padding:8px 12px;border-bottom:1px solid #333;color:#ccc;text-transform:capitalize;">${n.market_slug.replace('-pa', '').replace('-nc', '')}</td>
            <td style="padding:8px 12px;border-bottom:1px solid #333;color:#ccc;">${n.restaurant_name}</td>
            <td style="padding:8px 12px;border-bottom:1px solid #333;color:#ccc;">${n.title}</td>
            <td style="padding:8px 12px;border-bottom:1px solid #333;color:#aaa;font-size:12px;">${n.strategy ?? '—'}</td>
          </tr>`).join('')}
        </tbody>
      </table>
      <div style="margin-top:16px;">
        <a href="${DASHBOARD_URL}"
           style="display:inline-block;background:#e8b84b;color:#000;font-weight:600;font-size:14px;padding:10px 24px;border-radius:8px;text-decoration:none;">
          Review &amp; Approve →
        </a>
      </div>
    </div>
  ` : '';

  // Spotlight schedule section (Monday only)
  const statusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending_review: 'background:#2563eb;color:#fff',
      approved: 'background:#16a34a;color:#fff',
      published: 'background:#16a34a;color:#fff',
      abandoned: 'background:#dc2626;color:#fff',
      not_generated: 'background:#333;color:#888',
    };
    const labels: Record<string, string> = {
      pending_review: 'Scheduled',
      approved: 'Approved',
      published: 'Published',
      abandoned: '⚠ Abandoned',
      not_generated: 'Not generated',
    };
    const style = styles[status] ?? styles['not_generated'];
    const label = labels[status] ?? status;
    return `<span style="display:inline-block;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:600;${style}">${label}</span>`;
  };

  const tierBadge = (tier: 'elite' | 'premium') =>
    tier === 'elite'
      ? `<span style="color:#e8b84b;font-weight:600;font-size:12px;">★ ELITE</span>`
      : `<span style="color:#a78bfa;font-weight:600;font-size:12px;">◆ PREMIUM</span>`;

  const formatDate = (dateStr: string) => new Date(dateStr + 'T12:00:00Z').toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC',
  });

  const spotlightScheduleSection = (isMonday && upcomingSpotlights.length > 0) ? `
    <div style="margin-bottom:32px;">
      <h2 style="margin:0 0 12px;font-size:16px;color:#fff;">📸 Spotlight schedule — next 2 weeks</h2>
      <p style="color:#ccc;font-size:14px;margin:0 0 16px;">
        Auto-generated Saturday (elite) and Sunday (premium) posts. Each publishes at 11:30 AM ET.
        <a href="${INSTAGRAM_URL}" style="color:#e8b84b;text-decoration:none;">View in calendar →</a>
      </p>
      <table style="width:100%;border-collapse:collapse;font-size:14px;">
        <thead>
          <tr style="background:#1a1a1a;">
            <th style="padding:8px 12px;text-align:left;color:#666;font-weight:500;font-size:12px;text-transform:uppercase;letter-spacing:.05em;">Date</th>
            <th style="padding:8px 12px;text-align:left;color:#666;font-weight:500;font-size:12px;text-transform:uppercase;letter-spacing:.05em;">Tier</th>
            <th style="padding:8px 12px;text-align:left;color:#666;font-weight:500;font-size:12px;text-transform:uppercase;letter-spacing:.05em;">Restaurant</th>
            <th style="padding:8px 12px;text-align:left;color:#666;font-weight:500;font-size:12px;text-transform:uppercase;letter-spacing:.05em;">Status</th>
          </tr>
        </thead>
        <tbody>
          ${upcomingSpotlights.map(s => `
          <tr>
            <td style="padding:8px 12px;border-bottom:1px solid #333;color:#ccc;white-space:nowrap;">${formatDate(s.post_date)}</td>
            <td style="padding:8px 12px;border-bottom:1px solid #333;">${tierBadge(s.tier)}</td>
            <td style="padding:8px 12px;border-bottom:1px solid #333;color:${s.restaurant_name ? '#fff' : '#555'};">${s.restaurant_name ?? '—'}</td>
            <td style="padding:8px 12px;border-bottom:1px solid #333;">${statusBadge(s.status)}</td>
          </tr>`).join('')}
        </tbody>
      </table>
    </div>
  ` : '';

  const abandonedSection = (isMonday && abandonedSpotlights.length > 0) ? `
    <div style="margin-bottom:32px;">
      <h2 style="margin:0 0 12px;font-size:16px;color:#dc2626;">⚠ Abandoned spotlights — past 7 days</h2>
      <p style="color:#ccc;font-size:14px;margin:0 0 16px;">
        These posts failed quality checks after 3 attempts. You can regenerate them manually from the calendar.
      </p>
      <table style="width:100%;border-collapse:collapse;font-size:14px;">
        <thead>
          <tr style="background:#1a1a1a;">
            <th style="padding:8px 12px;text-align:left;color:#666;font-weight:500;font-size:12px;text-transform:uppercase;letter-spacing:.05em;">Date</th>
            <th style="padding:8px 12px;text-align:left;color:#666;font-weight:500;font-size:12px;text-transform:uppercase;letter-spacing:.05em;">Tier</th>
            <th style="padding:8px 12px;text-align:left;color:#666;font-weight:500;font-size:12px;text-transform:uppercase;letter-spacing:.05em;">Restaurant</th>
            <th style="padding:8px 12px;text-align:left;color:#666;font-weight:500;font-size:12px;text-transform:uppercase;letter-spacing:.05em;">Retries</th>
          </tr>
        </thead>
        <tbody>
          ${abandonedSpotlights.map(s => `
          <tr>
            <td style="padding:8px 12px;border-bottom:1px solid #333;color:#ccc;white-space:nowrap;">${formatDate(s.post_date)}</td>
            <td style="padding:8px 12px;border-bottom:1px solid #333;">${tierBadge(s.tier)}</td>
            <td style="padding:8px 12px;border-bottom:1px solid #333;color:#fff;">${s.restaurant_name ?? '—'}</td>
            <td style="padding:8px 12px;border-bottom:1px solid #333;color:#dc2626;font-weight:600;">${s.retry_count}/3</td>
          </tr>`).join('')}
        </tbody>
      </table>
      <div style="margin-top:16px;">
        <a href="${INSTAGRAM_URL}"
           style="display:inline-block;background:#dc2626;color:#fff;font-weight:600;font-size:14px;padding:10px 24px;border-radius:8px;text-decoration:none;">
          View in Calendar →
        </a>
      </div>
    </div>
  ` : '';

  const noSpotlightsYetSection = (isMonday && upcomingSpotlights.length === 0 && abandonedSpotlights.length === 0) ? `
    <div style="margin-bottom:32px;padding:16px;background:#1a1a1a;border-radius:8px;border:1px solid #333;">
      <p style="color:#666;font-size:14px;margin:0;">📸 No spotlight posts generated yet for the next 2 weeks. The advance generation runs every Saturday at 8:30 AM ET.</p>
    </div>
  ` : '';

  const subjectBase = isMonday
    ? `[Monday Digest]${hasPending ? ` ${pending!.length} pending notification${pending!.length > 1 ? 's' : ''} +` : ''} Spotlight schedule`
    : `[Action Required] ${pending!.length} notification${pending!.length > 1 ? 's' : ''} need approval for today (${dateDisplay})`;

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:640px;margin:40px auto;background:#111;border-radius:12px;overflow:hidden;border:1px solid #222;">
    <div style="background:#1a1a1a;padding:24px 32px;border-bottom:1px solid #222;">
      <h1 style="margin:0;font-size:20px;color:#fff;">${isMonday ? '📋 Monday Admin Digest' : '🔔 Notifications need approval'}</h1>
      <p style="margin:8px 0 0;color:#888;font-size:14px;">${dateDisplay}${isMonday ? '' : ' · Send time: 11:00 AM ET'}</p>
    </div>
    <div style="padding:24px 32px;">
      ${pendingSection}
      ${spotlightScheduleSection}
      ${abandonedSection}
      ${noSpotlightsYetSection}
    </div>
  </div>
</body>
</html>`;

  // Plain text fallback
  const pendingText = hasPending
    ? `PUSH NOTIFICATIONS NEEDING APPROVAL\n${pending!.map(n => `• ${n.market_slug}: ${n.restaurant_name} — "${n.title}"`).join('\n')}\nApprove: ${DASHBOARD_URL}\n\n`
    : '';

  const spotlightText = isMonday && upcomingSpotlights.length > 0
    ? `SPOTLIGHT SCHEDULE (NEXT 2 WEEKS)\n${upcomingSpotlights.map(s => `• ${formatDate(s.post_date)} [${s.tier.toUpperCase()}] ${s.restaurant_name ?? 'Not generated'} — ${s.status}`).join('\n')}\nView calendar: ${INSTAGRAM_URL}\n\n`
    : '';

  const abandonedText = isMonday && abandonedSpotlights.length > 0
    ? `ABANDONED SPOTLIGHTS (PAST 7 DAYS)\n${abandonedSpotlights.map(s => `• ${formatDate(s.post_date)} [${s.tier.toUpperCase()}] ${s.restaurant_name ?? '?'} — failed ${s.retry_count}/3 attempts`).join('\n')}\n\n`
    : '';

  const text = `${isMonday ? 'Monday Admin Digest' : 'Notifications need approval'} — ${dateDisplay}\n\n${pendingText}${spotlightText}${abandonedText}`;

  const { error: emailError } = await resend.emails.send({
    from: 'TasteLanc Monitor <noreply@tastelanc.com>',
    to: ADMIN_EMAIL,
    subject: subjectBase,
    html,
    text,
  });

  if (emailError) {
    console.error('[Reminder] Resend error:', emailError);
    return NextResponse.json({ error: String(emailError) }, { status: 500 });
  }

  console.log(`[Reminder] Sent email — ${hasPending ? pending!.length : 0} pending, ${upcomingSpotlights.length} spotlight slots, ${abandonedSpotlights.length} abandoned`);
  return NextResponse.json({
    sent: true,
    is_monday: isMonday,
    pending_count: pending?.length ?? 0,
    spotlight_slots: upcomingSpotlights.length,
    abandoned_count: abandonedSpotlights.length,
    date: todayET,
  });
}
