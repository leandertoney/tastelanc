import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { verifyAdminAccess } from '@/lib/auth/admin-access';
import { resend } from '@/lib/resend';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    let admin;
    try { admin = await verifyAdminAccess(supabase); }
    catch (err: any) { return NextResponse.json({ error: err.message }, { status: err.status || 500 }); }

    const body = await request.json();
    const { campaignId, scheduledCampaignId } = body;

    if (!campaignId && !scheduledCampaignId) {
      return NextResponse.json(
        { error: 'Campaign ID or Scheduled Campaign ID is required' },
        { status: 400 }
      );
    }

    // Get all email_sends for this campaign with resend_id
    let query = supabase
      .from('email_sends')
      .select('id, resend_id, campaign_id, scheduled_campaign_id, status, opened_at, clicked_at, bounced_at')
      .not('resend_id', 'is', null);

    if (campaignId) {
      query = query.eq('campaign_id', campaignId);
    } else if (scheduledCampaignId) {
      query = query.eq('scheduled_campaign_id', scheduledCampaignId);
    }

    const { data: sends, error: fetchError } = await query;

    if (fetchError) {
      console.error('Error fetching sends:', fetchError);
      return NextResponse.json({ error: 'Failed to fetch email sends' }, { status: 500 });
    }

    if (!sends || sends.length === 0) {
      return NextResponse.json({
        error: 'No emails found with Resend IDs for this campaign',
      }, { status: 404 });
    }

    let updated = 0;
    let errors = 0;
    const errorDetails: string[] = [];

    for (const send of sends) {
      try {
        // Fetch email details from Resend API
        const email = await resend.emails.get(send.resend_id!);

        if (email.data) {
          const emailData = email.data as {
            last_event?: string;
            created_at?: string;
          };
          const updates: Record<string, unknown> = {};

          // Check delivery/open/click events based on last_event field
          const lastEvent = emailData.last_event;

          if (lastEvent === 'delivered' && send.status === 'sent') {
            updates.status = 'delivered';
          }

          if ((lastEvent === 'opened' || lastEvent === 'clicked') && !send.opened_at) {
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
            await supabase
              .from('email_sends')
              .update(updates)
              .eq('id', send.id);
            updated++;
          }
        }
      } catch (err) {
        console.error(`Error fetching email ${send.resend_id}:`, err);
        errors++;
        errorDetails.push(`Failed to fetch ${send.resend_id}`);
      }

      // Rate limiting - Resend API has limits (add 100ms delay between requests)
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    // After updating individual sends, recalculate campaign totals
    if (campaignId) {
      await supabase.rpc('recalculate_campaign_totals', {
        target_campaign_id: campaignId,
      });
    } else if (scheduledCampaignId) {
      await supabase.rpc('recalculate_scheduled_campaign_totals', {
        target_scheduled_campaign_id: scheduledCampaignId,
      });
    }

    return NextResponse.json({
      success: true,
      processed: sends.length,
      updated,
      errors,
      errorDetails: errors > 0 ? errorDetails.slice(0, 10) : undefined,
    });
  } catch (error) {
    console.error('Backfill error:', error);
    return NextResponse.json({ error: 'Backfill failed' }, { status: 500 });
  }
}
