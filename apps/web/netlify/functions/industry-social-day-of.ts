import type { Config, Context } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import crypto from 'crypto';

/**
 * Industry Social DAY-OF reminder — fires ONCE at 4:00 PM ET on 2026-04-20.
 * Queries all yes-RSVPs at fire time, dedupes by name, sends via Resend.
 *
 * Cron schedule below is in UTC.  4:00 PM ET (EDT) = 20:00 UTC.
 * Restricted to April 20 only so it doesn't fire on future days.
 */

const SUBJECT = 'Confirming your reservation — tonight at 6';
const FROM = 'TasteLanc <invites@tastelanc.com>';
const REPLY_TO = 'invites@tastelanc.com';
const UNSUBSCRIBE_URL = 'https://tastelanc.com/unsubscribe';

function firstName(fullName: string | null): string | null {
  const t = (fullName || '').trim();
  if (!t) return null;
  const f = t.split(/\s+/)[0];
  if (f.length >= 2 && /^[a-zA-Z]+$/.test(f)) {
    return f.charAt(0).toUpperCase() + f.slice(1).toLowerCase();
  }
  return null;
}

function reservationRef(email: string): string {
  const hash = crypto.createHash('sha1').update(email.toLowerCase()).digest('hex').slice(0, 6).toUpperCase();
  return `TL-${hash}`;
}

function renderHTML(name: string | null, ref: string, email: string): string {
  const greeting = name ? `Hi ${name},` : 'Hi,';
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Confirming your reservation</title>
</head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;color:#202124;background:#ffffff;">
<div style="display:none;max-height:0;overflow:hidden;">Confirming your reservation for tonight at 6 PM. The Lounge at Hempfield Apothetique.</div>

<div style="max-width:560px;margin:0 auto;padding:24px;">

  <div style="font-size:13px;color:#5f6368;margin-bottom:4px;">Reservation ${ref}</div>
  <div style="font-size:13px;color:#5f6368;margin-bottom:20px;">TasteLanc</div>

  <p style="font-size:15px;line-height:1.6;margin:0 0 14px 0;">${greeting}</p>

  <p style="font-size:15px;line-height:1.6;margin:0 0 16px 0;">
    Quick note to confirm your reservation for tonight. See you at 6.
  </p>

  <table cellpadding="0" cellspacing="0" border="0" style="width:100%;border-top:1px solid #e8eaed;border-bottom:1px solid #e8eaed;margin:16px 0;">
    <tr><td style="padding:10px 0;font-size:14px;color:#5f6368;width:90px;">When</td><td style="padding:10px 0;font-size:14px;color:#202124;">Monday, 6:00 – 9:30 PM</td></tr>
    <tr><td style="padding:10px 0;font-size:14px;color:#5f6368;border-top:1px solid #f1f3f4;">Where</td><td style="padding:10px 0;font-size:14px;color:#202124;border-top:1px solid #f1f3f4;">Hempfield Apothetique<br>100 West Walnut St, Lancaster PA 17603</td></tr>
    <tr><td style="padding:10px 0;font-size:14px;color:#5f6368;border-top:1px solid #f1f3f4;">Guest</td><td style="padding:10px 0;font-size:14px;color:#202124;border-top:1px solid #f1f3f4;">${name || email}</td></tr>
  </table>

  <p style="font-size:14px;line-height:1.6;margin:14px 0;">
    Your ticket is in the TasteLanc app.
  </p>

  <p style="font-size:14px;line-height:1.6;margin:14px 0 6px 0;">Thanks,</p>
  <p style="font-size:14px;line-height:1.6;margin:0 0 6px 0;">Leander</p>

  <hr style="border:none;border-top:1px solid #e8eaed;margin:20px 0 14px 0;">

  <p style="font-size:12px;color:#80868b;line-height:1.5;margin:0 0 4px 0;">
    Reservation ${ref} · ${email} · <a href="${UNSUBSCRIBE_URL}" style="color:#80868b;">Unsubscribe</a>
  </p>

</div>
</body>
</html>`;
}

function renderText(name: string | null, ref: string, email: string): string {
  const greeting = name ? `Hi ${name},` : 'Hi,';
  return `Reservation ${ref}
TasteLanc

${greeting}

Quick note to confirm your reservation for tonight. See you at 6.

When:  Monday, 6:00 – 9:30 PM
Where: Hempfield Apothetique
       100 West Walnut St, Lancaster PA 17603
Guest: ${name || email}

Your ticket is in the TasteLanc app.

Thanks,
Leander

--
Reservation ${ref} · ${email}
Unsubscribe: ${UNSUBSCRIBE_URL}`;
}

// Idempotency guard: use the `day_of_email_sent_at` column on party_rsvps if you
// ever want to retry safely.  For today we just refuse to fire on any date other
// than the event date.
const EVENT_DATE = '2026-04-20';

export default async (_req: Request, _context: Context) => {
  const today = new Date().toISOString().slice(0, 10);
  if (today !== EVENT_DATE) {
    console.log(`[day-of] skip: today=${today} is not event date ${EVENT_DATE}`);
    return new Response('skipped: not event date', { status: 200 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const resendKey = process.env.RESEND_API_KEY!;
  if (!supabaseUrl || !serviceKey || !resendKey) {
    console.error('[day-of] missing env vars');
    return new Response('missing env', { status: 500 });
  }

  const supabase = createClient(supabaseUrl, serviceKey);
  const resend = new Resend(resendKey);

  const { data: rsvps, error } = await supabase
    .from('party_rsvps')
    .select('email, name, created_at')
    .eq('response', 'yes')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[day-of] query error', error);
    return new Response(`db error: ${error.message}`, { status: 500 });
  }

  // Dedupe by name (fallback to email)
  const byKey = new Map<string, typeof rsvps[number]>();
  for (const r of rsvps) {
    if (!r.email) continue;
    const name = (r.name || '').trim().toLowerCase();
    const key = name || r.email.toLowerCase();
    if (!byKey.has(key)) byKey.set(key, r);
  }

  const recipients = Array.from(byKey.values());
  console.log(`[day-of] sending to ${recipients.length} unique attendees`);

  let sent = 0, failed = 0;
  for (const r of recipients) {
    const ref = reservationRef(r.email);
    const name = firstName(r.name);
    try {
      const res = await resend.emails.send({
        from: FROM,
        to: r.email,
        subject: SUBJECT,
        html: renderHTML(name, ref, r.email),
        text: renderText(name, ref, r.email),
        replyTo: REPLY_TO,
        headers: { 'X-Entity-Ref-ID': ref },
        tags: [
          { name: 'campaign', value: 'industry-social-2026-04-20-day-of' },
          { name: 'audience', value: 'rsvpd-yes' },
        ],
      });
      if (res.error) {
        console.log(`[day-of] FAIL ${r.email}: ${JSON.stringify(res.error)}`);
        failed++;
      } else {
        sent++;
      }
    } catch (e: any) {
      console.log(`[day-of] FAIL ${r.email}: ${e.message}`);
      failed++;
    }
    await new Promise(r => setTimeout(r, 550));
  }

  const summary = `sent=${sent} failed=${failed} total=${recipients.length}`;
  console.log(`[day-of] DONE ${summary}`);
  return new Response(summary, { status: 200 });
};

// 4:00 PM ET (EDT) = 20:00 UTC
export const config: Config = {
  schedule: '0 20 20 4 *',
};
