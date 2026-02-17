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
// SLUG AUTO-CORRECTION
// ─────────────────────────────────────────────────────────

/**
 * Auto-correct restaurant slugs in generated HTML.
 * AI often hallucinates slightly wrong slugs (apostrophes, extra hyphens, etc).
 * This fixes near-misses by matching to the closest valid slug.
 */
function autoCorrectSlugs(bodyHtml: string, validSlugs: Set<string>): string {
  const linkRegex = /href="\/restaurants\/([^"]+)"/g;

  return bodyHtml.replace(linkRegex, (fullMatch, slug) => {
    if (validSlugs.has(slug)) return fullMatch; // Already correct

    // Normalize: strip apostrophes, collapse hyphens, lowercase
    const normalize = (s: string) => s.toLowerCase().replace(/['']/g, '').replace(/-+/g, '-').replace(/^-|-$/g, '');
    const normalizedSlug = normalize(slug);

    // Try exact normalized match
    const validArray = Array.from(validSlugs);
    for (const valid of validArray) {
      if (normalize(valid) === normalizedSlug) {
        console.log(`Slug auto-corrected: "${slug}" → "${valid}"`);
        return `href="/restaurants/${valid}"`;
      }
    }

    // Try Levenshtein-like fuzzy match (max 2 char difference)
    let bestMatch: string | null = null;
    let bestDist = 3; // max allowed distance
    for (const valid of validArray) {
      const dist = simpleEditDistance(normalizedSlug, normalize(valid));
      if (dist < bestDist) {
        bestDist = dist;
        bestMatch = valid;
      }
    }

    if (bestMatch) {
      console.log(`Slug fuzzy-corrected: "${slug}" → "${bestMatch}" (distance: ${bestDist})`);
      return `href="/restaurants/${bestMatch}"`;
    }

    return fullMatch; // Leave as-is if no match found
  });
}

/** Simple edit distance (Levenshtein) — only computed for short strings (slugs). */
function simpleEditDistance(a: string, b: string): number {
  if (Math.abs(a.length - b.length) > 3) return 999; // Quick bail for very different lengths
  const matrix: number[][] = [];
  for (let i = 0; i <= a.length; i++) {
    matrix[i] = [i];
    for (let j = 1; j <= b.length; j++) {
      if (i === 0) { matrix[i][j] = j; continue; }
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    }
  }
  return matrix[a.length][b.length];
}

// ─────────────────────────────────────────────────────────
// AUTOMATED REVIEW AGENT
// ─────────────────────────────────────────────────────────

interface ReviewResult {
  passed: boolean;
  score: number; // 1-10
  issues: string[];
  aiVerdict?: string;
}

/**
 * Programmatic quality gates — fast checks with zero API cost.
 */
function runProgrammaticChecks(
  parsed: { title: string; summary: string; body_html: string; tags?: string[] },
  brand: MarketBrand,
  restaurantSlugs: Set<string>,
): { passed: boolean; issues: string[] } {
  const issues: string[] = [];

  // Word count (strip HTML tags)
  const textOnly = parsed.body_html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  const wordCount = textOnly.split(/\s+/).length;
  if (wordCount < 400) issues.push(`Too short: ${wordCount} words (minimum 400)`);
  if (wordCount > 1500) issues.push(`Too long: ${wordCount} words (maximum 1500)`);

  // Restaurant links
  const linkRegex = /href="\/restaurants\/([^"]+)"/g;
  const links = Array.from(parsed.body_html.matchAll(linkRegex));
  const uniqueLinkedSlugs = new Set(links.map(m => m[1]));
  if (uniqueLinkedSlugs.size < 2) issues.push(`Only ${uniqueLinkedSlugs.size} restaurant links (minimum 2)`);

  // Verify linked restaurants actually exist in this market
  const invalidSlugs = Array.from(uniqueLinkedSlugs).filter(s => !restaurantSlugs.has(s));
  if (invalidSlugs.length > 0) issues.push(`Links to non-existent restaurants: ${invalidSlugs.join(', ')}`);

  // Valid HTML structure
  if (!parsed.body_html.includes('<h2')) issues.push('Missing <h2> section headers');
  if (!parsed.body_html.includes('<p')) issues.push('Missing <p> paragraph tags');

  // Summary length
  if (!parsed.summary || parsed.summary.length < 50) issues.push(`Summary too short: ${parsed.summary?.length || 0} chars`);
  if (parsed.summary && parsed.summary.length > 250) issues.push(`Summary too long: ${parsed.summary.length} chars`);

  // Title check
  if (!parsed.title || parsed.title.length < 10) issues.push('Title too short');
  if (parsed.title && parsed.title.length > 120) issues.push('Title too long');

  // Cross-market contamination: check the other market's name doesn't appear
  const otherMarkets = brand.name === 'TasteLanc'
    ? ['TasteCumberland', 'Mollie', 'Cumberland County']
    : ['TasteLanc', 'Rosie', 'Lancaster County'];
  for (const term of otherMarkets) {
    if (parsed.body_html.includes(term) || parsed.title.includes(term)) {
      issues.push(`Cross-market contamination: mentions "${term}"`);
    }
  }

  // Must include tags
  if (!parsed.tags || parsed.tags.length === 0) issues.push('No tags provided');

  return { passed: issues.length === 0, issues };
}

