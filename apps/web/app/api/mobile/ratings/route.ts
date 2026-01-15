import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceRoleClient } from '@/lib/supabase/admin';
import { calculatePoints, checkPremiumStatus, PREMIUM_MULTIPLIER, BASE_POINTS } from '@/lib/rewards';

interface SubmitRatingRequest {
  restaurant_id: string;
  rating: number;
}

// POST - Submit or update a rating
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
    const body: SubmitRatingRequest = await request.json();
    const { restaurant_id, rating } = body;

    // Validate input
    if (!restaurant_id) {
      return NextResponse.json(
        { error: 'restaurant_id is required' },
        { status: 400 }
      );
    }

    if (!rating || rating < 1 || rating > 5 || !Number.isInteger(rating)) {
      return NextResponse.json(
        { error: 'rating must be an integer between 1 and 5' },
        { status: 400 }
      );
    }

    const adminClient = createServiceRoleClient();

    // Check if user has already rated this restaurant
    const { data: existingRating } = await adminClient
      .from('user_ratings')
      .select('id, rating')
      .eq('user_id', user.id)
      .eq('restaurant_id', restaurant_id)
      .single();

    const isFirstRating = !existingRating;

    // Upsert the rating
    const { error: upsertError } = await adminClient
      .from('user_ratings')
      .upsert(
        {
          user_id: user.id,
          restaurant_id,
          rating,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'user_id,restaurant_id',
        }
      );

    if (upsertError) {
      console.error('Error upserting rating:', upsertError);
      return NextResponse.json(
        { error: 'Failed to save rating' },
        { status: 500 }
      );
    }

    // Award points only for first rating on this restaurant
    let pointsEarned = 0;
    if (isFirstRating) {
      const isPremium = await checkPremiumStatus(supabase, user.id);
      const multiplier = isPremium ? PREMIUM_MULTIPLIER : 1.0;
      const basePoints = BASE_POINTS.review; // Use existing 'review' action type
      pointsEarned = calculatePoints('review', isPremium);

      // Create transaction record
      await adminClient
        .from('point_transactions')
        .insert({
          user_id: user.id,
          action_type: 'review',
          points: pointsEarned,
          multiplier,
          base_points: basePoints,
          restaurant_id,
          metadata: { rating },
        });

      // Update user points
      const { data: existingPoints } = await adminClient
        .from('user_points')
        .select('id, total_points, lifetime_points')
        .eq('user_id', user.id)
        .single();

      if (existingPoints) {
        await adminClient
          .from('user_points')
          .update({
            total_points: existingPoints.total_points + pointsEarned,
            lifetime_points: existingPoints.lifetime_points + pointsEarned,
          })
          .eq('user_id', user.id);
      } else {
        await adminClient
          .from('user_points')
          .insert({
            user_id: user.id,
            total_points: pointsEarned,
            lifetime_points: pointsEarned,
          });
      }
    }

    // Get updated restaurant rating
    const { data: restaurant } = await adminClient
      .from('restaurants')
      .select('tastelancrating, tastelancrating_count')
      .eq('id', restaurant_id)
      .single();

    return NextResponse.json({
      success: true,
      rating,
      is_first_rating: isFirstRating,
      points_earned: pointsEarned,
      restaurant_rating: restaurant?.tastelancrating,
      restaurant_rating_count: restaurant?.tastelancrating_count,
      message: isFirstRating
        ? `Thanks for rating! You earned ${pointsEarned} points!`
        : 'Rating updated!',
    }, { status: isFirstRating ? 201 : 200 });
  } catch (error) {
    console.error('Error submitting rating:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET - Fetch user's rating for a restaurant
export async function GET(request: Request) {
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

    // Get restaurant_id from query params
    const { searchParams } = new URL(request.url);
    const restaurant_id = searchParams.get('restaurant_id');

    if (!restaurant_id) {
      return NextResponse.json(
        { error: 'restaurant_id is required' },
        { status: 400 }
      );
    }

    // Fetch user's rating
    const { data: userRating, error } = await supabase
      .from('user_ratings')
      .select('rating, created_at, updated_at')
      .eq('user_id', user.id)
      .eq('restaurant_id', restaurant_id)
      .single();

    if (error && error.code !== 'PGRST116') {
      // PGRST116 = no rows found, which is fine
      console.error('Error fetching rating:', error);
      return NextResponse.json(
        { error: 'Failed to fetch rating' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      has_rated: !!userRating,
      rating: userRating?.rating ?? null,
      created_at: userRating?.created_at ?? null,
      updated_at: userRating?.updated_at ?? null,
    });
  } catch (error) {
    console.error('Error fetching rating:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
