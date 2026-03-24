/**
 * Partner feature announcement — corrected send
 *
 * Test (preview to yourself only):
 *   cd apps/web && TEST=1 npx tsx scripts/send-partner-announcement.ts
 *
 * Send to all:
 *   cd apps/web && npx tsx scripts/send-partner-announcement.ts
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import { Resend } from 'resend';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const resend = new Resend(process.env.RESEND_API_KEY);

const SUBJECT = "You're invited — TasteLanc Industry Night + what's new in your dashboard";
const FROM = 'TasteLanc <noreply@tastelanc.com>';
const REPLY_TO = 'info@tastelanc.com';
const BCC = ['leandertoney@gmail.com', 'jmtoney1987@gmail.com', 'emily.c.allen1219@gmail.com'];
const LOGO_URL = 'https://tastelanc.com/images/tastelanc_new_dark.png';

const PAID_TIER_IDS = [
  '00000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000003',
  '8245abc3-be01-4916-b675-b089a80d7054',
];

interface Recipient {
  email: string;
  restaurantName: string;
}

async function getRecipients(): Promise<Recipient[]> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: paid } = await supabase
    .from('restaurants')
    .select('id, name, tier_id, owner_id, business_email, contact_email')
    .in('tier_id', PAID_TIER_IDS)
    .eq('is_active', true);

  const ownerIds = [...new Set((paid ?? []).map((r: any) => r.owner_id).filter(Boolean))];
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, email')
    .in('id', ownerIds);
  const profileMap = new Map((profiles ?? []).map((p: any) => [p.id, p.email]));

  const seen = new Set<string>();
  const recipients: Recipient[] = [];

  for (const r of paid ?? []) {
    let email: string | undefined = profileMap.get(r.owner_id) || r.business_email || r.contact_email;
    if (!email) {
      const { data: authUser } = await supabase.auth.admin.getUserById(r.owner_id);
      email = authUser?.user?.email;
    }
    if (!email) continue;
    const normalized = email.toLowerCase().trim();
    if (seen.has(normalized)) continue;
    seen.add(normalized);
    recipients.push({ email: normalized, restaurantName: r.name });
  }

  return recipients;
}

function buildHtml(restaurantName: string): string {
  const greeting = 'Hi ' + restaurantName + ' team,';
  const intro = 'This month we shipped several new tools for your dashboard at <strong style="color:#FFFFFF;">' + restaurantName + '</strong>. Here\'s what\'s live \u2014 and one invitation we want to make sure gets to you.';

  const apology = '<tr><td style="padding:20px 32px 0;">'
    + '<div style="background:#1f1010;border:1px solid #3a1a1a;border-radius:6px;padding:14px 16px;">'
    + '<p style="margin:0;color:#cc8888;font-size:13px;line-height:1.6;">We want to apologize \u2014 an earlier version of this email was sent in error with incorrect formatting. Please disregard that message. This is the correct one.</p>'
    + '</div></td></tr>';

  const html = '<!DOCTYPE html>'
    + '<html lang="en">'
    + '<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>'
    + '<body style="margin:0;padding:0;background:#0D0D0D;font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',Helvetica,Arial,sans-serif;">'
    + '<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#0D0D0D;padding:32px 16px;">'
    + '<tr><td align="center">'
    + '<table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background:#1A1A1A;border-radius:10px;overflow:hidden;border:1px solid #2a2a2a;">'

    // Logo
    + '<tr><td align="center" style="padding:28px 32px 20px;background:#111111;">'
    + '<img src="' + LOGO_URL + '" alt="TasteLanc" width="140" style="display:block;border:0;max-width:140px;">'
    + '</td></tr>'

    // Red bar
    + '<tr><td style="height:3px;background:#A41E22;font-size:0;line-height:0;">&nbsp;</td></tr>'

    // Greeting
    + '<tr><td style="padding:28px 32px 0;">'
    + '<p style="margin:0;color:#FFFFFF;font-size:15px;line-height:1.6;">' + greeting + '</p>'
    + '<p style="margin:12px 0 0;color:#AAAAAA;font-size:14px;line-height:1.65;">' + intro + '</p>'
    + '</td></tr>'

    // Apology
    + apology

    // Divider
    + '<tr><td style="padding:24px 32px 0;"><div style="height:1px;background:#2a2a2a;"></div></td></tr>'

    // Party section
    + '<tr><td style="padding:24px 32px 0;">'
    + '<p style="margin:0 0 4px;font-size:10px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;color:#A41E22;">You\'re Invited</p>'
    + '<p style="margin:0 0 10px;color:#FFFFFF;font-size:17px;font-weight:700;line-height:1.3;">TasteLanc Industry Night \u2014 April 20</p>'
    + '<p style="margin:0 0 10px;color:#AAAAAA;font-size:14px;line-height:1.65;">As the official digital partner of Restaurant Week Lancaster 2026, we\'re hosting an industry night on April 20 to celebrate the restaurants that made it happen. This is a thank-you \u2014 not a public event, not a networking mixer. Just us and the people behind your restaurant.</p>'
    + '<p style="margin:0 0 6px;color:#FFFFFF;font-size:13px;font-weight:600;">Here\'s how to claim your spots:</p>'
    + '<table width="100%" cellpadding="0" cellspacing="0" border="0">'
    + '<tr><td style="padding:4px 0;color:#AAAAAA;font-size:13px;line-height:1.55;"><span style="color:#A41E22;font-weight:700;">1.</span>&nbsp; Log into your dashboard \u2014 you\'ll see the invite card on your Overview page.</td></tr>'
    + '<tr><td style="padding:4px 0;color:#AAAAAA;font-size:13px;line-height:1.55;"><span style="color:#A41E22;font-weight:700;">2.</span>&nbsp; Enter how many staff you\'re bringing and request your spots.</td></tr>'
    + '<tr><td style="padding:4px 0;color:#AAAAAA;font-size:13px;line-height:1.55;"><span style="color:#A41E22;font-weight:700;">3.</span>&nbsp; We\'ll review and publish your invite code in the dashboard \u2014 share it with your staff so they can RSVP in the TasteLanc app and get their door ticket.</td></tr>'
    + '</table>'
    + '</td></tr>'

    // Divider
    + '<tr><td style="padding:24px 32px 0;"><div style="height:1px;background:#2a2a2a;"></div></td></tr>'

    // Content shoot
    + '<tr><td style="padding:24px 32px 0;">'
    + '<p style="margin:0 0 4px;font-size:10px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;color:#A41E22;">Premium &amp; Elite</p>'
    + '<p style="margin:0 0 8px;color:#FFFFFF;font-size:17px;font-weight:700;">We\'re coming to you \u2014 Content Shoot</p>'
    + '<p style="margin:0;color:#AAAAAA;font-size:14px;line-height:1.65;">Our social media manager will come to your location to capture footage and photos for your restaurant\'s presence across our channels. Included with your Premium or Elite plan \u2014 no cost to you. Reply to this email if you\'re interested and we\'ll get something on the calendar.</p>'
    + '</td></tr>'

    // Divider
    + '<tr><td style="padding:24px 32px 0;"><div style="height:1px;background:#2a2a2a;"></div></td></tr>'

    // Features header
    + '<tr><td style="padding:24px 32px 0;">'
    + '<p style="margin:0;font-size:10px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;color:#A41E22;">What\'s New in Your Dashboard</p>'
    + '</td></tr>'

    // Feature: Coupons
    + '<tr><td style="padding:16px 32px 0;">'
    + '<table width="100%" cellpadding="0" cellspacing="0" border="0"><tr>'
    + '<td width="36%" valign="top" style="color:#FFFFFF;font-size:13px;font-weight:600;padding-right:16px;">Digital Coupons</td>'
    + '<td width="64%" valign="top"><p style="margin:0;color:#AAAAAA;font-size:13px;line-height:1.55;">Create % off, $ off, BOGO, or free item coupons. Customers claim and redeem in the app. Track claims, redemptions, and conversion rate.</p>'
    + '<p style="margin:6px 0 0;color:#555555;font-size:11px;">Dashboard \u2192 Content \u2192 Coupons</p></td>'
    + '</tr></table></td></tr>'
    + '<tr><td style="padding:14px 32px 0;"><div style="height:1px;background:#222222;"></div></td></tr>'

    // Feature: Push Notifications
    + '<tr><td style="padding:14px 32px 0;">'
    + '<table width="100%" cellpadding="0" cellspacing="0" border="0"><tr>'
    + '<td width="36%" valign="top" style="color:#FFFFFF;font-size:13px;font-weight:600;padding-right:16px;">Push Notifications</td>'
    + '<td width="64%" valign="top"><p style="margin:0;color:#AAAAAA;font-size:13px;line-height:1.55;">Send directly to customers who\'ve favorited your restaurant. Preview exactly how it looks on their phone before you send.</p>'
    + '<p style="margin:6px 0 0;color:#555555;font-size:11px;">Dashboard \u2192 Growth \u2192 Marketing \u2192 Push Notifications</p></td>'
    + '</tr></table></td></tr>'
    + '<tr><td style="padding:14px 32px 0;"><div style="height:1px;background:#222222;"></div></td></tr>'

    // Feature: Email Campaigns
    + '<tr><td style="padding:14px 32px 0;">'
    + '<table width="100%" cellpadding="0" cellspacing="0" border="0"><tr>'
    + '<td width="36%" valign="top" style="color:#FFFFFF;font-size:13px;font-weight:600;padding-right:16px;">Email Campaigns</td>'
    + '<td width="64%" valign="top"><p style="margin:0;color:#AAAAAA;font-size:13px;line-height:1.55;">Import your own contact list and send branded campaigns \u2014 specials, events, announcements. You control the content and timing.</p>'
    + '<p style="margin:6px 0 0;color:#555555;font-size:11px;">Dashboard \u2192 Growth \u2192 Marketing \u2192 Email Campaigns</p></td>'
    + '</tr></table></td></tr>'
    + '<tr><td style="padding:14px 32px 0;"><div style="height:1px;background:#222222;"></div></td></tr>'

    // Feature: Display Preferences
    + '<tr><td style="padding:14px 32px 0;">'
    + '<table width="100%" cellpadding="0" cellspacing="0" border="0"><tr>'
    + '<td width="36%" valign="top" style="color:#FFFFFF;font-size:13px;font-weight:600;padding-right:16px;">Display Preferences</td>'
    + '<td width="64%" valign="top"><p style="margin:0;color:#AAAAAA;font-size:13px;line-height:1.55;">Customize which sections of your listing are most prominent and how your content is ordered in the app.</p>'
    + '<p style="margin:6px 0 0;color:#555555;font-size:11px;">Dashboard \u2192 Settings \u2192 Customize</p></td>'
    + '</tr></table></td></tr>'
    + '<tr><td style="padding:14px 32px 0;"><div style="height:1px;background:#222222;"></div></td></tr>'

    // Feature: Help & Support
    + '<tr><td style="padding:14px 32px 0;">'
    + '<table width="100%" cellpadding="0" cellspacing="0" border="0"><tr>'
    + '<td width="36%" valign="top" style="color:#FFFFFF;font-size:13px;font-weight:600;padding-right:16px;">Help &amp; Support</td>'
    + '<td width="64%" valign="top"><p style="margin:0;color:#AAAAAA;font-size:13px;line-height:1.55;">Ask Rose anything about the dashboard and she\'ll walk you through it. Direct contact form available if you need to reach our team.</p>'
    + '<p style="margin:6px 0 0;color:#555555;font-size:11px;">Dashboard \u2192 Support \u2192 Help &amp; Support</p></td>'
    + '</tr></table></td></tr>'

    // Divider
    + '<tr><td style="padding:24px 32px 0;"><div style="height:1px;background:#2a2a2a;"></div></td></tr>'

    // CTA
    + '<tr><td align="center" style="padding:28px 32px;">'
    + '<a href="https://dashboard.tastelanc.com" style="display:inline-block;background:#A41E22;color:#FFFFFF;text-decoration:none;font-size:14px;font-weight:600;padding:13px 28px;border-radius:6px;letter-spacing:0.02em;">Log in to your dashboard \u2192</a>'
    + '</td></tr>'

    // Footer
    + '<tr><td style="padding:0 32px 28px;" align="center">'
    + '<p style="margin:0;color:#444444;font-size:12px;line-height:1.6;">Questions? Reply to this email or reach us at <a href="mailto:info@tastelanc.com" style="color:#666666;">info@tastelanc.com</a></p>'
    + '<p style="margin:8px 0 0;color:#333333;font-size:11px;">TasteLanc &middot; Lancaster, PA</p>'
    + '</td></tr>'

    + '</table></td></tr></table>'
    + '</body></html>';

  return html;
}

async function main() {
  const isTest = !!process.env.TEST;

  if (isTest) {
    console.log('TEST MODE — sending preview to leandertoney@gmail.com only');
    const html = buildHtml('Trio Bar and Grill');
    const { data, error } = await resend.emails.send({
      from: FROM,
      to: 'leandertoney@gmail.com',
      replyTo: REPLY_TO,
      subject: SUBJECT,
      html,
    });
    if (error) console.error('Error:', error);
    else console.log('Preview sent — id:', data?.id);
    return;
  }

  const recipients = await getRecipients();
  console.log('Sending to', recipients.length, 'unique recipients...');

  let sent = 0;
  let failed = 0;

  for (const r of recipients) {
    await new Promise(res => setTimeout(res, 300));
    const { data, error } = await resend.emails.send({
      from: FROM,
      to: r.email,
      bcc: BCC,
      replyTo: REPLY_TO,
      subject: SUBJECT,
      html: buildHtml(r.restaurantName),
    });
    if (error) {
      console.error('FAILED:', r.email, error.message);
      failed++;
    } else {
      console.log('Sent:', r.email, '(' + r.restaurantName + ') — id:', data?.id);
      sent++;
    }
  }

  console.log('Done.', sent, 'sent,', failed, 'failed.');
}

main().catch(console.error);
