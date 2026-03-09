/**
 * Seed demo data for the Pulse tab feed.
 * Simulates an active community with photos, videos, votes, and check-ins
 * spread naturally across the last 48 hours.
 * Run: npx tsx scripts/seed-pulse-demo.ts
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://kufcxxynjvyharhtfptd.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/** Returns a Date that is `minutesAgo` minutes in the past */
function minsAgo(n: number) {
  const d = new Date();
  d.setMinutes(d.getMinutes() - n);
  return d.toISOString();
}

async function main() {
  // ── Get market
  const { data: market, error: mErr } = await supabase
    .from('markets').select('id,slug').eq('slug', 'lancaster-pa').single();
  if (mErr || !market) { console.error('Market error:', mErr); process.exit(1); }
  console.log('Market:', market.id);

  // ── Get top restaurants with cover images
  const { data: restaurants, error: rErr } = await supabase
    .from('restaurants')
    .select('id,name,cover_image_url')
    .eq('market_id', market.id)
    .not('cover_image_url', 'is', null)
    .eq('is_active', true)
    .order('tastelancrating', { ascending: false })
    .limit(20);
  if (rErr || !restaurants?.length) { console.error('Restaurants error:', rErr); process.exit(1); }
  console.log(`Found ${restaurants.length} restaurants`);

  // ── Get a user id
  const { data: users } = await supabase.from('profiles').select('id').limit(5);
  const userId = users?.[0]?.id;
  if (!userId) { console.error('No users found'); process.exit(1); }
  console.log('User:', userId);

  const DEMO_VIDEO_URL = 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4';

  // ─────────────────────────────────────────────────────────────────────────
  // 1. RESTAURANT PHOTOS — seed 2-3 food/interior photos per top restaurant
  //    Use cover_image_url variants as standin (in real app these'd be user uploads)
  // ─────────────────────────────────────────────────────────────────────────
  await supabase.from('restaurant_photos').delete().eq('restaurant_id', restaurants[0].id); // clear just to reset

  const photoRows: any[] = [];
  restaurants.slice(0, 10).forEach((r) => {
    // Use cover as first non-cover photo (standin for food photo), plus two URL variants
    // (In prod these'd be real user-uploaded shots)
    [
      { url: r.cover_image_url, is_cover: false },
      { url: r.cover_image_url + '?v=interior', is_cover: false },
    ].forEach(({ url, is_cover }) => {
      photoRows.push({ restaurant_id: r.id, url, is_cover, caption: null });
    });
  });

  // Wipe & re-insert demo photos for top 10 restaurants
  await supabase
    .from('restaurant_photos')
    .delete()
    .in('restaurant_id', restaurants.slice(0, 10).map((r) => r.id))
    .eq('is_cover', false);

  const { data: insertedPhotos, error: photoErr } = await supabase
    .from('restaurant_photos').insert(photoRows).select('id');
  if (photoErr) console.error('Photos error:', photoErr);
  else console.log(`Inserted ${insertedPhotos?.length} restaurant photos`);

  // ─────────────────────────────────────────────────────────────────────────
  // 2. VIDEO RECOMMENDATIONS — spread across last 6 hours with varied captions
  // ─────────────────────────────────────────────────────────────────────────
  await supabase.from('restaurant_recommendations').delete().eq('user_id', userId);

  const videoRows = [
    { r: 0,  minsBack: 8,   caption: 'The cocktails here are absolutely insane 🍸',          tag: 'must_try_dish',     views: 847,  likes: 203 },
    { r: 1,  minsBack: 34,  caption: 'Hidden gem alert — best brunch in Lancaster 🥞',        tag: 'hidden_gem',        views: 1243, likes: 389 },
    { r: 2,  minsBack: 71,  caption: 'Friday night vibes at their rooftop bar 🌆',            tag: 'best_vibes',        views: 2104, likes: 512 },
    { r: 3,  minsBack: 110, caption: 'This is not a drill. Get the smash burger. 🍔',          tag: 'must_try_dish',     views: 634,  likes: 178 },
    { r: 4,  minsBack: 185, caption: 'Date night done right 🕯️ Ambiance is everything',       tag: 'perfect_date_spot', views: 921,  likes: 267 },
    { r: 5,  minsBack: 290, caption: 'Happy hour from 4–6pm and the deals are real 🍺',       tag: 'go_to_spot',        views: 456,  likes: 134 },
    { r: 6,  minsBack: 420, caption: 'I drive 45 minutes just to come here. Worth it every time', tag: 'go_to_spot',   views: 712,  likes: 198 },
    { r: 7,  minsBack: 580, caption: 'Their pasta is genuinely life-changing 🍝',              tag: 'must_try_dish',     views: 1089, likes: 344 },
  ].map(({ r, minsBack, caption, tag, views, likes }) => ({
    restaurant_id: restaurants[r % restaurants.length].id,
    market_id: market.id,
    user_id: userId,
    video_url: DEMO_VIDEO_URL,
    thumbnail_url: restaurants[r % restaurants.length].cover_image_url,
    caption,
    caption_tag: tag,
    view_count: views,
    like_count: likes,
    is_visible: true,
    created_at: minsAgo(minsBack),
  }));

  const { data: insertedRecs, error: recErr } = await supabase
    .from('restaurant_recommendations').insert(videoRows).select('id');
  if (recErr) console.error('Recs error:', recErr);
  else console.log(`Inserted ${insertedRecs?.length} video recommendations`);

  // ─────────────────────────────────────────────────────────────────────────
  // 3. VOTES — spread across last 24 hours, different categories
  // ─────────────────────────────────────────────────────────────────────────
  await supabase.from('votes').delete().eq('user_id', userId).eq('month', '2026-03');

  const voteData = [
    { r: 8,  minsBack: 14,  category: 'Best Happy Hour' },
    { r: 9,  minsBack: 52,  category: 'Best Date Night' },
    { r: 10, minsBack: 143, category: 'Best Brunch Spot' },
    { r: 11, minsBack: 267, category: 'Best Cocktails' },
    { r: 12, minsBack: 390, category: 'Best Hidden Gem' },
    { r: 13, minsBack: 511, category: 'Best Live Music' },
    { r: 14, minsBack: 720, category: 'Best Outdoor Dining' },
    { r: 15, minsBack: 980, category: 'Best Late Night Spot' },
  ];

  // votes table doesn't have created_at override in insert — insert them one by one with updates after
  const voteRows = voteData.map(({ r, category }) => ({
    restaurant_id: restaurants[r % restaurants.length].id,
    user_id: userId,
    category,
    month: '2026-03',
  }));

  const { data: insertedVotes, error: voteErr } = await supabase
    .from('votes').insert(voteRows).select('id');
  if (voteErr) console.error('Votes error:', voteErr);
  else {
    console.log(`Inserted ${insertedVotes?.length} votes`);
    // Backdate them so they spread across the feed
    if (insertedVotes) {
      for (let i = 0; i < insertedVotes.length; i++) {
        await supabase
          .from('votes')
          .update({ created_at: minsAgo(voteData[i].minsBack) })
          .eq('id', insertedVotes[i].id);
      }
      console.log('Backdated votes across last 24h');
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 4. CHECK-INS — buzz data spread across last 7 days
  // ─────────────────────────────────────────────────────────────────────────
  await supabase.from('checkins').delete().eq('user_id', userId);

  const buzzRestaurants = restaurants.slice(0, 8);
  const checkInRows: any[] = [];
  const now = new Date();

  buzzRestaurants.forEach((restaurant, ri) => {
    const count = [24, 18, 14, 10, 8, 6, 5, 3][ri] ?? 3;
    for (let i = 0; i < count; i++) {
      const daysAgo = Math.floor(Math.random() * 7);
      const hoursAgo = Math.floor(Math.random() * 22);
      const ts = new Date(now);
      ts.setDate(ts.getDate() - daysAgo);
      ts.setHours(ts.getHours() - hoursAgo);
      checkInRows.push({
        user_id: userId,
        restaurant_id: restaurant.id,
        restaurant_name: restaurant.name,
        points_earned: 10,
        created_at: ts.toISOString(),
      });
    }
  });

  const { data: insertedCheckins, error: checkinErr } = await supabase
    .from('checkins').insert(checkInRows).select('id');
  if (checkinErr) console.error('Checkins error:', checkinErr);
  else console.log(`Inserted ${insertedCheckins?.length} checkins across ${buzzRestaurants.length} restaurants`);

  console.log('\n✅ Done! Pull to refresh on the Pulse tab to see the mixed feed.');
}

main().catch((e) => { console.error(e); process.exit(1); });
