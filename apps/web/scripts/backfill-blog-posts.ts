/**
 * Blog Backfill Script
 *
 * Generates blog posts for a date range with backdated timestamps.
 * Run with: npx tsx scripts/backfill-blog-posts.ts
 *
 * This will generate posts for Dec 2-13, 2024 with appropriate dates.
 */
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';
import {
  buildBlogSystemPrompt,
  BLOG_TOPICS,
  type BlogContext,
} from '../lib/rosie/blog-system-prompt';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Date range to backfill (Dec 2-13, 2024)
const START_DATE = new Date('2024-12-02');
const END_DATE = new Date('2024-12-13');

// Generate dates to backfill
function getDatesToBackfill(): Date[] {
  const dates: Date[] = [];
  const current = new Date(START_DATE);
  while (current <= END_DATE) {
    dates.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }
  return dates;
}

// Get day of year for topic selection
function getDayOfYear(date: Date): number {
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date.getTime() - start.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

// Get season for date
function getSeason(date: Date): string {
  const month = date.getMonth();
  if (month >= 2 && month <= 4) return 'spring';
  if (month >= 5 && month <= 7) return 'summer';
  if (month >= 8 && month <= 10) return 'fall';
  return 'winter';
}

async function fetchFullContext(): Promise<BlogContext> {
  // ONLY include restaurants WITH cover images - we need beautiful visuals
  const { data: restaurants } = await supabase
    .from('restaurants')
    .select('name, slug, categories, description, address, city, neighborhood, price_range, signature_dishes, vibe_tags, best_for, parking_info, noise_level, average_rating, cover_image_url')
    .eq('is_active', true)
    .not('cover_image_url', 'is', null)
    .order('name');

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

  const { data: events } = await supabase
    .from('events')
    .select(`
      name,
      event_type,
      performer_name,
      start_date,
      restaurant:restaurants(name, slug)
    `)
    .eq('is_active', true)
    .order('start_date')
    .limit(50);

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

  if (images.length === 0) return { type: 'none', images: [], layout: 'full' };
  if (images.length === 1) return { type: 'single', images, layout: 'full' };
  if (images.length === 2) return { type: 'dual', images, layout: 'split-diagonal' };
  if (images.length === 3) return { type: 'triple', images, layout: 'collage' };
  return { type: 'quad', images: images.slice(0, 4), layout: 'grid' };
}

async function generatePostForDate(date: Date, context: BlogContext): Promise<boolean> {
  // Get topic based on day of year (consistent with production)
  const dayOfYear = getDayOfYear(date);
  const topic = BLOG_TOPICS[dayOfYear % BLOG_TOPICS.length];
  const season = getSeason(date);
  const dateStr = date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const dayOfWeek = date.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();

  console.log(`\n📅 Generating post for ${dateStr}`);
  console.log(`   Topic: ${topic.id}`);

  // Build prompts
  const systemPrompt = buildBlogSystemPrompt(context);

  // Build topic-specific prompt (simplified version)
  const topicPrompts: Record<string, string> = {
    'happy-hour-deep-dive': `Write a deep dive into Lancaster's happy hour scene. Analyze which deals are actually worth it.`,
    'date-night-guide': `Write a date night guide for different vibes - first date vs anniversary, casual vs upscale.`,
    'family-dining': `Write about family dining that doesn't suck. Spots where kids are welcome but food isn't dumbed down.`,
    'tourist-guide': `Write for someone visiting Lancaster from NYC or Philly. What should they NOT miss?`,
    'contrarian-take': `Write a hot take about Lancaster dining. Challenge something locals accept as gospel.`,
    'seasonal-guide': `It's ${season} in Lancaster. Write about what to eat RIGHT NOW that's at peak seasonality.`,
    'late-night-eats': `Write about late-night dining options in Lancaster. Be honest about what's available.`,
    'brunch-battles': `Compare Lancaster's brunch scene. Best bloody mary? Best pancakes? Best for groups?`,
    'neighborhood-spotlight': `Deep dive into a Lancaster neighborhood's food scene. What's the vibe? Best-kept secrets?`,
    'hidden-gems': `Write about underrated spots that locals love but don't get enough attention.`,
    'new-openings': `Write about what's new or coming soon to Lancaster's dining scene.`,
    'app-feature': `Write about how TasteLanc helps solve a real dining problem.`,
    'best-of': `Create an interesting "best of" ranking. Add personality to the rankings.`,
    'weekend-plans': `It's ${dayOfWeek}. Write a weekend dining itinerary for Lancaster.`,
    'budget-eats': `Write about eating well in Lancaster on a budget. Focus on VALUE.`,
    'italian-guide': `Write a guide to Italian food in Lancaster. Best pasta? Best pizza?`,
    'mexican-guide': `Write about Mexican and Latin food in Lancaster. What's authentic vs fusion?`,
    'asian-cuisine': `Write a guide to Asian cuisine in Lancaster. What are the standouts?`,
    'american-comfort': `Write about American comfort food in Lancaster. Best versions of the classics?`,
    'cocktail-bars': `Write about Lancaster's cocktail bar scene. Best bartenders? Best atmospheres?`,
    'coffee-culture': `Write about Lancaster's coffee scene. Independent roasters, best lattes, best vibes.`,
    'beer-scene': `Write about Lancaster's craft beer scene. What styles does Lancaster do well?`,
    'wine-spots': `Write about wine in Lancaster. Wine bars, great wine programs.`,
    'lunch-spots': `Write about lunch in Lancaster. Quick bites, business meals. Best sandwiches?`,
    'breakfast-guide': `Write about breakfast spots in Lancaster. Best eggs? Best pastries?`,
    'dessert-destinations': `Write about desserts in Lancaster. Best cake? Best cookies?`,
    'first-friday': `Write about First Friday dining in Lancaster. Where to eat before, during, and after.`,
    'outdoor-dining': `Write about outdoor dining in Lancaster. Best patios, rooftops, sidewalk spots.`,
    'group-dining': `Write about where to bring a group in Lancaster. Where handles groups well?`,
    'solo-dining': `Write about solo dining in Lancaster. Bar seats, comfortable spots.`,
    'food-trends': `Write about food trends in Lancaster. What's hot? What's overdone?`,
  };

  const topicPrompt = `Today is ${dateStr}. ${topicPrompts[topic.id] || topicPrompts['hidden-gems']}

Use the restaurants, happy hours, events, and specials from your database. Be specific, be opinionated, and make it valuable.`;

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

    // Check for existing slug
    const { data: existing } = await supabase
      .from('blog_posts')
      .select('slug')
      .eq('slug', slug)
      .single();

    if (existing) {
      slug = `${slug}-${date.getDate()}`;
    }

    // Extract cover images
    const coverImageData = buildCoverImageData(parsed.body_html, context.restaurants);
    const coverImageUrl = coverImageData.images[0] || null;

    // Set created_at to the target date (around 10am local time)
    const createdAt = new Date(date);
    createdAt.setHours(10, 0, 0, 0);

    // Publish
    const { error } = await supabase.from('blog_posts').upsert(
      {
        slug,
        title: parsed.title,
        summary: parsed.summary,
        body_html: parsed.body_html,
        tags: parsed.tags || ['lancaster', 'tastelanc', 'rosie'],
        cover_image_url: coverImageUrl,
        cover_image_data: coverImageData.images.length > 0 ? JSON.stringify(coverImageData) : null,
        created_at: createdAt.toISOString(),
      },
      { onConflict: 'slug' }
    );

    if (error) {
      console.log(`   ❌ Error: ${error.message}`);
      return false;
    }

    console.log(`   ✅ Published: "${parsed.title}"`);
    console.log(`   📸 ${coverImageData.images.length} images`);
    return true;
  } catch (err) {
    console.log(`   ❌ Error: ${err instanceof Error ? err.message : 'Unknown'}`);
    return false;
  }
}

async function main() {
  console.log('\n🌹 BLOG BACKFILL SCRIPT');
  console.log('━'.repeat(50));

  const dates = getDatesToBackfill();
  console.log(`📅 Generating ${dates.length} posts (${START_DATE.toLocaleDateString()} - ${END_DATE.toLocaleDateString()})`);

  // Fetch context once
  console.log('\n📊 Fetching database context...');
  const context = await fetchFullContext();
  console.log(`   ✓ ${context.restaurants.length} restaurants`);
  console.log(`   ✓ ${context.happyHours.length} happy hours`);

  let success = 0;
  let failed = 0;

  for (const date of dates) {
    const result = await generatePostForDate(date, context);
    if (result) {
      success++;
    } else {
      failed++;
    }

    // Rate limiting - wait 3 seconds between requests
    if (dates.indexOf(date) < dates.length - 1) {
      console.log('   ⏳ Waiting 3s...');
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
  }

  console.log('\n' + '━'.repeat(50));
  console.log(`✅ BACKFILL COMPLETE`);
  console.log(`   Success: ${success}`);
  console.log(`   Failed: ${failed}`);
  console.log('━'.repeat(50) + '\n');
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
