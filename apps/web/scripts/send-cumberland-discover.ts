/**
 * TasteCumberland consumer blast — invite non-app users to download.
 *
 * Audience: platform_contacts in Cumberland market, not unsubscribed,
 * not already signed up for the app (excluded by email match against auth.users).
 *
 * Preview (sends 1 to leandertoney@gmail.com):
 *   cd apps/web && TEST=1 npx tsx scripts/send-cumberland-discover.ts
 *
 * Dry run (counts only, no send):
 *   cd apps/web && DRY=1 npx tsx scripts/send-cumberland-discover.ts
 *
 * Live send:
 *   cd apps/web && npx tsx scripts/send-cumberland-discover.ts
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import { Resend } from 'resend';
import { createClient } from '@supabase/supabase-js';
import { getMarketConfig } from '../config/market';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const resend = new Resend(process.env.RESEND_API_KEY);

const PREVIEW_EMAIL = 'leandertoney@gmail.com';
const REPLY_TO = 'info@tastelanc.com';
const CUMBERLAND_ID = '0602afe2-fae2-4e46-af2c-7b374bfc9d45';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const norm = (s: string | null | undefined) => (s || '').toLowerCase().trim();

interface Recipient {
  email: string;
  name: string | null;
}

async function getAuthEmails(): Promise<Set<string>> {
  const emails = new Set<string>();
  let page = 1;
  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
    if (error || !data?.users?.length) break;
    for (const u of data.users) if (u.email) emails.add(norm(u.email));
    if (data.users.length < 1000) break;
    page++;
  }
  return emails;
}

async function getRecipients(): Promise<Recipient[]> {
  const authEmails = await getAuthEmails();

  const { data: contacts } = await supabase
    .from('platform_contacts')
    .select('email, name')
    .eq('market_id', CUMBERLAND_ID)
    .eq('is_unsubscribed', false);

  const seen = new Set<string>();
  const out: Recipient[] = [];
  for (const c of contacts ?? []) {
    const e = norm(c.email);
    if (!e || !e.includes('@')) continue;
    if (authEmails.has(e)) continue; // already has the app
    if (seen.has(e)) continue;
    seen.add(e);
    out.push({ email: e, name: c.name });
  }
  return out;
}

function buildEmail(recipientName: string | null, unsubscribeUrl: string) {
  const brand = getMarketConfig('cumberland-pa')!;
  const brandName = brand.name; // TasteCumberland
  const accent = brand.colors.accent; // #3B7A57
  const logoUrl = `https://tastelanc.com${brand.logoPath}`;
  const appStoreUrl = brand.appStoreUrls.ios!;
  const playStoreUrl = brand.appStoreUrls.android!;
  const aiName = brand.aiName; // Mollie
  const county = brand.county; // Cumberland County

  const subject = `$8 off at Caddy Shack — and a bunch more on ${brandName}`;

  const firstName = recipientName
    ? recipientName.split(/[\s,]+/)[0].replace(/[^a-zA-Z]/g, '')
    : '';
  const greeting = firstName ? `Hey ${firstName},` : 'Hey there,';

  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0D0D0D;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#0D0D0D;padding:32px 16px;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background:#1A1A1A;border-radius:10px;overflow:hidden;border:1px solid #2a2a2a;">

<tr><td align="center" style="padding:28px 32px 20px;background:#111111;">
<img src="${logoUrl}" alt="${brandName}" width="180" style="display:block;border:0;max-width:180px;">
</td></tr>

<tr><td style="height:3px;background:${accent};font-size:0;line-height:0;">&nbsp;</td></tr>

<tr><td style="padding:32px 32px 0;">
<p style="margin:0;color:#FFFFFF;font-size:22px;font-weight:700;line-height:1.3;">A free app for ${county} — and $8 off at Caddy Shack to get you started.</p>
<p style="margin:14px 0 0;color:#D1D5DB;font-size:15px;line-height:1.7;">${greeting}</p>
<p style="margin:12px 0 0;color:#D1D5DB;font-size:14px;line-height:1.7;">${brandName} is a free app made for one thing: helping you figure out where to eat, where happy hour's on, and what's happening tonight — across ${county}. No scrolling Instagram, no guessing from Google reviews. Just the stuff that matters.</p>
</td></tr>

<tr><td style="padding:24px 32px 0;"><div style="height:1px;background:#2a2a2a;"></div></td></tr>

<tr><td style="padding:24px 32px 0;">
<p style="margin:0 0 4px;font-size:10px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;color:${accent};">01 · Happy Hour, Right Now</p>
<p style="margin:0 0 8px;color:#FFFFFF;font-size:16px;font-weight:700;">Never wonder where happy hour is again</p>
<p style="margin:0;color:#AAAAAA;font-size:13px;line-height:1.65;">Dozens of ${county} spots with their happy hour times, drink specials, and food deals — all in one place. Filter by what's happening tonight, this weekend, or right now.</p>
</td></tr>

<tr><td style="padding:16px 32px 0;"><div style="height:1px;background:#222222;"></div></td></tr>

<tr><td style="padding:16px 32px 0;">
<p style="margin:0 0 4px;font-size:10px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;color:${accent};">02 · Tonight's Specials</p>
<p style="margin:0 0 8px;color:#FFFFFF;font-size:16px;font-weight:700;">See what's on special before you pick a spot</p>
<p style="margin:0;color:#AAAAAA;font-size:13px;line-height:1.65;">Half-price wings Wednesday, $5 burgers Tuesday, bottomless mimosas Sunday — we pull the specials straight from each restaurant, updated constantly. So you're not committing to a $40 dinner when $12 would have done it.</p>
</td></tr>

<tr><td style="padding:24px 32px 0;"><div style="height:1px;background:#2a2a2a;"></div></td></tr>

<!-- Featured Deal Block -->
<tr><td style="padding:28px 32px 4px;">
<p style="margin:0 0 12px;font-size:10px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:${accent};">03 · Digital Deals — Live Now</p>
<div style="background:${accent};border-radius:12px;padding:24px 22px;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0">
    <tr>
      <td valign="top" style="padding-bottom:8px;">
        <span style="display:inline-block;background:#FFFFFF;color:${accent};font-size:10px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;padding:4px 10px;border-radius:999px;">Featured Deal</span>
      </td>
      <td valign="top" align="right" style="padding-bottom:8px;">
        <span style="color:#FFFFFF;font-size:11px;font-weight:600;letter-spacing:0.05em;opacity:0.9;">&#10003; Claim in the app</span>
      </td>
    </tr>
  </table>
  <p style="margin:8px 0 2px;color:#FFFFFF;font-size:13px;font-weight:700;letter-spacing:0.06em;opacity:0.95;">CADDY SHACK</p>
  <p style="margin:0;color:#FFFFFF;font-size:42px;font-weight:800;line-height:1;letter-spacing:-0.02em;">$8.00 OFF</p>
  <p style="margin:12px 0 0;color:#FFFFFF;font-size:13px;line-height:1.55;opacity:0.92;">Dine-in only. Claim the deal in ${brandName}, show the server, save $8 on your bill.</p>
</div>
<p style="margin:14px 0 0;color:#AAAAAA;font-size:13px;line-height:1.65;">Restaurants post deals directly in ${brandName} — dollars off, free items, BOGOs, happy hour drops. New deals added every week as more ${county} spots come on.</p>
</td></tr>

<tr><td style="padding:24px 32px 0;"><div style="height:1px;background:#2a2a2a;"></div></td></tr>

<tr><td style="padding:16px 32px 0;">
<p style="margin:0 0 4px;font-size:10px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;color:${accent};">04 · Meet ${aiName}</p>
<p style="margin:0 0 8px;color:#FFFFFF;font-size:16px;font-weight:700;">Your AI concierge for ${county}</p>
<p style="margin:0;color:#AAAAAA;font-size:13px;line-height:1.65;">Ask ${aiName} anything — "date night under $80," "best patio in Carlisle," "where's trivia tonight" — she'll plan the whole evening. She knows ${county} better than Google does.</p>
</td></tr>

<tr><td style="padding:32px 32px 8px;" align="center">
<a href="${appStoreUrl}" style="display:inline-block;background:${accent};color:#FFFFFF;text-decoration:none;font-size:14px;font-weight:600;padding:14px 28px;border-radius:6px;letter-spacing:0.02em;margin:4px;">Download for iPhone &rarr;</a>
<a href="${playStoreUrl}" style="display:inline-block;background:#2a2a2a;color:#FFFFFF;text-decoration:none;font-size:14px;font-weight:600;padding:14px 28px;border-radius:6px;letter-spacing:0.02em;margin:4px;border:1px solid #3a3a3a;">Download for Android &rarr;</a>
</td></tr>

<tr><td style="padding:8px 32px 28px;" align="center">
<p style="margin:0;color:#888888;font-size:12px;line-height:1.5;">Free. No ads shoved in your face. No spam.</p>
</td></tr>

<tr><td style="padding:0 32px 28px;" align="center">
<p style="margin:0;color:#444444;font-size:12px;line-height:1.6;">Questions? Reply to this email or reach us at <a href="mailto:info@tastelanc.com" style="color:#666666;">info@tastelanc.com</a></p>
<p style="margin:8px 0 0;color:#333333;font-size:11px;">${brandName} &middot; ${county}, PA</p>
<p style="margin:8px 0 0;color:#333333;font-size:11px;">Not interested? <a href="${unsubscribeUrl}" style="color:#555555;">Unsubscribe</a></p>
</td></tr>

</table></td></tr></table>
</body></html>`;

  return { subject, html };
}

async function main() {
  const isTest = !!process.env.TEST;
  const isDry = !!process.env.DRY;

  console.log('═══════════════════════════════════════════════════');
  console.log(' TasteCumberland Consumer Blast');
  console.log(`   Mode: ${isTest ? 'TEST (preview only)' : isDry ? 'DRY RUN' : 'LIVE SEND'}`);
  console.log('═══════════════════════════════════════════════════\n');

  if (isTest) {
    const unsubscribeUrl = `https://cumberland.tastelanc.com/api/unsubscribe?type=platform&email=${encodeURIComponent(PREVIEW_EMAIL)}`;
    const { subject, html } = buildEmail('Leander Toney', unsubscribeUrl);
    const brand = getMarketConfig('cumberland-pa')!;
    const { data, error } = await resend.emails.send({
      from: `${brand.name} <noreply@tastelanc.com>`,
      to: PREVIEW_EMAIL,
      replyTo: REPLY_TO,
      subject,
      html,
    });
    if (error) console.error('FAILED:', error);
    else console.log(`Preview sent id=${data?.id}`);
    return;
  }

  const recipients = await getRecipients();
  console.log(`Recipients: ${recipients.length}\n`);

  if (isDry) {
    for (const r of recipients.slice(0, 15)) console.log(`  ${r.email}  ·  ${r.name ?? '(no name)'}`);
    if (recipients.length > 15) console.log(`  ... and ${recipients.length - 15} more`);
    return;
  }

  const brand = getMarketConfig('cumberland-pa')!;
  const fromAddress = `${brand.name} <noreply@tastelanc.com>`;
  let sent = 0;
  let failed = 0;

  for (const r of recipients) {
    const unsubscribeUrl = `https://cumberland.tastelanc.com/api/unsubscribe?type=platform&email=${encodeURIComponent(r.email)}`;
    const { subject, html } = buildEmail(r.name, unsubscribeUrl);

    const { error } = await resend.emails.send({
      from: fromAddress,
      to: r.email,
      replyTo: REPLY_TO,
      subject,
      html,
    });

    if (error) {
      console.error(`FAILED ${r.email}: ${error.message}`);
      failed++;
    } else {
      sent++;
      if (sent % 50 === 0) console.log(`...${sent}/${recipients.length} sent`);
    }
    await new Promise((res) => setTimeout(res, 300));
  }

  console.log(`\n═══════════════════════════════════════════════════`);
  console.log(` Sent: ${sent}  |  Failed: ${failed}`);
  console.log(`═══════════════════════════════════════════════════`);
}

main().catch((e) => {
  console.error('Fatal:', e);
  process.exit(1);
});
