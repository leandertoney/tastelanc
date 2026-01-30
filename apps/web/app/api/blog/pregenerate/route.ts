import { NextResponse } from 'next/server';
import { createClient as createSupabaseAdmin } from '@supabase/supabase-js';
import OpenAI from 'openai';
import { Resend } from 'resend';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

const resend = new Resend(process.env.RESEND_API_KEY);

const BLOG_TOPICS = [
  { id: 'happy-hour-deep-dive', prompt: 'Write a deep dive into Lancaster\'s happy hour scene.' },
  { id: 'date-night-guide', prompt: 'Write a date night guide for different vibes.' },
  { id: 'family-dining', prompt: 'Write about family dining that doesn\'t suck.' },
  { id: 'tourist-guide', prompt: 'Write for someone visiting Lancaster from NYC or Philly.' },
  { id: 'contrarian-take', prompt: 'Write a hot take about Lancaster dining.' },
  { id: 'seasonal-guide', prompt: 'Write about what to eat RIGHT NOW that\'s at peak seasonality.' },
  { id: 'late-night-eats', prompt: 'Write about late-night dining options.' },
  { id: 'brunch-battles', prompt: 'Compare Lancaster\'s brunch scene.' },
  { id: 'neighborhood-spotlight', prompt: 'Deep dive into a Lancaster neighborhood\'s food scene.' },
  { id: 'hidden-gems', prompt: 'Write about underrated spots that locals love.' },
  { id: 'best-of', prompt: 'Create an interesting "best of" ranking.' },
  { id: 'weekend-plans', prompt: 'Write a weekend dining itinerary.' },
  { id: 'budget-eats', prompt: 'Write about eating well in Lancaster on a budget.' },
] as const;

function getSeason(): string {
  const month = new Date().getMonth();
  if (month >= 2 && month <= 4) return 'spring';
  if (month >= 5 && month <= 7) return 'summer';
  if (month >= 8 && month <= 10) return 'fall';
  return 'winter';
}

function buildSystemPrompt(restaurants: Array<{ name: string; slug: string; categories: string[] }>): string {
  const restaurantList = restaurants.map(r => `- ${r.name} (slug: ${r.slug})`).join('\n');

  return `You are Rosie, TasteLanc's food intelligence for Lancaster, PA. Write engaging blog posts.

## RESTAURANTS (${restaurants.length} total)
${restaurantList}

## GUIDELINES
- Use <h2> for headers, <p> for paragraphs, <ul>/<li> for lists
- Word count: 600-900 words
- EVERY restaurant mention MUST link: <a href="/restaurants/{slug}" class="restaurant-link">{Name}</a>

## RESPONSE FORMAT (JSON only)
{"title": "...", "summary": "150 chars", "body_html": "...", "tags": ["tag1", "tag2"]}`;
}

async function sendFailureNotification(error: string, scheduledFor: Date): Promise<void> {
  const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL || 'admin@tastelanc.com';
  try {
    await resend.emails.send({
      from: 'TasteLanc <alerts@tastelanc.com>',
      to: adminEmail,
      subject: 'Blog Pre-Generation Failed - Action Required',
      html: `<h2>Blog Pre-Generation Failed</h2>
        <p><strong>Scheduled:</strong> ${scheduledFor.toLocaleString('en-US', { timeZone: 'America/New_York' })} EST</p>
        <p><strong>Error:</strong></p><pre>${error}</pre>
        <p>Please manually generate at <a href="https://tastelanc.com/admin">admin panel</a></p>`,
    });
  } catch (e) {
    console.error('Failed to send notification:', e);
  }
}

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

    const supabase = createSupabaseAdmin(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

    // Calculate publish time (6 AM EST = 11 AM UTC)
    const publishAt = new Date();
    publishAt.setUTCHours(11, 0, 0, 0);
    if (publishAt.getTime() <= Date.now()) publishAt.setDate(publishAt.getDate() + 1);

    // Check for existing draft
    const { data: existingDraft } = await supabase
      .from('blog_posts')
      .select('slug, title')
      .eq('status', 'scheduled')
      .gte('scheduled_publish_at', new Date(publishAt.getTime() - 3600000).toISOString())
      .lte('scheduled_publish_at', new Date(publishAt.getTime() + 3600000).toISOString())
      .limit(1);

    if (existingDraft?.length) {
      return NextResponse.json({ success: true, skipped: true, existingDraft: existingDraft[0].slug });
    }

    // Fetch restaurants
    const { data: restaurants } = await supabase
      .from('restaurants')
      .select('name, slug, categories, cover_image_url')
      .eq('is_active', true)
      .not('cover_image_url', 'is', null);

    if (!restaurants?.length) throw new Error('No restaurants found');

    const restaurantData = restaurants.map(r => ({ name: r.name, slug: r.slug, categories: r.categories || [], coverImageUrl: r.cover_image_url }));

    // Pick topic
    const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
    const topic = BLOG_TOPICS[dayOfYear % BLOG_TOPICS.length];

    const dateString = publishAt.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
    const userPrompt = `Post for ${dateString}. It's ${getSeason()} in Lancaster.\n\n${topic.prompt}\n\nBe specific and opinionated.`;

    // Generate
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      max_tokens: 3000,
      temperature: 0.8,
      messages: [
        { role: 'system', content: buildSystemPrompt(restaurantData) },
        { role: 'user', content: userPrompt },
      ],
    });

    const content = response.choices[0]?.message?.content;
    if (!content) throw new Error('No response from OpenAI');

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('Could not parse JSON');

    const parsed = JSON.parse(jsonMatch[0]);

    let slug = parsed.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').substring(0, 80);
    const { data: existing } = await supabase.from('blog_posts').select('slug').eq('slug', slug).single();
    if (existing) slug = `${slug}-${Date.now()}`;

    // Extract cover image
    const linkRegex = /href="\/restaurants\/([^"]+)"/g;
    const matches = Array.from(parsed.body_html.matchAll(linkRegex) as Iterable<RegExpMatchArray>);
    let coverImageUrl: string | null = null;
    if (matches.length) {
      const restaurant = restaurantData.find(r => r.slug === matches[0][1]);
      coverImageUrl = restaurant?.coverImageUrl || null;
    }

    const featuredRestaurants = Array.from(new Set(matches.map(m => m[1])));

    // Save as scheduled draft
    const { error: insertErr } = await supabase.from('blog_posts').insert({
      slug,
      title: parsed.title,
      summary: parsed.summary,
      body_html: parsed.body_html,
      tags: parsed.tags || ['lancaster', 'tastelanc'],
      cover_image_url: coverImageUrl,
      featured_restaurants: featuredRestaurants.length ? featuredRestaurants : null,
      status: 'scheduled',
      scheduled_publish_at: publishAt.toISOString(),
    });

    if (insertErr) throw new Error(insertErr.message);

    console.log(`Draft created: "${parsed.title}" for ${publishAt.toISOString()}`);
    return NextResponse.json({ success: true, draft: { slug, title: parsed.title, scheduledFor: publishAt.toISOString() } });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Pre-generation failed:', errorMessage);

    try {
      const supabase = createSupabaseAdmin(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
      const publishAt = new Date();
      publishAt.setUTCHours(11, 0, 0, 0);
      if (publishAt.getTime() <= Date.now()) publishAt.setDate(publishAt.getDate() + 1);

      await supabase.from('blog_generation_failures').insert({ scheduled_for: publishAt.toISOString(), error_message: errorMessage });
      await sendFailureNotification(errorMessage, publishAt);
    } catch (e) {
      console.error('Failed to record failure:', e);
    }

    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
