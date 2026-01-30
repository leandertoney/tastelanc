/**
 * Backfill analytics_page_views from historical page_views data
 *
 * This script:
 * 1. Reads from page_views table (paths like /restaurants/{slug})
 * 2. Matches restaurant slugs to get restaurant_id
 * 3. Inserts into analytics_page_views with proper restaurant_id
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://kufcxxynjvyharhtfptd.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseServiceKey) {
  console.error('SUPABASE_SERVICE_ROLE_KEY is required');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function backfillAnalytics() {
  console.log('Starting analytics backfill...');

  // Step 1: Get all restaurants with their slugs
  console.log('Fetching restaurants...');
  const { data: restaurants, error: restaurantsError } = await supabase
    .from('restaurants')
    .select('id, slug, name');

  if (restaurantsError) {
    console.error('Error fetching restaurants:', restaurantsError);
    return;
  }

  console.log(`Found ${restaurants?.length || 0} restaurants`);

  // Create a map of slug -> restaurant_id
  const slugToId = new Map<string, string>();
  restaurants?.forEach(r => {
    if (r.slug) {
      slugToId.set(r.slug.toLowerCase(), r.id);
    }
  });

  // Step 2: Get page_views that match restaurant paths
  console.log('Fetching page views...');
  const { data: pageViews, error: pageViewsError } = await supabase
    .from('page_views')
    .select('*')
    .like('page_path', '/restaurants/%')
    .order('created_at', { ascending: true });

  if (pageViewsError) {
    console.error('Error fetching page views:', pageViewsError);
    return;
  }

  console.log(`Found ${pageViews?.length || 0} restaurant page views`);

  // Step 3: Check what's already been backfilled
  const { count: existingCount } = await supabase
    .from('analytics_page_views')
    .select('*', { count: 'exact', head: true });

  console.log(`analytics_page_views already has ${existingCount || 0} records`);

  // Step 4: Transform and insert
  let inserted = 0;
  let skipped = 0;
  let notFound = 0;

  const batchSize = 100;
  const toInsert: Array<{
    page_type: string;
    page_path: string;
    restaurant_id: string;
    visitor_id: string | null;
    referrer: string | null;
    user_agent: string | null;
    viewed_at: string;
  }> = [];

  for (const view of pageViews || []) {
    // Extract slug from path: /restaurants/{slug} or /restaurants/{slug}/something
    const pathMatch = view.page_path.match(/^\/restaurants\/([^/?]+)/);
    if (!pathMatch) {
      skipped++;
      continue;
    }

    const slug = pathMatch[1].toLowerCase();
    const restaurantId = slugToId.get(slug);

    if (!restaurantId) {
      notFound++;
      continue;
    }

    toInsert.push({
      page_type: 'restaurant',
      page_path: view.page_path,
      restaurant_id: restaurantId,
      visitor_id: view.visitor_id,
      referrer: view.referrer,
      user_agent: view.user_agent,
      viewed_at: view.created_at,
    });

    // Insert in batches
    if (toInsert.length >= batchSize) {
      const { error: insertError } = await supabase
        .from('analytics_page_views')
        .insert(toInsert);

      if (insertError) {
        console.error('Insert error:', insertError);
      } else {
        inserted += toInsert.length;
        console.log(`Inserted ${inserted} records...`);
      }
      toInsert.length = 0;
    }
  }

  // Insert remaining
  if (toInsert.length > 0) {
    const { error: insertError } = await supabase
      .from('analytics_page_views')
      .insert(toInsert);

    if (insertError) {
      console.error('Insert error:', insertError);
    } else {
      inserted += toInsert.length;
    }
  }

  console.log('\n=== Backfill Complete ===');
  console.log(`Inserted: ${inserted}`);
  console.log(`Skipped (no match pattern): ${skipped}`);
  console.log(`Not found (slug not in DB): ${notFound}`);

  // Verify final count
  const { count: finalCount } = await supabase
    .from('analytics_page_views')
    .select('*', { count: 'exact', head: true });

  console.log(`Total analytics_page_views: ${finalCount}`);
}

backfillAnalytics().catch(console.error);
