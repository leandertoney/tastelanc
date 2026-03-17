import { NextResponse } from 'next/server';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { verifySalesAccess } from '@/lib/auth/sales-access';
import { getRepSenderEmails } from '@/lib/auth/rep-identity';
import { INFO_INBOX_EMAILS } from '@/config/sender-identities';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
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
    const repEmails = await getRepSenderEmails(serviceClient, access);

    // CRM unread count (emails to rep sender addresses)
    let crmCount = 0;
    if (repEmails.length > 0) {
      const { count } = await serviceClient
        .from('inbound_emails')
        .select('id', { count: 'exact', head: true })
        .in('to_email', repEmails)
        .eq('is_read', false);
      crmCount = count || 0;
    }

    // Info@ unread count (admin only)
    let infoCount = 0;
    if (access.isAdmin) {
      const { count } = await serviceClient
        .from('inbound_emails')
        .select('id', { count: 'exact', head: true })
        .in('to_email', INFO_INBOX_EMAILS)
        .eq('is_read', false);
      infoCount = count || 0;
    }

    return NextResponse.json({
      count: crmCount + infoCount,
      crmCount,
      infoCount,
    });
  } catch (error) {
    console.error('Error in inbox unread count API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
