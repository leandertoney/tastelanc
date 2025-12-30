import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const resend = new Resend(process.env.RESEND_API_KEY);

async function checkCampaign() {
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

  console.log('\n=== CAMPAIGN DETAILS ===');
  console.log(`ID: ${campaign.id}`);
  console.log(`Name: ${campaign.name}`);
  console.log(`Subject: ${campaign.subject}`);
  console.log(`Status: ${campaign.status}`);
  console.log(`Sent at: ${campaign.sent_at}`);
  console.log(`Total recipients: ${campaign.total_recipients}`);
  console.log(`Total sent: ${campaign.total_sent}`);

  // Check recent Resend emails
  console.log('\n=== RECENT RESEND EMAILS ===');
  try {
    const emails = await resend.emails.list();
    if (emails.data?.data) {
      console.log(`Found ${emails.data.data.length} recent emails in Resend`);
      emails.data.data.slice(0, 5).forEach((email: any) => {
        console.log(`  - ${email.id}: to=${email.to}, subject="${email.subject}", last_event=${email.last_event}`);
      });
    }
  } catch (err) {
    console.log('Error fetching from Resend:', err);
  }

  // Check early_access_signups to see potential recipients
  const { count } = await supabase
    .from('early_access_signups')
    .select('*', { count: 'exact', head: true });

  console.log(`\n=== POTENTIAL RECIPIENTS ===`);
  console.log(`Early access signups: ${count}`);
}

checkCampaign().catch(console.error);
