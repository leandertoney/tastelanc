import { NextResponse } from 'next/server';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { verifySalesAccess } from '@/lib/auth/sales-access';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const access = await verifySalesAccess(supabase);

    if (!access.canAccess) {
      return NextResponse.json(
        { error: access.error },
        { status: access.userId ? 403 : 401 }
      );
    }

    const serviceClient = createServiceRoleClient();

    // Fetch the contact submission
    const { data: contact, error: fetchError } = await serviceClient
      .from('contact_submissions')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !contact) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
    }

    // Check if a lead with this email already exists
    const { data: existing } = await serviceClient
      .from('business_leads')
      .select('id')
      .eq('email', contact.email)
      .single();

    if (existing) {
      return NextResponse.json(
        { error: 'A lead with this email already exists' },
        { status: 409 }
      );
    }

    // Resolve market_id: contact's market > rep's market
    let resolvedMarketId = contact.market_id || null;
    if (!resolvedMarketId && access.marketIds && access.marketIds.length === 1) {
      resolvedMarketId = access.marketIds[0];
    }

    // Create lead from contact submission, auto-assign to converting sales rep
    const { data: lead, error: insertError } = await serviceClient
      .from('business_leads')
      .insert({
        business_name: contact.business_name || contact.name || 'Unknown',
        contact_name: contact.name || null,
        email: contact.email,
        phone: contact.phone || null,
        source: 'contact_form',
        status: 'new',
        notes: contact.message || null,
        tags: contact.interested_plan ? [contact.interested_plan] : [],
        assigned_to: access.userId || null,
        market_id: resolvedMarketId,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error creating lead from contact:', insertError);
      return NextResponse.json({ error: 'Failed to convert contact' }, { status: 500 });
    }

    // Mark the contact as responded
    await serviceClient
      .from('contact_submissions')
      .update({ responded_at: new Date().toISOString() })
      .eq('id', id);

    return NextResponse.json({ lead });
  } catch (error) {
    console.error('Error in convert contact API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
