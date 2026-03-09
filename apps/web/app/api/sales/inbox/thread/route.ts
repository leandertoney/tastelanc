import { NextResponse } from 'next/server';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { verifySalesAccess } from '@/lib/auth/sales-access';
import { getRepSenderEmails } from '@/lib/auth/rep-identity';
import { INFO_INBOX_EMAILS } from '@/config/sender-identities';

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
  delivery_status: string | null; // sent, delivered, opened, clicked, bounced
  opened_at: string | null;
  clicked_at: string | null;
  attachments: Array<{ url?: string; filename: string; size: number; contentType?: string; content_type?: string }>;
}

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
    const counterpartyEmail = searchParams.get('email');

    if (!counterpartyEmail) {
      return NextResponse.json({ error: 'Missing email parameter' }, { status: 400 });
    }

    // Determine which sender emails this user can see
    const repEmails = await getRepSenderEmails(serviceClient, access);

    // Admins always see info@ inbound in threads so conversations are complete
    // (replies to info@tastelanc.com route to inbox@in.tastelanc.com)
    const allVisibleEmails = access.isAdmin
      ? [...repEmails, ...INFO_INBOX_EMAILS]
      : repEmails;

    // Fetch sent emails to this counterparty
    // Use sent_by (user ID) OR sender_email to catch all messages regardless of identity mismatch
    const userId = access.userId;
    const sentFilter = userId
      ? `sent_by.eq.${userId}${repEmails.length > 0 ? `,sender_email.in.(${repEmails.join(',')})` : ''}`
      : repEmails.length > 0 ? `sender_email.in.(${repEmails.join(',')})` : 'id.is.null';

    const { data: sentEmails } = await serviceClient
      .from('email_sends')
      .select('id, subject, sender_name, sender_email, recipient_email, body_text, headline, resend_id, sent_at, lead_id, status, opened_at, clicked_at, attachments')
      .eq('recipient_email', counterpartyEmail)
      .or(sentFilter)
      .order('sent_at', { ascending: true });

    // Fetch received emails from this counterparty
    const { data: receivedEmails } = await serviceClient
      .from('inbound_emails')
      .select('id, from_email, from_name, to_email, subject, body_text, body_html, is_read, created_at, linked_lead_id, attachments')
      .eq('from_email', counterpartyEmail)
      .in('to_email', allVisibleEmails)
      .order('created_at', { ascending: true });

    // Mark unread received emails as read
    const unreadIds = (receivedEmails || []).filter(e => !e.is_read).map(e => e.id);
    if (unreadIds.length > 0) {
      await serviceClient
        .from('inbound_emails')
        .update({ is_read: true })
        .in('id', unreadIds);

      // Also clear has_unread_replies on any linked leads
      const linkedLeadIdSet = new Set<string>();
      (receivedEmails || []).forEach(e => {
        if (!e.is_read && e.linked_lead_id) linkedLeadIdSet.add(e.linked_lead_id);
      });
      const linkedLeadIds = Array.from(linkedLeadIdSet);

      for (const leadId of linkedLeadIds) {
        // Check if lead has any remaining unread replies
        const { count } = await serviceClient
          .from('lead_email_replies')
          .select('id', { count: 'exact', head: true })
          .eq('lead_id', leadId)
          .eq('is_read', false);

        // Also mark lead_email_replies as read
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
    console.error('Error in inbox thread API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

