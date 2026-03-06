import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { createMobileClient } from '@/lib/supabase/mobile-auth';
import { verifySalesAccess } from '@/lib/auth/sales-access';
import { getUserIdentity } from '@/lib/auth/rep-identity';

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
    const identity = await getUserIdentity(serviceClient, access);

    return NextResponse.json({
      identity,
      isAdmin: access.isAdmin,
    });
  } catch (error) {
    console.error('Error in mobile inbox identity API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
