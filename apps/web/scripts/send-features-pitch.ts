/**
 * Feature-value pitch to non-paying business leads across all 3 markets.
 *
 * Excludes:
 *   - Leads whose restaurant_id is on Premium or Elite (tier_id)
 *   - Leads whose email matches any paying owner / business_email / contact_email
 *   - Leads whose business_name matches any paying restaurant name
 *   - Leads with status='not_interested'
 *   - Unsubscribed platform_contacts
 *   - Bad/placeholder emails
 *
 * Each market gets its own branded email (logo, colors, AI name, domain, App Store link).
 *
 * Test (sends 3 previews — one per market brand — to leandertoney@gmail.com):
 *   cd apps/web && TEST=1 npx tsx scripts/send-features-pitch.ts
 *
 * Dry run (lists recipients, no send):
 *   cd apps/web && DRY=1 npx tsx scripts/send-features-pitch.ts
 *
 * Send to one market only:
 *   cd apps/web && MARKET=cumberland-pa npx tsx scripts/send-features-pitch.ts
 *
 * Real send (all markets):
 *   cd apps/web && npx tsx scripts/send-features-pitch.ts
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

const PAID_TIER_IDS = [
  '00000000-0000-0000-0000-000000000002', // premium
  '00000000-0000-0000-0000-000000000003', // elite
];

const MARKETS = [
  { slug: 'lancaster-pa', id: 'f7e72800-3d4c-4f68-af22-40b1d52dc2e5' },
  { slug: 'cumberland-pa', id: '0602afe2-fae2-4e46-af2c-7b374bfc9d45' },
  { slug: 'fayetteville-nc', id: 'c7b79d18-0bb6-434d-926a-0f8cdf420acb' },
];

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const norm = (s: string | null | undefined) => (s || '').toLowerCase().trim();
const normName = (s: string | null | undefined) =>
  (s || '').toLowerCase().replace(/[^a-z0-9]/g, '');

interface Recipient {
  email: string;
  businessName: string;
}

async function buildPayingExclusions(): Promise<{
  ids: Set<string>;
  emails: Set<string>;
  names: Set<string>;
}> {
  const { data: paying } = await supabase
    .from('restaurants')
    .select('id, name, owner_id, business_email, contact_email')
    .in('tier_id', PAID_TIER_IDS);

  const ids = new Set<string>();
  const emails = new Set<string>();
  const names = new Set<string>();
  const ownerIds: string[] = [];

  for (const r of paying ?? []) {
    ids.add(r.id);
    if (r.name) names.add(normName(r.name));
    if (r.business_email) emails.add(norm(r.business_email));
    if (r.contact_email) emails.add(norm(r.contact_email));
    if (r.owner_id) ownerIds.push(r.owner_id);
  }

  // Owner profile emails
  if (ownerIds.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, email')
      .in('id', ownerIds);
    for (const p of profiles ?? []) if (p.email) emails.add(norm(p.email));

    // Auth emails (belt-and-suspenders — some owners have null profile.email)
    for (const id of ownerIds) {
      const { data } = await supabase.auth.admin.getUserById(id);
      if (data?.user?.email) emails.add(norm(data.user.email));
    }
  }

  return { ids, emails, names };
}

async function getRecipientsForMarket(
  marketId: string,
  paying: { ids: Set<string>; emails: Set<string>; names: Set<string> }
): Promise<Recipient[]> {
  const { data: leads } = await supabase
    .from('business_leads')
    .select('id, email, business_name, restaurant_id, status')
    .eq('market_id', marketId)
    .not('email', 'is', null)
    .neq('email', '');

  const seen = new Set<string>();
  const candidates: Recipient[] = [];

  for (const l of leads ?? []) {
    const e = norm(l.email);
    if (!e || !e.includes('@')) continue;
    if (e.startsWith('unknown')) continue;
    if (l.status === 'not_interested') continue;
    if (l.restaurant_id && paying.ids.has(l.restaurant_id)) continue;
    if (paying.emails.has(e)) continue;
    if (l.business_name && paying.names.has(normName(l.business_name))) continue;
    if (seen.has(e)) continue;
    seen.add(e);
    candidates.push({ email: e, businessName: l.business_name || 'there' });
  }

  // Filter out unsubscribed platform_contacts
  if (candidates.length === 0) return [];
  const { data: unsub } = await supabase
    .from('platform_contacts')
    .select('email')
    .eq('is_unsubscribed', true)
    .in('email', candidates.map((c) => c.email));
  const unsubSet = new Set((unsub ?? []).map((u) => norm(u.email)));

  return candidates.filter((c) => !unsubSet.has(c.email));
}

function buildEmail(
  marketSlug: string,
  businessName: string,
  opts: { includeUnsubscribeUrl?: string } = {}
): { subject: string; html: string } {
  const brand = getMarketConfig(marketSlug)!;
  const brandName = brand.name;
  const accent = brand.colors.accent;
  const accentHover = brand.colors.accentHover;
  const logoUrl = `https://tastelanc.com${brand.logoPath}`;
  const appStoreUrl = brand.appStoreUrls.ios || brand.appStoreUrls.android || `https://${brand.domain}`;
  const listingUrl = `https://${brand.domain}`;
  const aiName = brand.aiName;
  const county = brand.county;

  const subjectByMarket: Record<string, string> = {
    'lancaster-pa': `Your restaurant is already on TasteLanc — here's what a paid plan unlocks`,
    'cumberland-pa': `TasteCumberland diners are discovering restaurants daily — here's what paid members get`,
    'fayetteville-nc': `TasteFayetteville is live — here's what a paid plan unlocks for your restaurant`,
  };
  const subject = subjectByMarket[marketSlug];

  const unsubscribeLine = opts.includeUnsubscribeUrl
    ? `<p style="margin:8px 0 0;color:#333333;font-size:11px;">Not a fit? <a href="${opts.includeUnsubscribeUrl}" style="color:#666666;">Unsubscribe</a></p>`
    : '';

  // Safely HTML-escape the business name
  const bn = businessName
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0D0D0D;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#0D0D0D;padding:32px 16px;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background:#1A1A1A;border-radius:10px;overflow:hidden;border:1px solid #2a2a2a;">

<tr><td align="center" style="padding:28px 32px 20px;background:#111111;">
<img src="${logoUrl}" alt="${brandName}" width="160" style="display:block;border:0;max-width:160px;">
</td></tr>

<tr><td style="height:3px;background:${accent};font-size:0;line-height:0;">&nbsp;</td></tr>

<tr><td style="padding:28px 32px 0;">
<p style="margin:0;color:#FFFFFF;font-size:16px;line-height:1.55;font-weight:600;">Hi ${bn},</p>
<p style="margin:14px 0 0;color:#D1D5DB;font-size:14px;line-height:1.7;">Your restaurant is already listed on <strong style="color:#FFFFFF;">${brandName}</strong> — the go-to app for ${county} diners looking for where to eat, where happy hour is on, and what's happening tonight. You're there, for free.</p>
<p style="margin:14px 0 0;color:#D1D5DB;font-size:14px;line-height:1.7;">Most of what moves the needle — getting diners to pick <strong style="color:#FFFFFF;">${bn}</strong> over the restaurant next to you — lives on a paid plan. Here's what you're missing:</p>
</td></tr>

<tr><td style="padding:24px 32px 0;"><div style="height:1px;background:#2a2a2a;"></div></td></tr>

<!-- Feature 1 -->
<tr><td style="padding:24px 32px 0;">
<p style="margin:0 0 4px;font-size:10px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;color:${accent};">01 · Menu + Specials + Happy Hour</p>
<p style="margin:0 0 8px;color:#FFFFFF;font-size:16px;font-weight:700;">Show diners what you actually serve</p>
<p style="margin:0;color:#AAAAAA;font-size:13px;line-height:1.65;">Full menu, weekly specials, happy hour times and deals, events, entertainment lineup. When diners open the app looking for "what's happy hour tonight" or "what's the special" — you're the answer. Right now, on Basic, you're a hours-and-location listing.</p>
</td></tr>

<tr><td style="padding:16px 32px 0;"><div style="height:1px;background:#222222;"></div></td></tr>

<!-- Feature 2 -->
<tr><td style="padding:16px 32px 0;">
<p style="margin:0 0 4px;font-size:10px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;color:${accent};">02 · Push Notifications</p>
<p style="margin:0 0 8px;color:#FFFFFF;font-size:16px;font-weight:700;">Go directly to diners who favorited you</p>
<p style="margin:0;color:#AAAAAA;font-size:13px;line-height:1.65;">Send a push the moment your patio opens, a live band goes on, or a special drops. Lands on the home screen of people who already said they like your place. Preview exactly how it'll look on their phone before you send it.</p>
</td></tr>

<tr><td style="padding:16px 32px 0;"><div style="height:1px;background:#222222;"></div></td></tr>

<!-- Feature 3 -->
<tr><td style="padding:16px 32px 0;">
<p style="margin:0 0 4px;font-size:10px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;color:${accent};">03 · Digital Deals</p>
<p style="margin:0 0 8px;color:#FFFFFF;font-size:16px;font-weight:700;">Drive traffic with redeemable offers</p>
<p style="margin:0;color:#AAAAAA;font-size:13px;line-height:1.65;">Build % off, $ off, BOGO, or free-item deals. Diners claim in the app, redeem at your door. Track claims, redemptions, and conversion rate in real time.</p>
</td></tr>

<tr><td style="padding:16px 32px 0;"><div style="height:1px;background:#222222;"></div></td></tr>

<!-- Feature 4 -->
<tr><td style="padding:16px 32px 0;">
<p style="margin:0 0 4px;font-size:10px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;color:${accent};">04 · Email Campaigns to Your List</p>
<p style="margin:0 0 8px;color:#FFFFFF;font-size:16px;font-weight:700;">Branded email, no Mailchimp subscription</p>
<p style="margin:0;color:#AAAAAA;font-size:13px;line-height:1.65;">Upload your customer list and send ${brandName}-branded campaigns — specials, events, announcements. Full delivery analytics. Included — no separate email tool required.</p>
</td></tr>

<tr><td style="padding:16px 32px 0;"><div style="height:1px;background:#222222;"></div></td></tr>

<!-- Feature 5 -->
<tr><td style="padding:16px 32px 0;">
<p style="margin:0 0 4px;font-size:10px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;color:${accent};">05 · Analytics</p>
<p style="margin:0 0 8px;color:#FFFFFF;font-size:16px;font-weight:700;">Know who's finding you and how</p>
<p style="margin:0;color:#AAAAAA;font-size:13px;line-height:1.65;">See listing views, favorites, menu opens, coupon performance, push open rates, and where in the funnel diners drop off. Data you actually act on, not vanity metrics.</p>
</td></tr>

<tr><td style="padding:16px 32px 0;"><div style="height:1px;background:#222222;"></div></td></tr>

<!-- Feature 6 -->
<tr><td style="padding:16px 32px 0;">
<p style="margin:0 0 4px;font-size:10px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;color:${accent};">06 · ${aiName}, your AI concierge</p>
<p style="margin:0 0 8px;color:#FFFFFF;font-size:16px;font-weight:700;">When diners ask, ${aiName} recommends</p>
<p style="margin:0;color:#AAAAAA;font-size:13px;line-height:1.65;">${aiName} is our in-app AI assistant ${county} diners use to plan a night out. Paid restaurants get priority placement in her recommendations. Elite members show up with logo on the map and daily specials pulled into the feed.</p>
</td></tr>

<tr><td style="padding:24px 32px 0;"><div style="height:1px;background:#2a2a2a;"></div></td></tr>

<!-- Pricing -->
<tr><td style="padding:24px 32px 0;">
<div style="background:#222222;border:1px solid ${accent};border-radius:10px;padding:22px 20px;text-align:center;">
  <p style="margin:0 0 6px;font-size:10px;font-weight:600;letter-spacing:0.12em;text-transform:uppercase;color:${accent};">Plans start at</p>
  <p style="margin:0 0 8px;color:#FFFFFF;font-size:32px;font-weight:800;line-height:1;">as low as $49<span style="color:#AAAAAA;font-size:16px;font-weight:500;"> / month</span></p>
  <p style="margin:0;color:#AAAAAA;font-size:13px;line-height:1.55;">Plans built for coffee shops, restaurants, and full-service venues. Flexible terms to fit how you want to commit.</p>
</div>
<p style="margin:12px 0 0;color:#888888;font-size:11px;line-height:1.5;text-align:center;">No setup fees. No contracts. Cancel any time.</p>
</td></tr>

<tr><td style="padding:24px 32px 0;"><div style="height:1px;background:#2a2a2a;"></div></td></tr>

<!-- CTA -->
<tr><td align="center" style="padding:28px 32px 20px;">
<a href="${listingUrl}" style="display:inline-block;background:${accent};color:#FFFFFF;text-decoration:none;font-size:14px;font-weight:600;padding:13px 28px;border-radius:6px;letter-spacing:0.02em;margin:0 4px 8px;">See ${brandName} &rarr;</a>
<a href="${appStoreUrl}" style="display:inline-block;background:#2a2a2a;color:#FFFFFF;text-decoration:none;font-size:14px;font-weight:600;padding:13px 28px;border-radius:6px;letter-spacing:0.02em;margin:0 4px 8px;border:1px solid #3a3a3a;">Download the app &rarr;</a>
</td></tr>

<!-- Reply CTA -->
<tr><td style="padding:0 32px 28px;" align="center">
<p style="margin:0;color:#D1D5DB;font-size:13px;line-height:1.65;">Want a 10-minute walkthrough of the dashboard? Just reply to this email and we'll find a time that works for you.</p>
<p style="margin:10px 0 0;color:#AAAAAA;font-size:12px;">&mdash; The ${brandName} Team</p>
</td></tr>

<!-- Footer -->
<tr><td style="padding:0 32px 28px;" align="center">
<p style="margin:0;color:#444444;font-size:12px;line-height:1.6;">Questions? Reply to this email or reach us at <a href="mailto:info@tastelanc.com" style="color:#666666;">info@tastelanc.com</a></p>
<p style="margin:8px 0 0;color:#333333;font-size:11px;">${brandName} &middot; ${county}</p>
${unsubscribeLine}
</td></tr>

</table></td></tr></table>
</body></html>`;

  return { subject, html };
}

async function main() {
  const isTest = !!process.env.TEST;
  const isDry = !!process.env.DRY;
  const marketFilter = process.env.MARKET;

  console.log('═══════════════════════════════════════════════════');
  console.log(' Feature Pitch Campaign');
  console.log(`   Mode: ${isTest ? 'TEST (preview only)' : isDry ? 'DRY RUN' : 'LIVE SEND'}`);
  if (marketFilter) console.log(`   Market filter: ${marketFilter}`);
  console.log('═══════════════════════════════════════════════════\n');

  const paying = await buildPayingExclusions();
  console.log(`Loaded paying exclusions:`);
  console.log(`  ${paying.ids.size} restaurant IDs`);
  console.log(`  ${paying.emails.size} emails`);
  console.log(`  ${paying.names.size} business names\n`);

  const targets = MARKETS.filter((m) => !marketFilter || m.slug === marketFilter);

  if (isTest) {
    console.log(`TEST MODE — sending 1 preview per market to ${PREVIEW_EMAIL}`);
    console.log('(Previews look exactly like what recipients will receive.)\n');
    // Use a real-looking business name so the email reads like the actual send.
    const sampleNames: Record<string, string> = {
      'lancaster-pa': 'Forklift & Palate Restaurant',
      'cumberland-pa': 'Hungry Run Distillery',
      'fayetteville-nc': 'Agora Mediterranean Restaurant',
    };
    for (const m of targets) {
      const { subject, html } = buildEmail(m.slug, sampleNames[m.slug] || 'your restaurant');
      const brand = getMarketConfig(m.slug)!;
      const { data, error } = await resend.emails.send({
        from: `${brand.name} <noreply@tastelanc.com>`,
        to: PREVIEW_EMAIL,
        replyTo: REPLY_TO,
        subject,
        html,
      });
      if (error) console.error(`FAILED ${m.slug}:`, error);
      else console.log(`Preview sent [${brand.name}] id=${data?.id}`);
      await new Promise((r) => setTimeout(r, 400));
    }
    console.log('\nDone. Check your inbox.');
    return;
  }

  let grandSent = 0;
  let grandFailed = 0;

  for (const m of targets) {
    const brand = getMarketConfig(m.slug)!;
    const recipients = await getRecipientsForMarket(m.id, paying);

    console.log(`\n── ${brand.name} (${m.slug}) ──`);
    console.log(`   Recipients: ${recipients.length}`);

    if (isDry) {
      console.log('   (DRY RUN — not sending)');
      for (const r of recipients.slice(0, 10)) {
        console.log(`     ${r.email}  ·  ${r.businessName}`);
      }
      if (recipients.length > 10) console.log(`     ... and ${recipients.length - 10} more`);
      continue;
    }

    let sent = 0;
    let failed = 0;
    const fromAddress = `${brand.name} <noreply@tastelanc.com>`;

    for (const r of recipients) {
      const { subject, html } = buildEmail(m.slug, r.businessName);

      const { data, error } = await resend.emails.send({
        from: fromAddress,
        to: r.email,
        replyTo: REPLY_TO,
        subject,
        html,
      });

      if (error) {
        console.error(`   FAILED ${r.email}: ${error.message}`);
        failed++;
      } else {
        sent++;
        if (sent % 25 === 0) {
          console.log(`   ...${sent}/${recipients.length} sent`);
        }
      }

      await new Promise((res) => setTimeout(res, 300));
    }

    console.log(`   ✓ Sent: ${sent}  |  Failed: ${failed}`);
    grandSent += sent;
    grandFailed += failed;
  }

  if (!isDry) {
    console.log('\n═══════════════════════════════════════════════════');
    console.log(` Grand total: ${grandSent} sent, ${grandFailed} failed`);
    console.log('═══════════════════════════════════════════════════');
  }
}

main().catch((e) => {
  console.error('Fatal error:', e);
  process.exit(1);
});
