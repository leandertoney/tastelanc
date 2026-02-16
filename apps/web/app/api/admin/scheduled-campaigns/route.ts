import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { verifyAdminAccess } from '@/lib/auth/admin-access';

export async function GET(request: Request) {
  try {
    const supabase = await createClient();

    let admin;
    try { admin = await verifyAdminAccess(supabase); }
    catch (err: any) { return NextResponse.json({ error: err.message }, { status: err.status || 500 }); }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    let query = supabase
      .from('scheduled_campaigns')
      .select('*, email_templates(name)')
      .order('created_at', { ascending: false });

    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    const { data: campaigns, error } = await query;

    if (error) {
      console.error('Error fetching scheduled campaigns:', error);
      return NextResponse.json(
        { error: 'Failed to fetch campaigns' },
        { status: 500 }
      );
    }

    return NextResponse.json({ campaigns: campaigns || [] });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    let admin;
    try { admin = await verifyAdminAccess(supabase); }
    catch (err: any) { return NextResponse.json({ error: err.message }, { status: err.status || 500 }); }

    const body = await request.json();
    const {
      name,
      campaign_type,
      target_audience,
      scheduled_at,
      countdown_target_date,
      days_before,
      trigger_event,
      trigger_delay_minutes,
      template_id,
      subject,
      preview_text,
      headline,
      body: emailBody,
      cta_text,
      cta_url,
      business_lead_filter,
    } = body;

    // Validate required fields
    if (!name || !campaign_type || !target_audience) {
      return NextResponse.json(
        { error: 'Name, campaign type, and target audience are required' },
        { status: 400 }
      );
    }

    // Calculate next_run_at based on campaign type
    let next_run_at: string | null = null;

    if (campaign_type === 'scheduled' && scheduled_at) {
      next_run_at = scheduled_at;
    } else if (
      campaign_type === 'countdown' &&
      countdown_target_date &&
      days_before
    ) {
      const targetDate = new Date(countdown_target_date);
      targetDate.setDate(targetDate.getDate() - days_before);
      targetDate.setHours(10, 0, 0, 0); // Send at 10 AM
      next_run_at = targetDate.toISOString();
    }
    // Trigger campaigns don't have a next_run_at

    const { data: campaign, error } = await supabase
      .from('scheduled_campaigns')
      .insert({
        name,
        campaign_type,
        target_audience,
        scheduled_at: scheduled_at || null,
        countdown_target_date: countdown_target_date || null,
        days_before: days_before || null,
        trigger_event: trigger_event || null,
        trigger_delay_minutes: trigger_delay_minutes || 0,
        template_id: template_id || null,
        subject: subject || null,
        preview_text: preview_text || null,
        headline: headline || null,
        body: emailBody || null,
        cta_text: cta_text || null,
        cta_url: cta_url || null,
        business_lead_filter: business_lead_filter || null,
        next_run_at,
        status: 'active',
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating scheduled campaign:', error);
      return NextResponse.json(
        { error: 'Failed to create campaign' },
        { status: 500 }
      );
    }

    return NextResponse.json({ campaign });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
