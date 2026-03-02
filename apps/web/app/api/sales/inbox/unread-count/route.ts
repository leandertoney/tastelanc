import { NextResponse } from 'next/server';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { verifySalesAccess } from '@/lib/auth/sales-access';
import { getRepSenderEmails } from '@/lib/auth/rep-identity';

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

    // Determine which sender emails this user can see
    const repEmails = await getRepSenderEmails(serviceClient, access);

    if (repEmails.length === 0) {
      return NextResponse.json({ count: 0 });
    }

    // Count unread inbound emails addressed to rep's identities
    const { count, error } = await serviceClient
      .from('inbound_emails')
      .select('id', { count: 'exact', head: true })
      .in('to_email', repEmails)
      .eq('is_read', false);

    if (error) {
      console.error('Error fetching inbox unread count:', error);
      return NextResponse.json({ error: 'Failed to fetch count' }, { status: 500 });
    }

    return NextResponse.json({ count: count || 0 });
  } catch (error) {
    console.error('Error in inbox unread count API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
