import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Verify access to a specific event
async function verifyEventAccess(eventId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Unauthorized', status: 401 };
  }

  const isAdmin = user.email === 'admin@tastelanc.com';

  // Fetch event with self-promoter info
  const { data: event, error } = await supabase
    .from('events')
    .select('*, self_promoters(id, owner_id)')
    .eq('id', eventId)
    .single();

  if (error || !event) {
    return { error: 'Event not found', status: 404 };
  }

  // Must be a self-promoter event
  if (!event.self_promoter_id || !event.self_promoters) {
    return { error: 'Not a self-promoter event', status: 400 };
  }

  const isOwner = event.self_promoters.owner_id === user.id;

  if (!isAdmin && !isOwner) {
    return { error: 'Access denied', status: 403 };
  }

  return { event, user, isAdmin, isOwner };
}

// PUT - Update an event
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const access = await verifyEventAccess(id);
    if ('error' in access) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const body = await request.json();
    const {
      name,
      description,
      event_type,
      event_date,
      start_time,
      end_time,
      performer_name,
      cover_charge,
      image_url,
      is_active,
    } = body;

    // Validate event type if provided
    if (event_type) {
      const allowedTypes = ['live_music', 'dj', 'karaoke', 'comedy'];
      if (!allowedTypes.includes(event_type)) {
        return NextResponse.json(
          { error: 'Invalid event type. Allowed: live_music, dj, karaoke, comedy' },
          { status: 400 }
        );
      }
    }

    const supabase = await createClient();
    const updateData: Record<string, unknown> = {};

    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (event_type !== undefined) updateData.event_type = event_type;
    if (event_date !== undefined) updateData.event_date = event_date;
    if (start_time !== undefined) updateData.start_time = start_time;
    if (end_time !== undefined) updateData.end_time = end_time;
    if (performer_name !== undefined) updateData.performer_name = performer_name;
    if (cover_charge !== undefined) updateData.cover_charge = cover_charge ? parseFloat(cover_charge) : null;
    if (image_url !== undefined) updateData.image_url = image_url;
    if (is_active !== undefined) updateData.is_active = is_active;

    const { data: event, error } = await supabase
      .from('events')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating event:', error);
      return NextResponse.json({ error: 'Failed to update event' }, { status: 500 });
    }

    return NextResponse.json({ event });
  } catch (error) {
    console.error('Error in PUT event:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - Delete an event
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const access = await verifyEventAccess(id);
    if ('error' in access) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const supabase = await createClient();
    const { error } = await supabase
      .from('events')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting event:', error);
      return NextResponse.json({ error: 'Failed to delete event' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE event:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