/**
 * AI quality review — uses gpt-4o-mini for cost-effective evaluation.
 * Checks voice, quality, market accuracy, and actionability.
 */
async function runAIReview(
  parsed: { title: string; summary: string; body_html: string },
  brand: MarketBrand,
): Promise<{ score: number; verdict: string; issues: string[] }> {
  try {
    const reviewPrompt = `You are a blog editor reviewing a post written by ${brand.aiName}, the AI food personality for ${brand.name} (${brand.county}, ${brand.state}).

Review this blog post and rate it 1-10 on these criteria:

1. **Voice** (Is it ${brand.aiName}'s voice? Confident, warm, opinionated, not generic?)
2. **Market accuracy** (Does it reference ${brand.countyShort} restaurants, neighborhoods, and culture correctly? No mentions of wrong markets?)
3. **Engagement** (Does it have a strong hook? Is it interesting to read, not boring listicle filler?)
4. **Actionability** (Does it give readers specific things to DO — places to go, dishes to order, times to visit?)
5. **Quality** (Good writing? Proper structure? No repetitive filler? Reads like a real food blogger, not AI slop?)

TITLE: ${parsed.title}
SUMMARY: ${parsed.summary}
BODY:
${parsed.body_html.substring(0, 4000)}

Respond with JSON only:
{"score": <1-10>, "verdict": "<1 sentence overall assessment>", "issues": ["<issue 1>", "<issue 2>"]}

A score of 7+ means publish-ready. Below 7 means it needs revision.`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      max_tokens: 500,
      temperature: 0.2,
      messages: [{ role: 'user', content: reviewPrompt }],
    });

    const content = response.choices[0]?.message?.content;
    if (!content) return { score: 7, verdict: 'Review unavailable', issues: [] };

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return { score: 7, verdict: 'Could not parse review', issues: [] };

    const result = JSON.parse(jsonMatch[0]);
    return {
      score: Math.min(10, Math.max(1, Number(result.score) || 7)),
      verdict: result.verdict || 'No verdict',
      issues: Array.isArray(result.issues) ? result.issues : [],
    };
  } catch (error) {
    console.error('AI review failed:', error);
    // If review fails, don't block publishing — assume it's fine
    return { score: 7, verdict: 'Review failed, defaulting to pass', issues: [] };
  }
}

/**
 * Full review pipeline: programmatic checks + AI quality review.
 * Returns whether the post should be auto-scheduled or held for manual review.
 */
