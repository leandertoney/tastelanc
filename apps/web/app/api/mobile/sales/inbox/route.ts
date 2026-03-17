import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { createMobileClient } from '@/lib/supabase/mobile-auth';
import { verifySalesAccess } from '@/lib/auth/sales-access';
import { getRepSenderEmails, getUserIdentity } from '@/lib/auth/rep-identity';
import { INFO_INBOX_EMAILS } from '@/config/sender-identities';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface ConversationItem {
  counterparty_email: string;
  counterparty_name: string | null;
  last_message_at: string;
  last_message_snippet: string | null;
  last_message_subject: string | null;
  last_message_direction: 'sent' | 'received';
  unread_count: number;
  lead_id: string | null;
  lead_business_name: string | null;
  message_count: number;
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
    const search = searchParams.get('search') || '';
    const filter = searchParams.get('filter') || 'all';
    const inbox = searchParams.get('inbox') || 'crm';

    const repEmails = await getRepSenderEmails(serviceClient, access);
    if (repEmails.length === 0 && inbox === 'crm') {
      return NextResponse.json({ conversations: [], isAdmin: access.isAdmin, userIdentity: null });
    }

    const isInfoInbox = inbox === 'info' && access.isAdmin;
    const inboundFilterEmails = isInfoInbox ? INFO_INBOX_EMAILS : repEmails;

    // Fetch outbound emails (skip for info@ inbox — it's receive-only)
    let sentEmails: { recipient_email: string; subject: string | null; body_text: string | null; sender_email: string | null; sender_name: string | null; sent_at: string | null; lead_id: string | null }[] | null = [];
    let sentError: { message: string } | null = null;
    if (!isInfoInbox) {
      const result = await serviceClient
        .from('email_sends')
        .select('recipient_email, subject, body_text, sender_email, sender_name, sent_at, lead_id')
        .in('sender_email', repEmails)
        .not('recipient_email', 'is', null)
        .order('sent_at', { ascending: false });
      sentEmails = result.data;
      sentError = result.error;
    }

    if (sentError) {
      console.error('Error fetching sent emails:', sentError);
      return NextResponse.json({ error: 'Failed to fetch inbox' }, { status: 500 });
    }

    // Fetch inbound emails
    const { data: receivedEmails, error: receivedError } = await serviceClient
      .from('inbound_emails')
      .select('from_email, from_name, to_email, subject, body_text, is_read, created_at, linked_lead_id')
      .in('to_email', inboundFilterEmails)
      .order('created_at', { ascending: false });

    if (receivedError) {
      console.error('Error fetching received emails:', receivedError);
      return NextResponse.json({ error: 'Failed to fetch inbox' }, { status: 500 });
    }

    // Build conversations grouped by counterparty email
    const convMap = new Map<string, ConversationItem>();

    for (const email of sentEmails || []) {
      const key = email.recipient_email.toLowerCase();
      const existing = convMap.get(key);
      const ts = email.sent_at || '';

      if (!existing) {
        convMap.set(key, {
          counterparty_email: email.recipient_email,
          counterparty_name: null,
          last_message_at: ts,
          last_message_snippet: email.body_text?.substring(0, 120) || email.subject || null,
          last_message_subject: email.subject,
          last_message_direction: 'sent',
          unread_count: 0,
          lead_id: email.lead_id || null,
          lead_business_name: null,
          message_count: 1,
        });
      } else {
        existing.message_count++;
        if (ts > existing.last_message_at) {
          existing.last_message_at = ts;
          existing.last_message_snippet = email.body_text?.substring(0, 120) || email.subject || null;
          existing.last_message_subject = email.subject;
          existing.last_message_direction = 'sent';
        }
        if (!existing.lead_id && email.lead_id) existing.lead_id = email.lead_id;
      }
    }

    for (const email of receivedEmails || []) {
      const key = email.from_email.toLowerCase();
      const existing = convMap.get(key);
      const ts = email.created_at || '';

      if (!existing) {
        convMap.set(key, {
          counterparty_email: email.from_email,
          counterparty_name: email.from_name || null,
          last_message_at: ts,
          last_message_snippet: email.body_text?.substring(0, 120) || email.subject || null,
          last_message_subject: email.subject,
          last_message_direction: 'received',
          unread_count: email.is_read ? 0 : 1,
          lead_id: email.linked_lead_id || null,
          lead_business_name: null,
          message_count: 1,
        });
      } else {
        existing.message_count++;
        if (!email.is_read) existing.unread_count++;
        if (email.from_name && !existing.counterparty_name) existing.counterparty_name = email.from_name;
        if (ts > existing.last_message_at) {
          existing.last_message_at = ts;
          existing.last_message_snippet = email.body_text?.substring(0, 120) || email.subject || null;
          existing.last_message_subject = email.subject;
          existing.last_message_direction = 'received';
        }
        if (!existing.lead_id && email.linked_lead_id) existing.lead_id = email.linked_lead_id;
      }
    }

    // Resolve lead names
    const leadIdSet = new Set<string>();
    convMap.forEach(c => { if (c.lead_id) leadIdSet.add(c.lead_id); });
    const leadIds = Array.from(leadIdSet);

    if (leadIds.length > 0) {
      const { data: leads } = await serviceClient
        .from('business_leads')
        .select('id, business_name')
        .in('id', leadIds);

      const leadMap = new Map((leads || []).map(l => [l.id, l.business_name]));
      convMap.forEach(conv => {
        if (conv.lead_id && leadMap.has(conv.lead_id)) {
          conv.lead_business_name = leadMap.get(conv.lead_id)!;
        }
      });
    }

    let conversations: ConversationItem[] = [];
    convMap.forEach(c => conversations.push(c));

    if (search) {
      const q = search.toLowerCase();
      conversations = conversations.filter(c =>
        c.counterparty_email.toLowerCase().includes(q) ||
        (c.counterparty_name && c.counterparty_name.toLowerCase().includes(q)) ||
        (c.last_message_subject && c.last_message_subject.toLowerCase().includes(q)) ||
        (c.lead_business_name && c.lead_business_name.toLowerCase().includes(q))
      );
    }

    if (filter === 'unread') {
      conversations = conversations.filter(c => c.unread_count > 0);
    }

    conversations.sort((a, b) => new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime());

    const userIdentity = await getUserIdentity(serviceClient, access);

    return NextResponse.json({ conversations, isAdmin: access.isAdmin, userIdentity });
  } catch (error) {
    console.error('Error in mobile inbox API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
