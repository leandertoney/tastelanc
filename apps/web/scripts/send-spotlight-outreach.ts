/**
 * Local Restaurant Spotlight — cold outreach to unpaid restaurants/bars
 *
 * Targets all active restaurants/bars that:
 *   - Have no Stripe subscription (not paying)
 *   - Have a contact_email or business_email on file
 *   - Are in a restaurant/bar category
 *   - Are not in b2b_unsubscribes
 *
 * After each successful send, upserts a CRM lead and logs the email
 * to email_sends + lead_activities so the team can see it in the dashboard.
 *
 * Counts (as of 2026-04-01):
 *   Lancaster (TasteLanc):        42 emails
 *   Cumberland (TasteCumberland): 46 emails
 *   Total: 88
 *
 * Test (preview to yourself only):
 *   cd apps/web && TEST=1 npx tsx scripts/send-spotlight-outreach.ts
 *
 * Live send:
 *   cd apps/web && npx tsx scripts/send-spotlight-outreach.ts
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import { Resend } from 'resend';
import { createClient } from '@supabase/supabase-js';
import { renderProfessionalEmail, renderProfessionalEmailPlainText } from '../lib/email-templates/professional-template';
import { MARKET_CONFIG } from '../config/market';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM_DOMAIN = 'tastelanc.com';
const REPLY_TO = 'info@tastelanc.com';
const SUMMARY_RECIPIENTS = ['leandertoney@gmail.com', 'jmtoney1987@gmail.com'];

// Leander's auth user ID — used as sent_by / user_id in CRM records
const LEANDER_USER_ID = 'd1b931ce-66ca-40c1-8144-cabf146e006b';

// Restaurant/bar category keywords
const BAR_RESTAURANT_KEYWORDS = [
  'restaurant', 'bar', 'brewery', 'pub',
  'tavern', 'grill', 'bistro', 'steakhouse',
];

interface Recipient {
  restaurantId: string;
  email: string;
  restaurantName: string;
  marketSlug: string;
  marketId: string;
}

async function getRecipients(supabase: ReturnType<typeof createClient>): Promise<Recipient[]> {
  // Fetch unsubscribes to exclude
  const { data: unsubs } = await supabase
    .from('b2b_unsubscribes')
    .select('email');
  const unsubSet = new Set((unsubs ?? []).map((u: any) => u.email.toLowerCase()));

  // Fetch eligible restaurants — paginate to bypass 1000-row Supabase cap
  const allRestaurants: any[] = [];
  const PAGE_SIZE = 1000;
  let offset = 0;
  while (true) {
    const { data, error } = await supabase
      .from('restaurants')
      .select('id, name, contact_email, business_email, stripe_subscription_id, categories, market_id')
      .is('stripe_subscription_id', null)
      .eq('is_active', true)
      .not('categories', 'is', null)
      .range(offset, offset + PAGE_SIZE - 1);
    if (error) throw new Error(`DB query failed: ${error.message}`);
    if (!data || data.length === 0) break;
    allRestaurants.push(...data);
    if (data.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }

  // Fetch markets for slug + id lookup
  const { data: markets } = await supabase
    .from('markets')
    .select('id, slug');
  const marketByIdMap = new Map((markets ?? []).map((m: any) => [m.id, { slug: m.slug, id: m.id }]));

  const seen = new Set<string>();
  const recipients: Recipient[] = [];

  for (const r of allRestaurants) {
    // Prefer contact_email (direct decision-maker) over business_email
    const email = r.contact_email || r.business_email;
    if (!email) continue;

    // Must be a restaurant/bar category
    const cats: string[] = Array.isArray(r.categories) ? r.categories : [];
    const isRestaurantBar = cats.some(cat =>
      BAR_RESTAURANT_KEYWORDS.some(kw => cat.toLowerCase().includes(kw))
    );
    if (!isRestaurantBar) continue;

    const normalized = email.toLowerCase().trim();
    if (unsubSet.has(normalized)) continue;
    if (seen.has(normalized)) continue;
    seen.add(normalized);

    const market = marketByIdMap.get(r.market_id);
    if (!market) continue;

    // Only send to markets with active branded apps
    if (!['lancaster-pa', 'cumberland-pa'].includes(market.slug)) continue;

    recipients.push({
      restaurantId: r.id,
      email: normalized,
      restaurantName: r.name,
      marketSlug: market.slug,
      marketId: market.id,
    });
  }

  return recipients;
}

function buildEmailBody(brandName: string, countyShort: string): string {
  return `Hey!

We run ${brandName}, a ${countyShort}-focused app highlighting real-time restaurant activity — happy hours, events, menus, specials, and more.

If you're interested in being featured, happy to set up a quick meeting to walk you through how it works and what's included.`;
}

/**
 * Upsert a CRM lead for this recipient.
 * Creates a new lead if none exists for this email; returns the existing lead id if one does.
 */
