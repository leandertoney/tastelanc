// Quick script to generate a blog post immediately
// Run with: npx tsx scripts/generate-blog-now.ts

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

const TOPICS = [
  { id: 'friday-vibes', prompt: 'Write about the best Friday night dining options in Lancaster. Where to start the weekend right - happy hours transitioning to dinner, lively atmospheres, group-friendly spots.' },
];

async function main() {
  console.log('Generating blog post...');

  // Fetch restaurants
  const { data: restaurants } = await supabase
    .from('restaurants')
    .select('name, slug, categories, cover_image_url')
    .eq('is_active', true)
    .not('cover_image_url', 'is', null)
    .order('name');

  if (!restaurants?.length) {
    console.error('No restaurants found');
    process.exit(1);
  }

  console.log(`Found ${restaurants.length} restaurants`);

  const restaurantList = restaurants
    .map(r => `- ${r.name} (slug: ${r.slug}) [${r.categories?.join(', ') || ''}]`)
    .join('\n');

  const systemPrompt = `You are Rosie, TasteLanc's food authority for Lancaster, PA. Write engaging blog posts.

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

  const userPrompt = `Today is ${today}. It's winter in Lancaster.

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

  // Extract cover image
  const linkRegex = /href="\/restaurants\/([^"]+)"/;
  const match = parsed.body_html.match(linkRegex);
  let coverImageUrl: string | null = null;
  if (match) {
    const restaurant = restaurants.find(r => r.slug === match[1]);
    coverImageUrl = restaurant?.cover_image_url || null;
  }

  // Insert into database
  const { error } = await supabase.from('blog_posts').insert({
    slug,
    title: parsed.title,
    summary: parsed.summary,
    body_html: parsed.body_html,
    tags: parsed.tags || ['lancaster', 'tastelanc'],
    cover_image_url: coverImageUrl,
    created_at: new Date().toISOString(),
  });

  if (error) {
    console.error('Database error:', error);
    process.exit(1);
  }

  console.log(`\n✅ Published: ${parsed.title}`);
  console.log(`📎 URL: https://tastelanc.com/blog/${slug}`);

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
      console.log(`📱 Push notifications sent: ${data?.sent || 0}`);
    }
  } catch (e) {
    console.error('Push notification failed:', e);
  }
}

main().catch(console.error);
