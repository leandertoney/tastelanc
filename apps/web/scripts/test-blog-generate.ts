/**
 * Enhanced Blog Generator Script
 *
 * Generates high-quality blog posts with Rosie's full persona.
 * Run with: npx tsx scripts/test-blog-generate.ts [topic]
 *
 * Topics: happy-hour-deep-dive, date-night-guide, family-dining, tourist-guide,
 *         contrarian-take, seasonal-guide, late-night-eats, brunch-battles,
 *         neighborhood-spotlight, hidden-gems, new-openings, app-feature,
 *         best-of, weekend-plans, budget-eats
 */
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';
import {
  buildBlogSystemPrompt,
  getBlogTopicPrompt,
  BLOG_TOPICS,
  type BlogContext,
  type BlogTopicId,
} from '../lib/rosie/blog-system-prompt';
import {
  verifyBlogContent,
  formatVerificationResult,
} from '../lib/blog/verify-content';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Get topic from command line or pick random
const argTopic = process.argv[2] as BlogTopicId | undefined;
const validTopicIds = BLOG_TOPICS.map((t) => t.id);

async function fetchFullContext(): Promise<BlogContext> {
  console.log('📊 Fetching full database context...\n');

  // Fetch restaurants (all active) with enrichment fields + cover image for inline blog images
  // ONLY include restaurants WITH cover images - we need beautiful visuals
  const { data: restaurants, error: rErr } = await supabase
    .from('restaurants')
    .select('name, slug, categories, description, address, city, neighborhood, price_range, signature_dishes, vibe_tags, best_for, parking_info, noise_level, average_rating, cover_image_url')
    .eq('is_active', true)
    .not('cover_image_url', 'is', null)
    .order('name');

  if (rErr) {
    console.error('Error fetching restaurants:', rErr);
    process.exit(1);
  }
  console.log(`   ✓ ${restaurants?.length || 0} restaurants`);

  // Fetch happy hours with items
  const { data: happyHours, error: hhErr } = await supabase
    .from('happy_hours')
    .select(`
      name,
      days_of_week,
      start_time,
      end_time,
      restaurant:restaurants(name, slug),
      happy_hour_items(name, discounted_price)
    `)
    .eq('is_active', true);

  if (hhErr) {
    console.error('Error fetching happy hours:', hhErr);
  }
  console.log(`   ✓ ${happyHours?.length || 0} happy hours`);

  // Fetch upcoming events
  const { data: events, error: eErr } = await supabase
    .from('events')
    .select(`
      name,
      event_type,
      performer_name,
      start_date,
      restaurant:restaurants(name, slug)
    `)
    .eq('is_active', true)
    .gte('start_date', new Date().toISOString())
    .order('start_date')
    .limit(50);

  if (eErr) {
    console.error('Error fetching events:', eErr);
  }
  console.log(`   ✓ ${events?.length || 0} upcoming events`);

  // Fetch specials
  const { data: specials, error: sErr } = await supabase
    .from('specials')
    .select(`
      name,
      description,
      discount_description,
      restaurant:restaurants(name, slug)
    `)
    .eq('is_active', true);

  if (sErr) {
    console.error('Error fetching specials:', sErr);
  }
  console.log(`   ✓ ${specials?.length || 0} specials\n`);

  return {
    restaurants: (restaurants || []).map((r) => ({
      name: r.name,
      slug: r.slug,
      categories: r.categories || [],
      description: r.description,
      address: r.address,
      city: r.city,
      neighborhood: r.neighborhood,
      priceRange: r.price_range,
      signatureDishes: r.signature_dishes,
      vibeTags: r.vibe_tags,
      bestFor: r.best_for,
      parkingInfo: r.parking_info,
      noiseLevel: r.noise_level,
      averageRating: r.average_rating,
      coverImageUrl: r.cover_image_url,
    })),
    happyHours: (happyHours || []).map((hh) => ({
      restaurantName: (hh.restaurant as { name: string; slug: string })?.name || 'Unknown',
      restaurantSlug: (hh.restaurant as { name: string; slug: string })?.slug || '',
      name: hh.name,
      daysOfWeek: hh.days_of_week || [],
      startTime: hh.start_time,
      endTime: hh.end_time,
      items: (hh.happy_hour_items || []).map((i: { name: string; discounted_price?: number }) => ({
        name: i.name,
        discountedPrice: i.discounted_price,
      })),
    })),
    events: (events || []).map((e) => ({
      restaurantName: (e.restaurant as { name: string; slug: string })?.name || 'Unknown',
      restaurantSlug: (e.restaurant as { name: string; slug: string })?.slug || '',
      name: e.name,
      eventType: e.event_type,
      performerName: e.performer_name,
      startDate: e.start_date,
    })),
    specials: (specials || []).map((s) => ({
      restaurantName: (s.restaurant as { name: string; slug: string })?.name || 'Unknown',
      restaurantSlug: (s.restaurant as { name: string; slug: string })?.slug || '',
      name: s.name,
      description: s.description,
      discountDescription: s.discount_description,
    })),
  };
}

/**
 * Extract restaurant images from generated blog HTML content
 * Uses real restaurant photos instead of AI-generated images
 */
