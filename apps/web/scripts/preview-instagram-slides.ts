/**
 * Preview the redesigned Instagram overlay system.
 * Generates sample slides and inserts them as draft posts so they
 * appear in the admin dashboard at /admin/instagram-posts.
 *
 * Run:  cd apps/web && npx tsx scripts/preview-instagram-slides.ts
 * View: http://localhost:3000/admin/instagram-posts (filter by "draft")
 */

// Load .env.local so we get Supabase keys
import { config } from 'dotenv';
config({ path: '.env.local' });

import { createClient } from '@supabase/supabase-js';
import { generateCarouselSlides, composeWeeklyRoundupSlides, composeRestaurantSpotlightSlides } from '../lib/instagram/overlay';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://kufcxxynjvyharhtfptd.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!SUPABASE_KEY) {
  console.error('❌ No Supabase key found in .env.local');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function insertDraftPost(
  marketId: string,
  contentType: string,
  mediaUrls: string[],
  caption: string,
  dayTheme: string | null = null,
) {
  const today = new Date().toISOString().split('T')[0];
  const { data, error } = await supabase
    .from('instagram_posts')
    .insert({
      market_id: marketId,
      post_date: today,
      content_type: contentType,
      selected_entity_ids: [],
      caption,
      media_urls: mediaUrls,
      status: 'draft',
      day_theme: dayTheme,
      generation_metadata: {
        post_type: contentType,
        preview: true,
        generated_by: 'preview-instagram-slides.ts',
      },
    })
    .select('id')
    .single();

  if (error) {
    console.log(`   ⚠️  DB insert failed (${contentType}): ${error.message}`);
    return null;
  }
  return data?.id;
}

