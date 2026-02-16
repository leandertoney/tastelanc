import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { verifyAdminAccess } from '@/lib/auth/admin-access';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    let admin;
    try { admin = await verifyAdminAccess(supabase); }
    catch (err: any) { return NextResponse.json({ error: err.message }, { status: err.status || 500 }); }

    // Fetch campaign
    const { data: campaign, error } = await supabase
      .from('email_campaigns')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !campaign) {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      );
    }

    // Fetch send history
    const { data: sends } = await supabase
      .from('email_sends')
      .select('*')
      .eq('campaign_id', id)
      .order('sent_at', { ascending: false })
      .limit(100);

    return NextResponse.json({
      campaign,
      sends: sends || [],
    });
  } catch (error) {
    console.error('Error fetching campaign:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    let admin;
    try { admin = await verifyAdminAccess(supabase); }
    catch (err: any) { return NextResponse.json({ error: err.message }, { status: err.status || 500 }); }

    const body = await request.json();
    const { name, subject, previewText, headline, body: emailBody, ctaText, ctaUrl, segment } = body;

    // Update campaign (only if draft)
    const { data: campaign, error } = await supabase
      .from('email_campaigns')
      .update({
        name,
        subject,
        preview_text: previewText,
        headline,
        body: emailBody,
        cta_text: ctaText,
        cta_url: ctaUrl,
        segment,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('status', 'draft') // Only allow editing drafts
      .select()
      .single();

    if (error) {
      console.error('Error updating campaign:', error);
      return NextResponse.json(
        { error: 'Failed to update campaign or campaign already sent' },
        { status: 400 }
      );
    }

    return NextResponse.json({ campaign });
  } catch (error) {
    console.error('Error updating campaign:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    let admin;
    try { admin = await verifyAdminAccess(supabase); }
    catch (err: any) { return NextResponse.json({ error: err.message }, { status: err.status || 500 }); }

    // Delete campaign (cascades to email_sends)
    const { error } = await supabase
      .from('email_campaigns')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting campaign:', error);
      return NextResponse.json(
        { error: 'Failed to delete campaign' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting campaign:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
