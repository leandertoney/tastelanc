import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { verifyAdminAccess } from '@/lib/auth/admin-access';
import { generateJobListing } from '@/lib/ai/expansion-agent';
import type { ExpansionCity, BrandDraft } from '@/lib/ai/expansion-types';

export const dynamic = 'force-dynamic';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; brandId: string }> }
) {
  try {
    const { id, brandId } = await params;

    const supabase = await createClient();
    let admin;
    try { admin = await verifyAdminAccess(supabase); }
    catch (err: any) { return NextResponse.json({ error: err.message }, { status: err.status || 500 }); }

    if (admin.role !== 'super_admin') {
      return NextResponse.json({ error: 'Super admin access required' }, { status: 403 });
    }

    const serviceClient = createServiceRoleClient();

    const body = await request.json();
    const { is_selected } = body;

    // Verify brand belongs to this city
    const { data: existingBrand, error: fetchError } = await serviceClient
      .from('expansion_brand_drafts')
      .select('id, city_id, app_name')
      .eq('id', brandId)
      .eq('city_id', id)
      .single();

    if (fetchError || !existingBrand) {
      return NextResponse.json({ error: 'Brand draft not found for this city' }, { status: 404 });
    }

    // If selecting this brand, deselect all others for this city first
    if (is_selected === true) {
      await serviceClient
        .from('expansion_brand_drafts')
        .update({ is_selected: false })
        .eq('city_id', id);
    }

    // Update this brand
    const updatePayload: Record<string, any> = {};
    if (is_selected !== undefined) updatePayload.is_selected = is_selected;

    const { data: brand, error: updateError } = await serviceClient
      .from('expansion_brand_drafts')
      .update(updatePayload)
      .eq('id', brandId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating brand draft:', updateError);
      return NextResponse.json({ error: 'Failed to update brand' }, { status: 500 });
    }

    // Log activity if brand was selected
    if (is_selected === true) {
      await serviceClient
        .from('expansion_activity_log')
        .insert({
          city_id: id,
          user_id: admin.userId,
          action: 'brand_selected',
          description: `Selected brand "${existingBrand.app_name}" for this city`,
          metadata: { brand_id: brandId, app_name: existingBrand.app_name },
        });

      // ── Think-ahead: Auto-generate job listings immediately ──
      // Don't wait for the next cron run — generate jobs as soon as brand is selected
      const { count: existingJobCount } = await serviceClient
        .from('expansion_job_listings')
        .select('*', { count: 'exact', head: true })
        .eq('city_id', id);

      if ((existingJobCount ?? 0) === 0) {
        // Fetch full city data for job generation
        const { data: cityData } = await serviceClient
          .from('expansion_cities')
          .select('*')
          .eq('id', id)
          .single();

        if (cityData) {
          const rolesToGenerate: string[] = ['sales_rep'];
          // Add content_creator for larger markets
          const cityPop = cityData.population || 0;
          const clusterPop = (cityData.research_data as Record<string, unknown>)?.cluster_population as number || 0;
          if (cityPop >= 100000 || clusterPop >= 150000) {
            rolesToGenerate.push('content_creator');
          }

          // Generate in background (don't block the response)
          const generateJobs = async () => {
            try {
              for (const roleType of rolesToGenerate) {
                const listing = await generateJobListing(
                  cityData as ExpansionCity,
                  brand as BrandDraft,
                  roleType
                );

                await serviceClient.from('expansion_job_listings').insert({
                  city_id: id,
                  title: listing.title,
                  role_type: roleType,
                  description: listing.description,
                  requirements: listing.requirements || [],
                  compensation_summary: listing.compensation_summary || null,
                  location: listing.location || `${cityData.city_name}, ${cityData.state}`,
                  is_remote: false,
                  status: 'draft',
                });

                await serviceClient.from('expansion_activity_log').insert({
                  city_id: id,
                  user_id: admin.userId,
                  action: 'job_listing_generated',
                  description: `Auto-generated ${roleType} listing on brand selection`,
                  metadata: { source: 'brand_selection_think_ahead', role_type: roleType },
                });
              }
              console.log(`[brand-select] Auto-generated ${rolesToGenerate.length} job listing(s) for ${cityData.city_name}`);
            } catch (err) {
              console.error('[brand-select] Failed to auto-generate jobs:', err);
            }
          };

          // Fire and forget — don't block the PUT response
          generateJobs();
        }
      }
    }

    return NextResponse.json({ brand });
  } catch (error) {
    console.error('Error updating brand draft:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
