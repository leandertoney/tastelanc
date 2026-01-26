import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import OpenAI from 'openai';
import { createClient as createSupabaseAdmin } from '@supabase/supabase-js';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

// Rosie's system prompt (simplified version for manual trigger)
function buildSystemPrompt(restaurants: Array<{ name: string; slug: string; categories: string[]; coverImageUrl?: string }>): string {
  const restaurantList = restaurants
    .map(r => `- ${r.name} (slug: ${r.slug}) [${r.categories?.join(', ') || 'uncategorized'}]${r.coverImageUrl ? ` | Image: ${r.coverImageUrl}` : ''}`)
    .join('\n');

  return `You are Rosie, TasteLanc's food intelligence and Lancaster, Pennsylvania's definitive dining authority. You write original, engaging blog posts that make readers feel like they have an insider connection to the city's food scene.

## YOUR IDENTITY
You're THE source for Lancaster dining intel. You have opinions. You have takes. You know things others don't.

### Your Voice
- **Confident**: You state opinions as an authority
- **Warm but not cheesy**: Friendly without being cringe
- **Specific**: You name names, cite numbers, give details
- **Hook-driven**: Your opening lines grab attention
- **Actionable**: Every post gives readers something to DO

## LANCASTER RESTAURANTS (${restaurants.length} total)
${restaurantList || 'No restaurants loaded'}

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

## RESTAURANT LINKING (CRITICAL)
**EVERY restaurant mention MUST be a hyperlink.**
Format: <a href="/restaurants/{slug}" class="restaurant-link">{Restaurant Name}</a>

## RESPONSE FORMAT
Always respond with valid JSON:
{
  "title": "Compelling, specific title",
  "summary": "150-160 char meta description",
  "body_html": "<h2>Section</h2><p>Content...</p>",
  "tags": ["tag1", "tag2", "tag3"]
}`;
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    // Verify user is admin
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isAdmin = user.email === 'admin@tastelanc.com';
    if (!isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Check for OpenAI key
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: 'OPENAI_API_KEY not configured' }, { status: 500 });
    }

    const body = await request.json().catch(() => ({}));
    const { theme } = body as { theme?: string };

    // Use service role for database operations
    const supabaseAdmin = createSupabaseAdmin(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Fetch restaurants with cover images
    const { data: restaurants } = await supabaseAdmin
      .from('restaurants')
      .select('name, slug, categories, cover_image_url')
      .eq('is_active', true)
      .not('cover_image_url', 'is', null)
      .order('name');

    if (!restaurants || restaurants.length === 0) {
      return NextResponse.json({ error: 'No restaurants found' }, { status: 500 });
    }

    const restaurantData = restaurants.map(r => ({
      name: r.name,
      slug: r.slug,
      categories: r.categories || [],
      coverImageUrl: r.cover_image_url,
    }));

    // Build the prompt based on theme or holiday
    const today = new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    let themePrompt: string;
    if (theme === 'new-years-eve' || (!theme && new Date().getMonth() === 11 && new Date().getDate() === 31)) {
      themePrompt = `🎉 It's New Year's Eve! Write about how Lancaster restaurants celebrate tonight - special prix fixe menus, champagne toasts, countdown parties, late-night dining options. Where should people ring in the new year? What are the best spots for a celebratory dinner?`;
    } else if (theme) {
      themePrompt = `Write a blog post themed around: ${theme}. Make it relevant to Lancaster's dining scene.`;
    } else {
      themePrompt = `Write about what's great about Lancaster dining right now. Be timely, specific, and give readers actionable recommendations.`;
    }

    const systemPrompt = buildSystemPrompt(restaurantData);
    const userPrompt = `Today is ${today}.

${themePrompt}

Use the restaurants from your database. Be specific, be opinionated, and make it valuable for readers planning where to eat.`;

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
      return NextResponse.json({ error: 'No response from OpenAI' }, { status: 500 });
    }

    // Parse JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json({ error: 'Could not parse JSON from response', raw: content }, { status: 500 });
    }

    const parsed = JSON.parse(jsonMatch[0]);

    // Generate slug from title
    let slug = parsed.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .substring(0, 80);

    // Check if slug exists
    const { data: existing } = await supabaseAdmin
      .from('blog_posts')
      .select('slug')
      .eq('slug', slug)
      .single();

    if (existing) {
      slug = `${slug}-${Date.now()}`;
    }

    // Extract cover image from first restaurant mentioned
    const linkRegex = /href="\/restaurants\/([^"]+)"/;
    const match = parsed.body_html.match(linkRegex);
    let coverImageUrl: string | null = null;
    if (match) {
      const firstSlug = match[1];
      const restaurant = restaurantData.find(r => r.slug === firstSlug);
      coverImageUrl = restaurant?.coverImageUrl || null;
    }

    // Extract featured restaurant slugs
    const allLinks = Array.from(
      parsed.body_html.matchAll(/href="\/restaurants\/([^"]+)"/g) as Iterable<RegExpMatchArray>
    );
    const featuredRestaurants = Array.from(new Set(allLinks.map((m: RegExpMatchArray) => m[1])));

    // Publish to Supabase
    const { error: upsertErr } = await supabaseAdmin.from('blog_posts').upsert({
      slug,
      title: parsed.title,
      summary: parsed.summary,
      body_html: parsed.body_html,
      tags: parsed.tags || ['lancaster', 'tastelanc', 'rosie'],
      cover_image_url: coverImageUrl,
      featured_restaurants: featuredRestaurants.length > 0 ? featuredRestaurants : null,
      created_at: new Date().toISOString(),
    });

    if (upsertErr) {
      return NextResponse.json({ error: upsertErr.message }, { status: 500 });
    }

    // Send push notification to all mobile app users
    try {
      const { error: pushError } = await supabaseAdmin.functions.invoke(
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
        console.error('Failed to send blog push notification:', pushError);
      }
    } catch (pushErr) {
      console.error('Error invoking push notification function:', pushErr);
    }

    return NextResponse.json({
      success: true,
      post: {
        slug,
        title: parsed.title,
        summary: parsed.summary,
        url: `/blog/${slug}`,
        featuredRestaurantCount: featuredRestaurants.length,
      },
    });
  } catch (error) {
    console.error('Blog generation failed:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
