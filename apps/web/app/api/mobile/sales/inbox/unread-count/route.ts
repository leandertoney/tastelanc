import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { createMobileClient } from '@/lib/supabase/mobile-auth';
import { verifySalesAccess } from '@/lib/auth/sales-access';
import { getRepSenderEmails } from '@/lib/auth/rep-identity';

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
    const repEmails = await getRepSenderEmails(serviceClient, access);

    let crmCount = 0;
    if (repEmails.length > 0) {
      const { count } = await serviceClient
        .from('inbound_emails')
        .select('id', { count: 'exact', head: true })
        .in('to_email', repEmails)
        .eq('is_read', false);
      crmCount = count || 0;
    }

    return NextResponse.json({ count: crmCount, crmCount, infoCount: 0 });
  } catch (error) {
    console.error('Error in mobile inbox unread count API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
