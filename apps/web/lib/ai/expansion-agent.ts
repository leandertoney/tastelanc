import { anthropic, CLAUDE_CONFIG } from '../anthropic';
import type {
  ExpansionCity,
  BrandDraft,
  CityResearchResult,
  BrandProposal,
  JobListingDraft,
  CitySuggestion,
} from './expansion-types';

// ─────────────────────────────────────────────────────────
// City Expansion AI Agent
//
// Powers city research, brand generation, job listings,
// and city suggestions using the Anthropic Claude API.
// ─────────────────────────────────────────────────────────

/**
 * Research a city for potential market expansion.
 *
 * Uses Claude to gather demographic data, dining scene analysis,
 * competition landscape, and an overall market potential score.
 *
 * @param cityName - The city name (e.g., "York")
 * @param county   - The county name (e.g., "York County")
 * @param state    - The state abbreviation (e.g., "PA")
 * @returns A structured CityResearchResult with all research fields
 */
export async function researchCity(
  cityName: string,
  county: string,
  state: string
): Promise<CityResearchResult> {
  const systemPrompt =
    'You are a market research analyst for a restaurant/dining discovery app company. ' +
    'You specialize in evaluating small-to-mid-size US cities for market expansion. ' +
    'Return ONLY valid JSON matching the requested schema.';

  const userPrompt = `Research the city of ${cityName}, ${county}, ${state} as a potential market for a local dining discovery app (similar to a hyperlocal Yelp/TripAdvisor focused on happy hours, events, specials, and curated restaurant guides).

Please return a JSON object with the following fields:

{
  "population": <number — estimated city/metro population>,
  "median_income": <number — estimated median household income in USD>,
  "median_age": <number — estimated median age>,
  "restaurant_count": <number — estimated number of restaurants in the area>,
  "bar_count": <number — estimated number of bars/pubs/breweries>,
  "dining_scene_description": "<string — 2-3 paragraphs describing the local dining scene, food culture, and trends>",
  "competition_analysis": "<string — analysis of existing food/dining apps, Yelp presence, local food blogs, and any competing platforms>",
  "market_potential_score": <number 0-100 — overall score for how good this market would be for expansion>,
  "center_latitude": <number — approximate latitude of city center>,
  "center_longitude": <number — approximate longitude of city center>,
  "key_neighborhoods": [<array of strings — notable neighborhoods or districts with dining activity>],
  "notable_restaurants": [<array of strings — well-known or notable local restaurants>],
  "local_food_traditions": "<string — local food traditions, signature dishes, or culinary heritage>",
  "college_presence": "<string — nearby colleges/universities and their impact on the dining scene>",
  "tourism_factors": "<string — tourism activity, seasonal visitors, and their impact on restaurants>",
  "seasonal_considerations": "<string — seasonal factors affecting dining (e.g., summer tourism, college calendar)>",
  "expansion_reasoning": "<string — 2-3 paragraph analysis of why this city is or is not a good expansion target>"
}

Be as accurate as possible with population, income, and location data. For restaurant/bar counts, provide reasonable estimates. Return ONLY the JSON object, no additional text.`;

  const response = await anthropic.messages.create({
    model: CLAUDE_CONFIG.model,
    max_tokens: 2048,
    temperature: 0.7,
    messages: [{ role: 'user', content: userPrompt }],
    system: systemPrompt,
  });

  const content = response.content[0];
  if (content.type !== 'text') {
    throw new Error('Unexpected response type from Claude');
  }

  try {
    let jsonStr = content.text;
    const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      jsonStr = jsonMatch[0];
    }

    return JSON.parse(jsonStr) as CityResearchResult;
  } catch (error) {
    console.error('Failed to parse city research response:', content.text);
    throw new Error(
      `Failed to parse city research data for ${cityName}, ${state} from AI response`
    );
  }
}

/**
 * Generate brand identity proposals for an expansion city.
 *
 * Produces multiple distinct brand proposals, each with a unique
 * app name, AI assistant name, color palette, and full MarketBrand config.
 *
 * @param city  - The ExpansionCity record (must have research data populated)
 * @param count - Number of distinct proposals to generate (default: 3)
 * @returns An array of BrandProposal objects
 */
