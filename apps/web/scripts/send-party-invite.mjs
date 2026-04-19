#!/usr/bin/env node
/**
 * Send TasteLanc Industry Social invite email.
 *
 * Usage:
 *   # Test send to one address:
 *   RESEND_API_KEY=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/send-party-invite.mjs --test=leandertoney@gmail.com
 *
 *   # Dry run (list recipients, no send):
 *   ... node scripts/send-party-invite.mjs --dry-run
 *
 *   # Full send to all verified emails:
 *   ... node scripts/send-party-invite.mjs --live
 */
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

const SUPABASE_URL = 'https://kufcxxynjvyharhtfptd.supabase.co';
const FROM = 'TasteLanc team <invites@tastelanc.com>';
const REPLY_TO = 'invites@tastelanc.com';
const SUBJECT = "You're invited. First drink on us.";
const RSVP_URL = 'https://tastelanc.com/party';

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
  if (full) return full.split(/\s+/)[0];
  const handle = (email || '').split('@')[0];
  if (!handle) return 'there';
  // Strip numbers and punctuation from handle
  const guess = handle.split(/[._\-0-9]+/)[0];
  if (guess.length >= 2 && /^[a-zA-Z]+$/.test(guess)) {
    return guess.charAt(0).toUpperCase() + guess.slice(1).toLowerCase();
  }
  return 'there';
}

