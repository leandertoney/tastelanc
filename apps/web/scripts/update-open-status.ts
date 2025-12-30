import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const resend = new Resend(process.env.RESEND_API_KEY);

async function updateOpenStatus() {
  // Get all email_sends with resend_id
  const { data: sends } = await supabase
    .from('email_sends')
    .select('id, resend_id, campaign_id, status, opened_at, clicked_at')
    .not('resend_id', 'is', null);

  if (!sends || sends.length === 0) {
    console.log('No sends to check');
    return;
  }

  console.log(`Checking ${sends.length} emails for open/click status...\n`);

  let updated = 0;

  for (const send of sends) {
    try {
      // Get detailed email status from Resend
      const email = await resend.emails.get(send.resend_id!);

      if (email.data) {
        const data = email.data as any;
        const updates: Record<string, any> = {};

        console.log(`${send.resend_id}: last_event=${data.last_event}`);

        if (data.last_event === 'opened' && !send.opened_at) {
          updates.status = 'opened';
          updates.opened_at = new Date().toISOString();
        }

        if (data.last_event === 'clicked') {
          updates.status = 'clicked';
          if (!send.clicked_at) {
            updates.clicked_at = new Date().toISOString();
          }
          if (!send.opened_at) {
            updates.opened_at = new Date().toISOString();
          }
        }

        if (data.last_event === 'bounced' && send.status !== 'bounced') {
          updates.status = 'bounced';
          updates.bounced_at = new Date().toISOString();
        }

        if (Object.keys(updates).length > 0) {
          await supabase.from('email_sends').update(updates).eq('id', send.id);
          updated++;
          console.log(`  -> Updated: ${JSON.stringify(updates)}`);
        }
      }

      // Rate limiting
      await new Promise((r) => setTimeout(r, 100));
    } catch (err) {
      console.error(`Error checking ${send.resend_id}:`, err);
    }
  }

  console.log(`\nUpdated ${updated} records`);

  // Get the campaign ID to recalculate
  if (sends.length > 0 && sends[0].campaign_id) {
    console.log('\nRecalculating campaign totals...');
    await supabase.rpc('recalculate_campaign_totals', {
      target_campaign_id: sends[0].campaign_id,
    });

    const { data: campaign } = await supabase
      .from('email_campaigns')
      .select('name, total_sent, total_opened, total_clicked, total_bounced')
      .eq('id', sends[0].campaign_id)
      .single();

    console.log('\n=== FINAL CAMPAIGN STATS ===');
    console.log(`Campaign: ${campaign?.name}`);
    console.log(`Sent: ${campaign?.total_sent}`);
    console.log(`Opened: ${campaign?.total_opened}`);
    console.log(`Clicked: ${campaign?.total_clicked}`);
    console.log(`Bounced: ${campaign?.total_bounced}`);

    if (campaign) {
      const openRate = campaign.total_sent > 0
        ? ((campaign.total_opened / campaign.total_sent) * 100).toFixed(1)
        : 0;
      const clickRate = campaign.total_opened > 0
        ? ((campaign.total_clicked / campaign.total_opened) * 100).toFixed(1)
        : 0;
      console.log(`\nOpen Rate: ${openRate}%`);
      console.log(`Click Rate: ${clickRate}%`);
    }
  }
}

updateOpenStatus().catch(console.error);
