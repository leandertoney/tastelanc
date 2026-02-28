/**
 * Autonomous City Expansion Agent
 *
 * Runs on a pg_cron schedule (every 6 hours) to advance cities through
 * the expansion pipeline without manual intervention.
 *
 * Pipeline flow:
 *   1. Suggest & add cities if pipeline < 20 active cities
 *   2. Research cities in "researching" status
 *   3. Generate brand proposals for "researched" cities
 *   4. Generate job listings for "brand_ready" cities with a selected brand
 *   5. Notify admin when items need review/approval
 *
 * The agent NEVER auto-approves — it generates work products and pauses
 * at approval gates. The admin reviews via the dashboard.
 */

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutes max for Netlify

import { NextResponse } from 'next/server';
import { createClient as createSupabaseAdmin, SupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';
import { verifyAdminAccess } from '@/lib/auth/admin-access';
import { Resend } from 'resend';
import {
  researchCity,
  calculateWeightedScore,
  validateWithGooglePlaces,
  generateBrandProposals,
  generateJobListing,
  suggestCities,
} from '@/lib/ai/expansion-agent';
import type { ExpansionCity, BrandDraft, ResearchSource } from '@/lib/ai/expansion-types';

const CRON_SECRET = process.env.CRON_SECRET;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const ADMIN_EMAIL = 'leandertoney@gmail.com';

// Batch sizes — keep small to stay within function timeout
const MAX_SUGGEST = 10; // cities to suggest per run
const MAX_RESEARCH = 5; // cities to research per run
const MAX_BRAND_GEN = 5; // cities to generate brands for per run
const MAX_JOB_GEN = 5; // cities to generate job listings for per run
const MIN_PIPELINE_SIZE = 20; // minimum active cities in pipeline

// Role types to auto-generate job listings for
const AUTO_JOB_ROLES = ['sales_rep'] as const;
// Content creator role: only generated for larger markets
const CONTENT_CREATOR_MIN_POPULATION = 100000;
const CONTENT_CREATOR_MIN_CLUSTER_POPULATION = 150000;

interface RunResult {
  citiesSuggested: number;
  citiesResearched: string[];
  brandsGenerated: string[];
  jobsGenerated: string[];
  jobsAutoPosted: string[];
  errors: string[];
  needsAdminAttention: {
    brandsToReview: number;
    jobsToApprove: number;
    citiesReadyToApprove: number;
    newApplications: number;
    totalPostedJobs: number;
  };
}

export async function POST(request: Request) {
  // Auth: three valid paths
  // 1. CRON_SECRET bearer token (pg_cron via HTTP)
  // 2. pg_cron source flag in body
  // 3. Authenticated super admin (dashboard "Run Agent Now" button)
  const body = await request.json().catch(() => ({}));
  const isPgCron = (body as { source?: string }).source === 'pg_cron';
  const authHeader = request.headers.get('authorization');
  const hasCronSecret = CRON_SECRET && authHeader === `Bearer ${CRON_SECRET}`;

  if (!hasCronSecret && !isPgCron) {
    // Try admin auth (for dashboard manual triggers)
    try {
      const authClient = await createClient();
      const admin = await verifyAdminAccess(authClient);
      if (admin.role !== 'super_admin') {
        return NextResponse.json({ error: 'Super admin access required' }, { status: 403 });
      }
    } catch {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  console.log('[expansion-agent] Starting autonomous run...');

  const supabase = createSupabaseAdmin(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const result: RunResult = {
    citiesSuggested: 0,
    citiesResearched: [],
    brandsGenerated: [],
    jobsGenerated: [],
    jobsAutoPosted: [],
    errors: [],
    needsAdminAttention: {
      brandsToReview: 0,
      jobsToApprove: 0,
      citiesReadyToApprove: 0,
      newApplications: 0,
      totalPostedJobs: 0,
    },
  };

  try {
    // ── Step 1: Fill pipeline if below threshold ──────────────
    await stepSuggestCities(supabase, result);

    // ── Step 2: Research cities in "researching" status ───────
    await stepResearchCities(supabase, result);

    // ── Step 3: Generate brands for "researched" cities ──────
    await stepGenerateBrands(supabase, result);

    // ── Step 4: Generate job listings for ready cities ───────
    await stepGenerateJobs(supabase, result);

    // ── Step 4.5: Auto-post approved jobs ─────────────────────
    await stepAutoPostJobs(supabase, result);

    // ── Step 5: Count items needing admin attention ──────────
    await stepCountPendingReview(supabase, result);

    // ── Step 6: Notify admin if there are items to review ───
    await stepNotifyAdmin(result, supabase);

    console.log('[expansion-agent] Run complete:', JSON.stringify(result, null, 2));

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error('[expansion-agent] Fatal error:', error);
    return NextResponse.json(
      { error: 'Expansion agent encountered a fatal error', details: String(error) },
      { status: 500 }
    );
  }
}

// ─────────────────────────────────────────────────────────
// Step 1: Suggest & add cities
// ─────────────────────────────────────────────────────────

async function stepSuggestCities(
  supabase: SupabaseClient,
  result: RunResult
) {
  try {
    // Count active pipeline cities (exclude live, rejected)
    const { count } = await supabase
      .from('expansion_cities')
      .select('*', { count: 'exact', head: true })
      .not('status', 'in', '("live","rejected")');

    const activeCount = count ?? 0;
    console.log(`[expansion-agent] Active pipeline: ${activeCount}/${MIN_PIPELINE_SIZE}`);

    if (activeCount >= MIN_PIPELINE_SIZE) return;

    const needed = Math.min(MIN_PIPELINE_SIZE - activeCount, MAX_SUGGEST);
    console.log(`[expansion-agent] Suggesting ${needed} cities to fill pipeline...`);

    // Get existing city names to pass as exclusions
    const { data: existingCities } = await supabase
      .from('expansion_cities')
      .select('city_name, state');

    // Get existing live markets — NEVER suggest cities that are already live markets
    const { data: existingMarkets } = await supabase
      .from('markets')
      .select('name, slug');

    const suggestions = await suggestCities({
      count: needed,
      // Focus on PA and neighboring states first, then expand
      min_population: 30000,
      max_population: 500000,
      // Pass existing pipeline cities so the AI itself avoids them
      excludeCities: (existingCities || []).map(c => ({
        city_name: c.city_name,
        state: c.state,
      })),
    });

    // Build exclusion sets:
    // 1. Cities already in expansion pipeline
    const existingPipelineNames = new Set(
      (existingCities || []).map((c) => `${c.city_name.toLowerCase()}-${c.state.toLowerCase()}`)
    );

    // 2. Live market names/slugs (Lancaster, Cumberland, etc.)
    const liveMarketNames = new Set(
      (existingMarkets || []).flatMap((m) => [
        m.slug?.toLowerCase(),
        m.name?.toLowerCase(),
      ]).filter(Boolean)
    );

    // 3. Hard-coded known market cities that must NEVER be re-suggested
    const KNOWN_MARKET_CITIES = new Set([
      'lancaster-pa',
      'carlisle-pa',
      'mechanicsburg-pa',
      'camp hill-pa',
      'shippensburg-pa',
      'boiling springs-pa',
    ]);

    const newSuggestions = suggestions.filter((s) => {
      const cityKey = `${s.city_name.toLowerCase()}-${s.state.toLowerCase()}`;
      const regionKey = s.suggested_region_name
        ? `${s.suggested_region_name.toLowerCase()}-${s.state.toLowerCase()}`
        : null;

      // Skip if already in pipeline
      if (existingPipelineNames.has(cityKey)) return false;

      // Skip if matches a live market
      if (liveMarketNames.has(s.city_name.toLowerCase())) return false;
      if (regionKey && liveMarketNames.has(s.suggested_region_name!.toLowerCase())) return false;

      // Skip hard-coded known market cities
      if (KNOWN_MARKET_CITIES.has(cityKey)) return false;

      // Skip if any cluster town is a known market city
      if (s.cluster_towns?.some((t) => KNOWN_MARKET_CITIES.has(`${t.toLowerCase()}-${s.state.toLowerCase()}`))) return false;

      return true;
    });

    // Insert new cities
    for (const suggestion of newSuggestions) {
      // Use the region name for slug if available (e.g., "lehigh-valley" instead of "allentown")
      const regionName = suggestion.suggested_region_name || suggestion.city_name;
      const regionSlug = regionName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');

      const { data: inserted, error: insertError } = await supabase
        .from('expansion_cities')
        .insert({
          city_name: suggestion.city_name,
          county: suggestion.county,
          state: suggestion.state,
          slug: regionSlug,
          population: suggestion.cluster_population || suggestion.population,
          market_potential_score: suggestion.estimated_score,
          status: 'researching',
          priority: Math.round(suggestion.estimated_score / 10),
          research_data: {
            suggested_region_name: suggestion.suggested_region_name || null,
            cluster_towns: suggestion.cluster_towns || [],
            cluster_population: suggestion.cluster_population || null,
          },
        })
        .select('id')
        .single();

      if (insertError || !inserted) {
        // Likely duplicate slug — skip
        console.warn(`[expansion-agent] Skipping ${suggestion.city_name}: ${insertError?.message}`);
        continue;
      }

      const clusterLabel = suggestion.cluster_towns?.length
        ? ` (cluster: ${suggestion.cluster_towns.join(', ')})`
        : '';

      // Log activity
      await supabase.from('expansion_activity_log').insert({
        city_id: inserted.id,
        action: 'city_added',
        description: `Auto-suggested: ${suggestion.suggested_region_name || suggestion.city_name}, ${suggestion.state}${clusterLabel} (est. score: ${suggestion.estimated_score})`,
        metadata: {
          source: 'autonomous_agent',
          reasoning: suggestion.reasoning,
          suggested_region_name: suggestion.suggested_region_name,
          cluster_towns: suggestion.cluster_towns,
          cluster_population: suggestion.cluster_population,
        },
      });

      result.citiesSuggested++;
    }

    console.log(`[expansion-agent] Added ${result.citiesSuggested} cities to pipeline`);
  } catch (error) {
    const msg = `Step 1 (suggest cities) failed: ${error}`;
    console.error(`[expansion-agent] ${msg}`);
    result.errors.push(msg);
  }
}

// ─────────────────────────────────────────────────────────
// Step 2: Research cities
// ─────────────────────────────────────────────────────────

async function stepResearchCities(
  supabase: SupabaseClient,
  result: RunResult
) {
  try {
    const { data: cities } = await supabase
      .from('expansion_cities')
      .select('id, city_name, county, state, research_data')
      .eq('status', 'researching')
      .order('priority', { ascending: false })
      .limit(MAX_RESEARCH);

    if (!cities || cities.length === 0) return;

    console.log(`[expansion-agent] Researching ${cities.length} cities...`);

    for (const city of cities) {
      try {
        // Extract cluster towns from initial suggestion data (if any)
        const clusterTowns = (city.research_data as Record<string, unknown>)?.cluster_towns as string[] | undefined;
        const regionLabel = clusterTowns?.length
          ? `${city.city_name} region (${clusterTowns.join(', ')})`
          : `${city.city_name}`;

        // Log start
        await supabase.from('expansion_activity_log').insert({
          city_id: city.id,
          action: 'research_started',
          description: `Autonomous research started for ${regionLabel}, ${city.state}`,
          metadata: { source: 'autonomous_agent' },
        });

        // Step 1: AI research with sub-scores (pass cluster towns for regional research)
        const research = await researchCity(city.city_name, city.county, city.state, clusterTowns);

        // Step 2: Calculate weighted score from sub-scores
        const weightedScore = calculateWeightedScore(research.sub_scores);

        // Step 3: Validate restaurant/bar counts with Google Places
        const googleCounts = await validateWithGooglePlaces(
          city.city_name,
          city.state,
          research.center_latitude,
          research.center_longitude
        );

        // Only trust Google Places if it found actual results; 0 likely means API issue
        const restaurantCount = (googleCounts.validated && googleCounts.restaurantCount > 0)
          ? googleCounts.restaurantCount : research.restaurant_count;
        const barCount = (googleCounts.validated && googleCounts.barCount > 0)
          ? googleCounts.barCount : research.bar_count;

        // Build sources array — start with Census/Wikipedia from AI research
        const sources: ResearchSource[] = [...(research.sources || [])];

        // Add Google Places as a source if validated
        if (googleCounts.validated) {
          const now = new Date().toISOString();
          sources.push({
            name: 'Google Places API',
            url: `https://www.google.com/maps/search/restaurants+${encodeURIComponent(city.city_name + ', ' + city.state)}`,
            data_point: `Restaurants: ${googleCounts.restaurantCount}, Bars: ${googleCounts.barCount}`,
            accessed_at: now,
          });
        }

        // Update city with research results
        await supabase
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
                suggested_region_name: (city.research_data as Record<string, unknown>)?.suggested_region_name,
                cluster_towns: clusterTowns,
                cluster_population: (city.research_data as Record<string, unknown>)?.cluster_population,
              } : {}),
              // Research sources for admin panel
              sources,
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
            priority: Math.round(weightedScore / 10),
          })
          .eq('id', city.id);

        // Log completion
        await supabase.from('expansion_activity_log').insert({
          city_id: city.id,
          action: 'research_completed',
          description: `Research complete for ${city.city_name} — score: ${weightedScore}/100`,
          metadata: {
            source: 'autonomous_agent',
            population: research.population,
            market_potential_score: weightedScore,
            sub_scores: research.sub_scores,
            google_places_validated: googleCounts.validated,
          },
        });

        result.citiesResearched.push(city.city_name);
        console.log(`[expansion-agent] Researched ${city.city_name}: ${weightedScore}/100`);
      } catch (error) {
        const msg = `Research failed for ${city.city_name}: ${error}`;
        console.error(`[expansion-agent] ${msg}`);
        result.errors.push(msg);
      }
    }
  } catch (error) {
    const msg = `Step 2 (research cities) failed: ${error}`;
    console.error(`[expansion-agent] ${msg}`);
    result.errors.push(msg);
  }
}

