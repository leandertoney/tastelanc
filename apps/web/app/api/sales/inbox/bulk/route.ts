import { NextResponse } from 'next/server';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { verifySalesAccess } from '@/lib/auth/sales-access';
import { getRepSenderEmails } from '@/lib/auth/rep-identity';
import { INFO_INBOX_EMAILS } from '@/config/sender-identities';

/**
 * Bulk operations on inbox conversations.
 *
 * POST body:
 *   action: 'mark_read' | 'mark_unread' | 'delete'
 *   emails: string[]  — counterparty email addresses identifying conversations
 *   inbox?: 'crm' | 'info'
 */
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
    const { action, emails, inbox } = await request.json();

    if (!action || !Array.isArray(emails) || emails.length === 0) {
      return NextResponse.json(
        { error: 'Missing required fields: action, emails[]' },
        { status: 400 }
      );
    }

    if (!['mark_read', 'mark_unread', 'delete'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Use: mark_read, mark_unread, or delete' },
        { status: 400 }
      );
    }

    // Determine which inbound addresses this user can see
    const repEmails = await getRepSenderEmails(serviceClient, access);
    const isInfoInbox = inbox === 'info' && access.isAdmin;
    const visibleEmails = isInfoInbox ? INFO_INBOX_EMAILS : repEmails;

    const normalizedEmails = emails.map((e: string) => e.toLowerCase());

    if (action === 'mark_read') {
      const { error } = await serviceClient
        .from('inbound_emails')
        .update({ is_read: true })
        .in('from_email', normalizedEmails)
        .in('to_email', visibleEmails)
        .eq('is_read', false);

      if (error) {
        console.error('Error marking read:', error);
        return NextResponse.json({ error: 'Failed to mark as read' }, { status: 500 });
      }

      return NextResponse.json({ success: true, action: 'mark_read', count: normalizedEmails.length });
    }

    if (action === 'mark_unread') {
      // Mark the most recent inbound email from each counterparty as unread
      for (const counterpartyEmail of normalizedEmails) {
        const { data: latest } = await serviceClient
          .from('inbound_emails')
          .select('id')
          .eq('from_email', counterpartyEmail)
          .in('to_email', visibleEmails)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (latest) {
          await serviceClient
            .from('inbound_emails')
            .update({ is_read: false })
            .eq('id', latest.id);
        }
      }

      return NextResponse.json({ success: true, action: 'mark_unread', count: normalizedEmails.length });
    }

    if (action === 'delete') {
      // Delete inbound emails from these counterparties
      const { error: inboundError } = await serviceClient
        .from('inbound_emails')
        .delete()
        .in('from_email', normalizedEmails)
        .in('to_email', visibleEmails);

      if (inboundError) {
        console.error('Error deleting inbound emails:', inboundError);
        return NextResponse.json({ error: 'Failed to delete conversations' }, { status: 500 });
      }

      // Delete outbound emails to these counterparties
      if (repEmails.length > 0) {
        const { error: outboundError } = await serviceClient
          .from('email_sends')
          .delete()
          .in('recipient_email', normalizedEmails)
          .in('sender_email', repEmails);

        if (outboundError) {
          console.error('Error deleting outbound emails:', outboundError);
          // Non-fatal — inbound already deleted
        }
      }

      return NextResponse.json({ success: true, action: 'delete', count: normalizedEmails.length });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    console.error('Error in inbox bulk API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
