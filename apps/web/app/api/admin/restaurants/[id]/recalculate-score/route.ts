export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { verifyAdminAccess } from '@/lib/auth/admin-access';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    try {
      await verifyAdminAccess(supabase);
    } catch (err: any) {
      return NextResponse.json(
        { error: err.message },
        { status: err.status || 500 }
      );
    }

    const serviceClient = createServiceRoleClient();

    // Call the database function to compute the score
    const { data: scoreResult, error: rpcError } = await serviceClient
      .rpc('compute_profile_score', { p_restaurant_id: id });

    if (rpcError) {
      console.error('Error computing profile score:', rpcError);
      return NextResponse.json(
        { error: 'Failed to compute profile score' },
        { status: 500 }
      );
    }

    const newScore = scoreResult as number;

    // Write the score back to the restaurant row
    const { error: updateError } = await serviceClient
      .from('restaurants')
      .update({
        profile_score: newScore,
        profile_score_updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (updateError) {
      console.error('Error updating profile score:', updateError);
      return NextResponse.json(
        { error: 'Failed to update profile score' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      profile_score: newScore,
      profile_score_updated_at: new Date().toISOString(),
      band: newScore >= 90 ? 'Optimized' : newScore >= 75 ? 'Great' : newScore >= 55 ? 'Good' : newScore >= 30 ? 'Getting Started' : 'Incomplete',
    });
  } catch (error) {
    console.error('Error recalculating profile score:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