// ─────────────────────────────────────────────────────────
// Step 3: Generate brand proposals
// ─────────────────────────────────────────────────────────

async function stepGenerateBrands(
  supabase: SupabaseClient,
  result: RunResult
) {
  try {
    // Find "researched" cities that don't have any brand drafts yet
    const { data: cities } = await supabase
      .from('expansion_cities')
      .select('*')
      .eq('status', 'researched')
      .order('market_potential_score', { ascending: false })
      .limit(MAX_BRAND_GEN);

    if (!cities || cities.length === 0) return;

    // Filter to only cities without brand drafts
    const citiesToProcess: ExpansionCity[] = [];
    for (const city of cities) {
      const { count } = await supabase
        .from('expansion_brand_drafts')
        .select('*', { count: 'exact', head: true })
        .eq('city_id', city.id);

      if ((count ?? 0) === 0) {
        citiesToProcess.push(city as ExpansionCity);
      }
    }

    if (citiesToProcess.length === 0) return;

    console.log(`[expansion-agent] Generating brands for ${citiesToProcess.length} cities...`);

    for (const city of citiesToProcess) {
      try {
        const proposals = await generateBrandProposals(city, 3);

        const brandsToInsert = proposals.map((proposal, index) => ({
          city_id: city.id,
          app_name: proposal.app_name,
          tagline: proposal.tagline,
          ai_assistant_name: proposal.ai_assistant_name,
          premium_name: proposal.premium_name,
          colors: proposal.colors || {},
          market_config_json: proposal.market_config_json || {},
          seo_title: proposal.seo_title || null,
          seo_description: proposal.seo_description || null,
          seo_keywords: proposal.seo_keywords || [],
          avatar_image_url: proposal.avatar_image_url || null,
          variant_number: index + 1,
          is_selected: false,
        }));

        await supabase.from('expansion_brand_drafts').insert(brandsToInsert);

        // Update city status
        await supabase
          .from('expansion_cities')
          .update({ status: 'brand_ready' })
          .eq('id', city.id);

        // Log activity
        await supabase.from('expansion_activity_log').insert({
          city_id: city.id,
          action: 'brand_generated',
          description: `Auto-generated 3 brand proposals for ${city.city_name}`,
          metadata: {
            source: 'autonomous_agent',
            proposals: proposals.map((p) => p.app_name),
          },
        });

        result.brandsGenerated.push(city.city_name);
        console.log(`[expansion-agent] Brands generated for ${city.city_name}`);
      } catch (error) {
        const msg = `Brand generation failed for ${city.city_name}: ${error}`;
        console.error(`[expansion-agent] ${msg}`);
        result.errors.push(msg);
      }
    }
  } catch (error) {
    const msg = `Step 3 (generate brands) failed: ${error}`;
    console.error(`[expansion-agent] ${msg}`);
    result.errors.push(msg);
  }
}

