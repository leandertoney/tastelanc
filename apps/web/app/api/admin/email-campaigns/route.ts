import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getRecipientCount } from '@/lib/resend';

export async function GET() {
  try {
    const supabase = await createClient();

    // Verify user is admin
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

    // Fetch all campaigns with stats
    const { data: campaigns, error } = await supabase
      .from('email_campaigns')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching campaigns:', error);
      return NextResponse.json(
        { error: 'Failed to fetch campaigns' },
        { status: 500 }
      );
    }

    // Get recipient counts for each segment
    const recipientCounts = {
      all: await getRecipientCount(supabase, 'all'),
      unconverted: await getRecipientCount(supabase, 'unconverted'),
      converted: await getRecipientCount(supabase, 'converted'),
    };

    // Calculate aggregate stats
    const totalCampaigns = campaigns?.length || 0;
    const sentCampaigns = campaigns?.filter((c) => c.status === 'sent') || [];
    const totalSent = sentCampaigns.reduce((acc, c) => acc + (c.total_sent || 0), 0);
    const totalOpened = sentCampaigns.reduce((acc, c) => acc + (c.total_opened || 0), 0);
    const totalClicked = sentCampaigns.reduce((acc, c) => acc + (c.total_clicked || 0), 0);
    const openRate = totalSent > 0 ? ((totalOpened / totalSent) * 100).toFixed(1) : '0';
    const clickRate = totalOpened > 0 ? ((totalClicked / totalOpened) * 100).toFixed(1) : '0';

    return NextResponse.json({
      campaigns: campaigns || [],
      stats: {
        totalCampaigns,
        totalSent,
        totalOpened,
        totalClicked,
        openRate,
        clickRate,
      },
      recipientCounts,
    });
  } catch (error) {
    console.error('Error in campaigns API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    // Verify user is admin
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
    const { name, subject, previewText, headline, body: emailBody, ctaText, ctaUrl, segment } = body;

    // Validate required fields
    if (!name || !subject || !headline || !emailBody) {
      return NextResponse.json(
        { error: 'Missing required fields: name, subject, headline, body' },
        { status: 400 }
      );
    }

    // Get recipient count for the segment
    const totalRecipients = await getRecipientCount(
      supabase,
      segment || 'unconverted'
    );

    // Create campaign
    const { data: campaign, error } = await supabase
      .from('email_campaigns')
      .insert({
        name,
        subject,
        preview_text: previewText || null,
        headline,
        body: emailBody,
        cta_text: ctaText || null,
        cta_url: ctaUrl || null,
        segment: segment || 'unconverted',
        status: 'draft',
        total_recipients: totalRecipients,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating campaign:', error);
      return NextResponse.json(
        { error: 'Failed to create campaign' },
        { status: 500 }
      );
    }

    return NextResponse.json({ campaign });
  } catch (error) {
    console.error('Error in create campaign API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
