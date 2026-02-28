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
  generateBrandProposals,
  generateJobListing,
  suggestCities,
} from '@/lib/ai/expansion-agent';
import type { ExpansionCity, BrandDraft } from '@/lib/ai/expansion-types';

const CRON_SECRET = process.env.CRON_SECRET;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const ADMIN_EMAIL = 'leandertoney@gmail.com';

// Batch sizes — keep small to stay within function timeout
const MAX_SUGGEST = 10; // cities to suggest per run
const MAX_RESEARCH = 2; // cities to research per run
const MAX_BRAND_GEN = 2; // cities to generate brands for per run
const MAX_JOB_GEN = 2; // cities to generate job listings for per run
const MIN_PIPELINE_SIZE = 20; // minimum active cities in pipeline

// Role types to auto-generate job listings for
const AUTO_JOB_ROLES = ['sales_rep'] as const;

interface RunResult {
  citiesSuggested: number;
  citiesResearched: string[];
  brandsGenerated: string[];
  jobsGenerated: string[];
  errors: string[];
  needsAdminAttention: {
    brandsToReview: number;
    jobsToApprove: number;
    citiesReadyToApprove: number;
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
    errors: [],
    needsAdminAttention: {
      brandsToReview: 0,
      jobsToApprove: 0,
      citiesReadyToApprove: 0,
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

    // ── Step 5: Count items needing admin attention ──────────
    await stepCountPendingReview(supabase, result);

    // ── Step 6: Notify admin if there are items to review ───
    await stepNotifyAdmin(result);

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

    // Also get existing markets
    const { data: existingMarkets } = await supabase
      .from('markets')
      .select('slug');

    const suggestions = await suggestCities({
      count: needed,
      // Focus on PA and neighboring states first, then expand
      min_population: 30000,
      max_population: 500000,
    });

    // Filter out cities that already exist in our pipeline
    const existingNames = new Set(
      (existingCities || []).map((c) => `${c.city_name.toLowerCase()}-${c.state.toLowerCase()}`)
    );

    const newSuggestions = suggestions.filter(
      (s) => !existingNames.has(`${s.city_name.toLowerCase()}-${s.state.toLowerCase()}`)
    );

    // Insert new cities
    for (const suggestion of newSuggestions) {
      const slug = suggestion.city_name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');

      const { error: insertError } = await supabase
        .from('expansion_cities')
        .insert({
          city_name: suggestion.city_name,
          county: suggestion.county,
          state: suggestion.state,
          slug,
          population: suggestion.population,
          market_potential_score: suggestion.estimated_score,
          status: 'researching',
          priority: Math.round(suggestion.estimated_score / 10),
        });

      if (insertError) {
        // Likely duplicate slug — skip
        console.warn(`[expansion-agent] Skipping ${suggestion.city_name}: ${insertError.message}`);
        continue;
      }

      // Log activity
      await supabase.from('expansion_activity_log').insert({
        city_id: null,
        action: 'city_added',
        description: `Auto-suggested: ${suggestion.city_name}, ${suggestion.state} (est. score: ${suggestion.estimated_score})`,
        metadata: { source: 'autonomous_agent', reasoning: suggestion.reasoning },
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
      .select('id, city_name, county, state')
      .eq('status', 'researching')
      .order('priority', { ascending: false })
      .limit(MAX_RESEARCH);

    if (!cities || cities.length === 0) return;

    console.log(`[expansion-agent] Researching ${cities.length} cities...`);

    for (const city of cities) {
      try {
        // Log start
        await supabase.from('expansion_activity_log').insert({
          city_id: city.id,
          action: 'research_started',
          description: `Autonomous research started for ${city.city_name}, ${city.state}`,
          metadata: { source: 'autonomous_agent' },
        });

        const research = await researchCity(city.city_name, city.county, city.state);

        // Update city with research results
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
            priority: Math.round(research.market_potential_score / 10),
          })
          .eq('id', city.id);

        // Log completion
        await supabase.from('expansion_activity_log').insert({
          city_id: city.id,
          action: 'research_completed',
          description: `Research complete for ${city.city_name} — score: ${research.market_potential_score}/100`,
          metadata: {
            source: 'autonomous_agent',
            population: research.population,
            market_potential_score: research.market_potential_score,
          },
        });

        result.citiesResearched.push(city.city_name);
        console.log(`[expansion-agent] Researched ${city.city_name}: ${research.market_potential_score}/100`);
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
        // Generate job listings for each auto-role
        for (const roleType of AUTO_JOB_ROLES) {
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

    // Cities ready to approve for launch (brand_ready + brand selected + jobs approved)
    // This is a more complex check — simplify to brand_ready cities with a selected brand
    let citiesReadyToApprove = 0;
    for (const city of brandReadyCities || []) {
      const { count: selectedCount } = await supabase
        .from('expansion_brand_drafts')
        .select('*', { count: 'exact', head: true })
        .eq('city_id', city.id)
        .eq('is_selected', true);

      if ((selectedCount ?? 0) > 0) citiesReadyToApprove++;
    }

    result.needsAdminAttention = {
      brandsToReview,
      jobsToApprove: draftJobs ?? 0,
      citiesReadyToApprove,
    };
  } catch (error) {
    console.error(`[expansion-agent] Step 5 (count pending) failed: ${error}`);
  }
}

// ─────────────────────────────────────────────────────────
// Step 6: Notify admin via email
// ─────────────────────────────────────────────────────────

async function stepNotifyAdmin(result: RunResult) {
  const { needsAdminAttention, citiesResearched, brandsGenerated, jobsGenerated, citiesSuggested, errors } = result;
  const totalPending =
    needsAdminAttention.brandsToReview +
    needsAdminAttention.jobsToApprove +
    needsAdminAttention.citiesReadyToApprove;

  const hasNewWork =
    citiesSuggested > 0 ||
    citiesResearched.length > 0 ||
    brandsGenerated.length > 0 ||
    jobsGenerated.length > 0;

  // Only send email if there's new work or pending items
  if (!hasNewWork && totalPending === 0) {
    console.log('[expansion-agent] No new work and no pending items — skipping notification');
    return;
  }

  try {
    const resend = new Resend(process.env.RESEND_API_KEY);

    const lines: string[] = [];
    lines.push('<h2>Expansion Agent Report</h2>');

    if (hasNewWork) {
      lines.push('<h3>New Work Completed</h3>');
      lines.push('<ul>');
      if (citiesSuggested > 0) {
        lines.push(`<li><strong>${citiesSuggested} cities</strong> added to pipeline</li>`);
      }
      if (citiesResearched.length > 0) {
        lines.push(`<li><strong>${citiesResearched.length} cities</strong> researched: ${citiesResearched.join(', ')}</li>`);
      }
      if (brandsGenerated.length > 0) {
        lines.push(`<li><strong>${brandsGenerated.length} cities</strong> received brand proposals: ${brandsGenerated.join(', ')}</li>`);
      }
      if (jobsGenerated.length > 0) {
        lines.push(`<li><strong>${jobsGenerated.length} cities</strong> received job listings: ${jobsGenerated.join(', ')}</li>`);
      }
      lines.push('</ul>');
    }

    if (totalPending > 0) {
      lines.push('<h3>Needs Your Attention</h3>');
      lines.push('<ul>');
      if (needsAdminAttention.brandsToReview > 0) {
        lines.push(`<li><strong>${needsAdminAttention.brandsToReview} cities</strong> need brand selection</li>`);
      }
      if (needsAdminAttention.jobsToApprove > 0) {
        lines.push(`<li><strong>${needsAdminAttention.jobsToApprove} job listings</strong> awaiting approval</li>`);
      }
      if (needsAdminAttention.citiesReadyToApprove > 0) {
        lines.push(`<li><strong>${needsAdminAttention.citiesReadyToApprove} cities</strong> ready for launch approval</li>`);
      }
      lines.push('</ul>');
      lines.push('<p><a href="https://tastelanc.com/admin/expansion" style="color: #A41E22; font-weight: bold;">Review in Dashboard →</a></p>');
    }

    if (errors.length > 0) {
      lines.push('<h3>Errors</h3>');
      lines.push('<ul>');
      for (const err of errors) {
        lines.push(`<li style="color: #cc3333;">${err}</li>`);
      }
      lines.push('</ul>');
    }

    await resend.emails.send({
      from: 'TasteLanc Expansion Agent <noreply@tastelanc.com>',
      to: ADMIN_EMAIL,
      subject: `Expansion Agent: ${hasNewWork ? 'New progress' : ''}${hasNewWork && totalPending > 0 ? ' + ' : ''}${totalPending > 0 ? `${totalPending} items need review` : ''}`,
      html: lines.join('\n'),
    });

    console.log('[expansion-agent] Admin notification sent');
  } catch (error) {
    console.error('[expansion-agent] Failed to send notification email:', error);
    result.errors.push(`Notification email failed: ${error}`);
  }
}
