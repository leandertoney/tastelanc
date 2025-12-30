import type { Config, Context } from '@netlify/functions';
import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const resend = new Resend(process.env.RESEND_API_KEY);
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://tastelanc.com';

// Rosie's Author Bio
const ROSIE_AUTHOR_BIO = `Rosie knows Lancaster's food scene like a local who never misses a grand opening. She's got the inside scoop on every happy hour worth your time, the best-kept secrets your foodie friends haven't discovered yet, and strong opinions about where you should actually eat tonight. Think of her as that friend who always knows the spot.`;

// Blog topics that rotate - 31 diverse topics for variety
const BLOG_TOPICS = [
  // Core dining guides
  { id: 'happy-hour-deep-dive', prompt: 'Write a deep dive into Lancaster\'s happy hour scene. Analyze which deals are actually worth it. Include specific prices and times.' },
  { id: 'date-night-guide', prompt: 'Write a date night guide for different vibes - first date vs anniversary, casual vs upscale. Be specific about what to order.' },
  { id: 'family-dining', prompt: 'Write about family dining that doesn\'t suck. Spots where kids are welcome but food isn\'t dumbed down.' },
  { id: 'tourist-guide', prompt: 'Write for someone visiting Lancaster from NYC or Philly. What should they NOT miss? What tourist traps should they skip?' },
  { id: 'contrarian-take', prompt: 'Write a hot take about Lancaster dining. Challenge something locals accept as gospel. Be bold but back it up.' },
  { id: 'seasonal-guide', prompt: 'Write about what to eat RIGHT NOW that\'s at peak seasonality. Make it feel timely and urgent.' },
  { id: 'late-night-eats', prompt: 'Write about late-night dining options. Be honest about what\'s available for different scenarios.' },
  { id: 'brunch-battles', prompt: 'Compare Lancaster\'s brunch scene with a framework. Best bloody mary? Best pancakes? Best for groups?' },
  { id: 'neighborhood-spotlight', prompt: 'Deep dive into a Lancaster neighborhood\'s food scene. What\'s the vibe? The best-kept secrets?' },
  { id: 'hidden-gems', prompt: 'Write about underrated spots that locals love but don\'t get enough attention. Explain WHY they\'re overlooked.' },
  { id: 'new-openings', prompt: 'Write about what\'s new or coming soon to Lancaster\'s dining scene. Position yourself as the insider.' },
  { id: 'best-of', prompt: 'Create an interesting "best of" ranking. Not generic - add personality to the rankings.' },
  { id: 'weekend-plans', prompt: 'Write a weekend dining itinerary. Friday dinner → Saturday brunch → Saturday dinner → Sunday brunch.' },
  { id: 'budget-eats', prompt: 'Write about eating well in Lancaster on a budget. Focus on VALUE, not just cheap. Include specific prices.' },
  { id: 'app-feature', prompt: 'Write about how TasteLanc helps solve a real dining problem. Make it practical without being too salesy.' },
  // Cuisine-specific
  { id: 'italian-guide', prompt: 'Write a guide to Italian food in Lancaster. From red sauce joints to upscale Italian. Best pasta? Best pizza? Be specific about dishes.' },
  { id: 'mexican-guide', prompt: 'Write about Mexican and Latin food in Lancaster. Tacos, burritos, margaritas. What\'s authentic vs fusion? Include specific dish recs.' },
  { id: 'asian-cuisine', prompt: 'Write a guide to Asian cuisine in Lancaster. Sushi, ramen, pho, Thai, Chinese, Korean. What are the standouts in each category?' },
  { id: 'american-comfort', prompt: 'Write about American comfort food in Lancaster. Burgers, steaks, BBQ, mac and cheese. Best versions of the classics?' },
  // Drink-focused
  { id: 'cocktail-bars', prompt: 'Write about Lancaster\'s cocktail bar scene. Where are the real craft cocktails? Best bartenders? Best atmospheres?' },
  { id: 'coffee-culture', prompt: 'Write about Lancaster\'s coffee scene. Independent roasters, best lattes, where to work remotely, best vibes.' },
  { id: 'beer-scene', prompt: 'Write about Lancaster\'s craft beer scene. Breweries, taprooms, beer bars. What styles does Lancaster do well?' },
  { id: 'wine-spots', prompt: 'Write about wine in Lancaster. Wine bars, restaurants with great wine programs. Where do you go for a nice glass?' },
  // Meal-specific
  { id: 'lunch-spots', prompt: 'Write about lunch in Lancaster. Quick bites, long lunches, business meals. Where\'s fast but good? Best sandwiches?' },
  { id: 'breakfast-guide', prompt: 'Write about breakfast spots in Lancaster. Best eggs? Best pastries? Best coffee pairings? Not just brunch - actual breakfast.' },
  { id: 'dessert-destinations', prompt: 'Write about desserts in Lancaster. Bakeries, ice cream, chocolate, pastry. Best cake? Best cookies? Worth the calories.' },
  // Lifestyle & events
  { id: 'first-friday', prompt: 'Write about First Friday dining in Lancaster. Where to eat before, during, and after gallery hopping. Strategic crowd suggestions.' },
  { id: 'outdoor-dining', prompt: 'Write about outdoor dining in Lancaster. Best patios, rooftops, sidewalk spots. Rank by vibe, view, food quality.' },
  { id: 'group-dining', prompt: 'Write about where to bring a group in Lancaster. Big parties, family gatherings. Where handles groups well? Private rooms?' },
  { id: 'solo-dining', prompt: 'Write about solo dining in Lancaster. Bar seats, cozy corners, comfortable spots. Best for reading? People-watching?' },
  { id: 'food-trends', prompt: 'Write about food trends in Lancaster. What\'s hot? What\'s overdone? What\'s coming next? Be opinionated.' },
] as const;

