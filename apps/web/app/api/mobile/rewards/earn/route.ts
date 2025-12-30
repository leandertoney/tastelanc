import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceRoleClient } from '@/lib/supabase/admin';
import { calculatePoints, checkPremiumStatus, validateRewardAction, PREMIUM_MULTIPLIER, BASE_POINTS } from '@/lib/rewards';
import { RewardActionType } from '@/types/database';

interface EarnPointsRequest {
  action_type: RewardActionType;
  restaurant_id?: string;
  radar_verified?: boolean;
  metadata?: Record<string, unknown>;
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse request body
    const body: EarnPointsRequest = await request.json();
    const { action_type, restaurant_id, radar_verified, metadata } = body;

    // Validate action type
    if (!action_type || !BASE_POINTS[action_type]) {
      return NextResponse.json(
        { error: 'Invalid action type' },
        { status: 400 }
      );
    }

    // For location-based actions, require Radar verification
    const locationBasedActions: RewardActionType[] = ['checkin', 'event'];
    if (locationBasedActions.includes(action_type) && !radar_verified) {
      return NextResponse.json(
        { error: 'Location verification required for this action' },
        { status: 400 }
      );
    }

    // Validate the action (check rate limits, etc.)
    const validation = await validateRewardAction(
      supabase,
      user.id,
      action_type,
      restaurant_id,
      metadata
    );

    if (!validation.isValid) {
      return NextResponse.json(
        { error: validation.reason || 'Action not allowed' },
        { status: 400 }
      );
    }

    // Check premium status for multiplier
    const isPremium = await checkPremiumStatus(supabase, user.id);
    const multiplier = isPremium ? PREMIUM_MULTIPLIER : 1.0;
    const basePoints = BASE_POINTS[action_type];
    const totalPoints = calculatePoints(action_type, isPremium);

    // Use service role client for database operations to bypass RLS
    const adminClient = createServiceRoleClient();

    // Create the transaction record
    const { error: txError } = await adminClient
      .from('point_transactions')
      .insert({
        user_id: user.id,
        action_type,
        points: totalPoints,
        multiplier,
        base_points: basePoints,
        restaurant_id: restaurant_id || null,
        metadata: metadata || null,
      });

    if (txError) {
      console.error('Error creating transaction:', txError);
      return NextResponse.json(
        { error: 'Failed to record points' },
        { status: 500 }
      );
    }

    // Update or create user_points record
    const { data: existingPoints } = await adminClient
      .from('user_points')
      .select('id, total_points, lifetime_points')
      .eq('user_id', user.id)
      .single();

    if (existingPoints) {
      // Update existing record
      const { error: updateError } = await adminClient
        .from('user_points')
        .update({
          total_points: existingPoints.total_points + totalPoints,
          lifetime_points: existingPoints.lifetime_points + totalPoints,
        })
        .eq('user_id', user.id);

      if (updateError) {
        console.error('Error updating points:', updateError);
      }
    } else {
      // Create new record
      const { error: insertError } = await adminClient
        .from('user_points')
        .insert({
          user_id: user.id,
          total_points: totalPoints,
          lifetime_points: totalPoints,
        });

      if (insertError) {
        console.error('Error creating points record:', insertError);
      }
    }

    // Get updated balance
    const { data: updatedPoints } = await adminClient
      .from('user_points')
      .select('total_points, lifetime_points')
      .eq('user_id', user.id)
      .single();

    return NextResponse.json({
      success: true,
      points_earned: totalPoints,
      base_points: basePoints,
      multiplier,
      new_balance: updatedPoints?.total_points ?? totalPoints,
      message: `You earned ${totalPoints} points!`,
    }, { status: 201 });
  } catch (error) {
    console.error('Error earning points:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