// ─────────────────────────────────────────────────────────
// Step 4: Generate job listings
// ─────────────────────────────────────────────────────────

async function stepGenerateJobs(
  supabase: SupabaseClient,
  result: RunResult
) {
  try {
    // Find "brand_ready" cities that have a selected brand
    const { data: cities } = await supabase
      .from('expansion_cities')
      .select('*')
      .eq('status', 'brand_ready')
      .order('market_potential_score', { ascending: false })
      .limit(MAX_JOB_GEN * 2); // fetch more, then filter

    if (!cities || cities.length === 0) return;

    let processed = 0;

    for (const city of cities) {
      if (processed >= MAX_JOB_GEN) break;

      // Check if this city has a selected brand
      const { data: selectedBrand } = await supabase
        .from('expansion_brand_drafts')
        .select('*')
        .eq('city_id', city.id)
        .eq('is_selected', true)
        .single();

      if (!selectedBrand) continue; // No brand selected yet — admin needs to pick one

      // Check if job listings already exist for this city
      const { count: jobCount } = await supabase
        .from('expansion_job_listings')
        .select('*', { count: 'exact', head: true })
        .eq('city_id', city.id);

      if ((jobCount ?? 0) > 0) continue; // Already has listings

      try {
        // Determine which roles to generate for this city
        const rolesToGenerate: string[] = [...AUTO_JOB_ROLES];

        // Add content_creator for larger markets
        const cityPop = city.population || 0;
        const clusterPop = (city.research_data as Record<string, unknown>)?.cluster_population as number || 0;
        if (cityPop >= CONTENT_CREATOR_MIN_POPULATION || clusterPop >= CONTENT_CREATOR_MIN_CLUSTER_POPULATION) {
          rolesToGenerate.push('content_creator');
        }

        // Generate job listings for each role
        for (const roleType of rolesToGenerate) {
          const listing = await generateJobListing(
            city as ExpansionCity,
            selectedBrand as BrandDraft,
            roleType
          );

          await supabase.from('expansion_job_listings').insert({
            city_id: city.id,
            title: listing.title,
            role_type: roleType,
            description: listing.description,
            requirements: listing.requirements || [],
            compensation_summary: listing.compensation_summary || null,
            location: listing.location || `${city.city_name}, ${city.state}`,
            is_remote: false,
            status: 'draft',
          });

          // Log activity
          await supabase.from('expansion_activity_log').insert({
            city_id: city.id,
            action: 'job_listing_generated',
            description: `Auto-generated ${roleType} listing for ${city.city_name}`,
            metadata: { source: 'autonomous_agent', role_type: roleType },
          });
        }

        result.jobsGenerated.push(city.city_name);
        processed++;
        console.log(`[expansion-agent] Job listings generated for ${city.city_name}`);
      } catch (error) {
        const msg = `Job generation failed for ${city.city_name}: ${error}`;
        console.error(`[expansion-agent] ${msg}`);
        result.errors.push(msg);
      }
    }
  } catch (error) {
    const msg = `Step 4 (generate jobs) failed: ${error}`;
    console.error(`[expansion-agent] ${msg}`);
    result.errors.push(msg);
  }
}

