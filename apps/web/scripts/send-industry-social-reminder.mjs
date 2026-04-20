#!/usr/bin/env node
/**
 * Send Industry Social DAY-OF reminder email.
 * Excludes anyone who already RSVPd (yes OR no).
 *
 * Usage:
 *   node scripts/send-industry-social-reminder.mjs --test=<email>
 *   node scripts/send-industry-social-reminder.mjs --dry-run
 *   node scripts/send-industry-social-reminder.mjs --live
 */
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import crypto from 'crypto';
import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, '../.env.local') });

const SUPABASE_URL = 'https://kufcxxynjvyharhtfptd.supabase.co';
const FROM = 'TasteLanc <invites@tastelanc.com>';
const REPLY_TO = 'invites@tastelanc.com';
const SUBJECT = "Tonight at 6 — we're still saving you a spot";
const RSVP_URL = 'https://tastelanc.com/party/rsvp';
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

function firstName(meta) {
  const full = (meta?.full_name || meta?.name || meta?.display_name || '').trim();
  if (full) {
    const f = full.split(/\s+/)[0];
    if (f.length >= 2 && /^[a-zA-Z]+$/.test(f) && !/\d/.test(f)) {
      return f.charAt(0).toUpperCase() + f.slice(1).toLowerCase();
    }
  }
  return null;
}

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
<title>Your spot — tonight at 6</title>
</head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;color:#202124;background:#ffffff;">
<div style="display:none;max-height:0;overflow:hidden;">Tonight at 6 PM — we're still saving you a spot at The Lounge at Hempfield Apothetique.</div>

<div style="max-width:560px;margin:0 auto;padding:32px 24px;">

  <div style="font-size:13px;color:#5f6368;margin-bottom:4px;">Reservation ${ref}</div>
  <div style="font-size:13px;color:#5f6368;margin-bottom:24px;">TasteLanc</div>

  <p style="font-size:15px;line-height:1.6;margin:0 0 14px 0;">${greeting}</p>

  <p style="font-size:15px;line-height:1.6;margin:0 0 20px 0;">
    Quick follow-up — we haven't heard back on your spot for tonight. We're still saving one for you. If you can make it, just tap below to confirm.
  </p>

  <table cellpadding="0" cellspacing="0" border="0" style="width:100%;border-top:1px solid #e8eaed;border-bottom:1px solid #e8eaed;margin:20px 0;">
    <tr><td style="padding:12px 0;font-size:14px;color:#5f6368;width:110px;">Event</td><td style="padding:12px 0;font-size:14px;color:#202124;">TasteLanc Industry Social</td></tr>
    <tr><td style="padding:12px 0;font-size:14px;color:#5f6368;border-top:1px solid #f1f3f4;">When</td><td style="padding:12px 0;font-size:14px;color:#202124;border-top:1px solid #f1f3f4;"><strong>Tonight, 6:00 – 9:30 PM</strong></td></tr>
    <tr><td style="padding:12px 0;font-size:14px;color:#5f6368;border-top:1px solid #f1f3f4;">Venue</td><td style="padding:12px 0;font-size:14px;color:#202124;border-top:1px solid #f1f3f4;">The Lounge at Hempfield Apothetique</td></tr>
    <tr><td style="padding:12px 0;font-size:14px;color:#5f6368;border-top:1px solid #f1f3f4;">Address</td><td style="padding:12px 0;font-size:14px;color:#202124;border-top:1px solid #f1f3f4;">100 West Walnut Street, Lancaster, PA 17603</td></tr>
    <tr><td style="padding:12px 0;font-size:14px;color:#5f6368;border-top:1px solid #f1f3f4;">Included</td><td style="padding:12px 0;font-size:14px;color:#202124;border-top:1px solid #f1f3f4;">First drink, food, music by DJ Eddy Mena</td></tr>
    <tr><td style="padding:12px 0;font-size:14px;color:#5f6368;border-top:1px solid #f1f3f4;">Status</td><td style="padding:12px 0;font-size:14px;color:#d93025;border-top:1px solid #f1f3f4;">Awaiting your confirmation</td></tr>
  </table>

  <p style="font-size:15px;line-height:1.6;margin:0 0 18px 0;">
    <a href="${RSVP_URL}" style="display:inline-block;background:#E63946;color:#ffffff;padding:11px 22px;border-radius:4px;text-decoration:none;font-weight:500;font-size:14px;">Confirm my spot</a>
  </p>

  <p style="font-size:14px;line-height:1.6;color:#5f6368;margin:0 0 14px 0;">
    Can't make it? <a href="${RSVP_URL}" style="color:#E63946;text-decoration:none;">Let us know here</a> and we'll release your spot.
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

