import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    // Verify admin
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isAdmin = user.email === 'admin@tastelanc.com';
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { campaignId, scheduledCampaignId, recalculateAll } = body;

    let campaignsUpdated = 0;
    let scheduledCampaignsUpdated = 0;

    // Recalculate specific campaign
    if (campaignId) {
      const { error } = await supabase.rpc('recalculate_campaign_totals', {
        target_campaign_id: campaignId,
      });
      if (!error) {
        campaignsUpdated = 1;
      }
    }

    // Recalculate specific scheduled campaign
    if (scheduledCampaignId) {
      const { error } = await supabase.rpc('recalculate_scheduled_campaign_totals', {
        target_scheduled_campaign_id: scheduledCampaignId,
      });
      if (!error) {
        scheduledCampaignsUpdated = 1;
      }
    }

    // Recalculate all campaigns if requested
    if (recalculateAll) {
      // Get all sent campaigns
      const { data: campaigns } = await supabase
        .from('email_campaigns')
        .select('id')
        .eq('status', 'sent');

      for (const campaign of campaigns || []) {
        const { error } = await supabase.rpc('recalculate_campaign_totals', {
          target_campaign_id: campaign.id,
        });
        if (!error) {
          campaignsUpdated++;
        }
      }

      // Get all scheduled campaigns with sends
      const { data: scheduledCampaigns } = await supabase
        .from('scheduled_campaigns')
        .select('id')
        .gt('total_sent', 0);

      for (const campaign of scheduledCampaigns || []) {
        const { error } = await supabase.rpc('recalculate_scheduled_campaign_totals', {
          target_scheduled_campaign_id: campaign.id,
        });
        if (!error) {
          scheduledCampaignsUpdated++;
        }
      }
    }

    return NextResponse.json({
      success: true,
      campaignsUpdated,
      scheduledCampaignsUpdated,
    });
  } catch (error) {
    console.error('Recalculate error:', error);
    return NextResponse.json({ error: 'Recalculation failed' }, { status: 500 });
  }
}
