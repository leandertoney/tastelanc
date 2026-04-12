import { NextResponse } from 'next/server';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { verifyAdminAccess } from '@/lib/auth/admin-access';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    try { await verifyAdminAccess(supabase); }
    catch (err: unknown) {
      const e = err as { message?: string; status?: number };
      return NextResponse.json({ error: e.message }, { status: e.status || 500 });
    }

    const serviceClient = createServiceRoleClient();

    const { data: campaign, error } = await serviceClient
      .from('platform_email_campaigns')
      .select('*, market:markets(name)')
      .eq('id', id)
      .single();

    if (error || !campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    // For sent campaigns, aggregate delivery stats
    let stats = null;
    if (campaign.status === 'sent') {
      const { data: sends } = await serviceClient
        .from('platform_email_sends')
        .select('status')
        .eq('campaign_id', id);

      if (sends) {
        stats = {
          total: sends.length,
          delivered: sends.filter((s) => s.status === 'delivered' || s.status === 'opened' || s.status === 'clicked').length,
          opened: sends.filter((s) => s.status === 'opened' || s.status === 'clicked').length,
          clicked: sends.filter((s) => s.status === 'clicked').length,
          bounced: sends.filter((s) => s.status === 'bounced').length,
          failed: sends.filter((s) => s.status === 'failed').length,
        };
      }
    }

    return NextResponse.json({
      campaign: {
        ...campaign,
        market_name: (campaign as Record<string, unknown>).market
          ? ((campaign as Record<string, unknown>).market as { name: string }).name
          : null,
      },
      stats,
    });
  } catch (error) {
    console.error('Error in platform-campaigns [id] GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    try { await verifyAdminAccess(supabase); }
    catch (err: unknown) {
      const e = err as { message?: string; status?: number };
      return NextResponse.json({ error: e.message }, { status: e.status || 500 });
    }

    const serviceClient = createServiceRoleClient();

    // Check campaign exists and is draft
    const { data: existing } = await serviceClient
      .from('platform_email_campaigns')
      .select('id, status')
      .eq('id', id)
      .single();

    if (!existing) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }
    if (existing.status !== 'draft') {
      return NextResponse.json({ error: 'Only draft campaigns can be edited' }, { status: 400 });
    }

    const body = await request.json();
    const { name, subject, preview_text, body: emailBody, cta_text, cta_url, audience_source, audience_market_id } = body;

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (name !== undefined) updates.name = name;
    if (subject !== undefined) updates.subject = subject;
    if (preview_text !== undefined) updates.preview_text = preview_text || null;
    if (emailBody !== undefined) updates.body = emailBody;
    if (cta_text !== undefined) updates.cta_text = cta_text || null;
    if (cta_url !== undefined) updates.cta_url = cta_url || null;
    if (audience_source !== undefined) updates.audience_source = audience_source || null;
    if (audience_market_id !== undefined) updates.audience_market_id = audience_market_id || null;

    const { data, error } = await serviceClient
      .from('platform_email_campaigns')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating platform campaign:', error);
      return NextResponse.json({ error: 'Failed to update campaign' }, { status: 500 });
    }

    return NextResponse.json({ campaign: data });
  } catch (error) {
    console.error('Error in platform-campaigns [id] PUT:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    try { await verifyAdminAccess(supabase); }
    catch (err: unknown) {
      const e = err as { message?: string; status?: number };
      return NextResponse.json({ error: e.message }, { status: e.status || 500 });
    }

    const serviceClient = createServiceRoleClient();

    // Check campaign exists and is draft
    const { data: existing } = await serviceClient
      .from('platform_email_campaigns')
      .select('id, status')
      .eq('id', id)
      .single();

    if (!existing) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }
    if (existing.status !== 'draft') {
      return NextResponse.json({ error: 'Only draft campaigns can be deleted' }, { status: 400 });
    }

    const { error } = await serviceClient
      .from('platform_email_campaigns')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting platform campaign:', error);
      return NextResponse.json({ error: 'Failed to delete campaign' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in platform-campaigns [id] DELETE:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