Quick follow-up — we haven't heard back on your spot for tonight. We're still saving one for you. If you can make it, just tap below to confirm.

--------------------------------------
Event    TasteLanc Industry Social
When     Tonight, 6:00 – 9:30 PM
Venue    The Lounge at Hempfield Apothetique
Address  100 West Walnut Street, Lancaster, PA 17603
Included First drink, food, music by DJ Eddy Mena
Status   Awaiting your confirmation
--------------------------------------

Confirm your spot: ${RSVP_URL}

Can't make it? Let us know here and we'll release your spot: ${RSVP_URL}

— The TasteLanc team

--------------------------------------
Reservation ${ref} · ${email}
The Lounge at Hempfield Apothetique is Pennsylvania's first legal cannabis consumption lounge. 21+.
Unsubscribe: ${UNSUBSCRIBE_URL}`;
}

async function getRsvpExclusions() {
  // Exclude everyone who has ANY party_rsvps row (yes or no).
  const { data: rsvps, error } = await supabase
    .from('party_rsvps')
    .select('user_id, email');
  if (error) throw error;

  const excludedUserIds = new Set();
  const excludedEmails = new Set();
  for (const r of rsvps) {
    if (r.user_id) excludedUserIds.add(r.user_id);
    if (r.email) excludedEmails.add(r.email.toLowerCase());
  }
  return { excludedUserIds, excludedEmails };
}

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
  return all.filter(u => u.email_confirmed_at && u.email);
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
    headers: { 'X-Entity-Ref-ID': ref },
    tags: [
      { name: 'campaign', value: 'industry-social-2026-04-20-reminder' },
      { name: 'audience', value: 'non-rsvpd' },
    ],
  });
}

async function main() {
  console.log('Loading RSVP exclusions...');
  const { excludedUserIds, excludedEmails } = await getRsvpExclusions();
  console.log(`  ${excludedUserIds.size} user_ids + ${excludedEmails.size} emails already RSVPd (any response)`);

  console.log('Loading auth users...');
  const users = await getRecipients();
  console.log(`  ${users.length} verified users`);

  // Exclude
  const eligible = [];
  let skippedUserId = 0, skippedEmail = 0;
  for (const u of users) {
    if (excludedUserIds.has(u.id)) { skippedUserId++; continue; }
    if (excludedEmails.has(u.email.toLowerCase())) { skippedEmail++; continue; }
    eligible.push(u);
  }

  // Dedup by email
  const seen = new Set();
  const unique = [];
  for (const u of eligible) {
    const e = u.email.toLowerCase();
    if (seen.has(e)) continue;
    seen.add(e);
    unique.push(u);
  }

  console.log(`\nExclusions:`);
  console.log(`  skipped by user_id match:  ${skippedUserId}`);
  console.log(`  skipped by email match:    ${skippedEmail}`);
  console.log(`Eligible recipients:         ${unique.length}`);

  if (dryRun) {
    console.log('\n--- DRY RUN ---');
    console.log(`Subject: ${SUBJECT}`);
    console.log('Sample recipients (first 10):');
    for (const u of unique.slice(0, 10)) {
      console.log(`  ${u.email.padEnd(40)} → ${firstName(u.user_metadata) || '(no name)'} / ${reservationRef(u.email)}`);
    }
    return;
  }

  if (testArg) {
    const testEmail = testArg.split('=')[1];
    const match = unique.find(u => u.email.toLowerCase() === testEmail.toLowerCase())
                || users.find(u => u.email.toLowerCase() === testEmail.toLowerCase())
                || { email: testEmail, user_metadata: {} };
    const name = firstName(match.user_metadata);
    console.log(`Test-sending to ${testEmail} / ref ${reservationRef(testEmail)}`);
    const res = await sendOne(testEmail, name);
    console.log('Result:', JSON.stringify(res, null, 2));
    return;
  }

  if (live) {
    console.log(`\n🚀 LIVE SEND: ${unique.length} recipients`);
    let sent = 0, failed = 0;
    for (const u of unique) {
      const name = firstName(u.user_metadata);
      try {
        const res = await sendOne(u.email, name);
        if (res.error) { console.log(`  ✗ ${u.email}: ${JSON.stringify(res.error)}`); failed++; }
        else { sent++; if (sent % 25 === 0) console.log(`  ... ${sent}/${unique.length}`); }
      } catch (e) {
        console.log(`  ✗ ${u.email}: ${e.message}`);
        failed++;
      }
      await new Promise(r => setTimeout(r, 550));
    }
    console.log(`\nDone. Sent: ${sent}, Failed: ${failed}, Total: ${unique.length}`);
  }
}

main().catch(err => { console.error(err); process.exit(1); });
