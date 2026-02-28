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

    let query = serviceClient
      .from('contact_submissions')
      .select('*')
      .order('created_at', { ascending: false });

    // Sales reps only see inquiries from 2026-02-28 onward (pre-existing ones are admin-only)
    if (!access.isAdmin) {
      query = query.gte('created_at', '2026-02-28T00:00:00Z');
    }

    const { data: contacts, error } = await query;

    if (error) {
      console.error('Error fetching contacts:', error);
      return NextResponse.json({ error: 'Failed to fetch contacts' }, { status: 500 });
    }

    return NextResponse.json({ contacts: contacts || [] });
  } catch (error) {
    console.error('Error in contacts API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
