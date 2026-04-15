/**
 * Generate Restaurant Week Daily Instagram Posts
 * Creates mini-carousels for Tue-Sat with TFK leaderboard + themed content
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import sharp from 'sharp';

config({ path: '.env.local' });

const SUPABASE_URL = 'https://kufcxxynjvyharhtfptd.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const W = 1080;
const H = 1350;

// Daily themes
const DAILY_THEMES = {
  tuesday: {
    date: '2026-04-15',
    theme: 'happy_hour_spotlight',
    title: 'Happy Hour + Restaurant Week',
    emoji: '🍹',
  },
  wednesday: {
    date: '2026-04-16',
    theme: 'hidden_gems',
    title: 'Hidden Gems of Restaurant Week',
    emoji: '💎',
  },
  thursday: {
    date: '2026-04-17',
    theme: 'weekend_preview',
    title: 'Weekend Restaurant Week Guide',
    emoji: '🎉',
  },
  friday: {
    date: '2026-04-18',
    theme: 'specials_deals',
    title: 'Best RW Menu Deals',
    emoji: '🔥',
  },
  saturday: {
    date: '2026-04-19',
    theme: 'final_day',
    title: 'Last Day to Check In!',
    emoji: '⏰',
  },
};

async function createTFKLeaderboardSlide(): Promise<Buffer> {
  // Placeholder leaderboard - will show real data once available
  const gradient = Buffer.from(`
    <svg width="${W}" height="${H}">
      <defs>
        <linearGradient id="tfkGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" style="stop-color:#F9A8D4;stop-opacity:1"/>
          <stop offset="50%" style="stop-color:#C084FC;stop-opacity:1"/>
          <stop offset="100%" style="stop-color:#93C5FD;stop-opacity:1"/>
        </linearGradient>
      </defs>
      <rect width="${W}" height="${H}" fill="url(#tfkGrad)"/>

      <text x="540" y="200" font-family="Arial" font-weight="900" font-size="48" fill="#1A2A4A" text-anchor="middle">
        Thirsty for Knowledge
      </text>
      <text x="540" y="260" font-family="Arial" font-weight="700" font-size="32" fill="#1A2A4A" text-anchor="middle">
        Restaurant Week Leaderboard
      </text>

      <text x="540" y="400" font-family="Arial" font-weight="600" font-size="24" fill="#1A2A4A" text-anchor="middle">
        Check in at TFK trivia tonight
      </text>
      <text x="540" y="440" font-family="Arial" font-weight="600" font-size="24" fill="#1A2A4A" text-anchor="middle">
        to compete for $25 prizes!
      </text>

      <text x="540" y="600" font-family="Arial" font-weight="500" font-size="20" fill="#1A2A4A" text-anchor="middle">
        🏆 Top players will be announced
      </text>
      <text x="540" y="640" font-family="Arial" font-weight="500" font-size="20" fill="#1A2A4A" text-anchor="middle">
        as the week progresses
      </text>
    </svg>
  `);

  return sharp(gradient).jpeg({ quality: 90 }).toBuffer();
}

async function createRestaurantSlide(
  restaurantName: string,
  detail: string,
  imageUrl: string | null
): Promise<Buffer> {
  let base: sharp.Sharp;

  if (imageUrl) {
    try {
      const response = await fetch(imageUrl);
      const imageBuffer = Buffer.from(await response.arrayBuffer());
      base = sharp(imageBuffer).resize(W, H, { fit: 'cover' });
    } catch (err) {
      base = sharp({
        create: { width: W, height: H, channels: 3, background: { r: 200, g: 200, b: 200 } },
      });
    }
  } else {
    base = sharp({
      create: { width: W, height: H, channels: 3, background: { r: 200, g: 200, b: 200 } },
    });
  }

  const overlay = Buffer.from(`
    <svg width="${W}" height="${H}">
      <rect x="0" y="${H - 300}" width="${W}" height="300" fill="rgba(0,0,0,0.7)"/>
      <text x="540" y="${H - 220}" font-family="Arial" font-weight="900" font-size="42" fill="white" text-anchor="middle">
        ${restaurantName}
      </text>
      <text x="540" y="${H - 160}" font-family="Arial" font-weight="600" font-size="28" fill="white" text-anchor="middle">
        ${detail}
      </text>
    </svg>
  `);

  return base.composite([{ input: overlay }]).jpeg({ quality: 90 }).toBuffer();
}

async function generateDailyPost(day: keyof typeof DAILY_THEMES) {
  const config = DAILY_THEMES[day];
  console.log(`\n📅 Generating ${day.toUpperCase()} (${config.date}): ${config.title}\n`);

  const { data: market } = await supabase
    .from('markets')
    .select('id')
    .eq('slug', 'lancaster-pa')
    .single();

  if (!market) throw new Error('Market not found');

  const slides: Buffer[] = [];
  const slideDescriptions: string[] = [];

  // Slide 1: TFK Leaderboard
  console.log('  📊 Creating TFK leaderboard slide...');
  slides.push(await createTFKLeaderboardSlide());
  slideDescriptions.push('TFK Leaderboard');

  // Slides 2-4: Theme-specific content
  let restaurants: any[] = [];

  if (day === 'tuesday') {
    // Happy Hour Spotlight
    const { data } = await supabase
      .from('restaurants')
      .select('name, cover_image_url, happy_hours(name, description)')
      .eq('market_id', market.id)
      .not('rw_description', 'is', null)
      .eq('is_active', true)
      .not('cover_image_url', 'is', null)
      .limit(3);

    restaurants = data || [];
    for (const r of restaurants) {
      const hh = r.happy_hours?.[0];
      const detail = hh?.name || 'Happy Hour Available';
      slides.push(await createRestaurantSlide(r.name, detail, r.cover_image_url));
      slideDescriptions.push(`${r.name} - ${detail}`);
    }
  } else if (day === 'wednesday') {
    // Hidden Gems
    const { data } = await supabase
      .from('restaurants')
      .select('name, cover_image_url, description')
      .eq('market_id', market.id)
      .not('rw_description', 'is', null)
      .eq('is_active', true)
      .not('cover_image_url', 'is', null)
      .order('name')
      .limit(3);

    restaurants = data || [];
    for (const r of restaurants) {
      slides.push(await createRestaurantSlide(r.name, 'Restaurant Week Participant', r.cover_image_url));
      slideDescriptions.push(`${r.name} - Hidden Gem`);
    }
  } else if (day === 'thursday') {
    // Weekend Preview
    const { data } = await supabase
      .from('restaurants')
      .select('name, cover_image_url')
      .eq('market_id', market.id)
      .not('rw_description', 'is', null)
      .eq('is_active', true)
      .not('cover_image_url', 'is', null)
      .order('name')
      .limit(3);

    restaurants = data || [];
    for (const r of restaurants) {
      slides.push(await createRestaurantSlide(r.name, 'Open This Weekend', r.cover_image_url));
      slideDescriptions.push(`${r.name} - Weekend`);
    }
  } else if (day === 'friday') {
    // Best Deals
    const { data } = await supabase
      .from('restaurants')
      .select('name, cover_image_url, rw_description')
      .eq('market_id', market.id)
      .not('rw_description', 'is', null)
      .eq('is_active', true)
      .not('cover_image_url', 'is', null)
      .limit(3);

    restaurants = data || [];
    for (const r of restaurants) {
      slides.push(await createRestaurantSlide(r.name, 'Restaurant Week Menu', r.cover_image_url));
      slideDescriptions.push(`${r.name} - Menu`);
    }
  } else if (day === 'saturday') {
    // Final Day
    const { data } = await supabase
      .from('restaurants')
      .select('name, cover_image_url')
      .eq('market_id', market.id)
      .not('rw_description', 'is', null)
      .eq('is_active', true)
      .not('cover_image_url', 'is', null)
      .limit(3);

    restaurants = data || [];
    for (const r of restaurants) {
      slides.push(await createRestaurantSlide(r.name, 'Last Chance!', r.cover_image_url));
      slideDescriptions.push(`${r.name} - Final Day`);
    }
  }

  console.log(`  ✅ Created ${slides.length} slides`);

  // Upload slides
  const uploadedUrls: string[] = [];
  const timestamp = Date.now();

  for (let i = 0; i < slides.length; i++) {
    const path = `instagram/lancaster-pa/${config.date}/rw-daily-${day}-${timestamp}/slide-${i + 1}.jpg`;
    const { error } = await supabase.storage.from('images').upload(path, slides[i], {
      contentType: 'image/jpeg',
      upsert: true,
    });

    if (error) {
      console.error(`  ❌ Upload failed for slide ${i + 1}:`, error);
      continue;
    }

    const url = `${SUPABASE_URL}/storage/v1/object/public/images/${path}`;
    uploadedUrls.push(url);
    console.log(`  📤 Uploaded slide ${i + 1}: ${slideDescriptions[i]}`);
  }

  // Create caption
  const caption = `${config.emoji} ${config.title}

Restaurant Week continues! ${day === 'saturday' ? 'Today is the LAST DAY!' : ''}

${config.emoji} Check in at TFK trivia to compete for $25 nightly prizes
🍽️ Explore special menus at 49 participating restaurants
🏆 Earn points towards grand prizes

Swipe to see featured spots →

#RestaurantWeek #LancasterPA #ThirstyForKnowledge #TasteLanc`;

  // Save draft post
  const { data: post, error: postError } = await supabase
    .from('instagram_posts')
    .insert({
      market_id: market.id,
      post_date: config.date,
      content_type: 'tonight_today',
      day_theme: config.theme,
      selected_entity_ids: [],
      caption,
      media_urls: uploadedUrls,
      status: 'draft',
      generation_metadata: {
        post_type: config.theme,
        generated_by: 'generate-rw-daily-posts.ts',
        day_of_week: day,
      },
    })
    .select('id')
    .single();

  if (postError) {
    console.error(`  ❌ Failed to save post:`, postError);
  } else {
    console.log(`  ✅ Draft post created: ${post?.id}`);
  }

  return uploadedUrls;
}

async function main() {
  console.log('🗓️  Restaurant Week Daily Post Generator\n');
  console.log('═'.repeat(60));

  try {
    await generateDailyPost('tuesday');
    await generateDailyPost('wednesday');
    await generateDailyPost('thursday');
    await generateDailyPost('friday');
    await generateDailyPost('saturday');

    console.log('\n═'.repeat(60));
    console.log('\n✅ All daily posts generated!\n');
    console.log('📱 View at: http://localhost:3000/admin/instagram-posts\n');
  } catch (err: any) {
    console.error('\n❌ Error:', err.message);
    process.exit(1);
  }
}

main();
