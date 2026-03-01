import OpenAI from 'openai';
import type {
  ExpansionCity,
  BrandDraft,
  CityResearchResult,
  BrandProposal,
  JobListingDraft,
  CitySuggestion,
  MarketSubScores,
  ResearchSource,
  CollegeInfo,
  TourismEconomicData,
  CensusExtendedInfo,
  VenueBreakdown,
  CuisineEntry,
} from './expansion-types';
import { fetchCensusData } from './census-data';
import { fetchCensusExtendedData } from './census-extended-data';
import { fetchCollegeScorecardData } from './college-scorecard-data';
import { fetchBEAData } from './bea-data';
import { fetchOverpassData } from './overpass-data';
import { calculateSubScores } from './score-calculator';

// ─────────────────────────────────────────────────────────
// City Expansion AI Agent
//
// Powers city research, brand generation, job listings,
// and city suggestions using the OpenAI API (gpt-4o-mini).
//
// Research includes:
//   - Weighted sub-score breakdown (6 categories)
//   - Google Places validation for restaurant/bar counts
// ─────────────────────────────────────────────────────────

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

const MODEL = 'gpt-4o-mini';

// ─────────────────────────────────────────────────────────
// Scoring weights
// ─────────────────────────────────────────────────────────

export const SCORING_WEIGHTS: Record<keyof MarketSubScores, number> = {
  dining_scene: 0.25,
  population_density: 0.20,
  competition: 0.15,
  college_presence: 0.15,
  income_level: 0.15,
  tourism: 0.10,
};

export function calculateWeightedScore(subScores: MarketSubScores): number {
  let total = 0;
  for (const [key, weight] of Object.entries(SCORING_WEIGHTS)) {
    const score = subScores[key as keyof MarketSubScores] ?? 0;
    total += Math.min(100, Math.max(0, score)) * weight;
  }
  return Math.round(total);
}

// ─────────────────────────────────────────────────────────
// Google Places validation
// ─────────────────────────────────────────────────────────

async function googlePlacesTextSearch(
  query: string,
  lat: number,
  lng: number,
  radiusMeters: number
): Promise<number> {
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) return 0;

  let totalCount = 0;
  let pageToken: string | undefined;

  do {
    const body: Record<string, unknown> = {
      textQuery: query,
      locationBias: {
        circle: {
          center: { latitude: lat, longitude: lng },
          radius: radiusMeters,
        },
      },
      maxResultCount: 20,
    };
    if (pageToken) body.pageToken = pageToken;

    const response = await fetch('https://places.googleapis.com/v1/places:searchText', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': 'places.id,nextPageToken',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      console.error(`Google Places search failed (${response.status}):`, await response.text());
      break;
    }

    const data = await response.json();
    totalCount += (data.places || []).length;
    pageToken = data.nextPageToken;
  } while (pageToken);

  return totalCount;
}

export async function validateWithGooglePlaces(
  cityName: string,
  state: string,
  latitude: number,
  longitude: number,
  radiusMiles: number = 25
): Promise<{ restaurantCount: number; barCount: number; validated: boolean }> {
  const radiusMeters = radiusMiles * 1609.34;

  try {
    const [restaurantCount, barCount] = await Promise.all([
      googlePlacesTextSearch(`restaurants in ${cityName}, ${state}`, latitude, longitude, radiusMeters),
      googlePlacesTextSearch(`bars pubs breweries in ${cityName}, ${state}`, latitude, longitude, radiusMeters),
    ]);

    console.log(`[google-places] ${cityName}, ${state}: ${restaurantCount} restaurants, ${barCount} bars`);
    return { restaurantCount, barCount, validated: true };
  } catch (error) {
    console.error(`[google-places] Validation failed for ${cityName}:`, error);
    return { restaurantCount: 0, barCount: 0, validated: false };
  }
}

// ─────────────────────────────────────────────────────────
// Avatar image generation (DALL-E 3)
// ─────────────────────────────────────────────────────────

/**
 * Generate an AI mascot avatar for a brand proposal using DALL-E 3.
 *
 * Art style matches Rosie (TasteLanc) and Mollie (TasteCumberland):
 * - Cute chibi-style cartoon character
 * - Bold, clean line art with thick outlines
 * - Friendly winking expression, rosy cheeks
 * - A local cultural element worked into the character design
 * - Brand accent color as the primary palette
 *
 * Uploads the result to Supabase Storage and returns the public URL.
 */
