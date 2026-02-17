import { NextResponse } from 'next/server';
import { createClient as createSupabaseAdmin } from '@supabase/supabase-js';
import OpenAI from 'openai';
import { Resend } from 'resend';
import { MARKET_SLUG, BRAND, getMarketConfig, type MarketBrand } from '@/config/market';
import { getMarketKnowledge } from '@/config/market-knowledge';
import {
  buildBlogSystemPrompt,
  getBlogTopicPrompt,
  BLOG_TOPICS,
  type BlogContext,
} from '@/lib/rosie/blog-system-prompt';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

const resend = new Resend(process.env.RESEND_API_KEY);

// ─────────────────────────────────────────────────────────
// HOLIDAY CONTEXT
// ─────────────────────────────────────────────────────────

function getHolidayContext(brand: MarketBrand): { name: string; prompt: string } | null {
  const now = new Date();
  const month = now.getMonth();
  const day = now.getDate();
  const dayOfWeek = now.getDay();

  if (month === 11 && day === 31) return { name: "New Year's Eve", prompt: `It's New Year's Eve! Consider how ${brand.countyShort} restaurants celebrate tonight - special prix fixe menus, champagne toasts, countdown parties, late-night dining.` };
  if (month === 0 && day === 1) return { name: "New Year's Day", prompt: `Happy New Year! Consider recovery brunch spots, comfort food for the first day of the year.` };
  if (month === 1 && (day === 13 || day === 14)) return { name: day === 14 ? "Valentine's Day" : "Valentine's Day Eve", prompt: `It's ${day === 14 ? "Valentine's Day" : "almost Valentine's Day"}! Focus on romantic dining - intimate spots, special tasting menus, best date night restaurants.` };
  if (month === 2 && day === 17) return { name: "St. Patrick's Day", prompt: `Happy St. Patrick's Day! Where to find the best Irish fare, green beer, corned beef and celebrations.` };
  if (month === 4 && day === 5) return { name: "Cinco de Mayo", prompt: `It's Cinco de Mayo! Best Mexican restaurants, margarita specials, taco deals.` };
  if (month === 4 && dayOfWeek === 0 && day >= 8 && day <= 14) return { name: "Mother's Day", prompt: `Happy Mother's Day! Focus on brunch spots perfect for treating mom, special menus, family-friendly fine dining.` };
  if (month === 4 && dayOfWeek === 1 && day >= 25) return { name: "Memorial Day", prompt: `Happy Memorial Day! Kick off summer with outdoor dining, BBQ spots, patios opening for the season.` };
  if (month === 5 && dayOfWeek === 0 && day >= 15 && day <= 21) return { name: "Father's Day", prompt: `Happy Father's Day! Steakhouses, BBQ joints, sports bars, restaurants with great whiskey selections.` };
  if (month === 6 && day === 4) return { name: "Independence Day", prompt: `Happy 4th of July! BBQ, outdoor dining, rooftop spots, patriotic specials.` };
  if (month === 8 && dayOfWeek === 1 && day <= 7) return { name: "Labor Day", prompt: `Happy Labor Day! Last hurrah of summer - outdoor dining, end-of-summer specials.` };
  if (month === 9 && day === 31) return { name: "Halloween", prompt: `Happy Halloween! Spooky-themed cocktails, costume-friendly spots, late-night dining.` };
  if (month === 10 && dayOfWeek === 4 && day >= 22 && day <= 28) return { name: "Thanksgiving", prompt: `Happy Thanksgiving! Restaurants serving Thanksgiving dinner, places to dine if you're not cooking.` };
  if (month === 11 && day === 24) return { name: "Christmas Eve", prompt: `It's Christmas Eve! Restaurants open tonight, special holiday menus, cozy spots for a festive dinner.` };
  if (month === 11 && day === 25) return { name: "Christmas Day", prompt: `Merry Christmas! What's open today? Hotel restaurants, Chinese restaurants, and spots serving Christmas dinner.` };

  return null;
}

// ─────────────────────────────────────────────────────────
// COVER IMAGE HELPERS
// ─────────────────────────────────────────────────────────