interface BlogContext {
  restaurants: Array<{
    name: string;
    slug: string;
    categories: string[];
    description?: string;
    address?: string;
    city?: string;
    neighborhood?: string;
    priceRange?: string;
    signatureDishes?: string[];
    vibeTags?: string[];
    bestFor?: string[];
    parkingInfo?: string;
    noiseLevel?: string;
    averageRating?: number;
    coverImageUrl?: string;
  }>;
  happyHours: Array<{
    restaurantName: string;
    restaurantSlug: string;
    name: string;
    daysOfWeek: string[];
    startTime: string;
    endTime: string;
    items: Array<{ name: string; discountedPrice?: number }>;
  }>;
  events: Array<{
    restaurantName: string;
    restaurantSlug: string;
    name: string;
    eventType: string;
    performerName?: string;
    startDate: string;
  }>;
  specials: Array<{
    restaurantName: string;
    restaurantSlug: string;
    name: string;
    description?: string;
    discountDescription?: string;
  }>;
}

async function fetchFullContext(): Promise<BlogContext> {
  // Fetch restaurants (all active) with enrichment fields + cover image for inline blog images
  // ONLY include restaurants WITH cover images - we need beautiful visuals
  const { data: restaurants } = await supabase
    .from('restaurants')
    .select('name, slug, categories, description, address, city, neighborhood, price_range, signature_dishes, vibe_tags, best_for, parking_info, noise_level, average_rating, cover_image_url')
    .eq('is_active', true)
    .not('cover_image_url', 'is', null)
    .order('name');

  // Fetch happy hours with items
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

  // Fetch upcoming events
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
    .gte('start_date', new Date().toISOString())
    .order('start_date')
    .limit(50);

  // Fetch specials
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
      restaurantName: (hh.restaurant as unknown as { name: string; slug: string })?.name || 'Unknown',
      restaurantSlug: (hh.restaurant as unknown as { name: string; slug: string })?.slug || '',
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
      restaurantName: (e.restaurant as unknown as { name: string; slug: string })?.name || 'Unknown',
      restaurantSlug: (e.restaurant as unknown as { name: string; slug: string })?.slug || '',
      name: e.name,
      eventType: e.event_type,
      performerName: e.performer_name,
      startDate: e.start_date,
    })),
    specials: (specials || []).map((s) => ({
      restaurantName: (s.restaurant as unknown as { name: string; slug: string })?.name || 'Unknown',
      restaurantSlug: (s.restaurant as unknown as { name: string; slug: string })?.slug || '',
      name: s.name,
      description: s.description,
      discountDescription: s.discount_description,
    })),
  };
}