// ─────────────────────────────────────────────────────────
// Step 4.5: Auto-post approved jobs
// ─────────────────────────────────────────────────────────

async function stepAutoPostJobs(
  supabase: SupabaseClient,
  result: RunResult
) {
  try {
    // Find approved jobs that haven't been posted yet
    const { data: approvedJobs } = await supabase
      .from('expansion_job_listings')
      .select('id, city_id, title, role_type')
      .eq('status', 'approved')
      .is('posted_at', null);

    if (!approvedJobs || approvedJobs.length === 0) return;

    console.log(`[expansion-agent] Auto-posting ${approvedJobs.length} approved jobs...`);

    const now = new Date();
    const validThrough = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000); // 90 days

    for (const job of approvedJobs) {
      try {
        await supabase
          .from('expansion_job_listings')
          .update({
            status: 'posted',
            posted_at: now.toISOString(),
            valid_through: validThrough.toISOString(),
          })
          .eq('id', job.id);

        // Log activity
        await supabase.from('expansion_activity_log').insert({
          city_id: job.city_id,
          action: 'job_posted',
          description: `Auto-posted ${job.role_type} listing: ${job.title}`,
          metadata: {
            source: 'autonomous_agent',
            job_listing_id: job.id,
            valid_through: validThrough.toISOString(),
          },
        });

        result.jobsAutoPosted.push(job.title);
        console.log(`[expansion-agent] Posted job: ${job.title}`);
      } catch (error) {
        const msg = `Auto-post failed for job ${job.id}: ${error}`;
        console.error(`[expansion-agent] ${msg}`);
        result.errors.push(msg);
      }
    }
  } catch (error) {
    const msg = `Step 4.5 (auto-post jobs) failed: ${error}`;
    console.error(`[expansion-agent] ${msg}`);
    result.errors.push(msg);
  }
}

