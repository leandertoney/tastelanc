/**
 * Autonomous City Expansion Agent
 *
 * Runs on a pg_cron schedule (every 6 hours) to advance cities through
 * the expansion pipeline without manual intervention.
 *
 * Pipeline flow:
 *   1. Suggest & add cities if pipeline < 20 active cities
 *   2. Research cities in "researching" status
 *      - Score 70+ → auto-advance to brand generation (skip voting)
 *      - Score 55-69 → queue for team review on dashboard
 *      - Score <55 → auto-reject
 *   3. Generate brand proposals for "researched" cities
 *   4. Generate job listings for "brand_ready" cities
 *   5. Notify admin when items need review/approval
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

const CRON_SECRET = process.env.CRON_SECRET;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const ADMIN_EMAIL = 'leandertoney@gmail.com';

// Batch sizes — keep small to stay within function timeout
const MAX_SUGGEST = 10; // cities to suggest per run
const MAX_RESEARCH = 3; // cities to research per run
const MAX_BRAND_GEN = 2; // cities to generate brands for per run (kept low for Netlify 26s timeout)
const MAX_JOB_GEN = 3; // cities to generate job listings for per run
const MIN_PIPELINE_SIZE = 20; // minimum active cities in pipeline

// Role types to auto-generate job listings for
const AUTO_JOB_ROLES = ['sales_rep', 'content_creator'] as const;

// Score thresholds for auto-filtering after research
const SCORE_AUTO_ADVANCE = 70;  // 70+ → skip voting, go straight to brand generation
const SCORE_AUTO_REJECT = 55;   // below 55 → auto-reject, not worth reviewing

interface RunResult {
  citiesSuggested: number;
  citiesResearched: string[];
  brandsGenerated: string[];
  jobsGenerated: string[];
  jobsAutoPosted: string[];
  errors: string[];
  hasMore: boolean; // true if there's more work for this step
  currentCity?: string; // city currently being processed (for UI feedback)
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

  const requestedStep = (body as { step?: string }).step;

  console.log(`[expansion-agent] Starting ${requestedStep ? `step: ${requestedStep}` : 'full run'}...`);

  const supabase = createSupabaseAdmin(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const result: RunResult = {
    citiesSuggested: 0,
    citiesResearched: [],
    brandsGenerated: [],
    jobsGenerated: [],
    jobsAutoPosted: [],
    errors: [],
    hasMore: false,
    needsAdminAttention: {
      brandsToReview: 0,
      jobsToApprove: 0,
      citiesReadyToApprove: 0,
      newApplications: 0,
      totalPostedJobs: 0,
    },
  };

  try {
    if (requestedStep) {
      // Run a single step (called by dashboard for progress feedback)
      switch (requestedStep) {
        case 'suggest':
          await stepSuggestCities(supabase, result);
          break;
        case 'research':
          await stepResearchCities(supabase, result, true);
          break;
        case 'brands':
          await stepGenerateBrands(supabase, result, true);
          break;
        case 'jobs':
          await stepGenerateJobs(supabase, result);
          await stepAutoApproveDefaultJobs(supabase, result);
          await stepAutoPostJobs(supabase, result);
          break;
        case 'notify':
          await stepCountPendingReview(supabase, result);
          await stepNotifyAdmin(result, supabase);
          break;
      }
    } else {
      // Full run (cron job)
      await stepCountPendingReview(supabase, result);
      await stepNotifyAdmin(result, supabase);
      await stepSuggestCities(supabase, result);
      await stepResearchCities(supabase, result);
      await stepGenerateBrands(supabase, result);
      await stepGenerateJobs(supabase, result);
      await stepAutoApproveDefaultJobs(supabase, result);
      await stepAutoPostJobs(supabase, result);
    }

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
          source: 'auto',
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
  result: RunResult,
  singleMode = false
) {
  try {
    const limit = singleMode ? 1 : MAX_RESEARCH;
    const { data: cities, count: totalCount } = await supabase
      .from('expansion_cities')
      .select('id, city_name, county, state, research_data', { count: 'exact' })
      .eq('status', 'researching')
      .order('priority', { ascending: false })
      .limit(limit);

    if (!cities || cities.length === 0) return;

    if (singleMode) {
      result.hasMore = (totalCount ?? 0) > 1;
      result.currentCity = cities[0].city_name;
    }

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

        // Auto-filter based on score thresholds
        let newStatus: string;
        let newPriority: number;
        let reviewStatus: string | null = null;

        if (weightedScore >= SCORE_AUTO_ADVANCE) {
          // Strong market — skip voting, go straight to brand generation
          newStatus = 'researched';
          newPriority = Math.round(weightedScore / 10);
          reviewStatus = 'consensus_interested';
        } else if (weightedScore < SCORE_AUTO_REJECT) {
          // Weak market — auto-reject
          newStatus = 'rejected';
          newPriority = 0;
          reviewStatus = 'consensus_reject';
        } else {
          // Borderline (55-69) — needs human review
          newStatus = 'researched';
          newPriority = Math.round(weightedScore / 10);
        }

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
            status: newStatus,
            priority: newPriority,
            ...(reviewStatus ? { review_status: reviewStatus } : {}),
          })
          .eq('id', city.id);

        // Log completion with data completeness summary
        const completeSources = Object.entries(research.data_completeness)
          .filter(([, v]) => v)
          .map(([k]) => k);

        const filterAction = weightedScore >= SCORE_AUTO_ADVANCE
          ? ' → auto-advancing to brand generation'
          : weightedScore < SCORE_AUTO_REJECT
          ? ' → auto-rejected (below threshold)'
          : ' → queued for team review';

        await supabase.from('expansion_activity_log').insert({
          city_id: city.id,
          action: weightedScore < SCORE_AUTO_REJECT ? 'city_rejected' : 'research_completed',
          description: `Deep research complete for ${city.city_name} — score: ${weightedScore}/100 (${completeSources.length}/5 data sources)${filterAction}`,
          metadata: {
            source: 'autonomous_agent',
            population: research.population,
            market_potential_score: weightedScore,
            sub_scores: research.sub_scores,
            data_completeness: research.data_completeness,
            colleges_found: research.colleges.length,
            total_college_enrollment: research.total_college_enrollment,
            auto_filter: weightedScore >= SCORE_AUTO_ADVANCE ? 'auto_advance' : weightedScore < SCORE_AUTO_REJECT ? 'auto_reject' : 'needs_review',
          },
        });

        result.citiesResearched.push(city.city_name);
        console.log(`[expansion-agent] Deep research complete: ${city.city_name}: ${weightedScore}/100 (sources: ${completeSources.join(', ')})${filterAction}`);
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
  result: RunResult,
  singleMode = false
) {
  try {
    // Find "researched" cities that don't have any brand drafts yet
    // In single mode, fetch more candidates to find one without brands
    const { data: cities } = await supabase
      .from('expansion_cities')
      .select('*')
      .eq('status', 'researched')
      .order('market_potential_score', { ascending: false })
      .limit(singleMode ? 10 : MAX_BRAND_GEN);

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

    if (singleMode) {
      // Only process 1 city per call in dashboard mode
      result.hasMore = citiesToProcess.length > 1;
      result.currentCity = citiesToProcess[0].city_name;
      citiesToProcess.length = 1; // truncate to first city only
    }

    // Collect all existing brand names across cities for deduplication
    const { data: existingBrands } = await supabase
      .from('expansion_brand_drafts')
      .select('ai_assistant_name');
    const usedNames = Array.from(new Set((existingBrands || []).map(b => b.ai_assistant_name)));

    console.log(`[expansion-agent] Generating brands for ${citiesToProcess.length} cities (${usedNames.length} names already used)...`);

    for (const city of citiesToProcess) {
      try {
        const proposals = await generateBrandProposals(city, 3, usedNames, true);
        // Add newly generated names to the used list for subsequent cities in this batch
        for (const p of proposals) {
          if (p.ai_assistant_name) usedNames.push(p.ai_assistant_name);
        }

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
          app_icon_url: proposal.app_icon_url || null,
          name_story: proposal.name_story || null,
          color_story: proposal.color_story || null,
          variant_number: index + 1,
          is_selected: false,
        }));

        await supabase.from('expansion_brand_drafts').insert(brandsToInsert);

        // Don't set brand_ready yet — city stays at 'researched' until all avatars are generated.
        // The avatar generation endpoint handles the transition to brand_ready.

        // Log activity
        await supabase.from('expansion_activity_log').insert({
          city_id: city.id,
          action: 'brand_generated',
          description: `Brand text generated for ${city.city_name} (awaiting avatar images)`,
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

      // Try to get selected brand, but don't require it — jobs can use fallback name
      const { data: selectedBrand } = await supabase
        .from('expansion_brand_drafts')
        .select('*')
        .eq('city_id', city.id)
        .eq('is_selected', true)
        .single();

      // Check if job listings already exist for this city
      const { count: jobCount } = await supabase
        .from('expansion_job_listings')
        .select('*', { count: 'exact', head: true })
        .eq('city_id', city.id);

      if ((jobCount ?? 0) > 0) continue; // Already has listings

      try {
        // Generate all default roles for every city
        const rolesToGenerate: string[] = [...AUTO_JOB_ROLES];

        // Generate job listings for each role
        for (const roleType of rolesToGenerate) {
          const listing = await generateJobListing(
            city as ExpansionCity,
            (selectedBrand as BrandDraft) || null,
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
// Step 4.6: Auto-approve jobs for approved cities (for SEO)
// ─────────────────────────────────────────────────────────

async function stepAutoApproveDefaultJobs(
  supabase: SupabaseClient,
  result: RunResult
) {
  try {
    // Find approved cities that have draft job listings
    const { data: approvedCities } = await supabase
      .from('expansion_cities')
      .select('id, city_name')
      .eq('status', 'approved');

    if (!approvedCities || approvedCities.length === 0) return;

    for (const city of approvedCities) {
      const { data: draftJobs } = await supabase
        .from('expansion_job_listings')
        .select('id, title')
        .eq('city_id', city.id)
        .eq('status', 'draft');

      if (!draftJobs || draftJobs.length === 0) continue;

      await supabase
        .from('expansion_job_listings')
        .update({ status: 'approved' })
        .eq('city_id', city.id)
        .eq('status', 'draft');

      console.log(`[expansion-agent] Auto-approved ${draftJobs.length} jobs for approved city ${city.city_name}`);
    }
  } catch (error) {
    const msg = `Step 4.6 (auto-approve default jobs) failed: ${error}`;
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
// Step 6: Notify team via email (clean, minimal)
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

  if (!hasNewWork && totalPending === 0) {
    console.log('[expansion-agent] No new work and no pending items — skipping notification');
    return;
  }

  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://tastelanc.com';
    const DASHBOARD_URL = `${BASE_URL}/admin/expansion`;

    // Fetch cities needing votes (just names + scores for the email)
    let voteNeededList = '';
    if (supabase) {
      const { data: reviewCities } = await supabase
        .from('expansion_cities')
        .select('city_name, state, market_potential_score')
        .in('status', ['researched', 'brand_ready'])
        .order('market_potential_score', { ascending: false })
        .limit(10);

      if (reviewCities && reviewCities.length > 0) {
        voteNeededList = reviewCities
          .map(c => `<li style="color:#e2e8f0;font-size:14px;margin-bottom:4px;">${c.city_name}, ${c.state} <span style="color:#64748b;">(${c.market_potential_score ?? '?'}/100)</span></li>`)
          .join('');
      }
    }

    // Build subject line
    const subjectParts: string[] = [];
    if (citiesResearched.length > 0) subjectParts.push(`${citiesResearched.length} researched`);
    if (brandsGenerated.length > 0) subjectParts.push(`${brandsGenerated.length} branded`);
    if (citiesSuggested > 0) subjectParts.push(`${citiesSuggested} added`);
    if (voteNeededList) subjectParts.push('votes needed');
    if (totalPending > 0 && subjectParts.length === 0) subjectParts.push(`${totalPending} items need review`);
    const subjectDetail = subjectParts.length > 0 ? subjectParts.join(', ') : 'Status update';

    // Build summary
    const summaryParts: string[] = [];
    if (citiesSuggested > 0) summaryParts.push(`${citiesSuggested} new cities added`);
    if (citiesResearched.length > 0) summaryParts.push(`${citiesResearched.length} researched`);
    if (brandsGenerated.length > 0) summaryParts.push(`${brandsGenerated.length} branded`);
    if (jobsAutoPosted.length > 0) summaryParts.push(`${jobsAutoPosted.length} jobs posted`);
    const summaryLine = summaryParts.join(' · ');

    const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin:0;padding:0;background:#0f172a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<div style="max-width:480px;margin:0 auto;padding:24px;">
  <h2 style="color:white;font-size:17px;margin:0 0 4px;">Expansion Update</h2>
  <p style="color:#64748b;font-size:12px;margin:0 0 16px;">${new Date().toLocaleDateString('en-US', { dateStyle: 'medium' })}</p>
  ${summaryLine ? `<p style="color:#94a3b8;font-size:14px;margin:0 0 16px;">${summaryLine}</p>` : ''}
  ${voteNeededList ? `<p style="color:#f59e0b;font-size:13px;font-weight:600;margin:0 0 6px;">Cities needing your vote:</p><ul style="margin:0 0 16px;padding-left:20px;">${voteNeededList}</ul>` : ''}
  ${totalPending > 0 ? `<p style="color:#94a3b8;font-size:13px;margin:0 0 16px;">${totalPending} item${totalPending > 1 ? 's' : ''} need review on the dashboard.</p>` : ''}
  <div style="text-align:center;margin-top:8px;">
    <a href="${DASHBOARD_URL}" style="display:inline-block;background:#A41E22;color:white;text-decoration:none;padding:10px 28px;border-radius:8px;font-weight:600;font-size:14px;">Open Dashboard</a>
  </div>
  ${errors.length > 0 ? `<p style="color:#fca5a5;font-size:11px;margin:16px 0 0;">${errors.length} error${errors.length > 1 ? 's' : ''} — check dashboard.</p>` : ''}
</div>
</body></html>`;

    // Send one email to all team members
    const teamEmails = EXPANSION_TEAM.map(m => m.email);

    await resend.emails.send({
      from: 'TasteLanc Expansion <expansion@tastelanc.com>',
      to: teamEmails,
      subject: `Expansion: ${subjectDetail}`,
      html,
    });

    console.log(`[expansion-agent] Notification sent to ${teamEmails.join(', ')}`);
  } catch (error) {
    console.error('[expansion-agent] Failed to send notification email:', error);
    result.errors.push(`Notification email failed: ${error}`);
  }
}
