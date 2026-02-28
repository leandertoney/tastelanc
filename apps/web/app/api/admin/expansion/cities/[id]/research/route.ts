import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { verifyAdminAccess } from '@/lib/auth/admin-access';
import { researchCity } from '@/lib/ai/expansion-agent';

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
      .select('id, city_name, county, state')
      .eq('id', id)
      .single();

    if (fetchError || !cityRow) {
      return NextResponse.json({ error: 'City not found' }, { status: 404 });
    }

    // Log research started
    await serviceClient
      .from('expansion_activity_log')
      .insert({
        city_id: id,
        user_id: admin.userId,
        action: 'research_started',
        description: `AI research started for ${cityRow.city_name}, ${cityRow.state}`,
      });

    // Call AI research
    const research = await researchCity(cityRow.city_name, cityRow.county, cityRow.state);

    // Update city with research results
    const { data: city, error: updateError } = await serviceClient
      .from('expansion_cities')
      .update({
        population: research.population,
        median_income: research.median_income,
        median_age: research.median_age,
        restaurant_count: research.restaurant_count,
        bar_count: research.bar_count,
        dining_scene_description: research.dining_scene_description,
        competition_analysis: research.competition_analysis,
        market_potential_score: research.market_potential_score,
        center_latitude: research.center_latitude,
        center_longitude: research.center_longitude,
        research_data: {
          key_neighborhoods: research.key_neighborhoods,
          notable_restaurants: research.notable_restaurants,
          local_food_traditions: research.local_food_traditions,
          college_presence: research.college_presence,
          tourism_factors: research.tourism_factors,
          seasonal_considerations: research.seasonal_considerations,
          expansion_reasoning: research.expansion_reasoning,
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
        description: `AI research completed for ${cityRow.city_name} — score: ${research.market_potential_score}/100`,
        metadata: {
          population: research.population,
          market_potential_score: research.market_potential_score,
        },
      });

    return NextResponse.json({ city });
  } catch (error) {
    console.error('Error running city research:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