async function upsertLead(
  supabase: ReturnType<typeof createClient>,
  r: Recipient
): Promise<string | null> {
  // Check for existing lead by email (business_leads.email field)
  const { data: existing } = await supabase
    .from('business_leads')
    .select('id')
    .eq('email', r.email)
    .maybeSingle();

  if (existing?.id) return existing.id;

  // Create new lead
  const { data: created, error } = await supabase
    .from('business_leads')
    .insert({
      business_name: r.restaurantName,
      email: r.email,
      category: 'restaurant',
      source: 'directory',
      status: 'contacted',
      market_id: r.marketId,
      restaurant_id: r.restaurantId,
      assigned_to: LEANDER_USER_ID,
      last_contacted_at: new Date().toISOString(),
    })
    .select('id')
    .single();

  if (error) {
    // 23505 = unique violation — another row was inserted between our check and insert
    if (error.code === '23505') {
      const { data: retry } = await supabase
        .from('business_leads')
        .select('id')
        .eq('email', r.email)
        .maybeSingle();
      return retry?.id ?? null;
    }
    console.warn(`  Lead upsert failed for ${r.email}: ${error.message}`);
    return null;
  }

  return created?.id ?? null;
}

/**
 * Log the send to email_sends and lead_activities.
 */
async function logSend(
  supabase: ReturnType<typeof createClient>,
  leadId: string | null,
  r: Recipient,
  subject: string,
  body: string,
  resendId: string
): Promise<void> {
  const senderEmail = `hello@${FROM_DOMAIN}`;
  const brand = MARKET_CONFIG[r.marketSlug];

  // Insert into email_sends
  const { data: sendRecord } = await supabase
    .from('email_sends')
    .insert({
      recipient_email: r.email,
      resend_id: resendId,
      status: 'sent',
      lead_id: leadId,
      sent_by: LEANDER_USER_ID,
      subject,
      sender_name: brand?.name ?? 'TasteLanc',
      sender_email: senderEmail,
      body_text: body,
      headline: subject,
    })
    .select('id')
    .single();

  if (!leadId) return;

  // Log lead activity
  await supabase.from('lead_activities').insert({
    lead_id: leadId,
    user_id: LEANDER_USER_ID,
    activity_type: 'email',
    description: `Sent email: "${subject}"`,
    metadata: {
      subject,
      resend_id: resendId,
      sender_name: brand?.name ?? 'TasteLanc',
      sender_email: senderEmail,
      sent_from: 'spotlight_outreach',
      email_send_id: sendRecord?.id ?? null,
    },
  });

  // Update lead: last_contacted_at + status → 'contacted' if still 'new'
  await supabase
    .from('business_leads')
    .update({
      last_contacted_at: new Date().toISOString(),
      status: 'contacted',
    })
    .eq('id', leadId)
    .in('status', ['new', 'contacted']);
}

