import { SupabaseClient } from '@supabase/supabase-js';

interface DraftData {
  id: string;
  flyer_image_url: string | null;
  extracted_json: Record<string, unknown> | null;
  edited_json: Record<string, unknown> | null;
  matched_venue_id: string | null;
  publishing_path: string;
  market_id: string;
  created_by_user_id: string;
}

interface PublishResult {
  success: boolean;
  event_id?: string;
  error?: string;
}

/**
 * Publishes an event from a draft to the events table.
 * Used by both direct publish (Option A) and webhook (Option B/C after payment).
 *
 * @param serviceClient - Supabase service role client (bypasses RLS)
 * @param draft - The event draft to publish
 */
export async function publishEventFromDraft(
  serviceClient: SupabaseClient,
  draft: DraftData
): Promise<PublishResult> {
  // Merge extracted + edited JSON (edited overrides extracted)
  const extracted = (draft.extracted_json || {}) as Record<string, unknown>;
  const edited = (draft.edited_json || {}) as Record<string, unknown>;
  const merged = { ...extracted, ...edited };

  const eventName = (merged.event_name as string) || 'Untitled Event';
  const category = (merged.category as string) || 'other';
  const eventDate = (merged.date as string) || null;
  const timeStart = (merged.time_start as string) || '19:00';
  const timeEnd = (merged.time_end as string) || null;
  const description = (merged.description as string) || null;
  const performers = (merged.performers as string) || null;

  // Determine owner: restaurant_id or self_promoter_id
  let restaurantId: string | null = null;
  let selfPromoterId: string | null = null;

  if (draft.publishing_path === 'venue_free' && draft.matched_venue_id) {
    restaurantId = draft.matched_venue_id;
  } else if (draft.publishing_path === 'promoter_paid' || draft.publishing_path === 'send_to_organizer') {
    // For paid promotions, create or find a self-promoter record
    const result = await findOrCreateSelfPromoter(serviceClient, draft, merged);
    if (result.error) {
      return { success: false, error: result.error };
    }
    selfPromoterId = result.selfPromoterId;
  } else {
    return { success: false, error: 'Cannot determine event owner. Venue must be matched for free listings.' };
  }

  // Create the event
  const { data: event, error: insertError } = await serviceClient
    .from('events')
    .insert({
      restaurant_id: restaurantId,
      self_promoter_id: selfPromoterId,
      market_id: draft.market_id,
      name: eventName,
      description,
      event_type: category,
      is_recurring: false,
      days_of_week: [],
      event_date: eventDate,
      start_time: timeStart,
      end_time: timeEnd,
      performer_name: performers,
      image_url: draft.flyer_image_url,
      is_active: true,
    })
    .select('id')
    .single();

  if (insertError) {
    console.error('Failed to publish event from draft:', insertError);
    return { success: false, error: insertError.message };
  }

  // Update draft status
  await serviceClient
    .from('event_drafts')
    .update({
      status: 'published',
      published_event_id: event.id,
    })
    .eq('id', draft.id);

  return { success: true, event_id: event.id };
}

async function findOrCreateSelfPromoter(
  serviceClient: SupabaseClient,
  draft: DraftData,
  merged: Record<string, unknown>
): Promise<{ selfPromoterId: string | null; error?: string }> {
  // Check if scanner already has a self-promoter profile
  const { data: existing } = await serviceClient
    .from('self_promoters')
    .select('id')
    .eq('owner_id', draft.created_by_user_id)
    .eq('is_active', true)
    .limit(1)
    .single();

  if (existing) {
    return { selfPromoterId: existing.id };
  }

  // Create a minimal self-promoter record from the extracted data
  const performerName = (merged.performers as string) || (merged.event_name as string) || 'Event Promoter';
  const slug = performerName
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .slice(0, 50)
    + '-' + Date.now().toString(36);

  const { data: newPromoter, error } = await serviceClient
    .from('self_promoters')
    .insert({
      owner_id: draft.created_by_user_id,
      name: performerName,
      slug,
      is_active: true,
    })
    .select('id')
    .single();

  if (error) {
    console.error('Failed to create self-promoter:', error);
    return { selfPromoterId: null, error: error.message };
  }

  return { selfPromoterId: newPromoter.id };
}
