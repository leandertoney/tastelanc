import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
config({ path: resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const googleMapsKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

if (!googleMapsKey) {
  console.error('Missing NEXT_PUBLIC_GOOGLE_MAPS_KEY - need this for Google Places API');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function searchPlace(name, lat, lng) {
  const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=100&keyword=${encodeURIComponent(name)}&key=${googleMapsKey}`;

  const res = await fetch(url);
  const data = await res.json();

  if (data.status === 'OK' && data.results.length > 0) {
    return data.results[0];
  }
  return null;
}

async function getPlacePhoto(photoReference, maxWidth = 800) {
  const url = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=${maxWidth}&photo_reference=${photoReference}&key=${googleMapsKey}`;

  const res = await fetch(url);
  if (!res.ok) return null;

  const buffer = await res.arrayBuffer();
  return Buffer.from(buffer);
}

async function uploadToSupabase(imageBuffer, restaurantId) {
  const fileName = `restaurants/${restaurantId}/cover.jpg`;

  const { data, error } = await supabase.storage
    .from('images')
    .upload(fileName, imageBuffer, {
      contentType: 'image/jpeg',
      upsert: true
    });

  if (error) {
    console.error(`Upload error for ${restaurantId}:`, error.message);
    return null;
  }

  const { data: urlData } = supabase.storage.from('images').getPublicUrl(fileName);
  return urlData.publicUrl;
}

async function main() {
  console.log('\n========== FETCH AND STORE IMAGES ==========\n');

  // Get all restaurants
  const { data: restaurants, error } = await supabase
    .from('restaurants')
    .select('id, name, latitude, longitude, cover_image_url')
    .eq('is_active', true);

  if (error) {
    console.error('Error fetching restaurants:', error.message);
    process.exit(1);
  }

  console.log(`Found ${restaurants.length} active restaurants\n`);

  let updated = 0;
  let failed = 0;
  let skipped = 0;

  for (const restaurant of restaurants) {
    // Skip if already has a Supabase URL
    if (restaurant.cover_image_url?.includes('supabase.co')) {
      skipped++;
      continue;
    }

    if (!restaurant.latitude || !restaurant.longitude) {
      console.log(`⚠️  ${restaurant.name} - No coordinates, skipping`);
      skipped++;
      continue;
    }

    console.log(`Processing: ${restaurant.name}...`);

    try {
      // Search for place
      const place = await searchPlace(restaurant.name, restaurant.latitude, restaurant.longitude);

      if (!place || !place.photos || place.photos.length === 0) {
        console.log(`   ❌ No photos found`);
        failed++;
        continue;
      }

      // Get photo
      const photoRef = place.photos[0].photo_reference;
      const imageBuffer = await getPlacePhoto(photoRef);

      if (!imageBuffer) {
        console.log(`   ❌ Failed to download photo`);
        failed++;
        continue;
      }

      // Upload to Supabase
      const newUrl = await uploadToSupabase(imageBuffer, restaurant.id);

      if (!newUrl) {
        console.log(`   ❌ Failed to upload`);
        failed++;
        continue;
      }

      // Update database
      const { error: updateError } = await supabase
        .from('restaurants')
        .update({ cover_image_url: newUrl })
        .eq('id', restaurant.id);

      if (updateError) {
        console.log(`   ❌ Failed to update DB: ${updateError.message}`);
        failed++;
        continue;
      }

      console.log(`   ✓ Updated with permanent URL`);
      updated++;

      // Rate limit - Google Places has quotas
      await new Promise(r => setTimeout(r, 200));

    } catch (err) {
      console.log(`   ❌ Error: ${err.message}`);
      failed++;
    }
  }

  console.log('\n========== SUMMARY ==========\n');
  console.log(`Updated:  ${updated}`);
  console.log(`Failed:   ${failed}`);
  console.log(`Skipped:  ${skipped}`);
  console.log('\n==============================\n');

  if (updated > 0) {
    console.log('✅ Images are now stored permanently in Supabase. They will never expire.\n');
  }
}

main();
