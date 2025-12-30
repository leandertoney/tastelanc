import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const resend = new Resend(process.env.RESEND_API_KEY);

async function backfillFromResend() {
  // Get the sent campaign
  const { data: campaign } = await supabase
    .from('email_campaigns')
    .select('*')
    .eq('status', 'sent')
    .single();

  if (!campaign) {
    console.log('No sent campaign found');
    return;
  }

  console.log(`\nBackfilling campaign: ${campaign.name}`);
  console.log(`Campaign ID: ${campaign.id}`);
  console.log(`Subject: ${campaign.subject}`);

  // Get all emails from Resend
  console.log('\nFetching emails from Resend...');
  const emails = await resend.emails.list();

  if (!emails.data?.data) {
    console.log('No emails found in Resend');
    return;
  }

  // Filter emails matching the campaign subject
  const campaignEmails = emails.data.data.filter(
    (e: any) => e.subject === campaign.subject
  );

  console.log(`Found ${campaignEmails.length} emails matching campaign subject`);

  // Get recipient lookup from early_access_signups
  const { data: signups } = await supabase
    .from('early_access_signups')
    .select('id, email');

  const emailToId = new Map(
    (signups || []).map((s) => [s.email.toLowerCase(), s.id])
  );

  // Create email_sends records
  const sendRecords = campaignEmails.map((email: any) => {
    const recipientEmail = Array.isArray(email.to) ? email.to[0] : email.to;
    const recipientId = emailToId.get(recipientEmail?.toLowerCase());

    return {
      campaign_id: campaign.id,
      recipient_email: recipientEmail,
      recipient_id: recipientId || null,
      resend_id: email.id,
      status: email.last_event === 'opened' ? 'opened' :
              email.last_event === 'clicked' ? 'clicked' :
              email.last_event === 'bounced' ? 'bounced' :
              email.last_event === 'delivered' ? 'delivered' : 'sent',
      sent_at: email.created_at,
      opened_at: email.last_event === 'opened' || email.last_event === 'clicked'
        ? new Date().toISOString()
        : null,
      clicked_at: email.last_event === 'clicked'
        ? new Date().toISOString()
        : null,
      bounced_at: email.last_event === 'bounced'
        ? new Date().toISOString()
        : null,
    };
  });

  console.log(`\nCreating ${sendRecords.length} email_sends records...`);

  // Insert records
  const { error: insertError } = await supabase
    .from('email_sends')
    .insert(sendRecords);

  if (insertError) {
    console.error('Error inserting records:', insertError);
    return;
  }

  console.log('Records created successfully');

  // Recalculate campaign totals
  console.log('\nRecalculating campaign totals...');
  await supabase.rpc('recalculate_campaign_totals', {
    target_campaign_id: campaign.id,
  });

  // Verify the update
  const { data: updated } = await supabase
    .from('email_campaigns')
    .select('total_sent, total_opened, total_clicked, total_bounced')
    .eq('id', campaign.id)
    .single();

  console.log('\n=== UPDATED CAMPAIGN STATS ===');
  console.log(`Total sent: ${updated?.total_sent}`);
  console.log(`Total opened: ${updated?.total_opened}`);
  console.log(`Total clicked: ${updated?.total_clicked}`);
  console.log(`Total bounced: ${updated?.total_bounced}`);

  console.log('\nDone!');
}

backfillFromResend().catch(console.error);