// ─────────────────────────────────────────────────────────
// Step 5: Count items needing admin attention
// ─────────────────────────────────────────────────────────

async function stepCountPendingReview(
  supabase: SupabaseClient,
  result: RunResult
) {
  try {
    // Cities in brand_ready that need brand selection (no selected brand)
    const { data: brandReadyCities } = await supabase
      .from('expansion_cities')
      .select('id')
      .eq('status', 'brand_ready');

    let brandsToReview = 0;
    for (const city of brandReadyCities || []) {
      const { count } = await supabase
        .from('expansion_brand_drafts')
        .select('*', { count: 'exact', head: true })
        .eq('city_id', city.id)
        .eq('is_selected', true);

      if ((count ?? 0) === 0) brandsToReview++;
    }

    // Draft job listings pending approval
    const { count: draftJobs } = await supabase
      .from('expansion_job_listings')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'draft');

    // Cities ready to approve for launch
    let citiesReadyToApprove = 0;
    for (const city of brandReadyCities || []) {
      const { count: selectedCount } = await supabase
        .from('expansion_brand_drafts')
        .select('*', { count: 'exact', head: true })
        .eq('city_id', city.id)
        .eq('is_selected', true);

      if ((selectedCount ?? 0) > 0) citiesReadyToApprove++;
    }

    // New job applications since last run (~2 hours ago)
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    const { count: newApps } = await supabase
      .from('job_applications')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'new')
      .gte('created_at', twoHoursAgo);

    // Total posted jobs across all markets
    const { count: postedJobs } = await supabase
      .from('expansion_job_listings')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'posted');

    result.needsAdminAttention = {
      brandsToReview,
      jobsToApprove: draftJobs ?? 0,
      citiesReadyToApprove,
      newApplications: newApps ?? 0,
      totalPostedJobs: postedJobs ?? 0,
    };
  } catch (error) {
    console.error(`[expansion-agent] Step 5 (count pending) failed: ${error}`);
  }
}

