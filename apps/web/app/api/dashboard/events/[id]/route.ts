import { NextResponse } from 'next/server';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { verifyRestaurantAccess } from '@/lib/auth/restaurant-access';

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // Use service role client to fetch the event (RLS may block admin reads)
    const serviceClient = createServiceRoleClient();
    const { data: existingEvent, error: fetchError } = await serviceClient
      .from('events')
      .select('restaurant_id')
      .eq('id', id)
      .single();

    if (fetchError || !existingEvent) {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      );
    }

    const accessResult = await verifyRestaurantAccess(supabase, existingEvent.restaurant_id);

    if (!accessResult.canAccess) {
      return NextResponse.json(
        { error: accessResult.error || 'Access denied' },
        { status: accessResult.userId ? 403 : 401 }
      );
    }

    const body = await request.json();
    const {
      name,
      description,
      event_type,
      is_recurring,
      days_of_week,
      event_date,
      start_time,
      end_time,
      performer_name,
      cover_charge,
      image_url,
      is_active,
    } = body;

    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description || null;
    if (event_type !== undefined) updateData.event_type = event_type;
    if (is_recurring !== undefined) updateData.is_recurring = is_recurring;
    if (days_of_week !== undefined) updateData.days_of_week = days_of_week;
    if (event_date !== undefined) updateData.event_date = event_date || null;
    if (start_time !== undefined) updateData.start_time = start_time;
    if (end_time !== undefined) updateData.end_time = end_time || null;
    if (performer_name !== undefined) updateData.performer_name = performer_name || null;
    if (cover_charge !== undefined) updateData.cover_charge = cover_charge || null;
    if (image_url !== undefined) updateData.image_url = image_url || null;
    if (is_active !== undefined) updateData.is_active = is_active;
    updateData.updated_at = new Date().toISOString();

    // Use service role client for admin operations to bypass RLS
    const dbClient = (accessResult.isAdmin || accessResult.isSalesRep) ? createServiceRoleClient() : supabase;

    const { data: event, error } = await dbClient
      .from('events')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating event:', error);
      return NextResponse.json(
        { error: `Failed to update event: ${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({ event });
  } catch (error) {
    console.error('Error in update event API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // Use service role client to fetch the event (RLS may block admin reads)
    const serviceClient = createServiceRoleClient();
    const { data: existingEvent, error: fetchError } = await serviceClient
      .from('events')
      .select('restaurant_id')
      .eq('id', id)
      .single();

    if (fetchError || !existingEvent) {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      );
    }

    const accessResult = await verifyRestaurantAccess(supabase, existingEvent.restaurant_id);

    if (!accessResult.canAccess) {
      return NextResponse.json(
        { error: accessResult.error || 'Access denied' },
        { status: accessResult.userId ? 403 : 401 }
      );
    }

    // Use service role client for admin operations to bypass RLS
    const dbClient = (accessResult.isAdmin || accessResult.isSalesRep) ? createServiceRoleClient() : supabase;

    const { error } = await dbClient
      .from('events')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting event:', error);
      return NextResponse.json(
        { error: 'Failed to delete event' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in delete event API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
