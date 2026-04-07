import { NextResponse } from 'next/server';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

async function verifyAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const svc = createServiceRoleClient();
  const { data: profile } = await svc
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();
  const adminRoles = ['admin', 'super_admin', 'co_founder'];
  if (!profile || !adminRoles.includes(profile.role)) return null;
  return user;
}

export async function PATCH(request: Request) {
  try {
    const user = await verifyAdmin();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { restaurant_id, rw_description } = body;

    if (!restaurant_id) {
      return NextResponse.json({ error: 'restaurant_id is required' }, { status: 400 });
    }

    const svc = createServiceRoleClient();
    const { data, error } = await svc
      .from('restaurants')
      .update({ rw_description: rw_description || null })
      .eq('id', restaurant_id)
      .select('id, name, rw_description')
      .single();

    if (error) {
      console.error('Error updating rw_description:', error);
      return NextResponse.json({ error: 'Failed to update' }, { status: 500 });
    }

    return NextResponse.json({ restaurant: data });
  } catch (error) {
    console.error('rw-description PATCH error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
