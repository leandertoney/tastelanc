import { NextResponse } from 'next/server';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { verifySalesAccess } from '@/lib/auth/sales-access';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const access = await verifySalesAccess(supabase);

    if (!access.canAccess) {
      return NextResponse.json(
        { error: access.error },
        { status: access.userId ? 403 : 401 }
      );
    }

    const serviceClient = createServiceRoleClient();
    const { searchParams } = new URL(request.url);
    const replyTo = searchParams.get('replyTo');

    let query = serviceClient
      .from('email_drafts')
      .select('*')
      .eq('user_id', access.userId)
      .order('updated_at', { ascending: false });

    if (replyTo) {
      query = query.eq('recipient_email', replyTo).eq('draft_type', 'reply');
    }

    const { data: drafts, error } = await query;

    if (error) {
      console.error('Error fetching drafts:', error);
      return NextResponse.json({ error: 'Failed to fetch drafts' }, { status: 500 });
    }

    return NextResponse.json({ drafts: drafts || [] });
  } catch (error) {
    console.error('Error in drafts API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const access = await verifySalesAccess(supabase);

    if (!access.canAccess) {
      return NextResponse.json(
        { error: access.error },
        { status: access.userId ? 403 : 401 }
      );
    }

    const serviceClient = createServiceRoleClient();
    const body = await request.json();
    const {
      id,
      draft_type = 'new',
      recipient_email,
      recipient_name,
      subject,
      headline,
      body: draftBody,
      cta_text,
      cta_url,
      sender_email,
      sender_name,
      reply_to_email,
      in_reply_to_message_id,
      attachments,
      inbox_type = 'crm',
    } = body;

    const draftData = {
      user_id: access.userId,
      draft_type,
      recipient_email: recipient_email || null,
      recipient_name: recipient_name || null,
      subject: subject || null,
      headline: headline || null,
      body: draftBody || null,
      cta_text: cta_text || null,
      cta_url: cta_url || null,
      sender_email: sender_email || null,
      sender_name: sender_name || null,
      reply_to_email: reply_to_email || null,
      in_reply_to_message_id: in_reply_to_message_id || null,
      attachments: attachments || [],
      inbox_type,
      updated_at: new Date().toISOString(),
    };

    if (id) {
      // Update existing draft (verify ownership)
      const { data: existing } = await serviceClient
        .from('email_drafts')
        .select('id')
        .eq('id', id)
        .eq('user_id', access.userId)
        .single();

      if (!existing) {
        return NextResponse.json({ error: 'Draft not found' }, { status: 404 });
      }

      const { data: draft, error } = await serviceClient
        .from('email_drafts')
        .update(draftData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Error updating draft:', error);
        return NextResponse.json({ error: 'Failed to update draft' }, { status: 500 });
      }

      return NextResponse.json({ draft });
    } else {
      // Create new draft
      const { data: draft, error } = await serviceClient
        .from('email_drafts')
        .insert(draftData)
        .select()
        .single();

      if (error) {
        console.error('Error creating draft:', error);
        return NextResponse.json({ error: 'Failed to create draft' }, { status: 500 });
      }

      return NextResponse.json({ draft }, { status: 201 });
    }
  } catch (error) {
    console.error('Error in drafts API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