async function reviewBlogPost(
  parsed: { title: string; summary: string; body_html: string; tags?: string[] },
  brand: MarketBrand,
  restaurantSlugs: Set<string>,
): Promise<ReviewResult> {
  // Step 1: Programmatic checks (fast, free)
  const programmatic = runProgrammaticChecks(parsed, brand, restaurantSlugs);

  // Step 2: AI quality review (cheap — gpt-4o-mini)
  const ai = await runAIReview(parsed, brand);

  const allIssues = [...programmatic.issues, ...ai.issues];
  const passed = programmatic.passed && ai.score >= 7;

  console.log(`Review: score=${ai.score}/10, programmatic=${programmatic.passed ? 'PASS' : 'FAIL'}, verdict="${ai.verdict}"`);
  if (allIssues.length > 0) {
    console.log(`Issues: ${allIssues.join(' | ')}`);
  }

  return {
    passed,
    score: ai.score,
    issues: allIssues,
    aiVerdict: ai.verdict,
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

    // Build set of valid restaurant slugs for this market
    const validSlugs = new Set(context.restaurantData.map(r => r.slug));

    // Generate with review loop (max 2 attempts)
    let parsed: { title: string; summary: string; body_html: string; tags?: string[] } | null = null;
    let review: ReviewResult | null = null;
    const MAX_ATTEMPTS = 2;

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      console.log(`Generation attempt ${attempt}/${MAX_ATTEMPTS}...`);

      const response = await openai.chat.completions.create({
        model: 'gpt-4o',
        max_tokens: 4000,
        temperature: attempt === 1 ? 0.8 : 0.7, // Lower temp on retry for more focus
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: attempt === 1
            ? userPrompt
            : `${userPrompt}\n\nIMPORTANT: A previous draft was rejected for these reasons:\n${review?.issues.map(i => `- ${i}`).join('\n')}\n\nFix these issues in your new draft.`
          },
        ],
      });

      const content = response.choices[0]?.message?.content;
      if (!content) throw new Error('No response from OpenAI');

      if (response.usage) {
        console.log(`Token usage: ${response.usage.total_tokens} total`);
      }

      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('Could not parse JSON');

      parsed = JSON.parse(jsonMatch[0]);

      // Auto-correct hallucinated slugs before review
      parsed!.body_html = autoCorrectSlugs(parsed!.body_html, validSlugs);

      // Run automated review
      review = await reviewBlogPost(parsed!, brand, validSlugs);

      if (review.passed) {
        console.log(`Review PASSED (score: ${review.score}/10) on attempt ${attempt}`);
        break;
      }

      if (attempt < MAX_ATTEMPTS) {
        console.log(`Review FAILED (score: ${review.score}/10), regenerating...`);
      } else {
        console.log(`Review FAILED after ${MAX_ATTEMPTS} attempts (score: ${review.score}/10), saving as draft`);
      }
    }

    if (!parsed) throw new Error('No valid blog post generated');

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

    // Determine status based on review result
    const postStatus = review?.passed ? 'scheduled' : 'draft';

    // Save blog post
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
      status: postStatus,
      scheduled_publish_at: postStatus === 'scheduled' ? publishAt.toISOString() : null,
      generation_error: review && !review.passed
        ? `Review failed (${review.score}/10): ${review.issues.join('; ')}`
        : null,
    });

    if (insertErr) throw new Error(insertErr.message);

    // If review failed, notify admin
    if (!review?.passed) {
      console.log(`Saved as DRAFT (needs manual review): "${parsed.title}"`);
      await sendFailureNotification(
        `Blog review failed for ${brand.name} (score: ${review?.score}/10).\n\nIssues:\n${review?.issues.map(i => `- ${i}`).join('\n')}\n\nPost saved as draft: "${parsed.title}" (slug: ${slug}).\n\nReview and manually publish at the admin panel.`,
        publishAt,
        brand,
      );
    } else {
      console.log(`Scheduled: "${parsed.title}" for ${publishAt.toISOString()}`);
    }

    return NextResponse.json({
      success: true,
      draft: {
        slug,
        title: parsed.title,
        status: postStatus,
        scheduledFor: postStatus === 'scheduled' ? publishAt.toISOString() : null,
        coverLayout: coverData.type,
        imageCount: coverData.images.length,
        featuredRestaurantCount: featuredRestaurants.length,
        review: review ? {
          passed: review.passed,
          score: review.score,
          issues: review.issues,
          verdict: review.aiVerdict,
        } : null,
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
