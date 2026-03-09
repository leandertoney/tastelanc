import { NextResponse } from 'next/server';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { verifySalesAccess } from '@/lib/auth/sales-access';
import { getRepSenderEmails } from '@/lib/auth/rep-identity';

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
    const search = searchParams.get('search') || '';

    // Use sent_by (user ID) as primary filter — more reliable than sender_email string matching.
    // Fallback to sender_email for cases where sent_by may be null (legacy records).
    const repEmails = await getRepSenderEmails(serviceClient, access);
    const userId = access.userId;

    let query = serviceClient
      .from('email_sends')
      .select('id, recipient_email, subject, body_text, headline, sender_name, sender_email, sent_at, status, opened_at, clicked_at, lead_id, attachments')
      .or(
        userId
          ? `sent_by.eq.${userId}${repEmails.length > 0 ? `,sender_email.in.(${repEmails.join(',')})` : ''}`
          : repEmails.length > 0 ? `sender_email.in.(${repEmails.join(',')})` : 'id.is.null'
      )
      .not('recipient_email', 'is', null)
      .order('sent_at', { ascending: false })
      .limit(200);

    if (search) {
      query = query.or(`recipient_email.ilike.%${search}%,subject.ilike.%${search}%`);
    }

    const { data: sentEmails, error } = await query;

    if (error) {
      console.error('Error fetching sent emails:', error);
      return NextResponse.json({ error: 'Failed to fetch sent emails' }, { status: 500 });
    }

    // Resolve lead names
    const leadIds = Array.from(new Set((sentEmails || []).filter(e => e.lead_id).map(e => e.lead_id)));
    const leadMap = new Map<string, string>();

    if (leadIds.length > 0) {
      const { data: leads } = await serviceClient
        .from('business_leads')
        .select('id, business_name')
        .in('id', leadIds);
      (leads || []).forEach(l => leadMap.set(l.id, l.business_name));
    }

    const emails = (sentEmails || []).map(e => ({
      ...e,
      lead_business_name: e.lead_id ? leadMap.get(e.lead_id) || null : null,
    }));

    return NextResponse.json({ emails });
  } catch (error) {
    console.error('Error in sent emails API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
