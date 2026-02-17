// Quick script to generate a blog post immediately for any market
// Run with: npx tsx scripts/generate-blog-now.ts [--market cumberland-pa]

import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load env from apps/web/.env.local
config({ path: resolve(__dirname, '../apps/web/.env.local') });

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Parse --market arg
const marketArg = process.argv.find((a, i) => process.argv[i - 1] === '--market') || 'lancaster-pa';

// Market configs (inline to avoid Next.js import issues)
const MARKET_BRANDS: Record<string, { name: string; aiName: string; countyShort: string; domain: string }> = {
  'lancaster-pa': { name: 'TasteLanc', aiName: 'Rosie', countyShort: 'Lancaster', domain: 'tastelanc.com' },
  'cumberland-pa': { name: 'TasteCumberland', aiName: 'Mollie', countyShort: 'Cumberland', domain: 'cumberland.tastelanc.com' },
};

const brand = MARKET_BRANDS[marketArg] || MARKET_BRANDS['lancaster-pa'];

const TOPICS = [
  { id: 'friday-vibes', prompt: `Write about the best Friday night dining options in ${brand.countyShort}. Where to start the weekend right - happy hours transitioning to dinner, lively atmospheres, group-friendly spots.` },
];

/**
 * Fetch cover images from recent blog posts to avoid duplication.
 */
async function fetchRecentCoverImages(limit = 15): Promise<Set<string>> {
  const { data } = await supabase
    .from('blog_posts')
    .select('cover_image_url')
    .not('cover_image_url', 'is', null)
    .order('created_at', { ascending: false })
    .limit(limit);

  return new Set((data || []).map(p => p.cover_image_url).filter(Boolean));
}

/**
 * Extract a unique cover image from blog HTML, excluding recently used ones.
 */
function extractCoverImage(
  bodyHtml: string,
  restaurants: Array<{ slug: string; cover_image_url: string | null }>,
  excludeUrls: Set<string>
): string | null {
  const restaurantMap = new Map(
    restaurants
      .filter(r => r.cover_image_url)
      .map(r => [r.slug, r.cover_image_url!])
  );

  const linkRegex = /href="\/restaurants\/([^"]+)"/g;
  const seenSlugs = new Set<string>();
  let match;

  // First pass: find an image NOT in the exclusion set
  while ((match = linkRegex.exec(bodyHtml)) !== null) {
    const slug = match[1];
    const imageUrl = restaurantMap.get(slug);
    if (!seenSlugs.has(slug) && imageUrl && !excludeUrls.has(imageUrl)) {
      return imageUrl;
    }
    seenSlugs.add(slug);
  }

  // Fallback: use any available image
  linkRegex.lastIndex = 0;
  while ((match = linkRegex.exec(bodyHtml)) !== null) {
    const slug = match[1];
    const imageUrl = restaurantMap.get(slug);
    if (imageUrl) return imageUrl;
  }

  return null;
}

async function main() {
  console.log(`Generating blog post for ${brand.name} (${brand.aiName})...`);

  // Resolve market ID
  const { data: marketRow, error: marketErr } = await supabase
    .from('markets')
    .select('id')
    .eq('slug', marketArg)
    .eq('is_active', true)
    .single();

  if (marketErr || !marketRow) {
    console.error(`Market "${marketArg}" not found or inactive`);
    process.exit(1);
  }
  const marketId = marketRow.id;

  // Fetch restaurants for this market
  const { data: restaurants } = await supabase
    .from('restaurants')
    .select('name, slug, categories, cover_image_url')
    .eq('market_id', marketId)
    .eq('is_active', true)
    .not('cover_image_url', 'is', null)
    .order('name');

  if (!restaurants?.length) {
    console.error('No restaurants found');
    process.exit(1);
  }

  console.log(`Found ${restaurants.length} restaurants`);

  // Fetch recent cover images to exclude
  const recentCoverImages = await fetchRecentCoverImages(15);
  console.log(`Excluding ${recentCoverImages.size} recent cover images`);

  const restaurantList = restaurants
    .map(r => `- ${r.name} (slug: ${r.slug}) [${r.categories?.join(', ') || ''}]`)
    .join('\n');

  const systemPrompt = `You are ${brand.aiName}, ${brand.name}'s food authority for ${brand.countyShort}, PA. Write engaging blog posts.

## RESTAURANTS (${restaurants.length} total)
${restaurantList}

## GUIDELINES
- Use <h2> for headers, <p> for paragraphs, <ul>/<li> for lists
- Word count: 600-900 words
- EVERY restaurant MUST link: <a href="/restaurants/{slug}" class="restaurant-link">{Name}</a>

## RESPONSE FORMAT (JSON only)
{"title": "...", "summary": "150 chars", "body_html": "...", "tags": ["tag1", "tag2"]}`;

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  const userPrompt = `Today is ${today}.

${TOPICS[0].prompt}

Be specific, be opinionated, and make it valuable.`;

  console.log('Calling OpenAI...');
  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    max_tokens: 3000,
    temperature: 0.8,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    console.error('No response from OpenAI');
    process.exit(1);
  }

  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    console.error('Could not parse JSON');
    process.exit(1);
  }

  const parsed = JSON.parse(jsonMatch[0]);
  console.log(`Generated: "${parsed.title}"`);

  // Generate slug
  let slug = parsed.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 80);

  const { data: existing } = await supabase
    .from('blog_posts')
    .select('slug')
    .eq('slug', slug)
    .single();

  if (existing) slug = `${slug}-${Date.now()}`;

  // Extract cover image with deduplication
  const coverImageUrl = extractCoverImage(parsed.body_html, restaurants, recentCoverImages);

  // Extract featured restaurant slugs
  const linkRegex = /href="\/restaurants\/([^"]+)"/g;
  const matches = Array.from(parsed.body_html.matchAll(linkRegex) as Iterable<RegExpMatchArray>);
  const featuredRestaurants = Array.from(new Set(matches.map((m: RegExpMatchArray) => m[1])));

  // Insert into database
  const now = new Date().toISOString();
  const { error } = await supabase.from('blog_posts').insert({
    slug,
    title: parsed.title,
    summary: parsed.summary,
    body_html: parsed.body_html,
    tags: parsed.tags || [brand.countyShort.toLowerCase(), brand.name.toLowerCase()],
    cover_image_url: coverImageUrl,
    featured_restaurants: featuredRestaurants.length ? featuredRestaurants : null,
    market_id: marketId,
    status: 'published',
    published_at: now,
    created_at: now,
  });

  if (error) {
    console.error('Database error:', error);
    process.exit(1);
  }

  console.log(`\nPublished: ${parsed.title}`);
  console.log(`URL: https://${brand.domain}/blog/${slug}`);
  console.log(`Cover image: ${coverImageUrl ? 'yes' : 'none (no unique image available)'}`);

  // Send push notifications
  console.log('\nSending push notifications...');
  try {
    const { data, error: pushError } = await supabase.functions.invoke(
      'send-notifications/new-blog-post',
      {
        body: {
          title: parsed.title,
          summary: parsed.summary,
          slug,
        },
      }
    );
    if (pushError) {
      console.error('Push notification error:', pushError);
    } else {
      console.log(`Push notifications sent: ${data?.sent || 0}`);
    }
  } catch (e) {
    console.error('Push notification failed:', e);
  }
}

main().catch(console.error);
