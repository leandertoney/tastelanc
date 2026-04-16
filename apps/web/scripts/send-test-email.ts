import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import {
  renderPlatformCampaign,
  renderPlatformCampaignPlainText,
} from '../lib/email-templates/platform-campaign-template';
import { getMarketConfig } from '../config/market';

const SUPABASE_URL = 'https://kufcxxynjvyharhtfptd.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt1ZmN4eHluanZ5aGFyaHRmcHRkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Njg1MTk4OSwiZXhwIjoyMDgyNDI3OTg5fQ.9wZNnGz5nSxK-RDj41GRXu3s1IG0DZ-Iv5tozPZC6GY';
const CAMPAIGN_ID = '22c44e95-0628-48d9-80ad-936853b75c9e';
const TEST_EMAIL = 'leandertoney@gmail.com';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function sendTestEmail() {
  console.log('📧 Sending test email...\n');

  // Get Resend API key from environment
  const resendApiKey = process.env.RESEND_API_KEY;
  if (!resendApiKey) {
    console.error('❌ RESEND_API_KEY not found in environment');
    console.error('   Please set RESEND_API_KEY in apps/web/.env.local');
    process.exit(1);
  }

  const resend = new Resend(resendApiKey);

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

  console.log('✅ Campaign loaded:');
  console.log(`   Name: ${campaign.name}`);
  console.log(`   Subject: ${campaign.subject}`);
  console.log(`   Status: ${campaign.status}`);

  // Resolve market brand
  const marketData = campaign.market as { slug: string; name: string } | null;
  const marketSlug = marketData?.slug || '';
  const brand = getMarketConfig(marketSlug);

  if (!brand) {
    console.error('❌ Market config not found for:', marketSlug);
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

  const unsubscribeUrl = `${baseUrl}/api/unsubscribe?type=platform&email=${encodeURIComponent(TEST_EMAIL)}`;

  // Render email
  const html = renderPlatformCampaign({
    recipientName: undefined, // Send as "Hi there," for test
    body: campaign.body,
    ctaText: campaign.cta_text || undefined,
    ctaUrl: campaign.cta_url || undefined,
    previewText: campaign.preview_text || undefined,
    unsubscribeUrl,
    ...brandProps,
  });

  const text = renderPlatformCampaignPlainText({
    recipientName: undefined,
    body: campaign.body,
    ctaText: campaign.cta_text || undefined,
    ctaUrl: campaign.cta_url || undefined,
    unsubscribeUrl,
    ...brandProps,
  });

  console.log(`\n📤 Sending test email to: ${TEST_EMAIL}`);
  console.log(`   From: ${fromAddress}`);
  console.log(`   Subject: ${campaign.subject}`);

  // Send via Resend
  try {
    const { data, error } = await resend.emails.send({
      from: fromAddress,
      to: TEST_EMAIL,
      subject: campaign.subject,
      html,
      text,
    });

    if (error) {
      console.error('❌ Resend error:', error);
      process.exit(1);
    }

    console.log('\n✅ Test email sent successfully!');
    console.log(`   Resend ID: ${data?.id}`);
    console.log(`\n📬 Check your inbox at ${TEST_EMAIL}`);
    console.log('\n📝 This email shows EXACTLY how recipients will see it.');
    console.log('   Campaign status remains "draft" - ready to send to full audience after approval.');
  } catch (err) {
    console.error('❌ Error sending email:', err);
    process.exit(1);
  }
}

sendTestEmail().catch(console.error);