interface CoverImageData {
  type: 'single' | 'dual' | 'triple' | 'quad' | 'none';
  images: string[];
  layout: 'full' | 'split-diagonal' | 'split-vertical' | 'grid' | 'collage';
}

/**
 * Fetch cover images from recent blog posts to avoid duplication.
 * Returns a set of image URLs that should NOT be reused.
 */
async function fetchRecentCoverImages(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  limit = 15
): Promise<Set<string>> {
  const { data } = await supabase
    .from('blog_posts')
    .select('cover_image_url')
    .not('cover_image_url', 'is', null)
    .order('created_at', { ascending: false })
    .limit(limit) as { data: Array<{ cover_image_url: string }> | null };

  return new Set((data || []).map((p: { cover_image_url: string }) => p.cover_image_url).filter(Boolean));
}

/**
 * Fetch recently featured restaurant slugs to encourage diversity.
 */
async function fetchRecentlyFeaturedRestaurants(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  limit = 10
): Promise<Set<string>> {
  const { data } = await supabase
    .from('blog_posts')
    .select('featured_restaurants')
    .not('featured_restaurants', 'is', null)
    .order('created_at', { ascending: false })
    .limit(limit) as { data: Array<{ featured_restaurants: string[] }> | null };

  const slugs = new Set<string>();
  (data || []).forEach((post: { featured_restaurants: string[] }) => {
    (post.featured_restaurants || []).forEach((slug: string) => slugs.add(slug));
  });
  return slugs;
}

/**
 * Extract unique cover images from blog HTML, excluding recently used ones.
 * Returns up to 4 images for multi-image layouts.
 */
function extractFeaturedImages(
  bodyHtml: string,
  restaurantData: Array<{ slug: string; coverImageUrl: string | null }>,
  excludeUrls: Set<string>
): string[] {
  const restaurantMap = new Map(
    restaurantData
      .filter(r => r.coverImageUrl)
      .map(r => [r.slug, r.coverImageUrl!])
  );

  const linkRegex = /href="\/restaurants\/([^"]+)"/g;
  const images: string[] = [];
  const seenSlugs = new Set<string>();
  let match;

  while ((match = linkRegex.exec(bodyHtml)) !== null && images.length < 4) {
    const slug = match[1];
    const imageUrl = restaurantMap.get(slug);
    if (!seenSlugs.has(slug) && imageUrl && !excludeUrls.has(imageUrl)) {
      seenSlugs.add(slug);
      images.push(imageUrl);
    }
  }

  // If no unique images found, fall back to any available (don't return empty)
  if (images.length === 0) {
    linkRegex.lastIndex = 0;
    while ((match = linkRegex.exec(bodyHtml)) !== null) {
      const slug = match[1];
      const imageUrl = restaurantMap.get(slug);
      if (imageUrl && !images.includes(imageUrl)) {
        images.push(imageUrl);
        break;
      }
    }
  }

  return images;
}

function buildCoverImageData(images: string[]): CoverImageData {
  if (images.length === 0) return { type: 'none', images: [], layout: 'full' };
  if (images.length === 1) return { type: 'single', images, layout: 'full' };
  if (images.length === 2) return { type: 'dual', images, layout: 'split-diagonal' };
  if (images.length === 3) return { type: 'triple', images, layout: 'collage' };
  return { type: 'quad', images: images.slice(0, 4), layout: 'grid' };
}

/**
 * Generate a cover image using DALL-E 3 and upload to Supabase Storage.
 * Returns the public URL of the generated image.
 */
async function generateFallbackCoverImage(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  title: string
): Promise<string | null> {
  try {
    const prompt = `A beautiful, appetizing food photography scene for a blog post titled "${title}". Warm lighting, shallow depth of field, elegant plating on a dark wood table. No text or words in the image. Professional food magazine quality. Moody, atmospheric, shot from above at a 45-degree angle.`;

    const response = await openai.images.generate({
      model: 'dall-e-3',
      prompt,
      n: 1,
      size: '1792x1024',
      quality: 'standard',
    });

    const imageUrl = response.data?.[0]?.url;
    if (!imageUrl) return null;

    // Download the image
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) return null;
    const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());

    // Upload to Supabase Storage
    const fileName = `blog-covers/${Date.now()}-generated.png`;
    const { error: uploadError } = await supabase.storage
      .from('images')
      .upload(fileName, imageBuffer, {
        contentType: 'image/png',
        upsert: false,
      });

    if (uploadError) {
      console.error('Failed to upload generated image:', uploadError);
      return null;
    }

    const { data: publicUrl } = supabase.storage
      .from('images')
      .getPublicUrl(fileName);

    console.log(`Generated fallback cover image: ${publicUrl.publicUrl}`);
    return publicUrl.publicUrl;
  } catch (error) {
    console.error('DALL-E image generation failed:', error);
    return null;
  }
}