export async function generateAvatarImage(
  aiName: string,
  regionName: string,
  accentColor: string,
  localCulture: string,
  slug: string,
  variant: number
): Promise<string | null> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.warn('[avatar-gen] Missing Supabase credentials, skipping avatar generation');
    return null;
  }

  try {
    const prompt = `A cute chibi-style cartoon mascot character named ${aiName} for a dining discovery app called "Taste${regionName.replace(/\s+/g, '')}".

Art style requirements (MUST match exactly):
- Cute chibi proportions, head/bust only, no full body
- Bold, clean line art with thick dark outlines
- Friendly winking expression (one eye closed, one open), warm smile, rosy pink cheeks
- Simple flat color fills, minimal shading
- The character should incorporate a LOCAL CULTURAL ELEMENT from ${regionName}: ${localCulture}. This element should be worked into the character as a hat, headpiece, or surrounding motif (similar to how a rose forms the hair/hat of another character in this series).
- Primary color palette should feature ${accentColor} as the dominant color
- Dark background (#121212)
- Square composition, centered
- Style reference: cute Japanese chibi mascot meets bold American logo design, similar to a friendly app mascot icon`;

    const response = await openai.images.generate({
      model: 'dall-e-3',
      prompt,
      n: 1,
      size: '1024x1024',
      quality: 'standard',
    });

    const imageUrl = response.data?.[0]?.url;
    if (!imageUrl) {
      console.error('[avatar-gen] No image URL returned from DALL-E');
      return null;
    }

    // Download the generated image
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      console.error('[avatar-gen] Failed to download generated image');
      return null;
    }

    const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());
    const fileName = `expansion-avatars/${slug}-v${variant}.png`;

    // Upload to Supabase Storage
    const { createClient } = await import('@supabase/supabase-js');
    const storageClient = createClient(supabaseUrl, supabaseServiceKey);

    const { error: uploadError } = await storageClient.storage
      .from('images')
      .upload(fileName, imageBuffer, {
        contentType: 'image/png',
        upsert: true,
      });

    if (uploadError) {
      console.error('[avatar-gen] Upload failed:', uploadError.message);
      return null;
    }

    // Get public URL
    const { data: publicUrl } = storageClient.storage
      .from('images')
      .getPublicUrl(fileName);

    console.log(`[avatar-gen] Generated avatar for ${aiName}: ${publicUrl.publicUrl}`);
    return publicUrl.publicUrl;
  } catch (error) {
    console.error(`[avatar-gen] Failed to generate avatar for ${aiName}:`, error);
    return null;
  }
}

// ─────────────────────────────────────────────────────────
// City research
// ─────────────────────────────────────────────────────────

// Deep research result includes all structured data from verified sources
export interface DeepResearchResult extends CityResearchResult {
  sources: ResearchSource[];
  colleges: CollegeInfo[];
  total_college_enrollment: number;
  tourism_economic_data: TourismEconomicData | null;
  census_extended: CensusExtendedInfo | null;
  venue_breakdown: VenueBreakdown | null;
  cuisine_distribution: CuisineEntry[];
  data_completeness: Record<string, boolean>;
}

/**
 * Research a city for potential market expansion.
 *
 * Deep research pipeline:
 *   Step 1: Parallel data fetch (Census, Census Extended, College Scorecard, BEA, Google Places)
 *   Step 2: Fetch Overpass data (needs coordinates from Step 1)
 *   Step 3: Compute sub-scores programmatically from real data
 *   Step 4: AI synthesis (GPT-4o-mini) — prose descriptions only, NO score estimates
 *
 * The overall market_potential_score is computed via calculateWeightedScore().
 */
