#!/usr/bin/env node
/**
 * One-time apology email for the duplicate day-of send at 20:03 UTC.
 * Recipient list = everyone who received >1 copy of the day-of confirmation.
 * Pulled from Resend API directly (not from DB) to be safe.
 *
 * Usage:
 *   node scripts/send-apology-oops.mjs --dry-run
 *   node scripts/send-apology-oops.mjs --test=<email>
 *   node scripts/send-apology-oops.mjs --live
 */
import { Resend } from 'resend';
import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, '../.env.local') });

const FROM = 'TasteLanc <invites@tastelanc.com>';
const REPLY_TO = 'invites@tastelanc.com';
const SUBJECT = 'Okay we sent that a few extra times…';
const UNSUBSCRIBE_URL = 'https://tastelanc.com/unsubscribe';

const args = process.argv.slice(2);
const testArg = args.find(a => a.startsWith('--test='));
const dryRun = args.includes('--dry-run');
const live = args.includes('--live');

if (!testArg && !dryRun && !live) {
  console.error('Specify --test=<email>, --dry-run, or --live');
  process.exit(1);
}

const resend = new Resend(process.env.RESEND_API_KEY);

function renderHTML() {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Okay we sent that a few extra times</title>
</head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;color:#202124;background:#ffffff;">

<div style="max-width:560px;margin:0 auto;padding:24px;">

  <p style="font-size:15px;line-height:1.6;margin:0 0 14px 0;">Hi,</p>

  <p style="font-size:15px;line-height:1.6;margin:0 0 14px 0;">
    Turns out our inbox got a little more excited about tonight than we did — and sent that confirmation a few extra times.
  </p>

  <p style="font-size:15px;line-height:1.6;margin:0 0 14px 0;">
    Apologies for the clutter. Your reservation is (very much) confirmed. See you at 6.
  </p>

  <p style="font-size:14px;line-height:1.6;margin:18px 0 6px 0;">Thanks,</p>
  <p style="font-size:14px;line-height:1.6;margin:0 0 6px 0;">The TasteLanc team</p>

  <hr style="border:none;border-top:1px solid #e8eaed;margin:20px 0 14px 0;">

  <p style="font-size:12px;color:#80868b;line-height:1.5;margin:0;">
    <a href="${UNSUBSCRIBE_URL}" style="color:#80868b;">Unsubscribe</a>
  </p>

</div>
</body>
</html>`;
}

function renderText() {
  return `Hi,

Turns out our inbox got a little more excited about tonight than we did — and sent that confirmation a few extra times.

Apologies for the clutter. Your reservation is (very much) confirmed. See you at 6.

Thanks,
The TasteLanc team

--
Unsubscribe: ${UNSUBSCRIBE_URL}`;
}

async function fetchDuplicateRecipients() {
  // Pull last 100 emails from Resend; find addresses that got the day-of send more than once.
  const res = await fetch('https://api.resend.com/emails?limit=100', {
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}` },
  });
  const body = await res.json();
  const counts = new Map();
  for (const e of body.data || []) {
    const subj = e.subject || '';
    if (!subj.startsWith('Confirming your reservation')) continue;
    const to = Array.isArray(e.to) ? e.to[0] : e.to;
    if (!to) continue;
    counts.set(to.toLowerCase(), (counts.get(to.toLowerCase()) || 0) + 1);
  }
  // Everyone who got >=2 copies
  const dup = [...counts.entries()].filter(([_, n]) => n >= 2).map(([e]) => e);
  return dup.sort();
}

async function sendOne(email) {
  return resend.emails.send({
    from: FROM,
    to: email,
    subject: SUBJECT,
    html: renderHTML(),
    text: renderText(),
    replyTo: REPLY_TO,
    tags: [
      { name: 'campaign', value: 'industry-social-2026-04-20-apology' },
    ],
  });
}

async function main() {
  console.log('Loading duplicate recipients from Resend logs...');
  const recipients = await fetchDuplicateRecipients();
  console.log(`  ${recipients.length} recipients got the confirmation more than once`);

  if (dryRun) {
    console.log('\n--- DRY RUN ---');
    console.log(`Subject: ${SUBJECT}`);
    console.log('\nRecipients:');
    for (const r of recipients) console.log(`  ${r}`);
    return;
  }

  if (testArg) {
    const testEmail = testArg.split('=')[1];
    console.log(`Test-sending to ${testEmail}`);
    const res = await sendOne(testEmail);
    console.log('Result:', JSON.stringify(res, null, 2));
    return;
  }

  if (live) {
    console.log(`\n🚀 LIVE SEND: ${recipients.length} apologies`);
    let sent = 0, failed = 0;
    for (const email of recipients) {
      try {
        const res = await sendOne(email);
        if (res.error) { console.log(`  ✗ ${email}: ${JSON.stringify(res.error)}`); failed++; }
        else { sent++; }
      } catch (e) {
        console.log(`  ✗ ${email}: ${e.message}`);
        failed++;
      }
      await new Promise(r => setTimeout(r, 550));
    }
    console.log(`\nDone. Sent: ${sent}, Failed: ${failed}, Total: ${recipients.length}`);
  }
}

main().catch(err => { console.error(err); process.exit(1); });
