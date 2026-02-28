import { NextResponse } from 'next/server';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { verifySalesAccess } from '@/lib/auth/sales-access';

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

    const { data: rep } = await serviceClient
      .from('sales_reps')
      .select('preferred_sender_name, preferred_sender_email')
      .eq('id', access.userId)
      .single();

    return NextResponse.json({
      preferredSenderName: rep?.preferred_sender_name || null,
      preferredSenderEmail: rep?.preferred_sender_email || null,
    });
  } catch (error) {
    console.error('Error fetching sender preference:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
