#!/usr/bin/env node
/**
 * Send Industry Social DAY-OF confirmation email to everyone who RSVPd yes.
 * Dedupes by lowercase(name) — picks the most recently-used email per person.
 *
 * Usage:
 *   node scripts/send-industry-social-day-of.mjs --dry-run
 *   node scripts/send-industry-social-day-of.mjs --test=<email>
 *   node scripts/send-industry-social-day-of.mjs --live
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
const SUBJECT = 'Confirming your reservation — tonight at 6';
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

function firstName(fullName) {
  const t = (fullName || '').trim();
  if (!t) return null;
  const f = t.split(/\s+/)[0];
  if (f.length >= 2 && /^[a-zA-Z]+$/.test(f)) {
    return f.charAt(0).toUpperCase() + f.slice(1).toLowerCase();
  }
  return null;
}

function reservationRef(email) {
  const hash = crypto.createHash('sha1').update(email.toLowerCase()).digest('hex').slice(0, 6).toUpperCase();
  return `TL-${hash}`;
}

function renderHTML(name, ref, email, qrToken) {
  const greeting = name ? `Hi ${name},` : 'Hi,';
  const ticketLine = `Your ticket is in the TasteLanc app.`;

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
    ${ticketLine}
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

function renderText(name, ref, email, qrToken) {
  const greeting = name ? `Hi ${name},` : 'Hi,';
  const ticketLine = `Your ticket is in the TasteLanc app.`;
  return `Reservation ${ref}
TasteLanc

${greeting}

Quick note to confirm your reservation for tonight. See you at 6.

When:  Monday, 6:00 – 9:30 PM
Where: Hempfield Apothetique
       100 West Walnut St, Lancaster PA 17603
Guest: ${name || email}

${ticketLine}

Thanks,
Leander

--
Reservation ${ref} · ${email}
Unsubscribe: ${UNSUBSCRIBE_URL}`;
}

async function getDedupedRecipients() {
  const { data: rsvps, error } = await supabase
    .from('party_rsvps')
    .select('email, name, qr_token, created_at')
    .eq('response', 'yes')
    .order('created_at', { ascending: false }); // newest first
  if (error) throw error;

  // Dedupe by lowercase trimmed name; keep the newest row per name.
  // For rows without a usable name, dedupe by email instead.
  const byKey = new Map();
  for (const r of rsvps) {
    if (!r.email) continue; // can't email without address
    const name = (r.name || '').trim().toLowerCase();
    const key = name || r.email.toLowerCase();
    if (!byKey.has(key)) byKey.set(key, r);
  }
  return Array.from(byKey.values());
}

async function sendOne(email, name, qrToken) {
  const ref = reservationRef(email);
  return resend.emails.send({
    from: FROM,
    to: email,
    subject: SUBJECT,
    html: renderHTML(name, ref, email, qrToken),
    text: renderText(name, ref, email, qrToken),
    replyTo: REPLY_TO,
    headers: { 'X-Entity-Ref-ID': ref },
    tags: [
      { name: 'campaign', value: 'industry-social-2026-04-20-day-of' },
      { name: 'audience', value: 'rsvpd-yes' },
    ],
  });
}

async function main() {
  console.log('Loading RSVPd=yes recipients (deduped by name)...');
  const recipients = await getDedupedRecipients();
  console.log(`  ${recipients.length} unique attendees`);

  if (dryRun) {
    console.log('\n--- DRY RUN ---');
    console.log(`Subject: ${SUBJECT}`);
    console.log('\nRecipients:');
    for (const r of recipients) {
      const fn = firstName(r.name);
      console.log(`  ${r.email.padEnd(40)} → ${fn || '(no first name)'} ${r.qr_token ? ' [has ticket]' : ''}`);
    }
    return;
  }

  if (testArg) {
    const testEmail = testArg.split('=')[1];
    const match = recipients.find(r => r.email.toLowerCase() === testEmail.toLowerCase()) || { email: testEmail, name: '', qr_token: null };
    console.log(`Test-sending to ${testEmail}`);
    const res = await sendOne(testEmail, firstName(match.name), match.qr_token);
    console.log('Result:', JSON.stringify(res, null, 2));
    return;
  }

  if (live) {
    console.log(`\n🚀 LIVE SEND: ${recipients.length} attendees`);
    let sent = 0, failed = 0;
    for (const r of recipients) {
      try {
        const res = await sendOne(r.email, firstName(r.name), r.qr_token);
        if (res.error) { console.log(`  ✗ ${r.email}: ${JSON.stringify(res.error)}`); failed++; }
        else { sent++; }
      } catch (e) {
        console.log(`  ✗ ${r.email}: ${e.message}`);
        failed++;
      }
      await new Promise(r => setTimeout(r, 550));
    }
    console.log(`\nDone. Sent: ${sent}, Failed: ${failed}, Total: ${recipients.length}`);
  }
}

main().catch(err => { console.error(err); process.exit(1); });