async function main() {
  const isTest = !!process.env.TEST;

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const recipients = await getRecipients(supabase);

  // Print counts summary
  const byMarket: Record<string, number> = {};
  for (const r of recipients) {
    byMarket[r.marketSlug] = (byMarket[r.marketSlug] || 0) + 1;
  }
  console.log('\n📊 Recipients by market:');
  for (const [slug, count] of Object.entries(byMarket)) {
    const brand = MARKET_CONFIG[slug];
    console.log(`  ${brand?.name ?? slug} (${slug}): ${count}`);
  }
  console.log(`  Total: ${recipients.length}\n`);

  if (isTest) {
    console.log('TEST MODE — sending preview to leandertoney@gmail.com only (no CRM writes)\n');
    const testMarketSlug = 'lancaster-pa';
    const brand = MARKET_CONFIG[testMarketSlug];
    const ref = Math.floor(10000 + Math.random() * 90000);
    const subject = `RE: Local Restaurant Spotlight — REF#${ref}`;
    const body = buildEmailBody(brand.name, brand.countyShort);

    const html = renderProfessionalEmail({ body, senderName: 'Leander', senderTitle: 'Founder', marketSlug: testMarketSlug });
    const text = renderProfessionalEmailPlainText({ body, senderName: 'Leander', senderTitle: 'Founder', marketSlug: testMarketSlug });

    const { data, error } = await resend.emails.send({
      from: `${brand.name} <hello@${FROM_DOMAIN}>`,
      to: 'leandertoney@gmail.com',
      replyTo: REPLY_TO,
      subject,
      html,
      text,
    });

    if (error) console.error('Error:', error);
    else console.log(`Preview sent — subject: "${subject}" — id: ${data?.id}`);
    return;
  }

  // Live send
  console.log(`Sending to ${recipients.length} recipients...\n`);
  const stats: Record<string, { sent: number; failed: number; leads_created: number }> = {};

  for (const r of recipients) {
    const brand = MARKET_CONFIG[r.marketSlug];
    if (!brand) {
      console.warn(`SKIP: unknown market slug "${r.marketSlug}" for ${r.email}`);
      continue;
    }

    if (!stats[r.marketSlug]) stats[r.marketSlug] = { sent: 0, failed: 0, leads_created: 0 };

    const ref = Math.floor(10000 + Math.random() * 90000);
    const subject = `RE: Local Restaurant Spotlight — REF#${ref}`;
    const body = buildEmailBody(brand.name, brand.countyShort);

    const html = renderProfessionalEmail({ body, senderName: 'Leander', senderTitle: 'Founder', marketSlug: r.marketSlug });
    const text = renderProfessionalEmailPlainText({ body, senderName: 'Leander', senderTitle: 'Founder', marketSlug: r.marketSlug });

    await new Promise(res => setTimeout(res, 300));

    const { data, error } = await resend.emails.send({
      from: `${brand.name} <hello@${FROM_DOMAIN}>`,
      to: r.email,
      replyTo: REPLY_TO,
      subject,
      html,
      text,
    });

    if (error) {
      console.error(`FAILED [${r.marketSlug}]: ${r.email} (${r.restaurantName}) — ${error.message}`);
      stats[r.marketSlug].failed++;
    } else {
      console.log(`Sent [${r.marketSlug}]: ${r.email} (${r.restaurantName}) — id: ${data?.id}`);
      stats[r.marketSlug].sent++;

      // Upsert CRM lead + log activity
      const existingLeadCount = stats[r.marketSlug].leads_created;
      const leadId = await upsertLead(supabase, r);
      if (leadId) {
        await logSend(supabase, leadId, r, subject, body, data!.id);
        // Track if this was a new lead (rough heuristic: check if count changed)
        const { count } = await supabase
          .from('business_leads')
          .select('id', { count: 'exact', head: true })
          .eq('restaurant_id', r.restaurantId)
          .eq('status', 'contacted');
        if ((count ?? 0) > existingLeadCount) stats[r.marketSlug].leads_created++;
      }
    }
  }

  const totalSent = Object.values(stats).reduce((sum, s) => sum + s.sent, 0);
  const totalFailed = Object.values(stats).reduce((sum, s) => sum + s.failed, 0);

  console.log('\n✅ Done.');
  for (const [slug, s] of Object.entries(stats)) {
    const brand = MARKET_CONFIG[slug];
    console.log(`  ${brand?.name ?? slug}: ${s.sent} sent, ${s.failed} failed`);
  }
  console.log('\nAll sends logged to CRM (email_sends + lead_activities).');

  // Send one summary email to the team
  const marketLines = Object.entries(stats)
    .map(([slug, s]) => `${MARKET_CONFIG[slug]?.name ?? slug}: ${s.sent} sent, ${s.failed} failed`)
    .join('<br>');

  await resend.emails.send({
    from: `TasteLanc <hello@${FROM_DOMAIN}>`,
    to: SUMMARY_RECIPIENTS,
    subject: `✅ Spotlight Outreach Complete — ${totalSent} sent, ${totalFailed} failed`,
    html: `<p>Bulk spotlight outreach finished at ${new Date().toLocaleString('en-US', { timeZone: 'America/New_York' })} ET.</p>
<p><strong>Results:</strong><br>${marketLines}</p>
<p>Total: <strong>${totalSent} sent</strong>, ${totalFailed} failed</p>
<p>All leads logged to CRM.</p>`,
  });
  console.log(`\nSummary email sent to team.`);
}

main().catch(console.error);
