/**
 * Google Review Highlights Enrichment Script
 *
 * Fetches Google Places reviews for each restaurant, then uses Claude
 * to extract 2-3 short highlight phrases that describe what people love.
 *
 * Usage:
 *   npx tsx scripts/enrich-google-reviews.ts --dry-run   # Preview
 *   npx tsx scripts/enrich-google-reviews.ts              # Apply
 *   npx tsx scripts/enrich-google-reviews.ts --limit=5    # First 5 only
 *   npx tsx scripts/enrich-google-reviews.ts --force      # Re-process all (even already synced)
 */

import { createClient } from '@supabase/supabase-js';
import Anthropic from '@anthropic-ai/sdk';

// ─── Config ──────────────────────────────────────────────────────

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://kufcxxynjvyharhtfptd.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY || 'AIzaSyA2pfw7scIrffb_O_o1Jvj7iimp2Pg3jZE';
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY!;

if (!SUPABASE_SERVICE_KEY) {
  console.error('Missing SUPABASE_SERVICE_ROLE_KEY. Set it in apps/web/.env.local or as env var.');
  process.exit(1);
}
if (!ANTHROPIC_API_KEY) {
  console.error('Missing ANTHROPIC_API_KEY. Set it in apps/web/.env.local or as env var.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY });

const BATCH_SIZE = 5;
const BATCH_DELAY_MS = 600; // Stay well under Google rate limits

// ─── Types ───────────────────────────────────────────────────────

interface GoogleReview {
  text?: string | { text: string };
  rating?: number;
  author_name?: string;
  relative_time_description?: string;
}

interface GooglePlaceDetails {
  rating?: number;
  user_ratings_total?: number;
  reviews?: GoogleReview[];
}

interface Restaurant {
  id: string;
  name: string;
  google_place_id: string;
  google_review_highlights: string[] | null;
  google_reviews_synced_at: string | null;
}

// ─── Google Places API (Legacy) ──────────────────────────────────

async function fetchPlaceDetails(placeId: string): Promise<GooglePlaceDetails | null> {
  const fields = 'rating,user_ratings_total,reviews';
  const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=${fields}&key=${GOOGLE_API_KEY}`;

  try {
    const res = await fetch(url);

    if (!res.ok) {
      const text = await res.text();
      console.error(`  Google API ${res.status} for ${placeId}: ${text.slice(0, 200)}`);
      return null;
    }

    const json = await res.json();
    if (json.status !== 'OK' || !json.result) {
      console.error(`  Google API status=${json.status} for ${placeId}`);
      return null;
    }

    return json.result as GooglePlaceDetails;
  } catch (error: any) {
    console.error(`  Google API error for ${placeId}: ${error.message}`);
    return null;
  }
}

// ─── Claude Highlight Extraction ─────────────────────────────────

async function extractHighlights(
  restaurantName: string,
  reviews: GoogleReview[]
): Promise<string[]> {
  // Collect review text (legacy API returns text as string directly)
  const reviewTexts = reviews
    .map((r) => {
      const text = typeof r.text === 'string' ? r.text : r.text?.text;
      return text ? `[${r.rating ?? '?'}★] ${text}` : null;
    })
    .filter(Boolean)
    .slice(0, 5); // Max 5 reviews to keep costs low

  if (reviewTexts.length === 0) return [];

  const prompt = `Analyze these Google reviews for "${restaurantName}" and output 2-3 SHORT badge labels (1-2 words each) summarizing what this place is known for.

Format: Each label should be a concise descriptor like an app badge — NOT a quote from reviews.

Good examples: "Great Wings", "Craft Cocktails", "Cozy Vibe", "Fresh Sushi", "Top Brunch", "Live Music", "Best Pizza", "Farm Fresh"
Bad examples: "Fresh, crispy fish sandwiches", "Best bread in town", "Perfectly cooked steaks" (too long, sounds like a quote)

Rules:
- MAX 2 words per label. Never exceed 2 words.
- Capitalize each word
- Focus on what makes this place special (signature food, atmosphere, experience)
- If reviews are mixed/negative, return an empty array []
- Return ONLY a JSON array of strings

Reviews:
${reviewTexts.join('\n')}`;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 150,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '';
    // Extract JSON array from response
    const match = text.match(/\[[\s\S]*?\]/);
    if (!match) return [];

    const parsed = JSON.parse(match[0]) as string[];
    // Validate: only short strings, max 3
    return parsed
      .filter((s) => typeof s === 'string' && s.length > 0 && s.length <= 50)
      .slice(0, 3);
  } catch (error: any) {
    console.error(`  Claude error for "${restaurantName}": ${error.message}`);
    return [];
  }
}

// ─── Main ────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const force = args.includes('--force');
  const limitArg = args.find((a) => a.startsWith('--limit='));
  const limit = limitArg ? parseInt(limitArg.split('=')[1], 10) : undefined;

  console.log('=== Google Review Highlights Enrichment ===');
  console.log(`Mode: ${dryRun ? 'DRY RUN' : 'LIVE'}`);
  if (force) console.log('Force: re-processing all restaurants');
  if (limit) console.log(`Limit: ${limit} restaurants`);
  console.log('');

  // Fetch restaurants with google_place_id
  let query = supabase
    .from('restaurants')
    .select('id, name, google_place_id, google_review_highlights, google_reviews_synced_at')
    .eq('is_active', true)
    .not('google_place_id', 'is', null)
    .order('name');

  // Skip already-synced unless --force
  if (!force) {
    query = query.is('google_reviews_synced_at', null);
  }

  if (limit) {
    query = query.limit(limit);
  }

  const { data: restaurants, error } = await query;

  if (error || !restaurants) {
    console.error('Failed to fetch restaurants:', error?.message);
    return;
  }

  console.log(`Found ${restaurants.length} restaurants to process\n`);

  const stats = {
    total: restaurants.length,
    enriched: 0,
    noReviews: 0,
    noHighlights: 0,
    errors: 0,
  };

  for (let i = 0; i < restaurants.length; i += BATCH_SIZE) {
    const batch = restaurants.slice(i, i + BATCH_SIZE);

    await Promise.all(
      batch.map(async (restaurant: Restaurant) => {
        try {
          // 1. Fetch Google Place Details with reviews
          const details = await fetchPlaceDetails(restaurant.google_place_id);

          if (!details) {
            stats.errors++;
            return;
          }

          const googleRating = details.rating ?? null;
          const googleReviewCount = details.user_ratings_total ?? 0;
          const reviews = details.reviews ?? [];

          if (reviews.length === 0) {
            stats.noReviews++;
            console.log(`  ${restaurant.name}: no Google reviews`);

            // Still update rating if available
            if (!dryRun && googleRating) {
              await supabase
                .from('restaurants')
                .update({
                  google_rating: googleRating,
                  google_review_count: googleReviewCount,
                  google_review_highlights: [],
                  google_reviews_synced_at: new Date().toISOString(),
                })
                .eq('id', restaurant.id);
            }
            return;
          }

          // 2. Extract highlights with Claude
          const highlights = await extractHighlights(restaurant.name, reviews);

          if (highlights.length === 0) {
            stats.noHighlights++;
            console.log(`  ${restaurant.name}: ${googleRating}★ (${googleReviewCount} reviews) — no highlights extracted`);
          } else {
            stats.enriched++;
            console.log(`  ${restaurant.name}: ${googleRating}★ (${googleReviewCount} reviews) → ${highlights.join(' | ')}`);
          }

          // 3. Update database
          if (!dryRun) {
            const { error: updateError } = await supabase
              .from('restaurants')
              .update({
                google_rating: googleRating,
                google_review_count: googleReviewCount,
                google_review_highlights: highlights,
                google_reviews_synced_at: new Date().toISOString(),
              })
              .eq('id', restaurant.id);

            if (updateError) {
              console.error(`  DB update error for ${restaurant.name}: ${updateError.message}`);
            }
          }
        } catch (error: any) {
          stats.errors++;
          console.error(`  Error processing ${restaurant.name}: ${error.message}`);
        }
      })
    );

    const processed = Math.min(i + BATCH_SIZE, restaurants.length);
    process.stdout.write(`\rProcessed ${processed}/${restaurants.length}...`);

    // Rate limiting delay between batches
    if (i + BATCH_SIZE < restaurants.length) {
      await new Promise((resolve) => setTimeout(resolve, BATCH_DELAY_MS));
    }
  }

  console.log('\n');
  console.log('=== RESULTS ===');
  console.log(`Total:          ${stats.total}`);
  console.log(`Enriched:       ${stats.enriched}`);
  console.log(`No reviews:     ${stats.noReviews}`);
  console.log(`No highlights:  ${stats.noHighlights}`);
  console.log(`Errors:         ${stats.errors}`);

  if (dryRun) {
    console.log('\n--- DRY RUN — no changes were made ---');
  } else {
    console.log('\n--- Changes applied to database ---');
  }
}

main().catch(console.error);
