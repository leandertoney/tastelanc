import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkData() {
  // Check email_sends
  const { data: sends, count: sendsCount } = await supabase
    .from('email_sends')
    .select('*', { count: 'exact' })
    .limit(5);

  console.log('\n=== EMAIL SENDS ===');
  console.log(`Total records: ${sendsCount}`);
  if (sends && sends.length > 0) {
    console.log('Sample records:');
    sends.forEach((s) => {
      console.log(
        `  - ${s.recipient_email}: status=${s.status}, resend_id=${s.resend_id || 'NULL'}, campaign_id=${s.campaign_id || 'NULL'}, scheduled_campaign_id=${s.scheduled_campaign_id || 'NULL'}`
      );
    });
  }

  // Check email_campaigns
  const { data: campaigns } = await supabase
    .from('email_campaigns')
    .select('id, name, status, total_sent, total_opened, total_clicked')
    .eq('status', 'sent');

  console.log('\n=== SENT CAMPAIGNS ===');
  if (campaigns && campaigns.length > 0) {
    campaigns.forEach((c) => {
      console.log(
        `  - ${c.name}: sent=${c.total_sent}, opened=${c.total_opened}, clicked=${c.total_clicked}`
      );
    });
  } else {
    console.log('  No sent campaigns found');
  }

  // Check scheduled_campaigns
  const { data: scheduled } = await supabase
    .from('scheduled_campaigns')
    .select('id, name, status, total_sent, total_opened, total_clicked');

  console.log('\n=== SCHEDULED CAMPAIGNS ===');
  if (scheduled && scheduled.length > 0) {
    scheduled.forEach((c) => {
      console.log(
        `  - ${c.name}: status=${c.status}, sent=${c.total_sent}, opened=${c.total_opened || 0}, clicked=${c.total_clicked || 0}`
      );
    });
  } else {
    console.log('  No scheduled campaigns found');
  }
}

checkData().catch(console.error);