// ─────────────────────────────────────────────────────────
// Step 6: Notify admin via email (rich template)
// ─────────────────────────────────────────────────────────

async function stepNotifyAdmin(
  result: RunResult,
  supabase?: SupabaseClient
) {
  const { needsAdminAttention, citiesResearched, brandsGenerated, jobsGenerated, jobsAutoPosted, citiesSuggested, errors } = result;
  const totalPending =
    needsAdminAttention.brandsToReview +
    needsAdminAttention.jobsToApprove +
    needsAdminAttention.citiesReadyToApprove;

  const hasNewWork =
    citiesSuggested > 0 ||
    citiesResearched.length > 0 ||
    brandsGenerated.length > 0 ||
    jobsGenerated.length > 0 ||
    jobsAutoPosted.length > 0;

  // Only send email if there's new work or pending items
  if (!hasNewWork && totalPending === 0) {
    console.log('[expansion-agent] No new work and no pending items — skipping notification');
    return;
  }

  try {
    const resend = new Resend(process.env.RESEND_API_KEY);

    // Fetch pipeline stats for the progress bar
    let pipelineStats = { researching: 0, researched: 0, brand_ready: 0, approved: 0, live: 0, posted_jobs: 0 };
    if (supabase) {
      const statuses = ['researching', 'researched', 'brand_ready', 'approved', 'live'];
      for (const status of statuses) {
        const { count } = await supabase
          .from('expansion_cities')
          .select('*', { count: 'exact', head: true })
          .eq('status', status);
        (pipelineStats as Record<string, number>)[status] = count ?? 0;
      }
      pipelineStats.posted_jobs = needsAdminAttention.totalPostedJobs;
    }

    // Fetch recently branded cities with avatars for thumbnails
    let brandThumbnails: { city: string; avatar: string; name: string }[] = [];
    if (supabase && brandsGenerated.length > 0) {
      for (const cityName of brandsGenerated.slice(0, 5)) {
        const { data: city } = await supabase
          .from('expansion_cities')
          .select('id')
          .eq('city_name', cityName)
          .single();
        if (city) {
          const { data: brands } = await supabase
            .from('expansion_brand_drafts')
            .select('app_name, avatar_image_url, ai_assistant_name')
            .eq('city_id', city.id)
            .not('avatar_image_url', 'is', null)
            .limit(3);
          if (brands) {
            for (const b of brands) {
              if (b.avatar_image_url) {
                brandThumbnails.push({ city: cityName, avatar: b.avatar_image_url, name: b.ai_assistant_name });
              }
            }
          }
        }
      }
    }

    const DASHBOARD_URL = 'https://tastelanc.com/admin/expansion';
    const ACCENT = '#A41E22';

    // Build the HTML email
    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin:0;padding:0;background:#0a0a0a;color:#e5e5e5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<div style="max-width:600px;margin:0 auto;padding:24px;">

  <!-- Header -->
  <div style="text-align:center;margin-bottom:24px;">
    <h1 style="color:white;font-size:22px;margin:0;">Expansion Agent Report</h1>
    <p style="color:#888;font-size:13px;margin:4px 0 0;">${new Date().toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}</p>
  </div>

  <!-- Pipeline Progress Bar -->
  <div style="background:#1a1a1a;border-radius:12px;padding:16px;margin-bottom:20px;">
    <h3 style="color:white;font-size:14px;margin:0 0 12px;text-transform:uppercase;letter-spacing:1px;">Pipeline Overview</h3>
    <div style="display:flex;gap:0;border-radius:8px;overflow:hidden;height:28px;background:#222;">
      ${pipelineStats.researching > 0 ? `<div style="background:#3b82f6;flex:${pipelineStats.researching};display:flex;align-items:center;justify-content:center;font-size:11px;color:white;font-weight:600;">${pipelineStats.researching}</div>` : ''}
      ${pipelineStats.researched > 0 ? `<div style="background:#8b5cf6;flex:${pipelineStats.researched};display:flex;align-items:center;justify-content:center;font-size:11px;color:white;font-weight:600;">${pipelineStats.researched}</div>` : ''}
      ${pipelineStats.brand_ready > 0 ? `<div style="background:#f59e0b;flex:${pipelineStats.brand_ready};display:flex;align-items:center;justify-content:center;font-size:11px;color:white;font-weight:600;">${pipelineStats.brand_ready}</div>` : ''}
      ${pipelineStats.approved > 0 ? `<div style="background:#10b981;flex:${pipelineStats.approved};display:flex;align-items:center;justify-content:center;font-size:11px;color:white;font-weight:600;">${pipelineStats.approved}</div>` : ''}
      ${pipelineStats.live > 0 ? `<div style="background:${ACCENT};flex:${pipelineStats.live};display:flex;align-items:center;justify-content:center;font-size:11px;color:white;font-weight:600;">${pipelineStats.live}</div>` : ''}
    </div>
    <div style="display:flex;justify-content:space-between;margin-top:8px;font-size:11px;color:#888;">
      <span style="color:#3b82f6;">Researching ${pipelineStats.researching}</span>
      <span style="color:#8b5cf6;">Researched ${pipelineStats.researched}</span>
      <span style="color:#f59e0b;">Branded ${pipelineStats.brand_ready}</span>
      <span style="color:#10b981;">Approved ${pipelineStats.approved}</span>
      <span style="color:${ACCENT};">Live ${pipelineStats.live}</span>
    </div>
    <p style="color:#888;font-size:12px;margin:8px 0 0;text-align:center;">
      <strong style="color:white;">${pipelineStats.posted_jobs}</strong> jobs posted across all markets
      ${needsAdminAttention.newApplications > 0 ? ` &bull; <strong style="color:#f59e0b;">${needsAdminAttention.newApplications} new application${needsAdminAttention.newApplications > 1 ? 's' : ''}</strong>` : ''}
    </p>
  </div>

  ${hasNewWork ? `
  <!-- New Work -->
  <div style="background:#1a1a1a;border-radius:12px;padding:16px;margin-bottom:20px;">
    <h3 style="color:white;font-size:14px;margin:0 0 12px;text-transform:uppercase;letter-spacing:1px;">New This Run</h3>
    <table style="width:100%;border-collapse:collapse;">
      ${citiesSuggested > 0 ? `<tr><td style="padding:6px 0;color:#888;font-size:13px;">Cities Added</td><td style="padding:6px 0;text-align:right;color:white;font-weight:600;font-size:13px;">${citiesSuggested}</td></tr>` : ''}
      ${citiesResearched.length > 0 ? `<tr><td style="padding:6px 0;color:#888;font-size:13px;">Cities Researched</td><td style="padding:6px 0;text-align:right;color:white;font-weight:600;font-size:13px;">${citiesResearched.join(', ')}</td></tr>` : ''}
      ${brandsGenerated.length > 0 ? `<tr><td style="padding:6px 0;color:#888;font-size:13px;">Brands Generated</td><td style="padding:6px 0;text-align:right;color:white;font-weight:600;font-size:13px;">${brandsGenerated.join(', ')}</td></tr>` : ''}
      ${jobsGenerated.length > 0 ? `<tr><td style="padding:6px 0;color:#888;font-size:13px;">Jobs Generated</td><td style="padding:6px 0;text-align:right;color:white;font-weight:600;font-size:13px;">${jobsGenerated.join(', ')}</td></tr>` : ''}
      ${jobsAutoPosted.length > 0 ? `<tr><td style="padding:6px 0;color:#888;font-size:13px;">Jobs Auto-Posted</td><td style="padding:6px 0;text-align:right;color:#10b981;font-weight:600;font-size:13px;">${jobsAutoPosted.length} posted</td></tr>` : ''}
    </table>
  </div>
  ` : ''}

  ${brandThumbnails.length > 0 ? `
  <!-- Avatar Thumbnails -->
  <div style="background:#1a1a1a;border-radius:12px;padding:16px;margin-bottom:20px;">
    <h3 style="color:white;font-size:14px;margin:0 0 12px;text-transform:uppercase;letter-spacing:1px;">New Brand Mascots</h3>
    <div style="display:flex;gap:12px;flex-wrap:wrap;justify-content:center;">
      ${brandThumbnails.slice(0, 6).map(b => `
        <div style="text-align:center;">
          <img src="${b.avatar}" width="64" height="64" style="border-radius:50%;border:2px solid #333;" alt="${b.name}" />
          <p style="color:#ccc;font-size:11px;margin:4px 0 0;">${b.name}</p>
          <p style="color:#666;font-size:10px;margin:2px 0 0;">${b.city}</p>
        </div>
      `).join('')}
    </div>
  </div>
  ` : ''}

  ${totalPending > 0 ? `
  <!-- Needs Attention -->
  <div style="background:#1a1a1a;border:1px solid ${ACCENT}44;border-radius:12px;padding:16px;margin-bottom:20px;">
    <h3 style="color:${ACCENT};font-size:14px;margin:0 0 12px;text-transform:uppercase;letter-spacing:1px;">Needs Your Attention</h3>
    <table style="width:100%;border-collapse:collapse;">
      ${needsAdminAttention.brandsToReview > 0 ? `<tr><td style="padding:6px 0;color:#888;font-size:13px;">Brand Selection Needed</td><td style="padding:6px 0;text-align:right;color:#f59e0b;font-weight:600;font-size:13px;">${needsAdminAttention.brandsToReview} cities</td></tr>` : ''}
      ${needsAdminAttention.jobsToApprove > 0 ? `<tr><td style="padding:6px 0;color:#888;font-size:13px;">Job Listings to Approve</td><td style="padding:6px 0;text-align:right;color:#f59e0b;font-weight:600;font-size:13px;">${needsAdminAttention.jobsToApprove} drafts</td></tr>` : ''}
      ${needsAdminAttention.citiesReadyToApprove > 0 ? `<tr><td style="padding:6px 0;color:#888;font-size:13px;">Cities Ready for Launch</td><td style="padding:6px 0;text-align:right;color:#10b981;font-weight:600;font-size:13px;">${needsAdminAttention.citiesReadyToApprove} cities</td></tr>` : ''}
      ${needsAdminAttention.newApplications > 0 ? `<tr><td style="padding:6px 0;color:#888;font-size:13px;">New Job Applications</td><td style="padding:6px 0;text-align:right;color:#f59e0b;font-weight:600;font-size:13px;">${needsAdminAttention.newApplications} new</td></tr>` : ''}
    </table>
    <div style="text-align:center;margin-top:16px;">
      <a href="${DASHBOARD_URL}" style="display:inline-block;background:${ACCENT};color:white;text-decoration:none;padding:10px 24px;border-radius:8px;font-weight:600;font-size:14px;">Review in Dashboard</a>
    </div>
  </div>
  ` : ''}

  ${errors.length > 0 ? `
  <!-- Errors -->
  <div style="background:#1a1a1a;border:1px solid #cc333344;border-radius:12px;padding:16px;margin-bottom:20px;">
    <h3 style="color:#cc3333;font-size:14px;margin:0 0 8px;">Errors (${errors.length})</h3>
    ${errors.map(err => `<p style="color:#cc6666;font-size:12px;margin:4px 0;">&bull; ${err}</p>`).join('')}
  </div>
  ` : ''}

  <!-- Footer -->
  <p style="text-align:center;color:#555;font-size:11px;margin-top:24px;">
    TasteLanc Expansion Agent &bull; <a href="${DASHBOARD_URL}" style="color:${ACCENT};">Dashboard</a> &bull; <a href="https://tastelanc.com/api/jobs/feed.xml" style="color:${ACCENT};">Indeed Feed</a>
  </p>

</div>
</body>
</html>`;

    // Build subject line
    const subjectParts: string[] = [];
    if (citiesSuggested > 0) subjectParts.push(`${citiesSuggested} cities added`);
    if (brandsGenerated.length > 0) subjectParts.push(`${brandsGenerated.length} branded`);
    if (jobsAutoPosted.length > 0) subjectParts.push(`${jobsAutoPosted.length} jobs posted`);
    if (needsAdminAttention.newApplications > 0) subjectParts.push(`${needsAdminAttention.newApplications} new application${needsAdminAttention.newApplications > 1 ? 's' : ''}`);
    if (totalPending > 0 && subjectParts.length === 0) subjectParts.push(`${totalPending} items need review`);
    const subjectDetail = subjectParts.length > 0 ? subjectParts.join(', ') : 'Status update';

    await resend.emails.send({
      from: 'TasteLanc Expansion Agent <noreply@tastelanc.com>',
      to: ADMIN_EMAIL,
      subject: `Expansion: ${subjectDetail}`,
      html,
    });

    console.log('[expansion-agent] Admin notification sent');
  } catch (error) {
    console.error('[expansion-agent] Failed to send notification email:', error);
    result.errors.push(`Notification email failed: ${error}`);
  }
}
