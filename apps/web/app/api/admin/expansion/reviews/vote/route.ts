import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { verifyAdminAccess } from '@/lib/auth/admin-access';
import { calculateConsensus, EXPANSION_TEAM } from '@/config/expansion-team';
import type { ReviewVote } from '@/config/expansion-team';

export const dynamic = 'force-dynamic';

const VALID_VOTES: ReviewVote[] = ['interested', 'not_now', 'reject'];

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    let admin;
    try { admin = await verifyAdminAccess(supabase); }
    catch (err: any) { return NextResponse.json({ error: err.message }, { status: err.status || 500 }); }

    if (admin.role !== 'super_admin' && admin.role !== 'co_founder') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const body = await request.json();
    const { city_id, vote, note } = body;

    if (!city_id || !vote) {
      return NextResponse.json({ error: 'city_id and vote are required' }, { status: 400 });
    }

    if (!VALID_VOTES.includes(vote)) {
      return NextResponse.json({ error: 'Invalid vote. Must be: interested, not_now, or reject' }, { status: 400 });
    }

    // Get reviewer email from authenticated user
    const { data: { user } } = await supabase.auth.getUser();
    const reviewerEmail = user?.email;
    if (!reviewerEmail) {
      return NextResponse.json({ error: 'Could not resolve user email' }, { status: 400 });
    }

    // Find team member name
    const teamMember = EXPANSION_TEAM.find(m => m.email === reviewerEmail);
    const reviewerName = teamMember?.name || reviewerEmail;

    const serviceClient = createServiceRoleClient();

    // Verify city exists
    const { data: city, error: cityError } = await serviceClient
      .from('expansion_cities')
      .select('id, city_name, priority')
      .eq('id', city_id)
      .single();

    if (cityError || !city) {
      return NextResponse.json({ error: 'City not found' }, { status: 404 });
    }

    // Upsert the vote
    const { error: upsertError } = await serviceClient
      .from('expansion_reviews')
      .upsert(
        {
          city_id,
          reviewer_email: reviewerEmail,
          reviewer_name: reviewerName,
          vote,
          note: note || null,
          voted_at: new Date().toISOString(),
        },
        { onConflict: 'city_id,reviewer_email' }
      );

    if (upsertError) {
      console.error('Error upserting review vote:', upsertError);
      return NextResponse.json({ error: 'Failed to save vote' }, { status: 500 });
    }

    // Fetch all votes for this city to calculate consensus
    const { data: allVotes } = await serviceClient
      .from('expansion_reviews')
      .select('id, city_id, reviewer_email, reviewer_name, vote, note, voted_at')
      .eq('city_id', city_id);

    const consensus = calculateConsensus(
      (allVotes || []).map(v => ({ reviewer_email: v.reviewer_email, vote: v.vote as ReviewVote }))
    );

    // Update city review status and priority
    await serviceClient
      .from('expansion_cities')
      .update({
        review_status: consensus.status,
        priority: Math.max(0, (city.priority || 0) + consensus.priorityDelta),
      })
      .eq('id', city_id);

    // Log activity
    await serviceClient.from('expansion_activity_log').insert({
      city_id,
      user_id: admin.userId,
      action: 'review_vote',
      description: `${reviewerName} voted "${vote}" on ${city.city_name} (via dashboard)`,
      metadata: { vote, reviewer_email: reviewerEmail, source: 'dashboard' },
    });

    return NextResponse.json({
      success: true,
      vote,
      review_status: consensus.status,
      votes: allVotes || [],
    });
  } catch (error) {
    console.error('Error processing expansion review vote:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
