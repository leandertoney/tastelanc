/**
 * Generate Blog Posts with Unique Images
 *
 * Ensures no restaurant image is used more than once across all blog posts.
 * Run with: npx tsx scripts/generate-unique-blogs.ts [count]
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

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// How many posts to generate (default 7)
const POST_COUNT = parseInt(process.argv[2] || '7', 10);

// Topics to use - spread across different categories to minimize overlap
const DIVERSE_TOPICS: BlogTopicId[] = [
  'hidden-gems',
  'brunch-battles',
  'italian-guide',
  'coffee-culture',
  'date-night-guide',
  'mexican-guide',
  'beer-scene',
  'budget-eats',
  'asian-cuisine',
  'dessert-destinations',
  'cocktail-bars',
  'breakfast-guide',
];

// Track globally used images
const usedImageUrls = new Set<string>();
const usedRestaurantSlugs = new Set<string>();

async function fetchFullContext(): Promise<BlogContext> {
  // Get restaurants with images, excluding already used ones
  const { data: restaurants } = await supabase
    .from('restaurants')
    .select('name, slug, categories, description, address, city, neighborhood, price_range, signature_dishes, vibe_tags, best_for, parking_info, noise_level, average_rating, cover_image_url')
    .eq('is_active', true)
    .not('cover_image_url', 'is', null)
    .order('name');

  // Filter out restaurants whose images we've already used
  const availableRestaurants = (restaurants || []).filter(r => {
    return !usedImageUrls.has(r.cover_image_url) && !usedRestaurantSlugs.has(r.slug);
  });

  console.log(`   Available restaurants: ${availableRestaurants.length} (${usedRestaurantSlugs.size} already used)`);

  const { data: happyHours } = await supabase
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

  const { data: specials } = await supabase
    .from('specials')
    .select(`
      name,
      description,
      discount_description,
      restaurant:restaurants(name, slug)
    `)
    .eq('is_active', true);

  return {
    restaurants: availableRestaurants.map((r) => ({
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
    events: [],
    specials: (specials || []).map((s) => ({
      restaurantName: (s.restaurant as { name: string; slug: string })?.name || 'Unknown',
      restaurantSlug: (s.restaurant as { name: string; slug: string })?.slug || '',
      name: s.name,
      description: s.description,
      discountDescription: s.discount_description,
    })),
  };
}

function extractRestaurantSlugsFromHtml(html: string): string[] {
  const slugs: string[] = [];
  const linkRegex = /href="\/restaurants\/([^"]+)"/g;
  let match;
  while ((match = linkRegex.exec(html)) !== null) {
    if (!slugs.includes(match[1])) {
      slugs.push(match[1]);
    }
  }
  return slugs;
}

interface CoverImageData {
  type: 'single' | 'dual' | 'triple' | 'quad' | 'none';
  images: string[];
  layout: 'full' | 'split-diagonal' | 'split-vertical' | 'grid' | 'collage';
}

function buildCoverImageData(bodyHtml: string, restaurants: BlogContext['restaurants']): CoverImageData {
  const images: string[] = [];
  const restaurantMap = new Map(
    restaurants
      .filter(r => r.coverImageUrl && !usedImageUrls.has(r.coverImageUrl))
      .map(r => [r.slug, { url: r.coverImageUrl!, slug: r.slug }])
  );

  const linkRegex = /href="\/restaurants\/([^"]+)"/g;
  let match;
  const seenSlugs = new Set<string>();

  while ((match = linkRegex.exec(bodyHtml)) !== null && images.length < 4) {
    const slug = match[1];
    if (!seenSlugs.has(slug) && restaurantMap.has(slug)) {
      seenSlugs.add(slug);
      const { url } = restaurantMap.get(slug)!;
      images.push(url);
      // Mark as used globally
      usedImageUrls.add(url);
      usedRestaurantSlugs.add(slug);
    }
  }

  if (images.length === 0) return { type: 'none', images: [], layout: 'full' };
  if (images.length === 1) return { type: 'single', images, layout: 'full' };
  if (images.length === 2) return { type: 'dual', images, layout: 'split-diagonal' };
  if (images.length === 3) return { type: 'triple', images, layout: 'collage' };
  return { type: 'quad', images: images.slice(0, 4), layout: 'grid' };
}

async function generatePost(topic: BlogTopicId, postNumber: number): Promise<boolean> {
  console.log(`\n📝 Post ${postNumber}: ${topic}`);

  // Fetch fresh context (excludes used restaurants)
  const context = await fetchFullContext();

  if (context.restaurants.length < 10) {
    console.log('   ⚠️ Not enough unique restaurants left, skipping');
    return false;
  }

  const systemPrompt = buildBlogSystemPrompt(context);
  const topicPrompt = getBlogTopicPrompt(topic, context);

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      max_tokens: 3000,
      temperature: 0.8,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: topicPrompt },
      ],
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      console.log('   ❌ No response from OpenAI');
      return false;
    }

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.log('   ❌ Could not parse JSON');
      return false;
    }

    const parsed = JSON.parse(jsonMatch[0]);

    // Generate slug
    let slug = parsed.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .substring(0, 80);

    // Check for existing
    const { data: existing } = await supabase
      .from('blog_posts')
      .select('slug')
      .eq('slug', slug)
      .single();

    if (existing) {
      slug = `${slug}-${Date.now()}`;
    }

    // Build cover image data (marks images as used)
    const coverImageData = buildCoverImageData(parsed.body_html, context.restaurants);
    const coverImageUrl = coverImageData.images[0] || null;

    if (!coverImageUrl) {
      console.log('   ❌ No cover image available');
      return false;
    }

    // Spread dates across December 2025 (Dec 1-12)
    const baseDate = new Date('2025-12-01T10:00:00-05:00'); // 10 AM Eastern
    baseDate.setDate(baseDate.getDate() + (postNumber - 1));

    const { error } = await supabase.from('blog_posts').upsert(
      {
        slug,
        title: parsed.title,
        summary: parsed.summary,
        body_html: parsed.body_html,
        tags: parsed.tags || ['lancaster', 'tastelanc', 'rosie'],
        cover_image_url: coverImageUrl,
        cover_image_data: JSON.stringify(coverImageData),
        created_at: baseDate.toISOString(),
      },
      { onConflict: 'slug' }
    );

    if (error) {
      console.log(`   ❌ Error: ${error.message}`);
      return false;
    }

    console.log(`   ✅ "${parsed.title}"`);
    console.log(`   📸 ${coverImageData.images.length} unique images`);
    console.log(`   📅 ${baseDate.toLocaleDateString('en-US', { timeZone: 'America/New_York' })}`);
    return true;
  } catch (err) {
    console.log(`   ❌ Error: ${err instanceof Error ? err.message : 'Unknown'}`);
    return false;
  }
}

async function main() {
  console.log('\n🌹 UNIQUE BLOG GENERATOR');
  console.log('━'.repeat(50));
  console.log(`Generating ${POST_COUNT} posts with unique images\n`);

  // First, clear existing posts
  console.log('🗑️ Clearing existing posts...');
  const { error: deleteError } = await supabase
    .from('blog_posts')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

  if (deleteError) {
    console.error('Delete error:', deleteError);
  } else {
    console.log('   ✓ Cleared all posts\n');
  }

  let success = 0;
  let failed = 0;

  for (let i = 0; i < POST_COUNT && i < DIVERSE_TOPICS.length; i++) {
    const topic = DIVERSE_TOPICS[i];
    const result = await generatePost(topic, i + 1);

    if (result) {
      success++;
    } else {
      failed++;
    }

    // Rate limit
    if (i < POST_COUNT - 1) {
      console.log('   ⏳ Waiting 3s...');
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
  }

  console.log('\n' + '━'.repeat(50));
  console.log('✅ GENERATION COMPLETE');
  console.log(`   Success: ${success}`);
  console.log(`   Failed: ${failed}`);
  console.log(`   Unique images used: ${usedImageUrls.size}`);
  console.log('━'.repeat(50) + '\n');
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
