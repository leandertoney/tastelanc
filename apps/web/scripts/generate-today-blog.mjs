/**
 * Generate today's missing blog post
 * Run: node scripts/generate-today-blog.mjs
 */
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Topics for rotation
const BLOG_TOPICS = [
  { id: 'happy-hour-deep-dive', prompt: 'Write a deep dive into Lancaster\'s happy hour scene. Analyze which deals are actually worth it.' },
  { id: 'date-night-guide', prompt: 'Write a date night guide for different vibes - first date vs anniversary, casual vs upscale.' },
  { id: 'family-dining', prompt: 'Write about family dining that doesn\'t suck. Spots where kids are welcome but food isn\'t dumbed down.' },
  { id: 'late-night-eats', prompt: 'Write about late-night dining options in Lancaster. Be honest about what\'s available.' },
  { id: 'brunch-battles', prompt: 'Compare Lancaster\'s brunch scene. Best bloody mary? Best pancakes? Best for groups?' },
  { id: 'neighborhood-spotlight', prompt: 'Deep dive into a Lancaster neighborhood\'s food scene. What\'s the vibe? The best-kept secrets?' },
  { id: 'hidden-gems', prompt: 'Write about underrated spots that locals love but don\'t get enough attention.' },
  { id: 'new-openings', prompt: 'Write about what\'s new or coming soon to Lancaster\'s dining scene.' },
  { id: 'weekend-plans', prompt: 'Write a weekend dining itinerary. Friday dinner → Saturday brunch → Saturday dinner → Sunday brunch.' },
  { id: 'budget-eats', prompt: 'Write about eating well in Lancaster on a budget. Focus on VALUE, not just cheap.' },
];

async function fetchContext() {
  const { data: restaurants } = await supabase
    .from('restaurants')
    .select('name, slug, categories, description, neighborhood, price_range, cover_image_url')
    .eq('is_active', true)
    .not('cover_image_url', 'is', null)
    .order('name');

  return restaurants || [];
}

async function fetchRecentlyFeatured() {
  const { data } = await supabase
    .from('blog_posts')
    .select('featured_restaurants')
    .not('featured_restaurants', 'is', null)
    .order('created_at', { ascending: false })
    .limit(10);

  const slugs = new Set();
  (data || []).forEach(p => {
    (p.featured_restaurants || []).forEach(s => slugs.add(s));
  });
  return slugs;
}

async function main() {
  console.log('🌹 Generating today\'s blog post...\n');

  // Check if already published today
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const { data: todayPosts } = await supabase
    .from('blog_posts')
    .select('slug, title')
    .gte('created_at', todayStart.toISOString())
    .limit(1);

  if (todayPosts && todayPosts.length > 0) {
    console.log(`Already published today: "${todayPosts[0].title}"`);
    console.log('Skipping generation.');
    return;
  }

  const restaurants = await fetchContext();
  const recentlyFeatured = await fetchRecentlyFeatured();

  console.log(`Loaded ${restaurants.length} restaurants`);
  console.log(`${recentlyFeatured.size} recently featured (will avoid)\n`);

  // Pick topic based on day of year
  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
  const topic = BLOG_TOPICS[dayOfYear % BLOG_TOPICS.length];

  console.log(`Topic: ${topic.id}\n`);

  // Build restaurant list for prompt
  const restaurantList = restaurants.map(r => {
    const parts = [`- ${r.name} (slug: ${r.slug})`];
    if (r.neighborhood) parts.push(`in ${r.neighborhood}`);
    if (r.categories?.length) parts.push(r.categories.slice(0, 3).join(', '));
    if (r.coverImageUrl) parts.push(`| Image: ${r.coverImageUrl}`);
    return parts.join(' ');
  }).join('\n');

  const systemPrompt = `You are Rosie, TasteLanc's food intelligence. Write an engaging blog post about Lancaster dining.

## YOUR VOICE
- Confident, warm, specific
- Give real recommendations with restaurant names
- Link every restaurant mention

## RESTAURANTS (use these)
${restaurantList}

${recentlyFeatured.size > 0 ? `## AVOID THESE (featured recently)
${Array.from(recentlyFeatured).slice(0, 15).join(', ')}` : ''}

## FORMAT
Link restaurants: <a href="/restaurants/{slug}" class="restaurant-link">{Name}</a>
Include 1-3 images: <figure class="restaurant-feature"><img src="{url}" alt="{name}" class="restaurant-img" /><figcaption>{name}</figcaption></figure>

## RESPONSE FORMAT (JSON only)
{
  "title": "Compelling title",
  "summary": "150 char meta description",
  "body_html": "<h2>Section</h2><p>Content with linked restaurants...</p>",
  "tags": ["tag1", "tag2"]
}`;

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });

  const userPrompt = `Today is ${today}. It's winter in Lancaster.\n\n${topic.prompt}\n\nUse real restaurants from the list. Be specific and helpful.`;

  console.log('Generating with GPT-4o...');

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

  console.log(`Tokens used: ${response.usage?.total_tokens || 'unknown'}\n`);

  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('Could not parse JSON');

  const parsed = JSON.parse(jsonMatch[0]);

  // Generate slug
  let slug = parsed.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 80);

  // Check for duplicates
  const { data: existing } = await supabase
    .from('blog_posts')
    .select('slug')
    .eq('slug', slug)
    .single();

  if (existing) {
    slug = `${slug}-${Date.now()}`;
  }

  // Extract cover image from content
  const restaurantMap = new Map(restaurants.map(r => [r.slug, r.cover_image_url]));
  const linkRegex = /href="\/restaurants\/([^"]+)"/g;
  let match;
  let coverImageUrl = null;
  const featuredSlugs = [];

  while ((match = linkRegex.exec(parsed.body_html)) !== null) {
    const s = match[1];
    if (!featuredSlugs.includes(s)) {
      featuredSlugs.push(s);
      if (!coverImageUrl && restaurantMap.has(s)) {
        coverImageUrl = restaurantMap.get(s);
      }
    }
  }

  // Save to database
  const { error } = await supabase.from('blog_posts').upsert({
    slug,
    title: parsed.title,
    summary: parsed.summary,
    body_html: parsed.body_html,
    tags: parsed.tags || ['lancaster', 'tastelanc', 'rosie'],
    cover_image_url: coverImageUrl,
    featured_restaurants: featuredSlugs.length > 0 ? featuredSlugs : null,
    created_at: new Date().toISOString(),
  });

  if (error) throw error;

  console.log('✅ Blog post published!');
  console.log(`   Title: ${parsed.title}`);
  console.log(`   Slug: ${slug}`);
  console.log(`   Featured: ${featuredSlugs.length} restaurants`);
  console.log(`   URL: https://tastelanc.com/blog/${slug}`);
}

main().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
