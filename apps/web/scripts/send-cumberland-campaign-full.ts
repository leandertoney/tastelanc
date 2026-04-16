import { createClient } from '@supabase/supabase-js';
import { sendBatchEmails } from '../lib/resend';
import {
  renderPlatformCampaign,
  renderPlatformCampaignPlainText,
} from '../lib/email-templates/platform-campaign-template';
import { getMarketConfig } from '../config/market';

const SUPABASE_URL = 'https://kufcxxynjvyharhtfptd.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt1ZmN4eHluanZ5aGFyaHRmcHRkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Njg1MTk4OSwiZXhwIjoyMDgyNDI3OTg5fQ.9wZNnGz5nSxK-RDj41GRXu3s1IG0DZ-Iv5tozPZC6GY';
const CAMPAIGN_ID = '22c44e95-0628-48d9-80ad-936853b75c9e';
const CUMBERLAND_MARKET_ID = '0602afe2-fae2-4e46-af2c-7b374bfc9d45';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function sendFullCampaign() {
  console.log('📧 Sending Cumberland Welcome Campaign to Full Audience...\n');

  // Get campaign
  const { data: campaign, error: campaignError } = await supabase
    .from('platform_email_campaigns')
    .select('*, market:markets(slug, name)')
    .eq('id', CAMPAIGN_ID)
    .single();

  if (campaignError || !campaign) {
    console.error('❌ Campaign not found:', campaignError?.message);
    process.exit(1);
  }

  if (campaign.status !== 'draft') {
    console.error('❌ Campaign has already been sent (status:', campaign.status, ')');
    process.exit(1);
  }

  console.log('✅ Campaign loaded:');
  console.log(`   Name: ${campaign.name}`);
  console.log(`   Subject: ${campaign.subject}\n`);

  // Mark campaign as sending
  await supabase
    .from('platform_email_campaigns')
    .update({ status: 'sending' })
    .eq('id', CAMPAIGN_ID);

  // Get all Cumberland contacts who DON'T have the app
  console.log('🔍 Finding Cumberland contacts without the app...');

  // First get all Cumberland contacts
  const { data: allContacts, error: contactsError } = await supabase
    .from('platform_contacts')
    .select('id, email, name')
    .eq('market_id', CUMBERLAND_MARKET_ID)
    .eq('is_unsubscribed', false);

  if (contactsError || !allContacts) {
    console.error('❌ Error fetching contacts:', contactsError?.message);
    await supabase
      .from('platform_email_campaigns')
      .update({ status: 'failed' })
      .eq('id', CAMPAIGN_ID);
    process.exit(1);
  }

  console.log(`   Total Cumberland contacts: ${allContacts.length}`);

  // Check which emails exist in auth.users (have the app)
  const { data: appUsers, error: usersError } = await supabase
    .from('profiles')
    .select('email')
    .in('email', allContacts.map(c => c.email));

  if (usersError) {
    console.error('❌ Error checking app users:', usersError.message);
  }

  const appUserEmails = new Set(appUsers?.map(u => u.email) || []);

  // Filter to only contacts without the app
  const contactsWithoutApp = allContacts.filter(c => !appUserEmails.has(c.email));

  console.log(`   Contacts with app: ${appUserEmails.size}`);
  console.log(`   Contacts without app: ${contactsWithoutApp.length}\n`);

  if (contactsWithoutApp.length === 0) {
    console.log('⚠️  No contacts without the app - aborting send');
    await supabase
      .from('platform_email_campaigns')
      .update({ status: 'draft' })
      .eq('id', CAMPAIGN_ID);
    process.exit(0);
  }

  console.log(`📤 Sending to ${contactsWithoutApp.length} recipients...\n`);

  // Resolve market brand
  const marketData = campaign.market as { slug: string; name: string } | null;
  const marketSlug = marketData?.slug || '';
  const brand = getMarketConfig(marketSlug);

  if (!brand) {
    console.error('❌ Market config not found');
    process.exit(1);
  }

  const fromAddress = `${brand.name} <campaigns@tastelanc.com>`;
  const baseUrl = `https://${brand.domain}`;

  const brandProps = {
    brandName: brand.name,
    brandDomain: brand.domain,
    brandLogoUrl: `https://${brand.domain}${brand.logoPath}`,
    appStoreUrl: brand.appStoreUrls.ios || undefined,
    playStoreUrl: brand.appStoreUrls.android || undefined,
  };

  // Build emails
  const emails = contactsWithoutApp.map((contact) => {
    const unsubscribeUrl = `${baseUrl}/api/unsubscribe?type=platform&email=${encodeURIComponent(contact.email)}`;

    const html = renderPlatformCampaign({
      recipientName: contact.name || undefined,
      body: campaign.body,
      ctaText: campaign.cta_text || undefined,
      ctaUrl: campaign.cta_url || undefined,
      previewText: campaign.preview_text || undefined,
      unsubscribeUrl,
      ...brandProps,
    });

    const text = renderPlatformCampaignPlainText({
      recipientName: contact.name || undefined,
      body: campaign.body,
      ctaText: campaign.cta_text || undefined,
      ctaUrl: campaign.cta_url || undefined,
      unsubscribeUrl,
      ...brandProps,
    });

    return {
      to: contact.email,
      subject: campaign.subject,
      html,
      text,
      from: fromAddress,
    };
  });

  console.log('📬 Sending via Resend (batches of 100)...');

  // Send via Resend
  const results = await sendBatchEmails(emails);

  // Extract Resend IDs
  const resendIds: string[] = [];
  for (const result of results) {
    const r = result as Record<string, unknown>;
    if (r.error) {
      console.error('❌ Resend batch error:', r.error);
    } else if (r.data && Array.isArray(r.data)) {
      for (const item of r.data as { id?: string }[]) {
        if (item.id) resendIds.push(item.id);
      }
    } else if (r.data && (r.data as { id?: string }).id) {
      resendIds.push((r.data as { id: string }).id);
    }
  }

  console.log(`\n✅ Sent ${resendIds.length} emails successfully`);

  if (resendIds.length === 0) {
    console.error('❌ No emails sent - marking campaign as failed');
    await supabase
      .from('platform_email_campaigns')
      .update({ status: 'failed' })
      .eq('id', CAMPAIGN_ID);
    process.exit(1);
  }

  // Track sends
  console.log('💾 Recording sends in database...');
  const sendRecords = contactsWithoutApp.map((contact, i) => ({
    campaign_id: CAMPAIGN_ID,
    contact_id: contact.id,
    email: contact.email,
    status: 'sent',
    resend_id: resendIds[i] || null,
    sent_at: new Date().toISOString(),
  }));

  if (sendRecords.length > 0) {
    await supabase.from('platform_email_sends').insert(sendRecords);
  }

  // Update campaign
  await supabase
    .from('platform_email_campaigns')
    .update({
      status: 'sent',
      recipient_count: contactsWithoutApp.length,
      sent_count: resendIds.length,
      sent_at: new Date().toISOString(),
    })
    .eq('id', CAMPAIGN_ID);

  console.log('\n🎉 Campaign sent successfully!');
  console.log(`   Total recipients: ${contactsWithoutApp.length}`);
  console.log(`   Successfully sent: ${resendIds.length}`);
  console.log(`   Campaign status: sent\n`);
}

sendFullCampaign().catch(console.error);