function renderHTML(name) {
  const safeName = name.replace(/[<>&"]/g, '');
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>You're invited. First drink on us.</title>
</head>
<body style="margin:0;padding:0;background:#1C0800;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="display:none;max-height:0;overflow:hidden;">Monday night in Lancaster — a relaxed wrap to Restaurant Week.</div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#1C0800;padding:40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;background:linear-gradient(160deg,#8B2F1A 0%,#1C0800 45%,#1C0800 100%);border-radius:24px;padding:48px 36px;border:1px solid rgba(240,208,96,0.15);">

          <tr>
            <td align="center" style="padding-bottom:6px;">
              <div style="font-size:11px;font-weight:700;letter-spacing:4px;color:#F0D060;">TASTELANC</div>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding-bottom:28px;">
              <div style="font-size:9px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:rgba(240,208,96,0.65);">POST-RESTAURANT WEEK · INVITATION</div>
            </td>
          </tr>

          <tr>
            <td align="center" style="padding-bottom:8px;">
              <h1 style="margin:0;font-size:32px;font-weight:900;color:#F0D060;line-height:1.1;letter-spacing:-0.5px;">You're invited.</h1>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding-bottom:28px;">
              <p style="margin:0;font-size:18px;color:rgba(240,208,96,0.75);font-weight:500;">First drink on us.</p>
            </td>
          </tr>

          <tr>
            <td style="padding-bottom:20px;">
              <p style="margin:0;font-size:15px;color:rgba(240,208,96,0.85);line-height:1.6;">
                Hey ${safeName},
              </p>
            </td>
          </tr>

          <tr>
            <td style="padding-bottom:20px;">
              <p style="margin:0;font-size:15px;color:rgba(240,208,96,0.85);line-height:1.6;">
                You're on TasteLanc, so you're on the list. We're hosting a night to close out Restaurant Week, and we'd love to see you there.
              </p>
            </td>
          </tr>

          <tr>
            <td style="padding-bottom:24px;">
              <div style="background:rgba(255,255,255,0.04);border:1px solid rgba(240,208,96,0.15);border-radius:14px;padding:20px 22px;">
                <div style="font-size:20px;font-weight:800;color:#F0D060;margin-bottom:6px;">TasteLanc Industry Social</div>
                <p style="margin:0;font-size:14px;color:rgba(240,208,96,0.7);line-height:1.5;">A relaxed evening with Lancaster's restaurant crews, TasteLanc users, and the people making this city's food scene what it is.</p>
              </div>
            </td>
          </tr>

          <tr>
            <td style="padding-bottom:20px;">
              <div style="font-size:11px;font-weight:700;letter-spacing:1.5px;color:#F0D060;text-transform:uppercase;margin-bottom:8px;">When</div>
              <p style="margin:0;font-size:15px;color:rgba(240,208,96,0.85);line-height:1.5;">
                Monday, April 20, 2026<br>
                6:00 PM – 9:30 PM
                <span style="color:rgba(240,208,96,0.5);">(come and go as you like)</span>
              </p>
            </td>
          </tr>

          <tr>
            <td style="padding-bottom:20px;">
              <div style="font-size:11px;font-weight:700;letter-spacing:1.5px;color:#F0D060;text-transform:uppercase;margin-bottom:8px;">Where</div>
              <p style="margin:0;font-size:15px;color:rgba(240,208,96,0.85);line-height:1.5;">
                The Lounge at Hempfield Apothetique<br>
                <span style="color:rgba(240,208,96,0.65);">100 West Walnut Street, Lancaster, PA 17603</span>
              </p>
            </td>
          </tr>

          <tr>
            <td style="padding-bottom:24px;">
              <div style="font-size:11px;font-weight:700;letter-spacing:1.5px;color:#F0D060;text-transform:uppercase;margin-bottom:10px;">What's included</div>
              <p style="margin:0;font-size:15px;color:rgba(240,208,96,0.85);line-height:1.9;">
                🍸 &nbsp;First drink on us<br>
                🍽  &nbsp;Food provided<br>
                🎵 &nbsp;DJ Eddy Mena on the decks
              </p>
            </td>
          </tr>

          <tr>
            <td style="padding-bottom:24px;">
              <div style="font-size:11px;font-weight:700;letter-spacing:1.5px;color:#F0D060;text-transform:uppercase;margin-bottom:10px;">The details</div>
              <p style="margin:0;font-size:14px;color:rgba(240,208,96,0.8);line-height:1.7;">
                · Free to attend<br>
                · 21+ only (valid ID required at the door)<br>
                · At the door: your RSVP confirmation and the TasteLanc app on your phone<br>
                · No dress code — come as you are
              </p>
            </td>
          </tr>

          <tr>
            <td style="padding:12px 0 8px;">
              <div style="height:1px;background:rgba(240,208,96,0.15);"></div>
            </td>
          </tr>

          <tr>
            <td style="padding:16px 0 6px;">
              <p style="margin:0;font-size:14px;color:rgba(240,208,96,0.75);line-height:1.6;">
                <strong style="color:#F0D060;">How to RSVP</strong><br>
                Tap below. Takes about 30 seconds. You'll get a confirmation with your personal QR code — show it at the door, you're in.
              </p>
            </td>
          </tr>

          <tr>
            <td align="center" style="padding:20px 0 12px;">
              <a href="${RSVP_URL}" style="display:inline-block;background:#C84B31;color:#F0D060;font-weight:800;font-size:16px;text-decoration:none;padding:16px 48px;border-radius:12px;letter-spacing:0.5px;">RSVP Now</a>
            </td>
          </tr>

          <tr>
            <td align="center" style="padding:0 0 20px;">
              <p style="margin:0;font-size:12px;color:rgba(240,208,96,0.5);line-height:1.5;">
                Can't make it? Tap above and hit "Can't Make It" so we know not to hold your spot.
              </p>
            </td>
          </tr>

          <tr>
            <td style="padding:24px 0 0;">
              <p style="margin:0;font-size:14px;color:rgba(240,208,96,0.8);line-height:1.6;">
                See you Monday,<br>
                <span style="color:#F0D060;font-weight:600;">The TasteLanc team</span>
              </p>
            </td>
          </tr>

          <tr>
            <td style="padding:28px 0 0;">
              <div style="height:1px;background:rgba(240,208,96,0.1);margin-bottom:16px;"></div>
              <p style="margin:0 0 8px;font-size:11px;color:rgba(240,208,96,0.4);line-height:1.5;font-style:italic;">
                The Lounge at Hempfield Apothetique is Pennsylvania's first legal cannabis consumption lounge. 21+.
              </p>
              <p style="margin:0;font-size:11px;color:rgba(240,208,96,0.3);line-height:1.5;">
                This mailbox isn't monitored. Questions? Ask on the RSVP page.
              </p>
            </td>
          </tr>

        </table>

        <p style="margin:20px 0 0;font-size:11px;color:rgba(240,208,96,0.25);text-align:center;">TasteLanc · Lancaster, PA</p>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function renderText(name) {
  return `Hey ${name},

You're on TasteLanc, so you're on the list. We're hosting a night to close out Restaurant Week, and we'd love to see you there.

TASTELANC INDUSTRY SOCIAL
A relaxed evening with Lancaster's restaurant crews, TasteLanc users, and the people making this city's food scene what it is.

WHEN
Monday, April 20, 2026
6:00 PM – 9:30 PM (come and go as you like)

WHERE
The Lounge at Hempfield Apothetique
100 West Walnut Street, Lancaster, PA 17603

WHAT'S INCLUDED
- First drink on us
- Food provided
- DJ Eddy Mena on the decks

DETAILS
- Free to attend
- 21+ only (valid ID required at the door)
- At the door: your RSVP confirmation and the TasteLanc app on your phone
- No dress code — come as you are

HOW TO RSVP
Tap the link below. Takes about 30 seconds. You'll get a confirmation with your personal QR code — show it at the door, you're in.

${RSVP_URL}

Can't make it? Tap the link and hit "Can't Make It" so we know not to hold your spot.

See you Monday,
The TasteLanc team

---
The Lounge at Hempfield Apothetique is Pennsylvania's first legal cannabis consumption lounge. 21+.
This mailbox isn't monitored. Questions? Ask on the RSVP page.
`;
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
  const verified = all.filter(u => u.email_confirmed_at && u.email);
  // Deduplicate by email (shouldn't happen but safe)
  const seen = new Set();
  const unique = [];
  for (const u of verified) {
    const e = u.email.toLowerCase();
    if (seen.has(e)) continue;
    seen.add(e);
    unique.push(u);
  }
  return unique;
}

async function sendOne(email, name) {
  const html = renderHTML(name);
  const text = renderText(name);
  const res = await resend.emails.send({
    from: FROM,
    to: email,
    subject: SUBJECT,
    html,
    text,
    replyTo: REPLY_TO,
    // Resend tracking (opens + clicks) is on by default for the account
    tags: [
      { name: 'campaign', value: 'industry-social-2026-04-20' },
      { name: 'audience', value: 'verified-email' },
    ],
  });
  return res;
}

async function main() {
  const recipients = await getRecipients();
  console.log(`Total verified recipients: ${recipients.length}`);

  if (dryRun) {
    console.log('--- DRY RUN ---');
    for (const u of recipients) console.log(`  ${u.email} → ${firstName(u.user_metadata, u.email)}`);
    return;
  }

  if (testArg) {
    const testEmail = testArg.split('=')[1];
    const match = recipients.find(u => u.email.toLowerCase() === testEmail.toLowerCase());
    const name = match ? firstName(match.user_metadata, match.email) : firstName({}, testEmail);
    console.log(`Test-sending to ${testEmail} with first-name "${name}"...`);
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
      // Resend rate limit: 2 req/sec. Sleep 550ms between sends.
      await new Promise(r => setTimeout(r, 550));
    }
    console.log(`\nDone. Sent: ${sent}, Failed: ${failed}, Total: ${recipients.length}`);
  }
}

main().catch(err => { console.error(err); process.exit(1); });
