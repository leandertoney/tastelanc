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
  generateBrandProposals,
  generateJobListing,
  suggestCities,
} from '@/lib/ai/expansion-agent';
import type { ExpansionCity, BrandDraft, CityResearchData } from '@/lib/ai/expansion-types';
import { EXPANSION_TEAM } from '@/config/expansion-team';
import { generateReviewToken } from '@/lib/expansion-review-token';
import { getSenderByEmail } from '@/config/sender-identities';

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
      if (admin.role !== 'super_admin' && admin.role !== 'co_founder') {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
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
    // ── Step 1: Count pending items & send notification FIRST ──
    // (Runs before heavy AI work so the 5-minute timeout can't prevent delivery)
    await stepCountPendingReview(supabase, result);
    await stepNotifyAdmin(result, supabase);

    // ── Step 2: Fill pipeline if below threshold ──────────────
    await stepSuggestCities(supabase, result);

    // ── Step 3: Research cities in "researching" status ───────
    await stepResearchCities(supabase, result);

    // ── Step 4: Generate brands for "researched" cities ──────
    await stepGenerateBrands(supabase, result);

    // ── Step 5: Generate job listings for ready cities ───────
    await stepGenerateJobs(supabase, result);

    // ── Step 5.5: Auto-post approved jobs ─────────────────────
    await stepAutoPostJobs(supabase, result);

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
          description: `Deep research started for ${regionLabel}, ${city.state}`,
          metadata: { source: 'autonomous_agent' },
        });

        // Deep research: Census + College Scorecard + BEA + Overpass + Google Places + AI prose
        const research = await researchCity(city.city_name, city.county, city.state, clusterTowns);

        // Calculate weighted score from programmatic sub-scores
        const weightedScore = calculateWeightedScore(research.sub_scores);

        // Update city with all research results including deep data
        await supabase
          .from('expansion_cities')
          .update({
            population: research.population,
            median_income: research.median_income,
            median_age: research.median_age,
            restaurant_count: research.restaurant_count,
            bar_count: research.bar_count,
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
              // Validated data sources
              sources: research.sources,
              // Prose analysis (AI-synthesized from real data)
              key_neighborhoods: research.key_neighborhoods,
              notable_restaurants: research.notable_restaurants,
              local_food_traditions: research.local_food_traditions,
              college_presence: research.college_presence,
              tourism_factors: research.tourism_factors,
              seasonal_considerations: research.seasonal_considerations,
              expansion_reasoning: research.expansion_reasoning,
              // Programmatic scores
              sub_scores: research.sub_scores,
              sub_score_reasoning: research.sub_score_reasoning,
              // Deep research structured data
              colleges: research.colleges,
              total_college_enrollment: research.total_college_enrollment,
              tourism_economic_data: research.tourism_economic_data,
              census_extended: research.census_extended,
              venue_breakdown: research.venue_breakdown,
              cuisine_distribution: research.cuisine_distribution,
              data_completeness: research.data_completeness,
              // Legacy fields for backward compatibility
              ai_estimated_restaurant_count: research.restaurant_count,
              ai_estimated_bar_count: research.bar_count,
              google_places_restaurant_count: research.data_completeness.google_places ? research.restaurant_count : null,
              google_places_bar_count: research.data_completeness.google_places ? research.bar_count : null,
              google_places_validated: research.data_completeness.google_places || false,
              google_places_validated_at: research.data_completeness.google_places ? new Date().toISOString() : null,
            },
            status: 'researched',
            priority: Math.round(weightedScore / 10),
          })
          .eq('id', city.id);

        // Log completion with data completeness summary
        const completeSources = Object.entries(research.data_completeness)
          .filter(([, v]) => v)
          .map(([k]) => k);

        await supabase.from('expansion_activity_log').insert({
          city_id: city.id,
          action: 'research_completed',
          description: `Deep research complete for ${city.city_name} — score: ${weightedScore}/100 (${completeSources.length}/5 data sources)`,
          metadata: {
            source: 'autonomous_agent',
            population: research.population,
            market_potential_score: weightedScore,
            sub_scores: research.sub_scores,
            data_completeness: research.data_completeness,
            colleges_found: research.colleges.length,
            total_college_enrollment: research.total_college_enrollment,
          },
        });

        result.citiesResearched.push(city.city_name);
        console.log(`[expansion-agent] Deep research complete: ${city.city_name}: ${weightedScore}/100 (sources: ${completeSources.join(', ')})`);
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
// Step 6: Notify team via email (rich template with voting)
// ─────────────────────────────────────────────────────────

