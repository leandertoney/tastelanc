/**
 * Generate Restaurant Week Magazine Preview
 *
 * Creates the 9-page Restaurant Week magazine and saves it as a draft
 * Instagram post for preview in the admin panel.
 *
 * Usage:
 *   cd apps/web
 *   npx tsx scripts/generate-rw-magazine-preview.ts
 *
 * Then view at: http://localhost:3000/admin/instagram-posts (filter: draft)
 */

import { config } from 'dotenv';
config({ path: '.env.local' });

import { createClient } from '@supabase/supabase-js';
import { generateRestaurantWeekMagazine } from '../lib/instagram/restaurant-week-magazine';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://kufcxxynjvyharhtfptd.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!SUPABASE_KEY) {
  console.error('❌ No Supabase key found in .env.local');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function main() {
  console.log('\n🗞️  Restaurant Week Magazine Generator\n');
  console.log('═'.repeat(60));

  // Fetch Lancaster market
  const { data: market, error: marketErr } = await supabase
    .from('markets')
    .select('id, slug, name, county, state')
    .eq('slug', 'lancaster-pa')
    .single();

  if (marketErr || !market) {
    console.error(`❌ Market not found: lancaster-pa`);
    process.exit(1);
  }

  console.log(`📍 Market: ${market.name}`);
  console.log(`📅 Date: Tomorrow (April 13, 2026)\n`);
  console.log('═'.repeat(60));

  const marketConfig = {
    market_id: market.id,
    market_slug: market.slug,
    market_name: market.name,
    county: market.county,
    state: market.state,
    instagram_account: null,
  };

  const date = '2026-04-13'; // Tomorrow - Restaurant Week launch day

  console.log('\n⏳ Generating 9-page magazine...\n');

  try {
    const carouselUrls = await generateRestaurantWeekMagazine({
      supabase,
      market: marketConfig,
      date,
    });

    console.log('\n✅ Magazine generated!\n');
    console.log('═'.repeat(60));
    console.log('\n📸 Pages:\n');
    carouselUrls.forEach((url, i) => {
      const pageNames = [
        'Cover',
        'Contents',
        'Participating Restaurants',
        'Featured Menus',
        'Thirsty for Knowledge',
        'Win Prizes',
        'Events This Week',
        'Leaderboard',
        'Back Cover'
      ];
      console.log(`  ${i + 1}. ${pageNames[i]}`);
      console.log(`     ${url}\n`);
    });

    console.log('═'.repeat(60));
    console.log('\n💾 Saving as draft Instagram post...\n');

    // Create draft Instagram post
    const { data: post, error: postErr } = await supabase
      .from('instagram_posts')
      .insert({
        market_id: market.id,
        post_date: date,
        content_type: 'tonight_today',
        selected_entity_ids: [],
        caption: `🗞️ Restaurant Week is here!\n\nApril 13–19 • Lancaster's biggest dining event of the year\n\n🍽️ Special menus at ${(await supabase.from('restaurants').select('id').eq('market_id', market.id).not('rw_description', 'is', null)).data?.length || '30+'}  restaurants\n🏆 Win prizes by checking in\n💡 TasteLanc is sponsoring a Thirsty for Knowledge round\n\nSwipe to see everything happening this week →\n\n#RestaurantWeek #LancasterPA #TasteLanc #ThirstyForKnowledge #LancasterDining`,
        media_urls: carouselUrls,
        status: 'draft',
        day_theme: 'weekly_roundup',
        generation_metadata: {
          post_type: 'restaurant_week_magazine',
          preview: true,
          generated_by: 'generate-rw-magazine-preview.ts',
          total_candidates: 0,
          total_hidden: 0,
          visible_names: [],
          decision_path: 'manual:rw_magazine',
          model_used: 'static',
          day_of_week: 'Monday',
        },
      })
      .select('id')
      .single();

    if (postErr) {
      console.log(`   ⚠️  Failed to save draft post: ${postErr.message}`);
      console.log('   (You can still view the images above)\n');
    } else {
      console.log(`   ✅ Draft post created! ID: ${post?.id}\n`);
    }

    console.log('═'.repeat(60));
    console.log('\n📱 Next Steps:\n');
    console.log('   1. Start the dev server: npm run dev');
    console.log('   2. Open: http://localhost:3000/admin/instagram-posts');
    console.log('   3. Filter by status "draft"');
    console.log('   4. Review the 9-page carousel');
    console.log('   5. If approved, change status to "pending_review" and schedule for Monday AM\n');
    console.log('═'.repeat(60));
    console.log('\n🎉 Done!\n');

  } catch (err: any) {
    console.error(`\n❌ Magazine generation failed:\n`);
    console.error(`   ${err.message}`);
    if (err.stack) {
      console.error(`\n   Stack trace:`);
      console.error(`   ${err.stack}`);
    }
    process.exit(1);
  }
}

main().catch(console.error);
