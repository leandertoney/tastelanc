#!/usr/bin/env node
/**
 * Send TasteLanc Industry Social invite email.
 * Receipt-style format optimized for Gmail Primary tab.
 *
 * Usage:
 *   node scripts/send-party-invite.mjs --test=<email>
 *   node scripts/send-party-invite.mjs --dry-run
 *   node scripts/send-party-invite.mjs --live
 */
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import crypto from 'crypto';

const SUPABASE_URL = 'https://kufcxxynjvyharhtfptd.supabase.co';
const FROM = 'TasteLanc <invites@tastelanc.com>';
const REPLY_TO = 'invites@tastelanc.com';
const SUBJECT = "Your reservation for Monday night";
const RSVP_URL = 'https://tastelanc.com/party/rsvp';
const LOGO_URL = 'https://tastelanc.com/images/tastelanc_new_dark.png';
const UNSUBSCRIBE_URL = 'https://tastelanc.com/unsubscribe';

const args = process.argv.slice(2);
const testArg = args.find(a => a.startsWith('--test='));
const dryRun = args.includes('--dry-run');
const live = args.includes('--live');

if (!testArg && !dryRun && !live) {
  console.error('Specify --test=<email>, --dry-run, or --live');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const resend = new Resend(process.env.RESEND_API_KEY);

function firstName(meta, email) {
  const full = (meta?.full_name || meta?.name || meta?.display_name || '').trim();
  if (full) {
    const f = full.split(/\s+/)[0];
    if (f.length >= 2 && /^[a-zA-Z]+$/.test(f) && !/\d/.test(f)) {
      return f.charAt(0).toUpperCase() + f.slice(1).toLowerCase();
    }
  }
  return null;
}

// Per-recipient reservation reference — feels transactional, deterministic
function reservationRef(email) {
  const hash = crypto.createHash('sha1').update(email.toLowerCase()).digest('hex').slice(0, 6).toUpperCase();
  return `TL-${hash}`;
}

function renderHTML(name, ref, email) {
  const greeting = name ? `Hi ${name},` : 'Hi there,';

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Your reservation</title>
</head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;color:#202124;background:#ffffff;">
<div style="display:none;max-height:0;overflow:hidden;">Confirm your spot for Monday, April 20 at The Lounge at Hempfield Apothetique.</div>

<div style="max-width:560px;margin:0 auto;padding:32px 24px;">

  <div style="font-size:13px;color:#5f6368;margin-bottom:4px;">Reservation ${ref}</div>
  <div style="font-size:13px;color:#5f6368;margin-bottom:24px;">TasteLanc</div>

  <p style="font-size:15px;line-height:1.6;margin:0 0 14px 0;">${greeting}</p>

  <p style="font-size:15px;line-height:1.6;margin:0 0 20px 0;">
    We're closing out Restaurant Week on Monday night and we've reserved a spot for you — our way of saying thanks for being part of TasteLanc. First drink is on us. Confirm your seat below.
  </p>

  <table cellpadding="0" cellspacing="0" border="0" style="width:100%;border-top:1px solid #e8eaed;border-bottom:1px solid #e8eaed;margin:20px 0;">
    <tr><td style="padding:12px 0;font-size:14px;color:#5f6368;width:110px;">Event</td><td style="padding:12px 0;font-size:14px;color:#202124;">TasteLanc Industry Social</td></tr>
    <tr><td style="padding:12px 0;font-size:14px;color:#5f6368;border-top:1px solid #f1f3f4;">Date</td><td style="padding:12px 0;font-size:14px;color:#202124;border-top:1px solid #f1f3f4;">Monday, April 20, 2026</td></tr>
    <tr><td style="padding:12px 0;font-size:14px;color:#5f6368;border-top:1px solid #f1f3f4;">Time</td><td style="padding:12px 0;font-size:14px;color:#202124;border-top:1px solid #f1f3f4;">6:00 – 9:30 PM</td></tr>
    <tr><td style="padding:12px 0;font-size:14px;color:#5f6368;border-top:1px solid #f1f3f4;">Venue</td><td style="padding:12px 0;font-size:14px;color:#202124;border-top:1px solid #f1f3f4;">The Lounge at Hempfield Apothetique</td></tr>
    <tr><td style="padding:12px 0;font-size:14px;color:#5f6368;border-top:1px solid #f1f3f4;">Address</td><td style="padding:12px 0;font-size:14px;color:#202124;border-top:1px solid #f1f3f4;">100 West Walnut Street, Lancaster, PA 17603</td></tr>
    <tr><td style="padding:12px 0;font-size:14px;color:#5f6368;border-top:1px solid #f1f3f4;">Music</td><td style="padding:12px 0;font-size:14px;color:#202124;border-top:1px solid #f1f3f4;">DJ Eddy Mena</td></tr>
    <tr><td style="padding:12px 0;font-size:14px;color:#5f6368;border-top:1px solid #f1f3f4;">Included</td><td style="padding:12px 0;font-size:14px;color:#202124;border-top:1px solid #f1f3f4;">First drink, food</td></tr>
    <tr><td style="padding:12px 0;font-size:14px;color:#5f6368;border-top:1px solid #f1f3f4;">Cost</td><td style="padding:12px 0;font-size:14px;color:#202124;border-top:1px solid #f1f3f4;">No charge · 21+</td></tr>
    <tr><td style="padding:12px 0;font-size:14px;color:#5f6368;border-top:1px solid #f1f3f4;">Status</td><td style="padding:12px 0;font-size:14px;color:#d93025;border-top:1px solid #f1f3f4;">Awaiting your confirmation</td></tr>
  </table>

  <p style="font-size:15px;line-height:1.6;margin:0 0 18px 0;">
    <a href="${RSVP_URL}" style="display:inline-block;background:#E63946;color:#ffffff;padding:11px 22px;border-radius:4px;text-decoration:none;font-weight:500;font-size:14px;">Confirm my spot</a>
  </p>

  <p style="font-size:14px;line-height:1.6;color:#5f6368;margin:0 0 14px 0;">
    Seats are limited and held on a first-come basis. If you can't make it, <a href="${RSVP_URL}" style="color:#E63946;text-decoration:none;">let us know here</a> and we'll release your spot.
  </p>

  <p style="font-size:14px;line-height:1.6;color:#5f6368;margin:0 0 14px 0;">
    At the door we'll check your confirmation and that you have the TasteLanc app installed. That's it.
  </p>

  <p style="font-size:14px;line-height:1.6;margin:24px 0 6px 0;">— The TasteLanc team</p>

  <hr style="border:none;border-top:1px solid #e8eaed;margin:24px 0 16px 0;">

  <p style="font-size:12px;color:#80868b;line-height:1.5;margin:0 0 6px 0;">
    Reservation ${ref} · ${email}
  </p>
  <p style="font-size:12px;color:#80868b;line-height:1.5;margin:0 0 6px 0;">
    The Lounge at Hempfield Apothetique is Pennsylvania's first legal cannabis consumption lounge. 21+.
  </p>
  <p style="font-size:12px;color:#80868b;line-height:1.5;margin:0;">
    <a href="${UNSUBSCRIBE_URL}" style="color:#80868b;">Unsubscribe</a>
  </p>

</div>
</body>
</html>`;
}

function renderText(name, ref, email) {
  const greeting = name ? `Hi ${name},` : 'Hi there,';
  return `Reservation ${ref}
TasteLanc

${greeting}

We're closing out Restaurant Week on Monday night and we've reserved a spot for you — our way of saying thanks for being part of TasteLanc. First drink is on us. Confirm your seat below.

--------------------------------------
Event    TasteLanc Industry Social
Date     Monday, April 20, 2026
Time     6:00 – 9:30 PM
Venue    The Lounge at Hempfield Apothetique
Address  100 West Walnut Street, Lancaster, PA 17603
Music    DJ Eddy Mena
Included First drink, food
Cost     No charge · 21+
Status   Awaiting your confirmation
--------------------------------------

Confirm your spot: ${RSVP_URL}

Seats are limited and held on a first-come basis. If you can't make it, let us know here and we'll release your spot: ${RSVP_URL}

At the door we'll check your confirmation and that you have the TasteLanc app installed. That's it.

— The TasteLanc team

--------------------------------------
Reservation ${ref} · ${email}
The Lounge at Hempfield Apothetique is Pennsylvania's first legal cannabis consumption lounge. 21+.
Unsubscribe: ${UNSUBSCRIBE_URL}`;
}

// Additional addresses outside auth.users to include in every send
const EXTRA_RECIPIENTS = [
  { email: 'tashina@centralpatalent.com', user_metadata: { full_name: 'Tashina' } },
];

async function getRecipients() {
  const all = [];
  let page = 1;
  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    all.push(...data.users);
    if (data.users.length < 1000) break;
    page++;
  }
  const verified = all.filter(u => u.email_confirmed_at && u.email);
  const combined = [...verified, ...EXTRA_RECIPIENTS];
  const seen = new Set();
  const unique = [];
  for (const u of combined) {
    const e = u.email.toLowerCase();
    if (seen.has(e)) continue;
    seen.add(e);
    unique.push(u);
  }
  return unique;
}

async function sendOne(email, name) {
  const ref = reservationRef(email);
  const html = renderHTML(name, ref, email);
  const text = renderText(name, ref, email);
  return resend.emails.send({
    from: FROM,
    to: email,
    subject: SUBJECT,
    html,
    text,
    replyTo: REPLY_TO,
    headers: {
      'X-Entity-Ref-ID': ref,
    },
    tags: [
      { name: 'campaign', value: 'industry-social-2026-04-20' },
      { name: 'audience', value: 'verified-email' },
    ],
  });
}

async function main() {
  const recipients = await getRecipients();
  console.log(`Total verified recipients: ${recipients.length}`);

  if (dryRun) {
    console.log('--- DRY RUN ---');
    for (const u of recipients) console.log(`  ${u.email} → ${firstName(u.user_metadata, u.email) || '(no name)'} / ${reservationRef(u.email)}`);
    return;
  }

  if (testArg) {
    const testEmail = testArg.split('=')[1];
    const match = recipients.find(u => u.email.toLowerCase() === testEmail.toLowerCase());
    const name = match ? firstName(match.user_metadata, match.email) : null;
    console.log(`Test-sending to ${testEmail} / ref ${reservationRef(testEmail)} / greeting "${name ? 'Hi ' + name : 'Hi there'}"`);
    const res = await sendOne(testEmail, name);
    console.log('Result:', JSON.stringify(res, null, 2));
    return;
  }

  if (live) {
    console.log(`🚀 LIVE SEND: ${recipients.length} recipients`);
    let sent = 0, failed = 0;
    for (const u of recipients) {
      const name = firstName(u.user_metadata, u.email);
      try {
        const res = await sendOne(u.email, name);
        if (res.error) { console.log(`  ✗ ${u.email}: ${JSON.stringify(res.error)}`); failed++; }
        else { sent++; if (sent % 25 === 0) console.log(`  ... ${sent}/${recipients.length}`); }
      } catch (e) {
        console.log(`  ✗ ${u.email}: ${e.message}`);
        failed++;
      }
      await new Promise(r => setTimeout(r, 550));
    }
    console.log(`\nDone. Sent: ${sent}, Failed: ${failed}, Total: ${recipients.length}`);
  }
}

main().catch(err => { console.error(err); process.exit(1); });