function extractFeaturedRestaurantImages(
  bodyHtml: string,
  restaurants: BlogContext['restaurants']
): string[] {
  const images: string[] = [];
  const restaurantMap = new Map(
    restaurants
      .filter(r => r.coverImageUrl)
      .map(r => [r.slug, r.coverImageUrl!])
  );

  // Find all restaurant links in order of appearance
  const linkRegex = /href="\/restaurants\/([^"]+)"/g;
  let match;
  const seenSlugs = new Set<string>();

  while ((match = linkRegex.exec(bodyHtml)) !== null && images.length < 4) {
    const slug = match[1];
    if (!seenSlugs.has(slug) && restaurantMap.has(slug)) {
      seenSlugs.add(slug);
      images.push(restaurantMap.get(slug)!);
    }
  }

  return images;
}

interface CoverImageData {
  type: 'single' | 'dual' | 'triple' | 'quad' | 'none';
  images: string[];
  layout: 'full' | 'split-diagonal' | 'split-vertical' | 'grid' | 'collage';
}

function buildCoverImageData(bodyHtml: string, restaurants: BlogContext['restaurants']): CoverImageData {
  const images = extractFeaturedRestaurantImages(bodyHtml, restaurants);

  if (images.length === 0) {
    return { type: 'none', images: [], layout: 'full' };
  }
  if (images.length === 1) {
    return { type: 'single', images, layout: 'full' };
  }
  if (images.length === 2) {
    return { type: 'dual', images, layout: 'split-diagonal' };
  }
  if (images.length === 3) {
    return { type: 'triple', images, layout: 'collage' };
  }
  return { type: 'quad', images: images.slice(0, 4), layout: 'grid' };
}

async function main() {
  console.log('\n🌹 ROSIE BLOG GENERATOR\n');
  console.log('━'.repeat(50));

  // Select topic
  let selectedTopic: BlogTopicId;
  if (argTopic && validTopicIds.includes(argTopic)) {
    selectedTopic = argTopic;
    console.log(`📝 Topic (specified): ${selectedTopic}\n`);
  } else {
    // Pick a random topic
    const randomIndex = Math.floor(Math.random() * BLOG_TOPICS.length);
    selectedTopic = BLOG_TOPICS[randomIndex].id;
    console.log(`📝 Topic (random): ${selectedTopic}\n`);
    if (argTopic) {
      console.log(`   (Invalid topic "${argTopic}" - using random)\n`);
      console.log(`   Valid topics: ${validTopicIds.join(', ')}\n`);
    }
  }

  // Fetch context
  const context = await fetchFullContext();

  // Build prompts
  const systemPrompt = buildBlogSystemPrompt(context);
  const topicPrompt = getBlogTopicPrompt(selectedTopic, context);

  console.log('🤖 Generating blog post with GPT-4o...\n');

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    max_tokens: 3000,
    temperature: 0.8, // Slightly higher for more creative output
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: topicPrompt },
    ],
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    console.error('❌ No response from OpenAI');
    process.exit(1);
  }

  // Log token usage
  const usage = response.usage;
  if (usage) {
    console.log(`   Token usage: ${usage.prompt_tokens} prompt + ${usage.completion_tokens} completion = ${usage.total_tokens} total\n`);
  }

  console.log('📄 Parsing response...\n');

  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    console.error('❌ Could not parse JSON from response');
    console.log('Raw response:', content);
    process.exit(1);
  }

  const parsed = JSON.parse(jsonMatch[0]);

  // Generate slug from title
  const slug = parsed.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 80);

  console.log('━'.repeat(50));
  console.log(`📌 Title: ${parsed.title}`);
  console.log(`🔗 Slug: ${slug}`);
  console.log(`📋 Summary: ${parsed.summary}`);
  console.log(`🏷️  Tags: ${parsed.tags?.join(', ')}`);
  console.log(`👥 Target: ${parsed.target_audience || 'general'}`);
  console.log(`🎣 Hook: ${parsed.hook_type || 'unknown'}`);
  console.log('━'.repeat(50) + '\n');

  // Verify content accuracy
  const verification = verifyBlogContent(parsed.body_html, context.restaurants);
  console.log(formatVerificationResult(verification));

  if (!verification.passed) {
    console.log('\n⚠️  Content did not pass verification (accuracy < 98% or has errors)');
    console.log('   Publishing anyway for review, but consider regenerating.\n');
  }

  // Extract real restaurant images for cover
  console.log('📸 Extracting restaurant images for cover...');
  const coverImageData = buildCoverImageData(parsed.body_html, context.restaurants);
  const coverImageUrl = coverImageData.images[0] || null;
  console.log(`   ✓ Found ${coverImageData.images.length} restaurant images (${coverImageData.type} layout)\n`);

  console.log('💾 Publishing to Supabase...\n');

  const { error: upsertErr } = await supabase.from('blog_posts').upsert(
    {
      slug,
      title: parsed.title,
      summary: parsed.summary,
      body_html: parsed.body_html,
      tags: parsed.tags || ['lancaster', 'tastelanc', 'rosie'],
      cover_image_url: coverImageUrl,
      cover_image_data: coverImageData.images.length > 0 ? JSON.stringify(coverImageData) : null,
      created_at: new Date().toISOString(),
    },
    { onConflict: 'slug' }
  );

  if (upsertErr) {
    console.error('❌ Error publishing:', upsertErr);
    process.exit(1);
  }

  console.log('━'.repeat(50));
  console.log('✅ BLOG POST PUBLISHED SUCCESSFULLY!');
  console.log('━'.repeat(50));
  console.log(`\n🔗 View at: http://localhost:3001/blog/${slug}\n`);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
