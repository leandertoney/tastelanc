#!/usr/bin/env node

/**
 * iOS Launch Email Campaign
 * Sends the launch announcement to all waitlist members
 *
 * Usage: node scripts/send-ios-launch-email.mjs
 */

import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

// Load environment variables
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const resendApiKey = process.env.RESEND_API_KEY;

if (!supabaseUrl || !supabaseServiceKey || !resendApiKey) {
  console.error('Missing required environment variables');
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, RESEND_API_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);
const resend = new Resend(resendApiKey);

const BATCH_SIZE = 100;
const FROM_EMAIL = 'TasteLanc <noreply@tastelanc.com>';

// iOS Launch email content
const CAMPAIGN = {
  name: 'iOS App Launch Announcement',
  subject: 'TasteLanc is Live! Download Now for iPhone',
  previewText: "The wait is over - discover Lancaster's best dining & nightlife",
  headline: 'TasteLanc is Officially Live!',
  body: `Big news — TasteLanc is now available on the App Store!

After months of building and your amazing support as an early member, we're thrilled to announce that you can download TasteLanc today and start discovering Lancaster's best restaurants, happy hours, and nightlife.

What's waiting for you:
• Real-time happy hours and specials
• Live events across Lancaster
• Rosie, your AI dining assistant
• Rewards for checking in at your favorite spots

As one of our founding members, you've already earned early access perks. Download the app and sign in with the email you used to join the waitlist to unlock them.

Android version coming soon — we'll let you know when it's ready!`,
  ctaText: 'Download for iPhone',
  ctaUrl: 'https://apps.apple.com/us/app/tastelanc/id6755852717',
};

