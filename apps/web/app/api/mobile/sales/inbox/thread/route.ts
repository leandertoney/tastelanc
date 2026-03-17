import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { createMobileClient } from '@/lib/supabase/mobile-auth';
import { verifySalesAccess } from '@/lib/auth/sales-access';
import { getRepSenderEmails } from '@/lib/auth/rep-identity';
import { INFO_INBOX_EMAILS } from '@/config/sender-identities';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface ThreadMessage {
  id: string;
  direction: 'sent' | 'received';
  from_email: string;
  from_name: string | null;
  to_email: string;
  subject: string | null;
  body_text: string | null;
  body_html: string | null;
  headline: string | null;
  timestamp: string;
  lead_id: string | null;
  resend_id: string | null;
  is_read: boolean;
  delivery_status: string | null;
  opened_at: string | null;
  clicked_at: string | null;
  attachments: Array<{ url?: string; filename: string; size: number; contentType?: string; content_type?: string }>;
}

export async function GET(request: Request) {
  try {
    const supabase = createMobileClient(request);
    if (!supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const access = await verifySalesAccess(supabase);
    if (!access.canAccess) {
      return NextResponse.json(
        { error: access.error },
        { status: access.userId ? 403 : 401 }
      );
    }

    const serviceClient = createServiceRoleClient();
    const { searchParams } = new URL(request.url);
    const counterpartyEmail = searchParams.get('email');

    if (!counterpartyEmail) {
      return NextResponse.json({ error: 'Missing email parameter' }, { status: 400 });
    }

    const repEmails = await getRepSenderEmails(serviceClient, access);
    const allVisibleEmails = access.isAdmin
      ? [...repEmails, ...INFO_INBOX_EMAILS]
      : repEmails;

    // Fetch sent emails to this counterparty
    const { data: sentEmails, error: sentError } = await serviceClient
      .from('email_sends')
      .select('id, subject, sender_name, sender_email, recipient_email, body_text, headline, resend_id, sent_at, lead_id, status, opened_at, clicked_at, attachments')
      .eq('recipient_email', counterpartyEmail)
      .in('sender_email', repEmails)
      .order('sent_at', { ascending: true });

    if (sentError) {
      console.error('Error fetching sent emails for thread:', sentError);
      return NextResponse.json({ error: 'Failed to load thread' }, { status: 500 });
    }

    // Fetch received emails from this counterparty
    const { data: receivedEmails, error: receivedError } = await serviceClient
      .from('inbound_emails')
      .select('id, from_email, from_name, to_email, subject, body_text, body_html, is_read, created_at, linked_lead_id, attachments')
      .eq('from_email', counterpartyEmail)
      .in('to_email', allVisibleEmails)
      .order('created_at', { ascending: true });

    if (receivedError) {
      console.error('Error fetching received emails for thread:', receivedError);
      return NextResponse.json({ error: 'Failed to load thread' }, { status: 500 });
    }

    // Mark unread received emails as read
    const unreadIds = (receivedEmails || []).filter(e => !e.is_read).map(e => e.id);
    if (unreadIds.length > 0) {
      await serviceClient
        .from('inbound_emails')
        .update({ is_read: true })
        .in('id', unreadIds);

      const linkedLeadIdSet = new Set<string>();
      (receivedEmails || []).forEach(e => {
        if (!e.is_read && e.linked_lead_id) linkedLeadIdSet.add(e.linked_lead_id);
      });

      for (const leadId of Array.from(linkedLeadIdSet)) {
        const { count } = await serviceClient
          .from('lead_email_replies')
          .select('id', { count: 'exact', head: true })
          .eq('lead_id', leadId)
          .eq('is_read', false);

        await serviceClient
          .from('lead_email_replies')
          .update({ is_read: true })
          .eq('lead_id', leadId)
          .eq('is_read', false);

        if ((count || 0) <= unreadIds.length) {
          await serviceClient
            .from('business_leads')
            .update({ has_unread_replies: false })
            .eq('id', leadId);
        }
      }
    }

    // Merge into chronological thread
    const messages: ThreadMessage[] = [
      ...(sentEmails || []).map(e => ({
        id: e.id,
        direction: 'sent' as const,
        from_email: e.sender_email,
        from_name: e.sender_name,
        to_email: e.recipient_email,
        subject: e.subject,
        body_text: e.body_text,
        body_html: null,
        headline: e.headline,
        timestamp: e.sent_at,
        lead_id: e.lead_id,
        resend_id: e.resend_id,
        is_read: true,
        delivery_status: e.status || 'sent',
        opened_at: e.opened_at || null,
        clicked_at: e.clicked_at || null,
        attachments: e.attachments || [],
      })),
      ...(receivedEmails || []).map(e => ({
        id: e.id,
        direction: 'received' as const,
        from_email: e.from_email,
        from_name: e.from_name,
        to_email: e.to_email,
        subject: e.subject,
        body_text: e.body_text,
        body_html: e.body_html || null,
        headline: null,
        timestamp: e.created_at,
        lead_id: e.linked_lead_id,
        resend_id: null,
        is_read: true,
        delivery_status: null,
        opened_at: null,
        clicked_at: null,
        attachments: e.attachments || [],
      })),
    ].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    return NextResponse.json({ messages });
  } catch (error) {
    console.error('Error in mobile inbox thread API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