// ─────────────────────────────────────────────────────────
// FULL CONTEXT FETCHER
// ─────────────────────────────────────────────────────────

async function fetchBlogContext(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  marketId: string
): Promise<BlogContext & { restaurantData: Array<{ slug: string; coverImageUrl: string | null }> }> {
  // Fetch restaurants with enrichment fields + cover images
  const { data: restaurants } = await supabase
    .from('restaurants')
    .select('name, slug, categories, description, address, city, neighborhood, price_range, signature_dishes, vibe_tags, best_for, parking_info, noise_level, average_rating, cover_image_url')
    .eq('market_id', marketId)
    .eq('is_active', true)
    .not('cover_image_url', 'is', null)
    .order('name');

  // Fetch happy hours with items
  const { data: happyHours } = await supabase
    .from('happy_hours')
    .select(`
      name, days_of_week, start_time, end_time,
      restaurant:restaurants!inner(name, slug),
      happy_hour_items(name, discounted_price)
    `)
    .eq('restaurant.market_id', marketId)
    .eq('is_active', true);

  // Fetch upcoming events
  const { data: events } = await supabase
    .from('events')
    .select(`
      name, event_type, performer_name, start_date,
      restaurant:restaurants!inner(name, slug)
    `)
    .eq('restaurant.market_id', marketId)
    .eq('is_active', true)
    .gte('start_date', new Date().toISOString())
    .order('start_date')
    .limit(50);

  // Fetch specials
  const { data: specials } = await supabase
    .from('specials')
    .select(`
      name, description, discount_description,
      restaurant:restaurants!inner(name, slug)
    `)
    .eq('restaurant.market_id', marketId)
    .eq('is_active', true);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const restaurantRows = (restaurants || []) as any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const happyHourRows = (happyHours || []) as any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const eventRows = (events || []) as any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const specialRows = (specials || []) as any[];

  const mappedRestaurants = restaurantRows.map(r => ({
    name: r.name as string,
    slug: r.slug as string,
    categories: (r.categories || []) as string[],
    description: r.description as string | undefined,
    address: r.address as string | undefined,
    city: r.city as string | undefined,
    neighborhood: r.neighborhood as string | undefined,
    priceRange: r.price_range as string | undefined,
    signatureDishes: r.signature_dishes as string[] | undefined,
    vibeTags: r.vibe_tags as string[] | undefined,
    bestFor: r.best_for as string[] | undefined,
    parkingInfo: r.parking_info as string | undefined,
    noiseLevel: r.noise_level as string | undefined,
    averageRating: r.average_rating as number | undefined,
    coverImageUrl: r.cover_image_url as string | undefined,
  }));

  return {
    restaurants: mappedRestaurants,
    happyHours: happyHourRows.map(hh => ({
      restaurantName: hh.restaurant?.name || 'Unknown',
      restaurantSlug: hh.restaurant?.slug || '',
      name: hh.name,
      daysOfWeek: hh.days_of_week || [],
      startTime: hh.start_time,
      endTime: hh.end_time,
      items: (hh.happy_hour_items || []).map((i: { name: string; discounted_price?: number }) => ({
        name: i.name,
        discountedPrice: i.discounted_price,
      })),
    })),
    events: eventRows.map(e => ({
      restaurantName: e.restaurant?.name || 'Unknown',
      restaurantSlug: e.restaurant?.slug || '',
      name: e.name,
      eventType: e.event_type,
      performerName: e.performer_name,
      startDate: e.start_date,
    })),
    specials: specialRows.map(s => ({
      restaurantName: s.restaurant?.name || 'Unknown',
      restaurantSlug: s.restaurant?.slug || '',
      name: s.name,
      description: s.description,
      discountDescription: s.discount_description,
    })),
    restaurantData: restaurantRows.map(r => ({
      slug: r.slug as string,
      coverImageUrl: r.cover_image_url as string | null,
    })),
  };
}