function renderEmail(unsubscribeUrl) {
  const formattedBody = CAMPAIGN.body
    .split('\n\n')
    .map(p => `<p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.6; color: #FFFFFF;">${p.replace(/\n/g, '<br>')}</p>`)
    .join('');

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>TasteLanc</title>
</head>
<body style="margin:0; padding:0; background:#0D0D0D; color:#FFFFFF; font-family: Arial, sans-serif;">
  <div style="display:none; max-height:0; overflow:hidden;">${CAMPAIGN.previewText}</div>

  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#0D0D0D;">
    <tr>
      <td align="center" style="padding: 32px 16px;">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="max-width:600px; width:100%;">
          <!-- Logo -->
          <tr>
            <td align="center" style="padding-bottom: 32px;">
              <img src="https://tastelanc.com/images/tastelanc_new_dark.png" width="160" alt="TasteLanc" style="display:block;" />
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 0 16px;">
              <h1 style="margin: 0 0 24px 0; font-size: 28px; font-weight: 700; color: #FFFFFF; text-align: center;">
                ${CAMPAIGN.headline}
              </h1>

              ${formattedBody}

              <!-- CTA Button -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin: 32px 0;">
                <tr>
                  <td align="center">
                    <a href="${CAMPAIGN.ctaUrl}" target="_blank" style="display: inline-block; background: #E63946; color: #FFFFFF; padding: 16px 40px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px;">
                      ${CAMPAIGN.ctaText}
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Footer -->
              <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #1F1F1F; text-align: center;">
                <p style="margin: 0; font-size: 12px; color: #888888;">
                  You're receiving this because you joined the TasteLanc waitlist.
                  <br><br>
                  <a href="${unsubscribeUrl}" style="color: #888888;">Unsubscribe</a>
                </p>
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

async function main() {
  console.log('🚀 iOS Launch Email Campaign');
  console.log('============================\n');

  // 1. Get all recipients (excluding unsubscribed)
  console.log('📋 Fetching recipients...');

  const { data: recipients, error: recipientsError } = await supabase
    .from('early_access_signups')
    .select('id, email');

  if (recipientsError) {
    console.error('Failed to fetch recipients:', recipientsError);
    process.exit(1);
  }

  // Get unsubscribed emails
  const { data: unsubscribes } = await supabase
    .from('email_unsubscribes')
    .select('email');

  const unsubscribedEmails = new Set(
    (unsubscribes || []).map(u => u.email.toLowerCase())
  );

  const activeRecipients = recipients.filter(
    r => !unsubscribedEmails.has(r.email.toLowerCase())
  );

  console.log(`Found ${recipients.length} total signups`);
  console.log(`${unsubscribedEmails.size} unsubscribed`);
  console.log(`${activeRecipients.length} will receive the email\n`);

  if (activeRecipients.length === 0) {
    console.log('No recipients to send to. Exiting.');
    process.exit(0);
  }

  // 2. Create campaign record
  console.log('📝 Creating campaign record...');

  const { data: campaign, error: campaignError } = await supabase
    .from('email_campaigns')
    .insert({
      name: CAMPAIGN.name,
      subject: CAMPAIGN.subject,
      preview_text: CAMPAIGN.previewText,
      headline: CAMPAIGN.headline,
      body: CAMPAIGN.body,
      cta_text: CAMPAIGN.ctaText,
      cta_url: CAMPAIGN.ctaUrl,
      segment: 'all',
      status: 'sending',
      total_recipients: activeRecipients.length,
    })
    .select()
    .single();

  if (campaignError) {
    console.error('Failed to create campaign:', campaignError);
    process.exit(1);
  }

  console.log(`Campaign created: ${campaign.id}\n`);

  // 3. Send emails in batches
  console.log('📧 Sending emails...\n');

  let totalSent = 0;
  let totalFailed = 0;
  const sendRecords = [];

  for (let i = 0; i < activeRecipients.length; i += BATCH_SIZE) {
    const batch = activeRecipients.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(activeRecipients.length / BATCH_SIZE);

    console.log(`Batch ${batchNum}/${totalBatches} (${batch.length} emails)...`);

    const emailsToSend = batch.map(recipient => {
      const unsubscribeUrl = `https://tastelanc.com/api/unsubscribe?email=${encodeURIComponent(recipient.email)}&campaign=${campaign.id}`;
      return {
        from: FROM_EMAIL,
        to: recipient.email,
        subject: CAMPAIGN.subject,
        html: renderEmail(unsubscribeUrl),
      };
    });

    try {
      const result = await resend.batch.send(emailsToSend);

      // Resend batch returns { data: { data: [...] } } structure
      const batchData = result.data?.data || result.data;

      if (batchData && Array.isArray(batchData)) {
        batchData.forEach((sendResult, index) => {
          const recipient = batch[index];
          if (sendResult && 'id' in sendResult) {
            totalSent++;
            sendRecords.push({
              campaign_id: campaign.id,
              recipient_email: recipient.email,
              recipient_id: recipient.id,
              resend_id: sendResult.id,
              status: 'sent',
              error_message: null,
            });
          } else {
            totalFailed++;
            sendRecords.push({
              campaign_id: campaign.id,
              recipient_email: recipient.email,
              recipient_id: recipient.id,
              resend_id: null,
              status: 'failed',
              error_message: sendResult?.error?.message || 'Unknown error',
            });
          }
        });
        console.log(`  ✓ Sent ${batchData.length} emails`);
      } else if (result.error) {
        console.error(`  ✗ Batch failed:`, result.error.message);
        batch.forEach(recipient => {
          totalFailed++;
          sendRecords.push({
            campaign_id: campaign.id,
            recipient_email: recipient.email,
            recipient_id: recipient.id,
            resend_id: null,
            status: 'failed',
            error_message: result.error.message,
          });
        });
      } else {
        console.error(`  ✗ Unexpected response format`);
      }
    } catch (error) {
      console.error(`  Batch exception:`, error.message);
      batch.forEach(recipient => {
        totalFailed++;
        sendRecords.push({
          campaign_id: campaign.id,
          recipient_email: recipient.email,
          recipient_id: recipient.id,
          resend_id: null,
          status: 'failed',
          error_message: error.message,
        });
      });
    }

    // Small delay between batches
    if (i + BATCH_SIZE < activeRecipients.length) {
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  }

  // 4. Save send records
  if (sendRecords.length > 0) {
    await supabase.from('email_sends').insert(sendRecords);
  }

  // 5. Update campaign status
  await supabase
    .from('email_campaigns')
    .update({
      status: 'sent',
      total_sent: totalSent,
      sent_at: new Date().toISOString(),
    })
    .eq('id', campaign.id);

  // 6. Summary
  console.log('\n============================');
  console.log('✅ Campaign Complete!\n');
  console.log(`Total Recipients: ${activeRecipients.length}`);
  console.log(`Successfully Sent: ${totalSent}`);
  console.log(`Failed: ${totalFailed}`);
  console.log(`\nCampaign ID: ${campaign.id}`);
}

main().catch(console.error);