export async function researchCity(
  cityName: string,
  county: string,
  state: string,
  clusterTowns?: string[]
): Promise<DeepResearchResult> {
  const now = new Date().toISOString();
  const sources: ResearchSource[] = [];
  const dataCompleteness: Record<string, boolean> = {};

  // ── Step 1: Parallel data fetch ────────────────────────
  console.log(`[research] Starting deep research for ${cityName}, ${county}, ${state}`);

  const [
    censusResult,
    censusExtResult,
    collegeScorecardResult,
    beaResult,
    googlePlacesResult,
  ] = await Promise.allSettled([
    fetchCensusData(cityName, state),
    fetchCensusExtendedData(cityName, state),
    fetchCollegeScorecardData(cityName, state, clusterTowns),
    fetchBEAData(county, state),
    validateWithGooglePlaces(cityName, state, 0, 0, 25), // coordinates filled in Step 2 re-run if needed
  ]);

  // Extract results with graceful fallbacks
  const census = censusResult.status === 'fulfilled' ? censusResult.value : null;
  const censusExt = censusExtResult.status === 'fulfilled' ? censusExtResult.value : null;
  const collegeData = collegeScorecardResult.status === 'fulfilled' ? collegeScorecardResult.value : null;
  const beaData = beaResult.status === 'fulfilled' ? beaResult.value : null;

  dataCompleteness.census = !!census;
  dataCompleteness.census_extended = !!censusExt;
  dataCompleteness.college_scorecard = !!collegeData;
  dataCompleteness.bea = !!beaData;

  // Build Census sources
  if (census) {
    sources.push(
      { name: `US Census Bureau ACS ${census.year}`, url: census.source_url, data_point: `Population: ${census.population.toLocaleString()}`, accessed_at: now, source_type: 'verified' },
      { name: `US Census Bureau ACS ${census.year}`, url: census.source_url, data_point: `Median Income: $${census.median_income.toLocaleString()}`, accessed_at: now, source_type: 'verified' },
      { name: `US Census Bureau ACS ${census.year}`, url: census.source_url, data_point: `Median Age: ${census.median_age}`, accessed_at: now, source_type: 'verified' },
    );
  }
  if (censusExt) sources.push(...censusExt.sources);
  if (collegeData) sources.push(...collegeData.sources);
  if (beaData) sources.push(...beaData.sources);

  // Wikipedia general reference
  const wikiCity = encodeURIComponent(`${cityName}, ${state}`).replace(/%20/g, '_').replace(/%2C/g, ',');
  sources.push({
    name: 'Wikipedia',
    url: `https://en.wikipedia.org/wiki/${wikiCity}`,
    data_point: 'General city reference',
    accessed_at: now,
    source_type: 'ai_synthesized',
  });

  // ── Step 2: AI for coordinates + prose (needs Census context) ──
  const censusBlock = census
    ? `\nVERIFIED DEMOGRAPHIC DATA (use these exact numbers):\n- Population: ${census.population.toLocaleString()}\n- Median Household Income: $${census.median_income.toLocaleString()}\n- Median Age: ${census.median_age}`
    : '';

  const collegeBlock = collegeData
    ? `\nVERIFIED COLLEGE DATA (${collegeData.institution_count} institutions, ${collegeData.total_enrollment.toLocaleString()} total enrollment):\n${collegeData.colleges.slice(0, 10).map(c => `- ${c.name}: ${c.enrollment.toLocaleString()} students, ${c.type}, ${c.degree_level}${c.is_research_university ? ' (Research University)' : ''}`).join('\n')}`
    : '';

  const beaBlock = beaData
    ? `\nVERIFIED ECONOMIC DATA (BEA ${beaData.data.year}):\n- County GDP: $${beaData.data.total_county_gdp_millions?.toLocaleString() || 'N/A'}M\n- Hospitality GDP (NAICS 72): $${beaData.data.hospitality_gdp_millions?.toLocaleString() || 'N/A'}M (${beaData.data.hospitality_pct_of_gdp || 'N/A'}% of economy)\n- Arts/Entertainment GDP (NAICS 71): $${beaData.data.arts_entertainment_gdp_millions?.toLocaleString() || 'N/A'}M`
    : '';

  const censusExtBlock = censusExt
    ? `\nVERIFIED HOUSING & EDUCATION DATA:\n- Median Home Value: $${censusExt.data.median_home_value?.toLocaleString() || 'N/A'}\n- Median Gross Rent: $${censusExt.data.median_gross_rent?.toLocaleString() || 'N/A'}/mo\n- Bachelor's Degree Rate: ${censusExt.data.bachelors_degree_pct || 'N/A'}%\n- Rent-to-Income Ratio: ${censusExt.data.rent_to_income_ratio ? (censusExt.data.rent_to_income_ratio * 100).toFixed(0) + '%' : 'N/A'}`
    : '';

  const systemPrompt =
    'You are a market research analyst for a restaurant/dining discovery app company. ' +
    'You write insightful prose analysis based on VERIFIED DATA provided to you. ' +
    'Do NOT estimate numbers — use only the verified data given. ' +
    'Focus on qualitative insights: local food culture, competition landscape, neighborhoods, notable restaurants. ' +
    'Return ONLY valid JSON matching the requested schema.';

  const regionLabel = clusterTowns?.length
    ? `the ${county} region (including ${clusterTowns.join(', ')})`
    : `the city of ${cityName}, ${county}`;

  const userPrompt = `Write qualitative analysis for ${regionLabel}, ${state} as a potential market for a local dining discovery app.
${clusterTowns?.length ? `\nThis is a REGIONAL market covering: ${clusterTowns.join(', ')}. Analyze the ENTIRE region.` : ''}
${censusBlock}${collegeBlock}${beaBlock}${censusExtBlock}

IMPORTANT: Sub-scores are computed programmatically from the data above. Do NOT provide sub_scores or sub_score_reasoning — they will be overridden. Focus ONLY on prose analysis.

Return a JSON object with:
{
  "population": <number — ${census ? `USE ${census.population}` : 'best estimate'}>,
  "median_income": <number — ${census ? `USE ${census.median_income}` : 'best estimate'}>,
  "median_age": <number — ${census ? `USE ${census.median_age}` : 'best estimate'}>,
  "restaurant_count": <number — estimated restaurants in the area>,
  "bar_count": <number — estimated bars/pubs/breweries>,
  "center_latitude": <number — latitude of city center>,
  "center_longitude": <number — longitude of city center>,
  "dining_scene_description": "<2-3 paragraphs on local dining scene, food culture, trends>",
  "competition_analysis": "<analysis of existing food/dining apps, Yelp, local food blogs, competing platforms>",
  "key_neighborhoods": [<notable neighborhoods with dining activity>],
  "notable_restaurants": [<well-known local restaurants>],
  "local_food_traditions": "<local food traditions, signature dishes, culinary heritage>",
  "college_presence": "<prose about colleges and their impact on dining — USE verified college data above>",
  "tourism_factors": "<tourism activity and impact — USE verified BEA economic data above>",
  "seasonal_considerations": "<seasonal factors affecting dining>",
  "expansion_reasoning": "<2-3 paragraph analysis of why this is/isn't a good expansion target, synthesizing ALL the verified data above>"
}

Return ONLY the JSON object.`;

  const response = await openai.chat.completions.create({
    model: MODEL,
    max_tokens: 2048,
    temperature: 0.7,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error('No response from OpenAI');
  }

  let parsed: Record<string, unknown>;
  try {
    let jsonStr = content;
    const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
    if (jsonMatch) jsonStr = jsonMatch[0];
    parsed = JSON.parse(jsonStr);
  } catch {
    console.error('Failed to parse city research response:', content);
    throw new Error(`Failed to parse research data for ${cityName}, ${state}`);
  }

  // Override with Census data (AI sometimes ignores instructions)
  if (census) {
    parsed.population = census.population;
    parsed.median_income = census.median_income;
    parsed.median_age = census.median_age;
  }

  const lat = parsed.center_latitude as number || 0;
  const lng = parsed.center_longitude as number || 0;

  // ── Step 2b: Fetch Overpass data + re-run Google Places with real coords ──
  let overpassData: Awaited<ReturnType<typeof fetchOverpassData>> = null;
  let googlePlaces = { restaurantCount: 0, barCount: 0, validated: false };

  const [overpassResult2, googleResult2] = await Promise.allSettled([
    fetchOverpassData(lat, lng, 15),
    lat !== 0 && lng !== 0
      ? validateWithGooglePlaces(cityName, state, lat, lng, 25)
      : Promise.resolve({ restaurantCount: 0, barCount: 0, validated: false }),
  ]);

  overpassData = overpassResult2.status === 'fulfilled' ? overpassResult2.value : null;
  googlePlaces = googleResult2.status === 'fulfilled'
    ? googleResult2.value
    : { restaurantCount: 0, barCount: 0, validated: false };

  dataCompleteness.overpass = !!overpassData;
  dataCompleteness.google_places = googlePlaces.validated;

  if (overpassData) sources.push(...overpassData.sources);
  if (googlePlaces.validated) {
    sources.push({
      name: 'Google Places API',
      url: `https://www.google.com/maps/search/restaurants/@${lat},${lng},12z`,
      data_point: `${googlePlaces.restaurantCount} restaurants, ${googlePlaces.barCount} bars`,
      accessed_at: now,
      source_type: 'verified',
    });
  }

  // ── Step 3: Compute sub-scores programmatically ────────
  const scoreResult = calculateSubScores({
    population: (parsed.population as number) || 0,
    cluster_population: undefined, // Set by cron route if cluster exists
    median_income: (parsed.median_income as number) || 0,
    median_age: (parsed.median_age as number) || 0,
    census_extended: censusExt?.data || null,
    colleges: collegeData?.colleges || null,
    total_college_enrollment: collegeData?.total_enrollment,
    has_research_university: collegeData?.has_research_university,
    has_four_year: collegeData?.has_four_year,
    tourism_economic_data: beaData?.data || null,
    google_places_restaurant_count: googlePlaces.restaurantCount,
    google_places_bar_count: googlePlaces.barCount,
    venue_breakdown: overpassData?.venue_breakdown || null,
    cuisine_diversity: overpassData?.cuisine_distribution.length || 0,
  });

  console.log(`[research] ${cityName}: scores = ${JSON.stringify(scoreResult.sub_scores)}`);

  // ── Step 4: Assemble result ────────────────────────────
  return {
    population: (parsed.population as number) || 0,
    median_income: (parsed.median_income as number) || 0,
    median_age: (parsed.median_age as number) || 0,
    restaurant_count: googlePlaces.restaurantCount || (parsed.restaurant_count as number) || 0,
    bar_count: googlePlaces.barCount || (parsed.bar_count as number) || 0,
    dining_scene_description: (parsed.dining_scene_description as string) || '',
    competition_analysis: (parsed.competition_analysis as string) || '',
    center_latitude: lat,
    center_longitude: lng,
    key_neighborhoods: (parsed.key_neighborhoods as string[]) || [],
    notable_restaurants: (parsed.notable_restaurants as string[]) || [],
    local_food_traditions: (parsed.local_food_traditions as string) || '',
    college_presence: (parsed.college_presence as string) || '',
    tourism_factors: (parsed.tourism_factors as string) || '',
    seasonal_considerations: (parsed.seasonal_considerations as string) || '',
    expansion_reasoning: (parsed.expansion_reasoning as string) || '',
    sub_scores: scoreResult.sub_scores,
    sub_score_reasoning: scoreResult.sub_score_reasoning,
    // Deep research structured data
    sources,
    colleges: collegeData?.colleges || [],
    total_college_enrollment: collegeData?.total_enrollment || 0,
    tourism_economic_data: beaData?.data || null,
    census_extended: censusExt?.data || null,
    venue_breakdown: overpassData?.venue_breakdown || null,
    cuisine_distribution: overpassData?.cuisine_distribution || [],
    data_completeness: dataCompleteness,
  };
}

// ─────────────────────────────────────────────────────────
// Brand proposals
// ─────────────────────────────────────────────────────────

/**
 * Generate brand identity proposals for an expansion city.
 */
export async function generateBrandProposals(
  city: ExpansionCity,
  count: number = 3
): Promise<BrandProposal[]> {
  const systemPrompt =
    'You are a brand identity designer for a chain of local dining discovery apps. ' +
    "Each app follows the 'Taste{Region}' naming convention where the region can be a city, " +
    'county, or well-known area name. ' +
    'You create cohesive brand identities including names, color palettes, taglines, and SEO copy. ' +
    'Return ONLY valid JSON matching the requested schema.';

  // Use region name if available (cluster-based), otherwise fall back to city name
  const regionName = city.research_data?.suggested_region_name || city.city_name;
  const clusterTowns: string[] = (city.research_data?.cluster_towns as string[]) || [];
  const slug = city.slug || regionName.toLowerCase().replace(/\s+/g, '-');

  const clusterContext = clusterTowns.length > 0
    ? `\n- This is a REGIONAL market covering: ${clusterTowns.join(', ')}\n- The brand name should reflect the REGION, not just the anchor city`
    : '';

  const userPrompt = `We are expanding our dining discovery app brand to the ${regionName} region (${city.county}, ${city.state}). Generate ${count} distinct brand identity proposals.

EXISTING BRANDS (for reference — do NOT duplicate their colors or AI names):
1. TasteLanc — Lancaster, PA
   - AI Assistant: Rosie
   - Accent color: #A41E22 (red)
   - Tagline: "Eat. Drink. Experience Lancaster."
   - Premium tier: "TasteLanc+"

2. TasteCumberland — Cumberland County, PA (covers Carlisle, Mechanicsburg, Camp Hill, Shippensburg, etc.)
   - AI Assistant: Mollie
   - Accent color: #3B7A57 (green)
   - Tagline: "Eat. Drink. Experience Cumberland."
   - Premium tier: "TasteCumberland+"

MARKET CONTEXT:
- Anchor city: ${city.city_name}, ${city.county}, ${city.state}
- Region name: ${regionName}${clusterContext}
- Population: ${city.population ?? 'Unknown'}
- Dining scene: ${city.dining_scene_description ?? 'Not yet researched'}
${city.research_data?.local_food_traditions ? `- Food traditions: ${city.research_data.local_food_traditions}` : ''}
${city.research_data?.college_presence ? `- College presence: ${city.research_data.college_presence}` : ''}
${city.research_data?.tourism_factors ? `- Tourism: ${city.research_data.tourism_factors}` : ''}

IMPORTANT: The app name should use the REGION name (e.g., "TasteCumberland" not "TasteCarlisle", "TasteLehigh" not "TasteAllentown") so it covers the whole area.

For each proposal, generate a JSON object with:
- "app_name": string — follows "Taste{Region}" pattern (e.g., "TasteYork", "TasteLehigh", "TasteBerks")
- "tagline": string — follows "Eat. Drink. Experience {Region}." pattern
- "ai_assistant_name": string — CRITICAL: the name MUST end in "-ie" to match our brand convention (Rosie, Mollie). Good examples: Sadie, Ellie, Sophie, Josie, Callie, Lexie, Addie, Gracie, Hattie, Tillie, Birdie, Frankie, Winnie, Bessie, Nellie, Dixie, Bonnie. The name should feel warm, approachable, and fit the local culture. MUST end in -ie. NOT Rosie or Mollie
- "premium_name": string — follows "{AppName}+" pattern
- "colors": object matching this exact shape:
  {
    "accent": "<hex — primary brand color, visually distinct from #A41E22 and #3B7A57>",
    "accentHover": "<hex — slightly darker/lighter variant of accent>",
    "gold": "<hex — warm gold for premium elements>",
    "bg": "<hex — page background, typically near-white>",
    "card": "<hex — card background, white or near-white>",
    "surface": "<hex — subtle surface background>",
    "surfaceLight": "<hex — lighter surface variant>",
    "headerBg": "<hex — header background, typically dark>",
    "headerText": "<hex — header text color, typically white>"
  }
- "seo_title": string — page title for SEO (e.g., "TasteYork | Discover York, PA Dining")
- "seo_description": string — meta description for SEO (150-160 chars)
- "seo_keywords": string[] — array of 8-12 SEO keywords
- "market_config_json": object matching this exact interface:
  {
    "name": "<app_name>",
    "tagline": "<tagline>",
    "county": "<full county name>",
    "countyShort": "<short county reference, e.g. 'York'>",
    "state": "${city.state}",
    "premiumName": "<premium_name>",
    "aiName": "<ai_assistant_name>",
    "aiAvatarVideo": "",
    "aiAvatarImage": "",
    "domain": "${slug}.tastelanc.com",
    "socialHandle": "@taste${slug.replace(/-/g, '')}",
    "instagramUrl": "https://www.instagram.com/taste${slug.replace(/-/g, '')}/",
    "logoPath": "",
    "appStoreUrls": { "ios": "", "android": "" },
    "colors": { <same colors object as above> },
    "seo": {
      "title": "<seo_title>",
      "description": "<seo_description>",
      "keywords": [<seo_keywords>]
    }
  }

Each proposal should have a DISTINCT color palette and AI assistant name. Make the colors feel local — inspired by the city's character, landscape, or heritage.

Return ONLY a JSON object with a "proposals" key containing an array of ${count} proposal objects:
{"proposals": [{ ... }, { ... }, { ... }]}`;

  const response = await openai.chat.completions.create({
    model: MODEL,
    max_tokens: 4096,
    temperature: 0.7,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error('No response from OpenAI');
  }

  try {
    const parsed = JSON.parse(content);
    let proposals: BrandProposal[];
    if (Array.isArray(parsed.proposals || parsed)) {
      proposals = (parsed.proposals || parsed) as BrandProposal[];
    } else {
      const arrayMatch = content.match(/\[[\s\S]*\]/);
      if (arrayMatch) {
        proposals = JSON.parse(arrayMatch[0]) as BrandProposal[];
      } else {
        throw new Error('Response is not an array');
      }
    }

    // Generate avatar images for each brand proposal using DALL-E 3
    const localCulture = [
      city.research_data?.local_food_traditions,
      city.research_data?.tourism_factors,
      city.dining_scene_description,
    ].filter(Boolean).join('. ').slice(0, 300) || `the ${regionName} area`;

    const avatarPromises = proposals.map((proposal, index) =>
      generateAvatarImage(
        proposal.ai_assistant_name,
        regionName,
        proposal.colors?.accent || '#4A90D9',
        localCulture,
        slug,
        index + 1
      )
    );

    const avatarUrls = await Promise.allSettled(avatarPromises);

    // Attach avatar URLs to proposals and market_config_json
    for (let i = 0; i < proposals.length; i++) {
      const result = avatarUrls[i];
      const avatarUrl = result?.status === 'fulfilled' ? result.value : null;
      if (avatarUrl) {
        proposals[i].avatar_image_url = avatarUrl;
        if (proposals[i].market_config_json) {
          (proposals[i].market_config_json as Record<string, unknown>).aiAvatarImage = avatarUrl;
        }
      }
    }

    return proposals;
  } catch (error) {
    console.error('Failed to parse brand proposals response:', content);
    throw new Error(
      `Failed to parse brand proposals for ${city.city_name} from AI response`
    );
  }
}

// ─────────────────────────────────────────────────────────
// Job listings
// ─────────────────────────────────────────────────────────

/**
 * Generate a job listing for a specific role in an expansion city.
 */
export async function generateJobListing(
  city: ExpansionCity,
  brand: BrandDraft | null,
  roleType: string
): Promise<JobListingDraft> {
  const brandName = brand?.app_name ?? `Taste${city.city_name.replace(/\s+/g, '')}`;

  const systemPrompt =
    'You are a hiring manager for a fast-growing local dining discovery app startup. ' +
    'You write compelling job listings that attract motivated self-starters. ' +
    'Return ONLY valid JSON matching the requested schema.';

  const roleLabels: Record<string, string> = {
    sales_rep: 'Restaurant Partnership Manager',
    market_manager: 'Market Manager',
    content_creator: 'Content Creator & Food Photographer',
    community_manager: 'Community Manager',
  };

  const roleLabel = roleLabels[roleType] ?? roleType;

  const neighborhoodList = city.research_data?.key_neighborhoods?.length
    ? city.research_data.key_neighborhoods.join(', ')
    : 'various neighborhoods throughout the city';

  const userPrompt = `Generate a job listing for a ${roleLabel} role for ${brandName} in ${city.city_name}, ${city.county}, ${city.state}.

COMPANY CONTEXT:
- ${brandName} is a hyperlocal dining discovery app helping people find restaurants, happy hours, events, and specials
- Part of the Taste family of apps (TasteLanc in Lancaster, PA; TasteCumberland in Cumberland County, PA)
- We're expanding to ${city.city_name} and need someone to build our local restaurant network
- This is a ground-floor opportunity to shape a new market

CITY CONTEXT:
- Population: ${city.population ?? 'Unknown'}
- Dining scene: ${city.dining_scene_description ?? 'Growing local dining scene'}
- Key neighborhoods: ${neighborhoodList}
${city.research_data?.notable_restaurants?.length ? `- Notable restaurants: ${city.research_data.notable_restaurants.join(', ')}` : ''}
${city.research_data?.college_presence ? `- College presence: ${city.research_data.college_presence}` : ''}
${city.research_data?.tourism_factors ? `- Tourism: ${city.research_data.tourism_factors}` : ''}

STYLE REFERENCE (Restaurant Partnership Manager):
- Commission-based compensation with uncapped earning potential
- Flexible schedule, work-from-anywhere with in-person restaurant visits
- Emphasis on relationship building and local community
- Entrepreneurial, self-starter mentality
- No cold corporate language — keep it energetic and genuine

Please return a JSON object with:
{
  "title": "<string — role title, e.g. '${roleLabel} — ${city.city_name}, ${city.state}'>",
  "description": "<string — full job listing body in markdown format. Include sections: About ${brandName}, The Role, What You'll Do (bullet points), Who You Are (bullet points), Perks & Compensation. Use \\n for line breaks.>",
  "requirements": [<array of 5-8 requirement strings>],
  "compensation_summary": "<string — brief compensation summary, e.g. 'Commission-based with uncapped earning potential. Base stipend during ramp-up period.'>",
  "location": "<string — e.g. '${city.city_name}, ${city.state} (In-Person / Hybrid)'>"
}

Make it compelling enough that someone passionate about food and their local community would be excited to apply. Return ONLY the JSON object.`;

  const response = await openai.chat.completions.create({
    model: MODEL,
    max_tokens: 2048,
    temperature: 0.6,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error('No response from OpenAI');
  }

  try {
    let jsonStr = content;
    const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      jsonStr = jsonMatch[0];
    }

    return JSON.parse(jsonStr) as JobListingDraft;
  } catch (error) {
    console.error('Failed to parse job listing response:', content);
    throw new Error(
      `Failed to parse job listing for ${roleLabel} in ${city.city_name} from AI response`
    );
  }
}

// ─────────────────────────────────────────────────────────
// City suggestions
// ─────────────────────────────────────────────────────────

/**
 * Suggest cities for potential expansion based on criteria.
 */
export async function suggestCities(criteria: {
  state?: string;
  min_population?: number;
  max_population?: number;
  count?: number;
  excludeCities?: { city_name: string; state: string }[];
}): Promise<CitySuggestion[]> {
  const count = criteria.count ?? 10;

  const systemPrompt =
    'You are a market expansion strategist for a restaurant/dining discovery app company ' +
    'currently operating in Lancaster, PA and Cumberland County, PA. ' +
    'You specialize in identifying promising small-to-mid-size US regions for expansion. ' +
    'You think in terms of REGIONAL CLUSTERS, not just individual cities — smaller towns ' +
    'should be bundled together under a cohesive region name. ' +
    'Return ONLY valid JSON matching the requested schema.';

  let criteriaDescription = `Suggest ${count} cities that would be good candidates for our dining discovery app expansion.`;

  if (criteria.state) {
    criteriaDescription += ` Focus on cities in ${criteria.state}.`;
  }

  if (criteria.min_population) {
    criteriaDescription += ` Minimum population: ${criteria.min_population.toLocaleString()}.`;
  }

  if (criteria.max_population) {
    criteriaDescription += ` Maximum population: ${criteria.max_population.toLocaleString()}.`;
  }

  const userPrompt = `${criteriaDescription}

COMPANY CONTEXT:
- We operate hyperlocal dining discovery apps (happy hours, events, specials, restaurant guides)
- Current markets: Lancaster, PA (TasteLanc) and Cumberland County, PA (TasteCumberland)
- Our model works best in small-to-mid-size regions (50k-500k combined population) with:
  - Active local dining scenes with independent restaurants
  - Community-oriented culture (not dominated by chains)
  - College presence or tourism that boosts dining activity
  - Underserved by existing dining discovery platforms
  - Enough population density to support a curated app

CRITICAL — THINK IN REGIONAL CLUSTERS, NOT JUST CITIES:
Our apps serve REGIONS, not just single cities. For example, TasteCumberland covers Carlisle,
Mechanicsburg, Camp Hill, Shippensburg, Boiling Springs, and other Cumberland County towns —
we would NEVER launch a "TasteCarlisle" for just one small town.

When evaluating areas, consider:
1. Can nearby towns be bundled into one cohesive market under a region/county name?
2. Would "Taste{RegionName}" sound natural and appealing? (e.g., TasteLehigh, TasteYork, TasteBerks)
3. A city large enough on its own (like 150k+) can stand alone, but smaller towns MUST be clustered
4. The cluster should make geographic sense — towns should be within ~30 minutes of each other
5. Use county names, valley names, or well-known regional identifiers as the region name

EXCLUDE these areas (already in our pipeline or live markets — do NOT suggest these):
- Lancaster, PA (LIVE market — TasteLanc)
- Cumberland County / Carlisle / Mechanicsburg, PA (LIVE market — TasteCumberland)${criteria.excludeCities?.length ? '\n' + criteria.excludeCities.map(c => `- ${c.city_name}, ${c.state}`).join('\n') : ''}

For each suggested region/city, return a JSON object with:
{
  "city_name": "<string — the anchor/largest city in the region>",
  "county": "<string — primary county name>",
  "state": "<string — state abbreviation>",
  "population": <number — estimated anchor city population>,
  "reasoning": "<string — 2-3 sentences explaining why this region is a good candidate>",
  "estimated_score": <number 0-100 — estimated market potential score>,
  "suggested_region_name": "<string — the region name for the app brand, e.g. 'Lehigh Valley', 'York', 'Berks'>",
  "cluster_towns": [<array of strings — all towns/cities included in this market region, e.g. ["Allentown", "Bethlehem", "Easton"]>],
  "cluster_population": <number — combined estimated population of all cluster towns>
}

Rank them from highest to lowest estimated_score. Return ONLY a JSON object with a "cities" key containing an array:
{"cities": [{ ... }, { ... }, ...]}`;

  const response = await openai.chat.completions.create({
    model: MODEL,
    max_tokens: 2048,
    temperature: 0.7,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error('No response from OpenAI');
  }

  try {
    const parsed = JSON.parse(content);
    const cities = parsed.cities || parsed;
    if (Array.isArray(cities)) {
      return cities as CitySuggestion[];
    }
    const arrayMatch = content.match(/\[[\s\S]*\]/);
    if (arrayMatch) {
      return JSON.parse(arrayMatch[0]) as CitySuggestion[];
    }
    throw new Error('Response is not an array');
  } catch (error) {
    console.error('Failed to parse city suggestions response:', content);
    throw new Error('Failed to parse city suggestions from AI response');
  }
}