function buildSystemPrompt(context: BlogContext, recentlyFeaturedSlugs: Set<string> = new Set()): string {
  const restaurantList = context.restaurants
    .map(r => {
      const parts = [`- ${r.name} (slug: ${r.slug})`];
      if (r.priceRange) parts.push(`[${r.priceRange}]`);
      if (r.categories?.length) parts.push(r.categories.join(', '));
      if (r.neighborhood) parts.push(`in ${r.neighborhood}`);
      if (r.averageRating) parts.push(`★${r.averageRating}`);
      if (r.vibeTags?.length) parts.push(`| Vibe: ${r.vibeTags.join(', ')}`);
      if (r.bestFor?.length) parts.push(`| Best for: ${r.bestFor.join(', ')}`);
      if (r.signatureDishes?.length) parts.push(`| Known for: ${r.signatureDishes.slice(0, 3).join(', ')}`);
      if (r.coverImageUrl) parts.push(`| Image: ${r.coverImageUrl}`);
      if (r.description) parts.push(`- ${r.description}`);
      return parts.join(' ');
    })
    .join('\n');

  const happyHourList = context.happyHours
    .map(hh => `- ${hh.restaurantName}: "${hh.name}" on ${hh.daysOfWeek.join(', ')} from ${hh.startTime}-${hh.endTime}${hh.items.length > 0 ? ` | Deals: ${hh.items.map(i => `${i.name}${i.discountedPrice ? ` $${i.discountedPrice}` : ''}`).join(', ')}` : ''}`)
    .join('\n');

  const eventList = context.events
    .map(e => `- ${e.restaurantName}: "${e.name}" (${e.eventType})${e.performerName ? ` featuring ${e.performerName}` : ''} on ${e.startDate}`)
    .join('\n');

  const specialsList = context.specials
    .map(s => `- ${s.restaurantName}: "${s.name}"${s.discountDescription ? ` - ${s.discountDescription}` : ''}`)
    .join('\n');

  return `You are Rosie, TasteLanc's food intelligence and Lancaster, Pennsylvania's definitive dining authority. You write original, engaging blog posts that make readers feel like they have an insider connection to the city's food scene.

## YOUR IDENTITY

You're not a generic food blogger. You're THE source for Lancaster dining intel. You have opinions. You have takes. You know things others don't. You speak with confidence because you have the data to back it up.

### Your Voice
- **Confident**: You state opinions as an authority, not tentatively
- **Warm but not cheesy**: Friendly without being cringe
- **Specific**: You name names, cite numbers, give details
- **Occasionally contrarian**: You're not afraid of hot takes
- **Hook-driven**: Your opening lines grab attention
- **Actionable**: Every post gives readers something to DO

### What You're NOT
- Generic ("Best restaurants in Lancaster!" - boring)
- Wishy-washy ("You might want to try..." - be definitive)
- Clickbait without substance (deliver on your promises)
- A robot (you have personality and opinions)

## LANCASTER KNOWLEDGE

### Neighborhoods
- **Downtown Lancaster**: The heart - walkable, trendy, always evolving
- **Lititz**: Charming small-town vibes with surprising culinary depth
- **Manheim**: More casual, local favorites
- **Columbia**: Riverside town with growing food scene

### Local Culture
- Farm-to-table isn't a trend here - it's heritage
- Craft cocktail scene has exploded in the last 5 years
- Brunch culture is HUGE
- Late night options are limited

## YOUR DATABASE (REAL-TIME DATA)

### Restaurants (${context.restaurants.length} total)
${restaurantList || 'No restaurants loaded'}

### Active Happy Hours
${happyHourList || 'No happy hours loaded'}

### Upcoming Events
${eventList || 'No events loaded'}

### Current Specials
${specialsList || 'No specials loaded'}

${recentlyFeaturedSlugs.size > 0 ? `### Recently Featured (avoid unless newsworthy)
The following restaurants have been featured recently. AVOID featuring them prominently unless you have news/updates about them (new menu, event, opening, etc.):
${Array.from(recentlyFeaturedSlugs).slice(0, 20).map(slug => `- ${slug}`).join('\n')}

Note: You can still mention these restaurants briefly, but focus your detailed coverage on OTHER restaurants that haven't been featured recently.` : ''}

## CONTENT GUIDELINES

### Structure Every Post With:
1. **A hook** - First sentence grabs attention
2. **The angle** - What makes this different
3. **Specific recommendations** - Names, what to order
4. **Insider details** - Things only a local would know
5. **Call to action** - Download the app, visit a spot

### Formatting (HTML)
- Use <h2> for section headers
- Use <p> for paragraphs (2-3 sentences max)
- Use <ul>/<li> for lists
- Use <strong> for emphasis

### Word Count: 600-900 words

## RESTAURANT LINKING (CRITICAL - MUST FOLLOW)

**EVERY restaurant mention MUST be a hyperlink.** This is non-negotiable for SEO and user experience.

Format: <a href="/restaurants/{slug}" class="restaurant-link">{Restaurant Name}</a>

Examples:
- ✅ <a href="/restaurants/horse-inn" class="restaurant-link">The Horse Inn</a>
- ❌ "Check out The Horse Inn" (WRONG - no link)

The slug is provided after each restaurant name in your database (e.g., "Restaurant Name (slug: restaurant-slug)").

## INLINE RESTAURANT IMAGES

When discussing a specific restaurant in detail, include its image:

<figure class="restaurant-feature">
  <img src="{coverImageUrl}" alt="{Restaurant Name}" class="restaurant-img" />
  <figcaption>{Restaurant Name}</figcaption>
</figure>

Rules: Only include 1-3 images per post. Only use images when coverImageUrl is provided. Place after the introductory paragraph.

## GRID LAYOUTS FOR LISTS

When featuring 3+ restaurants in a section, use a grid:

<div class="restaurant-grid">
  <div class="restaurant-card">
    <img src="{coverImageUrl}" alt="{name}" />
    <h4><a href="/restaurants/{slug}" class="restaurant-link">{name}</a></h4>
    <p>{Brief description}</p>
  </div>
</div>

## RESPONSE FORMAT

Always respond with valid JSON:
{
  "title": "Compelling, specific title",
  "summary": "150-160 char meta description",
  "body_html": "<h2>Section</h2><p>Content...</p>",
  "tags": ["tag1", "tag2", "tag3"],
  "target_audience": "primary audience",
  "hook_type": "question|bold_claim|surprising_fact|contrarian"
}`;
}

function getSeason(): string {
  const month = new Date().getMonth();
  if (month >= 2 && month <= 4) return 'spring';
  if (month >= 5 && month <= 7) return 'summer';
  if (month >= 8 && month <= 10) return 'fall';
  return 'winter';
}

/**
 * Extract featured restaurant images from the generated blog HTML
 * Returns up to 4 restaurant cover images mentioned in the post
 * Excludes images that were recently used as cover images
 */
function extractFeaturedRestaurantImages(
  bodyHtml: string,
  restaurants: BlogContext['restaurants'],
  excludeImageUrls: Set<string> = new Set()
): string[] {
  const images: string[] = [];
  const restaurantMap = new Map(
    restaurants
      .filter(r => r.coverImageUrl)
      .map(r => [r.slug, r.coverImageUrl!])
  );

  // Find all restaurant links in the HTML
  const linkRegex = /href="\/restaurants\/([^"]+)"/g;
  let match;
  const seenSlugs = new Set<string>();

  while ((match = linkRegex.exec(bodyHtml)) !== null && images.length < 4) {
    const slug = match[1];
    const imageUrl = restaurantMap.get(slug);

    // Skip if we've seen this slug, if there's no image, or if image was recently used
    if (!seenSlugs.has(slug) && imageUrl && !excludeImageUrls.has(imageUrl)) {
      seenSlugs.add(slug);
      images.push(imageUrl);
    }
  }

  // If no images found (all were excluded), fall back to using any available image
  if (images.length === 0) {
    linkRegex.lastIndex = 0; // Reset regex
    while ((match = linkRegex.exec(bodyHtml)) !== null && images.length < 1) {
      const slug = match[1];
      const imageUrl = restaurantMap.get(slug);
      if (imageUrl) {
        images.push(imageUrl);
        break;
      }
    }
  }

  return images;
}

/**
 * Build cover image data from real restaurant photos
 * Returns structured data for different cover layouts
 */
interface CoverImageData {
  type: 'single' | 'dual' | 'triple' | 'quad' | 'none';
  images: string[];
  layout: 'full' | 'split-diagonal' | 'split-vertical' | 'grid' | 'collage';
}

function buildCoverImageData(
  bodyHtml: string,
  restaurants: BlogContext['restaurants'],
  excludeImageUrls: Set<string> = new Set()
): CoverImageData {
  const images = extractFeaturedRestaurantImages(bodyHtml, restaurants, excludeImageUrls);

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

async function fetchExistingSlugs(): Promise<Set<string>> {
  const { data } = await supabase.from('blog_posts').select('slug');
  return new Set((data || []).map((p) => p.slug));
}

/**
 * Fetch cover images from recent blog posts to avoid duplication
 */
async function fetchRecentCoverImages(limit: number = 5): Promise<Set<string>> {
  const { data } = await supabase
    .from('blog_posts')
    .select('cover_image_url')
    .not('cover_image_url', 'is', null)
    .order('created_at', { ascending: false })
    .limit(limit);

  return new Set((data || []).map((p) => p.cover_image_url).filter(Boolean));
}

/**
 * Fetch recently featured restaurants to avoid repetition
 * Returns a set of restaurant slugs that have been featured in the last N posts
 */
async function fetchRecentlyFeaturedRestaurants(limit: number = 10): Promise<Set<string>> {
  const { data } = await supabase
    .from('blog_posts')
    .select('featured_restaurants')
    .not('featured_restaurants', 'is', null)
    .order('created_at', { ascending: false })
    .limit(limit);

  const slugs = new Set<string>();
  (data || []).forEach((post) => {
    (post.featured_restaurants || []).forEach((slug: string) => slugs.add(slug));
  });

  return slugs;
}

/**
 * Extract restaurant slugs from blog HTML content
 * Returns array of unique restaurant slugs mentioned in the post
 */
function extractFeaturedRestaurantSlugs(bodyHtml: string): string[] {
  const slugs: string[] = [];
  const seenSlugs = new Set<string>();

  // Find all restaurant links in the HTML
  const linkRegex = /href="\/restaurants\/([^"]+)"/g;
  let match;

  while ((match = linkRegex.exec(bodyHtml)) !== null) {
    const slug = match[1];
    if (!seenSlugs.has(slug)) {
      seenSlugs.add(slug);
      slugs.push(slug);
    }
  }

  return slugs;
}

/**
 * Send blog notification emails to waitlisters
 */
interface BlogEmailParams {
  title: string;
  slug: string;
  summary: string;
  coverImageUrl: string | null;
}

async function sendBlogNotificationEmails(post: BlogEmailParams): Promise<number> {
  // Skip if no Resend API key
  if (!process.env.RESEND_API_KEY) {
    console.log('Skipping emails: RESEND_API_KEY not configured');
    return 0;
  }

  // Get waitlist subscribers
  const { data: subscribers } = await supabase
    .from('early_access_signups')
    .select('id, email');

  if (!subscribers || subscribers.length === 0) {
    console.log('No waitlist subscribers to notify');
    return 0;
  }

  // Get unsubscribed emails
  const { data: unsubscribes } = await supabase
    .from('email_unsubscribes')
    .select('email');

  const unsubscribedEmails = new Set(
    (unsubscribes || []).map((u: { email: string }) => u.email.toLowerCase())
  );

  // Deduplicate by email (in case someone signed up multiple times) and filter out unsubscribed
  const seenEmails = new Set<string>();
  const recipients = subscribers.filter((s) => {
    const email = s.email.toLowerCase();
    if (seenEmails.has(email) || unsubscribedEmails.has(email)) {
      return false;
    }
    seenEmails.add(email);
    return true;
  });

  if (recipients.length === 0) {
    console.log('All subscribers are unsubscribed');
    return 0;
  }

  const postUrl = `${siteUrl}/blog/${post.slug}`;

  // Build email HTML
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #0D0D0D; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0D0D0D;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; width: 100%;">
          <tr>
            <td align="center" style="padding-bottom: 30px;">
              <img src="${siteUrl}/images/tastelanc_new_dark.png" alt="TasteLanc" width="180" style="display: block;">
            </td>
          </tr>
          ${post.coverImageUrl ? `
          <tr>
            <td style="padding-bottom: 24px;">
              <a href="${postUrl}" style="display: block;">
                <img src="${post.coverImageUrl}" alt="${post.title}" width="600" style="display: block; width: 100%; max-width: 600px; border-radius: 8px;">
              </a>
            </td>
          </tr>
          ` : ''}
          <tr>
            <td style="background-color: #1A1A1A; border-radius: 12px; padding: 32px;">
              <table cellpadding="0" cellspacing="0" style="margin-bottom: 20px;">
                <tr>
                  <td style="background-color: #D4AF37; color: #000; font-size: 11px; font-weight: bold; padding: 4px 10px; border-radius: 4px; text-transform: uppercase; letter-spacing: 0.5px;">
                    New from Rosie
                  </td>
                </tr>
              </table>
              <h1 style="color: #FFFFFF; font-size: 26px; font-weight: bold; margin: 0 0 16px 0; line-height: 1.3;">
                ${post.title}
              </h1>
              <p style="color: #A0A0A0; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
                ${post.summary}
              </p>
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background-color: #D4AF37; border-radius: 8px;">
                    <a href="${postUrl}" style="display: inline-block; padding: 14px 28px; color: #000000; text-decoration: none; font-weight: bold; font-size: 16px;">
                      Read Now →
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding-top: 32px; text-align: center;">
              <p style="color: #666; font-size: 13px; margin: 0 0 8px 0;">
                You're receiving this because you joined the TasteLanc waitlist.
              </p>
              <p style="color: #666; font-size: 13px; margin: 0;">
                <a href="${siteUrl}/unsubscribe" style="color: #666; text-decoration: underline;">Unsubscribe</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

  // Send in batches of 100
  const batchSize = 100;
  let sent = 0;

  for (let i = 0; i < recipients.length; i += batchSize) {
    const batch = recipients.slice(i, i + batchSize);
    try {
      await resend.batch.send(
        batch.map((r) => ({
          from: 'TasteLanc <noreply@tastelanc.com>',
          to: r.email,
          subject: `🍽️ ${post.title}`,
          html,
        }))
      );
      sent += batch.length;
    } catch (err) {
      console.error(`Batch send error (batch ${i / batchSize}):`, err);
    }
  }

  return sent;
}

export default async function handler(req: Request, context: Context) {
  try {
    // Check for required env vars
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY not configured');
    }
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Supabase credentials not configured');
    }

    // GUARD: Check if we already published a post today (prevent duplicate runs)
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const { data: todayPosts } = await supabase
      .from('blog_posts')
      .select('slug, title')
      .gte('created_at', todayStart.toISOString())
      .limit(1);

    if (todayPosts && todayPosts.length > 0) {
      console.log(`Already published today: "${todayPosts[0].title}" - skipping generation`);
      return new Response(
        JSON.stringify({
          success: true,
          skipped: true,
          reason: 'Already published today',
          existingPost: todayPosts[0].slug,
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Fetch full context
    const blogContext = await fetchFullContext();
    if (blogContext.restaurants.length === 0) {
      return new Response(JSON.stringify({ error: 'No restaurants found' }), {
        status: 500,
      });
    }

    console.log(`Context loaded: ${blogContext.restaurants.length} restaurants, ${blogContext.happyHours.length} happy hours, ${blogContext.events.length} events`);

    // Get existing slugs to avoid duplicates
    const existingSlugs = await fetchExistingSlugs();

    // Get recent cover images to avoid using the same cover image on adjacent posts
    const recentCoverImages = await fetchRecentCoverImages(5);
    console.log(`Found ${recentCoverImages.size} recent cover images to exclude`);

    // Get recently featured restaurants to avoid repetition
    const recentlyFeaturedRestaurants = await fetchRecentlyFeaturedRestaurants(10);
    console.log(`Found ${recentlyFeaturedRestaurants.size} recently featured restaurants`);

    // Pick today's topic based on day of year (more variety than day of week)
    const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
    const topic = BLOG_TOPICS[dayOfYear % BLOG_TOPICS.length];

    // Build prompts (pass recently featured restaurants to avoid repetition)
    const systemPrompt = buildSystemPrompt(blogContext, recentlyFeaturedRestaurants);
    const today = new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    const userPrompt = `Today is ${today}. It's ${getSeason()} in Lancaster.

${topic.prompt}

Use the restaurants, happy hours, events, and specials from your database. Be specific, be opinionated, and make it valuable.`;

    console.log(`Generating blog post for topic: ${topic.id}`);

    // Generate the blog post
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
      throw new Error('No response from OpenAI');
    }

    // Log token usage
    if (response.usage) {
      console.log(`Token usage: ${response.usage.total_tokens} total`);
    }

    // Parse JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Could not parse JSON from response');
    }

    const parsed = JSON.parse(jsonMatch[0]);

    // Generate slug from title
    let slug = parsed.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .substring(0, 80);

    // Check if similar post exists (avoid duplicates)
    if (existingSlugs.has(slug)) {
      slug = `${slug}-${Date.now()}`;
    }

    // Extract real restaurant photos from the post content (exclude recently used cover images)
    const coverData = buildCoverImageData(parsed.body_html, blogContext.restaurants, recentCoverImages);
    const coverImageUrl = coverData.images[0] || null; // Primary cover image

    // Extract featured restaurant slugs for tracking
    const featuredRestaurants = extractFeaturedRestaurantSlugs(parsed.body_html);

    console.log(`Cover image data: ${coverData.type} layout with ${coverData.images.length} images`);
    console.log(`Featured restaurants: ${featuredRestaurants.length} restaurants`);

    // Publish to Supabase
    const { error: upsertErr } = await supabase.from('blog_posts').upsert({
      slug,
      title: parsed.title,
      summary: parsed.summary,
      body_html: parsed.body_html,
      tags: parsed.tags || ['lancaster', 'tastelanc', 'rosie'],
      cover_image_url: coverImageUrl,
      // Store full cover data as JSON for editorial layouts
      cover_image_data: coverData.images.length > 0 ? JSON.stringify(coverData) : null,
      // Track which restaurants were featured for diversity
      featured_restaurants: featuredRestaurants.length > 0 ? featuredRestaurants : null,
      created_at: new Date().toISOString(),
    });

    if (upsertErr) throw upsertErr;

    console.log(`Published blog post: ${parsed.title} (${coverData.images.length} real photos)`);

    // Send email notification to waitlisters
    let emailsSent = 0;
    try {
      emailsSent = await sendBlogNotificationEmails({
        title: parsed.title,
        slug,
        summary: parsed.summary,
        coverImageUrl,
      });
      console.log(`Sent ${emailsSent} blog notification emails`);
    } catch (emailError) {
      console.error('Failed to send blog notification emails:', emailError);
      // Don't fail the whole function if email fails
    }

    return new Response(
      JSON.stringify({
        success: true,
        post: {
          slug,
          title: parsed.title,
          topic: topic.id,
          coverLayout: coverData.layout,
          imageCount: coverData.images.length,
          featuredRestaurantCount: featuredRestaurants.length,
          emailsSent,
        },
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Blog generation failed:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

// Run daily at 6am ET (11:00 UTC)
export const config: Config = {
  // Monday, Wednesday, Friday at 11 AM UTC
  schedule: '0 11 * * 1,3,5',
};
