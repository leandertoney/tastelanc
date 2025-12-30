import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

// Load environment variables from .env.local
config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const resend = new Resend(process.env.RESEND_API_KEY);

async function backfill() {
  console.log('Fetching all email sends with resend_id...');

  // Get all email_sends with resend_id
  const { data: sends, error } = await supabase
    .from('email_sends')
    .select(
      'id, resend_id, campaign_id, scheduled_campaign_id, status, opened_at, clicked_at, bounced_at'
    )
    .not('resend_id', 'is', null);

  if (error) {
    console.error('Error fetching sends:', error);
    return;
  }

  console.log(`Found ${sends?.length || 0} email sends to check`);

  if (!sends || sends.length === 0) {
    console.log('No sends to backfill');
    return;
  }

  let updated = 0;
  let errors = 0;

  for (const send of sends) {
    try {
      const email = await resend.emails.get(send.resend_id!);

      if (email.data) {
        const emailData = email.data as { last_event?: string };
        const updates: Record<string, unknown> = {};
        const lastEvent = emailData.last_event;

        console.log(`Email ${send.resend_id}: last_event = ${lastEvent}`);

        if (lastEvent === 'delivered' && send.status === 'sent') {
          updates.status = 'delivered';
        }

        if (
          (lastEvent === 'opened' || lastEvent === 'clicked') &&
          !send.opened_at
        ) {
          updates.opened_at = new Date().toISOString();
          if (lastEvent === 'opened') {
            updates.status = 'opened';
          }
        }

        if (lastEvent === 'clicked' && !send.clicked_at) {
          updates.status = 'clicked';
          updates.clicked_at = new Date().toISOString();
        }

        if (lastEvent === 'bounced' && send.status !== 'bounced') {
          updates.status = 'bounced';
          updates.bounced_at = new Date().toISOString();
        }

        if (Object.keys(updates).length > 0) {
          console.log(`Updating send ${send.id}:`, updates);
          await supabase.from('email_sends').update(updates).eq('id', send.id);
          updated++;
        }
      }
    } catch (err) {
      console.error(`Error fetching email ${send.resend_id}:`, err);
      errors++;
    }

    // Rate limiting
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  console.log(`\nBackfill complete: ${updated} updated, ${errors} errors`);

  // Get unique campaign IDs to recalculate
  const campaignIds = [
    ...new Set(sends.filter((s) => s.campaign_id).map((s) => s.campaign_id)),
  ];
  const scheduledCampaignIds = [
    ...new Set(
      sends
        .filter((s) => s.scheduled_campaign_id)
        .map((s) => s.scheduled_campaign_id)
    ),
  ];

  console.log(
    `\nRecalculating ${campaignIds.length} campaigns and ${scheduledCampaignIds.length} scheduled campaigns...`
  );

  for (const cid of campaignIds) {
    if (cid) {
      await supabase.rpc('recalculate_campaign_totals', {
        target_campaign_id: cid,
      });
      console.log(`Recalculated campaign ${cid}`);
    }
  }

  for (const scid of scheduledCampaignIds) {
    if (scid) {
      await supabase.rpc('recalculate_scheduled_campaign_totals', {
        target_scheduled_campaign_id: scid,
      });
      console.log(`Recalculated scheduled campaign ${scid}`);
    }
  }

  console.log('\nDone!');
}

backfill().catch(console.error);
