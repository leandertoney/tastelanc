import { NextResponse } from 'next/server';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';

const ADMIN_ROLES = ['admin', 'super_admin', 'co_founder', 'market_admin'];

/**
 * Guard for admin API routes that do not already call verifyAdminAccess().
 *
 * Returns a 401 NextResponse when the caller is not an admin, or null when the
 * request may proceed:
 *
 *   const denied = await requireAdmin();
 *   if (denied) return denied;
 */
export async function requireAdmin(): Promise<NextResponse | null> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const svc = createServiceRoleClient();
    const { data: profile } = await svc
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile?.role || !ADMIN_ROLES.includes(profile.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return null;
  } catch {
    // Fail closed: if the check itself errors, deny the request.
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}
