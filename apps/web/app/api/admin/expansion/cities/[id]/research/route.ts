import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { verifyAdminAccess } from '@/lib/auth/admin-access';
import { researchCity, calculateWeightedScore, validateWithGooglePlaces } from '@/lib/ai/expansion-agent';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const supabase = await createClient();
    let admin;
    try { admin = await verifyAdminAccess(supabase); }
    catch (err: any) { return NextResponse.json({ error: err.message }, { status: err.status || 500 }); }

    if (admin.role !== 'super_admin') {
      return NextResponse.json({ error: 'Super admin access required' }, { status: 403 });
    }

    const serviceClient = createServiceRoleClient();

    // Fetch city data
    const { data: cityRow, error: fetchError } = await serviceClient
      .from('expansion_cities')
      .select('id, city_name, county, state, radius_miles, research_data')
      .eq('id', id)
      .single();

    if (fetchError || !cityRow) {
      return NextResponse.json({ error: 'City not found' }, { status: 404 });
    }

    // Extract cluster info if available
    const existingResearch = cityRow.research_data as Record<string, unknown> | null;
    const clusterTowns = existingResearch?.cluster_towns as string[] | undefined;

    // Log research started
    await serviceClient
      .from('expansion_activity_log')
      .insert({
        city_id: id,
        user_id: admin.userId,
        action: 'research_started',
        description: `AI research started for ${cityRow.city_name}, ${cityRow.state}${clusterTowns?.length ? ` (cluster: ${clusterTowns.join(', ')})` : ''}`,
      });

    // Step 1: AI research (returns sub-scores instead of a single score)
    const research = await researchCity(cityRow.city_name, cityRow.county, cityRow.state, clusterTowns);

    // Step 2: Calculate weighted score from sub-scores
    const weightedScore = calculateWeightedScore(research.sub_scores);

    // Step 3: Validate restaurant/bar counts with Google Places
    const googleCounts = await validateWithGooglePlaces(
      cityRow.city_name,
      cityRow.state,
      research.center_latitude,
      research.center_longitude,
      cityRow.radius_miles || 25
    );

    // Use Google counts if validated, otherwise fall back to AI estimates
    // Only trust Google Places if it found actual results; 0 likely means API issue
    const restaurantCount = (googleCounts.validated && googleCounts.restaurantCount > 0)
      ? googleCounts.restaurantCount : research.restaurant_count;
    const barCount = (googleCounts.validated && googleCounts.barCount > 0)
      ? googleCounts.barCount : research.bar_count;

    // Update city with research results
    const { data: city, error: updateError } = await serviceClient
      .from('expansion_cities')
      .update({
        population: research.population,
        median_income: research.median_income,
        median_age: research.median_age,
        restaurant_count: restaurantCount,
        bar_count: barCount,
        dining_scene_description: research.dining_scene_description,
        competition_analysis: research.competition_analysis,
        market_potential_score: weightedScore,
        center_latitude: research.center_latitude,
        center_longitude: research.center_longitude,
        research_data: {
          // Preserve cluster info from initial suggestion
          ...(clusterTowns?.length ? {
            suggested_region_name: existingResearch?.suggested_region_name,
            cluster_towns: clusterTowns,
            cluster_population: existingResearch?.cluster_population,
          } : {}),
          key_neighborhoods: research.key_neighborhoods,
          notable_restaurants: research.notable_restaurants,
          local_food_traditions: research.local_food_traditions,
          college_presence: research.college_presence,
          tourism_factors: research.tourism_factors,
          seasonal_considerations: research.seasonal_considerations,
          expansion_reasoning: research.expansion_reasoning,
          sub_scores: research.sub_scores,
          sub_score_reasoning: research.sub_score_reasoning,
          ai_estimated_restaurant_count: research.restaurant_count,
          ai_estimated_bar_count: research.bar_count,
          google_places_restaurant_count: googleCounts.validated ? googleCounts.restaurantCount : null,
          google_places_bar_count: googleCounts.validated ? googleCounts.barCount : null,
          google_places_validated: googleCounts.validated,
          google_places_validated_at: googleCounts.validated ? new Date().toISOString() : null,
        },
        status: 'researched',
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating city with research:', updateError);
      return NextResponse.json({ error: 'Failed to save research results' }, { status: 500 });
    }

    // Log research completed
    await serviceClient
      .from('expansion_activity_log')
      .insert({
        city_id: id,
        user_id: admin.userId,
        action: 'research_completed',
        description: `AI research completed for ${cityRow.city_name} — score: ${weightedScore}/100`,
        metadata: {
          population: research.population,
          market_potential_score: weightedScore,
          sub_scores: research.sub_scores,
          google_places_validated: googleCounts.validated,
        },
      });

    return NextResponse.json({ city });
  } catch (error) {
    console.error('Error running city research:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
