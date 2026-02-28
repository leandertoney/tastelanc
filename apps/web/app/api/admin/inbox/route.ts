import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { verifyAdminAccess } from '@/lib/auth/admin-access';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/inbox
 * List inbound emails with optional filtering.
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    let admin;
    try { admin = await verifyAdminAccess(supabase); }
    catch (err: any) { return NextResponse.json({ error: err.message }, { status: err.status || 500 }); }

    if (admin.role !== 'super_admin') {
      return NextResponse.json({ error: 'Super admin access required' }, { status: 403 });
    }

    const serviceClient = createServiceRoleClient();
    const searchParams = request.nextUrl.searchParams;
    const category = searchParams.get('category');
    const is_read = searchParams.get('is_read');
    const is_archived = searchParams.get('is_archived');
    const search = searchParams.get('search');
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    let query = serviceClient
      .from('inbound_emails')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (category && category !== 'all') {
      query = query.eq('category', category);
    }
    if (is_read !== null && is_read !== 'all') {
      query = query.eq('is_read', is_read === 'true');
    }
    if (is_archived !== null) {
      query = query.eq('is_archived', is_archived === 'true');
    } else {
      // By default, hide archived emails
      query = query.eq('is_archived', false);
    }
    if (search) {
      query = query.or(
        `from_email.ilike.%${search}%,from_name.ilike.%${search}%,subject.ilike.%${search}%`
      );
    }

    const { data: emails, error } = await query;

    if (error) {
      console.error('Error fetching inbox:', error);
      return NextResponse.json({ error: 'Failed to fetch inbox' }, { status: 500 });
    }

    // Get unread count
    const { count: unreadCount } = await serviceClient
      .from('inbound_emails')
      .select('*', { count: 'exact', head: true })
      .eq('is_read', false)
      .eq('is_archived', false);

    return NextResponse.json({
      emails: emails || [],
      unread_count: unreadCount || 0,
    });
  } catch (error) {
    console.error('Error in inbox GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PUT /api/admin/inbox
 * Update an email (mark as read, archive, categorize, add notes).
 * Body: { id, is_read?, is_archived?, category?, admin_notes?, linked_city_id? }
 */
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient();
    let admin;
    try { admin = await verifyAdminAccess(supabase); }
    catch (err: any) { return NextResponse.json({ error: err.message }, { status: err.status || 500 }); }

    if (admin.role !== 'super_admin') {
      return NextResponse.json({ error: 'Super admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: 'Email ID is required' }, { status: 400 });
    }

    // Only allow specific fields to be updated
    const allowedFields = ['is_read', 'is_archived', 'category', 'admin_notes', 'linked_city_id'];
    const cleanUpdates: Record<string, unknown> = {};
    for (const key of allowedFields) {
      if (key in updates) {
        cleanUpdates[key] = updates[key];
      }
    }

    if (Object.keys(cleanUpdates).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    const serviceClient = createServiceRoleClient();
    const { data: email, error } = await serviceClient
      .from('inbound_emails')
      .update(cleanUpdates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating email:', error);
      return NextResponse.json({ error: 'Failed to update email' }, { status: 500 });
    }

    return NextResponse.json({ email });
  } catch (error) {
    console.error('Error in inbox PUT:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