export async function generateBrandProposals(
  city: ExpansionCity,
  count: number = 3
): Promise<BrandProposal[]> {
  const systemPrompt =
    'You are a brand identity designer for a chain of local dining discovery apps. ' +
    "Each app follows the 'Taste{City}' naming convention. " +
    'You create cohesive brand identities including names, color palettes, taglines, and SEO copy. ' +
    'Return ONLY valid JSON matching the requested schema.';

  const slug = city.slug || city.city_name.toLowerCase().replace(/\s+/g, '-');

  const userPrompt = `We are expanding our dining discovery app brand to ${city.city_name}, ${city.county}, ${city.state}. Generate ${count} distinct brand identity proposals.

EXISTING BRANDS (for reference — do NOT duplicate their colors or AI names):
1. TasteLanc — Lancaster, PA
   - AI Assistant: Rosie
   - Accent color: #A41E22 (red)
   - Tagline: "Eat. Drink. Experience Lancaster."
   - Premium tier: "TasteLanc+"

2. TasteCumberland — Cumberland County, PA
   - AI Assistant: Mollie
   - Accent color: #3B7A57 (green)
   - Tagline: "Eat. Drink. Experience Cumberland."
   - Premium tier: "TasteCumberland+"

CITY CONTEXT:
- City: ${city.city_name}, ${city.county}, ${city.state}
- Population: ${city.population ?? 'Unknown'}
- Dining scene: ${city.dining_scene_description ?? 'Not yet researched'}
${city.research_data?.local_food_traditions ? `- Food traditions: ${city.research_data.local_food_traditions}` : ''}
${city.research_data?.college_presence ? `- College presence: ${city.research_data.college_presence}` : ''}
${city.research_data?.tourism_factors ? `- Tourism: ${city.research_data.tourism_factors}` : ''}

For each proposal, generate a JSON object with:
- "app_name": string — follows "Taste{City}" pattern (e.g., "TasteYork")
- "tagline": string — follows "Eat. Drink. Experience {City}." pattern
- "ai_assistant_name": string — a unique female name that fits the local culture (NOT Rosie or Mollie)
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

Return ONLY a JSON array of ${count} proposal objects, no additional text:
[{ ... }, { ... }, { ... }]`;

  const response = await anthropic.messages.create({
    model: CLAUDE_CONFIG.model,
    max_tokens: 4096,
    temperature: 0.7,
    messages: [{ role: 'user', content: userPrompt }],
    system: systemPrompt,
  });

  const content = response.content[0];
  if (content.type !== 'text') {
    throw new Error('Unexpected response type from Claude');
  }

  try {
    let jsonStr = content.text;
    const arrayMatch = jsonStr.match(/\[[\s\S]*\]/);
    if (arrayMatch) {
      jsonStr = arrayMatch[0];
    }

    return JSON.parse(jsonStr) as BrandProposal[];
  } catch (error) {
    console.error('Failed to parse brand proposals response:', content.text);
    throw new Error(
      `Failed to parse brand proposals for ${city.city_name} from AI response`
    );
  }
}

/**
 * Generate a job listing for a specific role in an expansion city.
 *
 * Creates a compelling, detailed job listing customized to the city's
 * dining scene, neighborhoods, and brand identity.
 *
 * @param city     - The ExpansionCity record
 * @param brand    - The selected BrandDraft (or null if not yet chosen)
 * @param roleType - The role type (e.g., "sales_rep", "market_manager")
 * @returns A structured JobListingDraft
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

  const response = await anthropic.messages.create({
    model: CLAUDE_CONFIG.model,
    max_tokens: CLAUDE_CONFIG.maxTokens,
    temperature: 0.6,
    messages: [{ role: 'user', content: userPrompt }],
    system: systemPrompt,
  });

  const content = response.content[0];
  if (content.type !== 'text') {
    throw new Error('Unexpected response type from Claude');
  }

  try {
    let jsonStr = content.text;
    const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      jsonStr = jsonMatch[0];
    }

    return JSON.parse(jsonStr) as JobListingDraft;
  } catch (error) {
    console.error('Failed to parse job listing response:', content.text);
    throw new Error(
      `Failed to parse job listing for ${roleLabel} in ${city.city_name} from AI response`
    );
  }
}

/**
 * Suggest cities for potential expansion based on criteria.
 *
 * Uses Claude's knowledge to recommend cities that would be good
 * candidates for the Taste app family, excluding existing markets.
 *
 * @param criteria - Optional filters: state, population range, count
 * @returns An array of CitySuggestion objects ranked by estimated score
 */
export async function suggestCities(criteria: {
  state?: string;
  min_population?: number;
  max_population?: number;
  count?: number;
}): Promise<CitySuggestion[]> {
  const count = criteria.count ?? 10;

  const systemPrompt =
    'You are a market expansion strategist for a restaurant/dining discovery app company ' +
    'currently operating in Lancaster, PA and Cumberland County, PA. ' +
    'You specialize in identifying promising small-to-mid-size US cities for expansion. ' +
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
- Our model works best in small-to-mid-size cities (50k-500k metro population) with:
  - Active local dining scenes with independent restaurants
  - Community-oriented culture (not dominated by chains)
  - College presence or tourism that boosts dining activity
  - Underserved by existing dining discovery platforms
  - Enough population density to support a curated app

EXCLUDE these cities (already in our pipeline):
- Lancaster, PA
- Cumberland County / Carlisle / Mechanicsburg, PA

For each suggested city, return a JSON object with:
{
  "city_name": "<string — city name>",
  "county": "<string — county name>",
  "state": "<string — state abbreviation>",
  "population": <number — estimated city/metro population>,
  "reasoning": "<string — 2-3 sentences explaining why this city is a good candidate>",
  "estimated_score": <number 0-100 — estimated market potential score>
}

Rank them from highest to lowest estimated_score. Return ONLY a JSON array:
[{ ... }, { ... }, ...]`;

  const response = await anthropic.messages.create({
    model: CLAUDE_CONFIG.model,
    max_tokens: CLAUDE_CONFIG.maxTokens,
    temperature: 0.7,
    messages: [{ role: 'user', content: userPrompt }],
    system: systemPrompt,
  });

  const content = response.content[0];
  if (content.type !== 'text') {
    throw new Error('Unexpected response type from Claude');
  }

  try {
    let jsonStr = content.text;
    const arrayMatch = jsonStr.match(/\[[\s\S]*\]/);
    if (arrayMatch) {
      jsonStr = arrayMatch[0];
    }

    return JSON.parse(jsonStr) as CitySuggestion[];
  } catch (error) {
    console.error('Failed to parse city suggestions response:', content.text);
    throw new Error('Failed to parse city suggestions from AI response');
  }
}