async function main() {
  console.log('\n🎨 Generating Instagram slide previews...\n');

  // Look up real market ID for Lancaster
  const { data: market } = await supabase
    .from('markets')
    .select('id, slug, name')
    .eq('slug', 'lancaster-pa')
    .single();

  if (!market) {
    console.error('❌ Could not find lancaster-pa market in DB');
    process.exit(1);
  }

  console.log(`📍 Market: ${market.name} (${market.id})\n`);

  const marketConfig = {
    market_slug: market.slug,
    market_id: market.id,
    market_name: market.name,
    county: '',
    state: 'PA',
    instagram_account: null,
  };

  // Fetch restaurants with photos for realistic previews
  const { data: restaurants } = await supabase
    .from('restaurants')
    .select('id, name, cover_image_url')
    .eq('market_id', market.id)
    .not('cover_image_url', 'is', null)
    .limit(5);

  const candidates = (restaurants && restaurants.length > 0)
    ? restaurants.slice(0, 3).map(r => ({
        restaurant_name: r.name,
        detail_text: '$5 craft pints, 4pm–6pm',
        image_url: r.cover_image_url,
        cover_image_url: r.cover_image_url,
      }))
    : [
        { restaurant_name: 'Iron Hill Brewery', detail_text: '$5 craft pints, 4pm–6pm', image_url: null, cover_image_url: null },
        { restaurant_name: 'The Pressroom', detail_text: 'Half-price apps, 5pm–7pm', image_url: null, cover_image_url: null },
        { restaurant_name: 'Tellus360', detail_text: 'Live music tonight at 8pm', image_url: null, cover_image_url: null },
      ];

  const today = new Date().toISOString().split('T')[0];

  // ═══════════════════════════════════════════════════════════
  // 1. Regular carousel (happy hours / specials)
  // ═══════════════════════════════════════════════════════════
  console.log('📰 Regular carousel (magazine style)...');
  try {
    const urls = await generateCarouselSlides({
      supabase, market: marketConfig, candidates,
      headline: { count: '15', label: 'Happy Hours', dayLabel: 'Happy Hour Tonight' },
      totalCount: 45, date: today,
    });
    const id = await insertDraftPost(market.id, 'tonight_today', urls,
      '🍻 15 happy hours pouring tonight in Lancaster. Swipe for our top picks → \n\n#LancasterPA #HappyHour #TasteLanc',
      'happy_hour_spotlight');
    console.log(`   ✅ ${urls.length} slides → draft post ${id || '(not saved)'}`);
  } catch (err: any) {
    console.log(`   ❌ ${err.message}`);
  }

  // ═══════════════════════════════════════════════════════════
  // 2. Event poster carousel
  // ═══════════════════════════════════════════════════════════
  const eventCandidates = candidates.filter(c => c.image_url || c.cover_image_url);
  if (eventCandidates.length > 0) {
    console.log('🎤 Event poster carousel...');
    try {
      const urls = await generateCarouselSlides({
        supabase, market: marketConfig,
        candidates: eventCandidates,
        headline: { count: '12', label: 'Events', dayLabel: 'This Weekend in Lancaster' },
        totalCount: 28, date: today, contentType: 'upcoming_events',
      });
      const id = await insertDraftPost(market.id, 'upcoming_events', urls,
        '🎶 12 live events this weekend in Lancaster. Don\'t miss out → \n\n#LancasterPA #LiveMusic #WeekendVibes',
        'weekend_preview');
      console.log(`   ✅ ${urls.length} slides → draft post ${id || '(not saved)'}`);
    } catch (err: any) {
      console.log(`   ❌ ${err.message}`);
    }
  } else {
    console.log('🎤 Event poster — skipped (no restaurants with photos)');
  }

  // ═══════════════════════════════════════════════════════════
  // 3. Weekly roundup
  // ═══════════════════════════════════════════════════════════
  console.log('📋 Weekly roundup carousel...');
  try {
    const urls = await composeWeeklyRoundupSlides({
      supabase, market: marketConfig, candidates,
      headline: { count: '20', label: 'Deals & Specials', dayLabel: 'Your Week Ahead' },
      totalCount: 50, date: today,
    });
    const id = await insertDraftPost(market.id, 'weekly_roundup', urls,
      '📋 Your weekly roundup: 20+ deals, specials, and events in Lancaster. Swipe → \n\n#LancasterPA #FoodDeals #TasteLanc',
      'weekly_roundup');
    console.log(`   ✅ ${urls.length} slides → draft post ${id || '(not saved)'}`);
  } catch (err: any) {
    console.log(`   ❌ ${err.message}`);
  }

  // ═══════════════════════════════════════════════════════════
  // 4. Restaurant spotlight
  // ═══════════════════════════════════════════════════════════
  if (restaurants && restaurants.length > 0) {
    const target = restaurants[0];
    console.log(`🔦 Spotlight: "${target.name}"...`);

    const { data: photos } = await supabase
      .from('restaurant_photos').select('id, url, caption, display_order, is_cover')
      .eq('restaurant_id', target.id).limit(6);

    const { data: hh } = await supabase
      .from('happy_hours').select('id, name, description, image_url, start_time, end_time, days_of_week, happy_hour_items(name, discounted_price, original_price)')
      .eq('restaurant_id', target.id).limit(2);

    const { data: specials } = await supabase
      .from('specials').select('id, name, description, image_url, special_price, original_price, days_of_week, start_time, end_time')
      .eq('restaurant_id', target.id).limit(3);

    const { data: events } = await supabase
      .from('events').select('id, name, description, image_url, event_type, start_time, performer_name, days_of_week, event_date, is_recurring')
      .eq('restaurant_id', target.id).limit(3);

    try {
      const urls = await composeRestaurantSpotlightSlides({
        supabase, market: marketConfig,
        restaurant: {
          id: target.id,
          name: target.name,
          slug: '',
          description: null,
          custom_description: null,
          cover_image_url: target.cover_image_url,
          logo_url: null,
          categories: [],
          tier_name: 'premium',
          market_id: market.id,
          photos: (photos || []).map(p => ({
            id: p.id, url: p.url, caption: p.caption || null,
            display_order: p.display_order || 0, is_cover: p.is_cover,
          })),
          happy_hours: (hh || []).map(h => ({
            id: h.id, name: h.name || '', description: h.description || null,
            image_url: h.image_url, start_time: h.start_time, end_time: h.end_time,
            days_of_week: h.days_of_week || [],
            items: (h.happy_hour_items || []).map((item: any) => ({
              name: item.name, discounted_price: item.discounted_price, original_price: item.original_price,
            })),
          })),
          deals: [],
          specials: (specials || []).map(s => ({
            id: s.id, name: s.name, description: s.description || null,
            image_url: s.image_url, special_price: s.special_price,
            original_price: s.original_price, days_of_week: s.days_of_week || [],
            start_time: s.start_time, end_time: s.end_time,
          })),
          events: (events || []).map(e => ({
            id: e.id, name: e.name || '', description: e.description || null,
            image_url: e.image_url, event_type: e.event_type,
            start_time: e.start_time, performer_name: e.performer_name || null,
            days_of_week: e.days_of_week || [], event_date: e.event_date || null,
            is_recurring: e.is_recurring,
          })),
        },
        date: today,
      });
      const id = await insertDraftPost(market.id, 'restaurant_spotlight', urls,
        `✨ Inside ${target.name} — happy hours, deals, events & more. Swipe to explore → \n\n#LancasterPA #TasteLanc`,
      );
      console.log(`   ✅ ${urls.length} slides → draft post ${id || '(not saved)'}`);
    } catch (err: any) {
      console.log(`   ❌ ${err.message}`);
    }
  }

  console.log('\n✅ Done! View your preview posts:');
  console.log('   → http://localhost:3000/admin/instagram-posts');
  console.log('   → Filter by status "draft" to see the new designs\n');
}

main().catch(console.error);