interface CityForReview {
  id: string;
  city_name: string;
  state_abbr: string;
  market_potential_score: number | null;
  population: number | null;
  median_income: number | null;
  research_data: CityResearchData;
  status: string;
}

function buildCityReviewCard(
  city: CityForReview,
  reviewerEmail: string,
  baseUrl: string
): string {
  const score = city.market_potential_score ?? 0;
  const scoreColor = score >= 70 ? '#22c55e' : score >= 40 ? '#eab308' : '#ef4444';

  const votes = ['interested', 'not_now', 'reject'] as const;
  const voteLinks = Object.fromEntries(
    votes.map(v => [v, `${baseUrl}/api/expansion/review?city=${city.id}&email=${encodeURIComponent(reviewerEmail)}&vote=${v}&token=${generateReviewToken(city.id, reviewerEmail, v)}`])
  );

  return `
  <div style="background:#1e293b;border-radius:10px;padding:14px;margin-bottom:10px;">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
      <span style="font-size:15px;font-weight:600;color:white;">${city.city_name}, ${city.state_abbr}</span>
      <span style="color:${scoreColor};font-size:14px;font-weight:700;">${score}/100</span>
    </div>
    <div style="display:flex;gap:6px;">
      <a href="${voteLinks.interested}" style="flex:1;display:block;text-align:center;padding:8px;background:#166534;color:#bbf7d0;text-decoration:none;border-radius:6px;font-weight:600;font-size:12px;">Interested</a>
      <a href="${voteLinks.not_now}" style="flex:1;display:block;text-align:center;padding:8px;background:#854d0e;color:#fef08a;text-decoration:none;border-radius:6px;font-weight:600;font-size:12px;">Not Now</a>
      <a href="${voteLinks.reject}" style="flex:1;display:block;text-align:center;padding:8px;background:#991b1b;color:#fecaca;text-decoration:none;border-radius:6px;font-weight:600;font-size:12px;">Reject</a>
    </div>
  </div>`;
}

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
    const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://tastelanc.com';
    const DASHBOARD_URL = `${BASE_URL}/admin/expansion`;
    const ACCENT = '#A41E22';

    // Fetch cities needing review votes + existing votes
    let citiesForReview: CityForReview[] = [];
    let existingVotes: Record<string, { reviewer_email: string; vote: string }[]> = {};
    if (supabase) {
      const { data: reviewCities } = await supabase
        .from('expansion_cities')
        .select('id, city_name, state, market_potential_score, population, median_income, research_data, status')
        .in('status', ['researched', 'brand_ready'])
        .order('market_potential_score', { ascending: false })
        .limit(10);

      if (reviewCities) {
        citiesForReview = reviewCities.map(c => ({
          id: c.id,
          city_name: c.city_name,
          state_abbr: c.state,
          market_potential_score: c.market_potential_score,
          population: c.population,
          median_income: c.median_income,
          research_data: (c.research_data || {}) as CityResearchData,
          status: c.status,
        }));

        const cityIds = reviewCities.map(c => c.id);
        if (cityIds.length > 0) {
          const { data: votes } = await supabase
            .from('expansion_reviews')
            .select('city_id, reviewer_email, vote')
            .in('city_id', cityIds);

          if (votes) {
            for (const v of votes) {
              if (!existingVotes[v.city_id]) existingVotes[v.city_id] = [];
              existingVotes[v.city_id].push({ reviewer_email: v.reviewer_email, vote: v.vote });
            }
          }
        }
      }
    }

    // Build subject line
    const subjectParts: string[] = [];
    if (citiesSuggested > 0) subjectParts.push(`${citiesSuggested} cities added`);
    if (citiesResearched.length > 0) subjectParts.push(`${citiesResearched.length} researched`);
    if (brandsGenerated.length > 0) subjectParts.push(`${brandsGenerated.length} branded`);
    if (jobsAutoPosted.length > 0) subjectParts.push(`${jobsAutoPosted.length} jobs posted`);
    if (needsAdminAttention.newApplications > 0) subjectParts.push(`${needsAdminAttention.newApplications} new application${needsAdminAttention.newApplications > 1 ? 's' : ''}`);
    if (totalPending > 0 && subjectParts.length === 0) subjectParts.push(`${totalPending} items need review`);
    const subjectDetail = subjectParts.length > 0 ? subjectParts.join(', ') : 'Status update';

    // Send personalized email to each team member
    for (const member of EXPANSION_TEAM) {
      const unvotedCities = citiesForReview.filter(c => {
        const cityVotes = existingVotes[c.id] || [];
        return !cityVotes.some(v => v.reviewer_email === member.email);
      });

      const decidedCities = citiesForReview.filter(c => {
        const cityVotes = existingVotes[c.id] || [];
        return cityVotes.length >= EXPANSION_TEAM.length;
      });

      const VOTE_LABELS: Record<string, string> = { interested: 'Interested', not_now: 'Not Now', reject: 'Reject' };

      const votingCardsHtml = unvotedCities.length > 0
        ? unvotedCities.map(c => buildCityReviewCard(c, member.email, BASE_URL)).join('')
        : '';

      const decidedListHtml = decidedCities.length > 0
        ? decidedCities.map(c => {
            const cityVotes = existingVotes[c.id] || [];
            const allSame = cityVotes.every(v => v.vote === cityVotes[0].vote);
            const consensusLabel = allSame ? `Both ${VOTE_LABELS[cityVotes[0].vote]}` : 'Split Decision';
            const consensusColor = allSame
              ? (cityVotes[0].vote === 'interested' ? '#22c55e' : cityVotes[0].vote === 'not_now' ? '#eab308' : '#ef4444')
              : '#3b82f6';
            return `<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #334155;">
              <span style="color:white;font-size:13px;">${c.city_name}, ${c.state_abbr}</span>
              <span style="color:${consensusColor};font-size:12px;font-weight:600;">${consensusLabel}</span>
            </div>`;
          }).join('')
        : '';

      // Build a brief summary line
      const summaryParts: string[] = [];
      if (citiesSuggested > 0) summaryParts.push(`${citiesSuggested} new cities added`);
      if (citiesResearched.length > 0) summaryParts.push(`${citiesResearched.length} researched`);
      if (brandsGenerated.length > 0) summaryParts.push(`${brandsGenerated.length} branded`);
      if (jobsAutoPosted.length > 0) summaryParts.push(`${jobsAutoPosted.length} jobs posted`);
      const summaryLine = summaryParts.length > 0 ? summaryParts.join(' · ') : '';

      const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin:0;padding:0;background:#0f172a;color:#e2e8f0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<div style="max-width:520px;margin:0 auto;padding:20px;">

  <h2 style="color:white;font-size:18px;margin:0 0 4px;">Expansion Update</h2>
  <p style="color:#64748b;font-size:12px;margin:0 0 16px;">${new Date().toLocaleDateString('en-US', { dateStyle: 'medium' })}</p>

  ${summaryLine ? `<p style="color:#94a3b8;font-size:13px;margin:0 0 16px;">${summaryLine}</p>` : ''}

  ${unvotedCities.length > 0 ? `
  <h3 style="color:white;font-size:13px;margin:0 0 10px;">Vote on ${unvotedCities.length} ${unvotedCities.length === 1 ? 'city' : 'cities'}</h3>
  ${votingCardsHtml}
  ` : ''}

  ${decidedListHtml ? `
  <div style="background:#1e293b;border-radius:10px;padding:14px;margin-bottom:14px;">
    <h3 style="color:white;font-size:13px;margin:0 0 8px;">Decided</h3>
    ${decidedListHtml}
  </div>
  ` : ''}

  ${totalPending > 0 ? `
  <p style="color:#f59e0b;font-size:13px;margin:0 0 14px;">${totalPending} item${totalPending > 1 ? 's' : ''} need your review on the dashboard.</p>
  ` : ''}

  <div style="text-align:center;margin-top:8px;">
    <a href="${DASHBOARD_URL}" style="display:inline-block;background:${ACCENT};color:white;text-decoration:none;padding:10px 24px;border-radius:8px;font-weight:600;font-size:13px;">Open Dashboard</a>
  </div>

  ${errors.length > 0 ? `<p style="color:#fca5a5;font-size:11px;margin:16px 0 0;">${errors.length} error${errors.length > 1 ? 's' : ''} occurred — check dashboard for details.</p>` : ''}

</div>
</body>
</html>`;

      const senderIdentity = getSenderByEmail(member.senderIdentity);
      const deliveryEmail = senderIdentity?.replyEmail || member.email;

      await resend.emails.send({
        from: 'TasteLanc Expansion <expansion@tastelanc.com>',
        to: deliveryEmail,
        subject: `Expansion: ${subjectDetail}`,
        html,
      });

      console.log(`[expansion-agent] Notification sent to ${member.name} (${deliveryEmail})`);
    }

    console.log(`[expansion-agent] Team notifications sent to ${EXPANSION_TEAM.length} members`);
  } catch (error) {
    console.error('[expansion-agent] Failed to send notification email:', error);
    result.errors.push(`Notification email failed: ${error}`);
  }
}