// ─────────────────────────────────────────────────────────
// FAILURE NOTIFICATION
// ─────────────────────────────────────────────────────────

async function sendFailureNotification(error: string, scheduledFor: Date, brand: MarketBrand): Promise<void> {
  const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL || 'admin@tastelanc.com';
  try {
    await resend.emails.send({
      from: `${brand.name} <alerts@${brand.domain}>`,
      to: adminEmail,
      subject: `[${brand.name}] Blog Pre-Generation Failed - Action Required`,
      html: `<h2>${brand.name} Blog Pre-Generation Failed</h2>
        <p><strong>Market:</strong> ${brand.county}</p>
        <p><strong>Scheduled:</strong> ${scheduledFor.toLocaleString('en-US', { timeZone: 'America/New_York' })} EST</p>
        <p><strong>Error:</strong></p><pre>${error}</pre>
        <p>Please manually generate at <a href="https://${brand.domain}/admin">admin panel</a></p>`,
    });
  } catch (e) {
    console.error('Failed to send notification:', e);
  }
}

// ─────────────────────────────────────────────────────────
// MAIN HANDLER
// ─────────────────────────────────────────────────────────

export async function POST(request: Request) {
  console.log('Blog pre-generation started');

  try {
    const body = await request.json().catch(() => ({}));
    const isPgCron = (body as { source?: string }).source === 'pg_cron';
    const authHeader = request.headers.get('Authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}` && !isPgCron) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!process.env.OPENAI_API_KEY || !process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Missing required environment variables');
    }

    // Resolve market from body param or env var
    const marketSlug = (body as { market_slug?: string }).market_slug || MARKET_SLUG;
    const brand = getMarketConfig(marketSlug) || BRAND;
    const knowledge = getMarketKnowledge(marketSlug);

    const supabase = createSupabaseAdmin(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

    // Resolve market ID from database
    const { data: marketRow, error: marketErr } = await supabase
      .from('markets')
      .select('id')
      .eq('slug', marketSlug)
      .eq('is_active', true)
      .single();
    if (marketErr || !marketRow) throw new Error(`Market "${marketSlug}" not found or inactive`);
    const marketId = marketRow.id;

    console.log(`Generating for market: ${brand.name} (${marketSlug})`);

    // Calculate publish time (6 AM EST = 11 AM UTC)
    const publishAt = new Date();
    publishAt.setUTCHours(11, 0, 0, 0);
    if (publishAt.getTime() <= Date.now()) publishAt.setDate(publishAt.getDate() + 1);

    // Check for existing draft
    const { data: existingDraft } = await supabase
      .from('blog_posts')
      .select('slug, title')
      .eq('market_id', marketId)
      .eq('status', 'scheduled')
      .gte('scheduled_publish_at', new Date(publishAt.getTime() - 3600000).toISOString())
      .lte('scheduled_publish_at', new Date(publishAt.getTime() + 3600000).toISOString())
      .limit(1);

    if (existingDraft?.length) {
      return NextResponse.json({ success: true, skipped: true, existingDraft: existingDraft[0].slug });
    }

    // Fetch full context (restaurants, happy hours, events, specials)
    const context = await fetchBlogContext(supabase, marketId);
    if (!context.restaurants.length) throw new Error('No restaurants found');

    console.log(`Context: ${context.restaurants.length} restaurants, ${context.happyHours.length} happy hours, ${context.events.length} events, ${context.specials.length} specials`);

    // Fetch recent cover images to exclude (last 15 posts)
    const recentCoverImages = await fetchRecentCoverImages(supabase, 15);
    console.log(`Excluding ${recentCoverImages.size} recent cover images`);

    // Fetch recently featured restaurants for prompt diversity
    const recentlyFeatured = await fetchRecentlyFeaturedRestaurants(supabase, 10);
    console.log(`${recentlyFeatured.size} recently featured restaurants`);

    // Build system prompt with recently featured exclusion + market overrides
    const systemPrompt = buildBlogSystemPrompt(context, recentlyFeatured, brand, knowledge);

    // Pick topic
    const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
    const topicIndex = dayOfYear % BLOG_TOPICS.length;
    const topic = BLOG_TOPICS[topicIndex];

    // Build user prompt — holiday-aware
    const holidayContext = getHolidayContext(brand);
    let userPrompt: string;

    if (holidayContext) {
      const dateStr = publishAt.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
      userPrompt = `Post for ${dateStr}.\n\n${holidayContext.prompt}\n\nWhile keeping the holiday theme central, you can also incorporate elements from this topic if relevant: ${getBlogTopicPrompt(topic.id, context, brand)}\n\nBe specific and opinionated.`;
      console.log(`Holiday detected: ${holidayContext.name}`);
    } else {
      userPrompt = getBlogTopicPrompt(topic.id, context, brand);
    }

    console.log(`Generating blog for topic: ${topic.id}`);

    // Generate
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
    if (!content) throw new Error('No response from OpenAI');

    if (response.usage) {
      console.log(`Token usage: ${response.usage.total_tokens} total`);
    }

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('Could not parse JSON');

    const parsed = JSON.parse(jsonMatch[0]);

    let slug = parsed.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').substring(0, 80);
    const { data: existing } = await supabase.from('blog_posts').select('slug').eq('slug', slug).single();
    if (existing) slug = `${slug}-${Date.now()}`;

    // Extract cover images with deduplication
    const coverImages = extractFeaturedImages(parsed.body_html, context.restaurantData, recentCoverImages);
    let coverImageUrl = coverImages[0] || null;

    // If NO unique cover image found, generate one with DALL-E
    if (!coverImageUrl) {
      console.log('No unique restaurant cover image available, generating with DALL-E...');
      coverImageUrl = await generateFallbackCoverImage(supabase, parsed.title);
    }

    const coverData = buildCoverImageData(coverImages.length > 0 ? coverImages : (coverImageUrl ? [coverImageUrl] : []));

    // Extract featured restaurant slugs
    const linkRegex = /href="\/restaurants\/([^"]+)"/g;
    const matches = Array.from(parsed.body_html.matchAll(linkRegex) as Iterable<RegExpMatchArray>);
    const featuredRestaurants = Array.from(new Set(matches.map(m => m[1])));

    console.log(`Cover: ${coverData.type} layout, ${coverData.images.length} images`);
    console.log(`Featured: ${featuredRestaurants.length} restaurants`);

    // Save as scheduled draft
    const { error: insertErr } = await supabase.from('blog_posts').insert({
      slug,
      title: parsed.title,
      summary: parsed.summary,
      body_html: parsed.body_html,
      tags: parsed.tags || [brand.countyShort.toLowerCase(), brand.name.toLowerCase()],
      cover_image_url: coverImageUrl,
      cover_image_data: coverData.images.length > 0 ? JSON.stringify(coverData) : null,
      featured_restaurants: featuredRestaurants.length ? featuredRestaurants : null,
      market_id: marketId,
      status: 'scheduled',
      scheduled_publish_at: publishAt.toISOString(),
    });

    if (insertErr) throw new Error(insertErr.message);

    console.log(`Draft created: "${parsed.title}" for ${publishAt.toISOString()}`);
    return NextResponse.json({
      success: true,
      draft: {
        slug,
        title: parsed.title,
        scheduledFor: publishAt.toISOString(),
        coverLayout: coverData.type,
        imageCount: coverData.images.length,
        featuredRestaurantCount: featuredRestaurants.length,
      },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Pre-generation failed:', errorMessage);

    try {
      const supabase = createSupabaseAdmin(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
      const publishAt = new Date();
      publishAt.setUTCHours(11, 0, 0, 0);
      if (publishAt.getTime() <= Date.now()) publishAt.setDate(publishAt.getDate() + 1);

      await supabase.from('blog_generation_failures').insert({ scheduled_for: publishAt.toISOString(), error_message: errorMessage });
      await sendFailureNotification(errorMessage, publishAt, BRAND);
    } catch (e) {
      console.error('Failed to record failure:', e);
    }

    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
