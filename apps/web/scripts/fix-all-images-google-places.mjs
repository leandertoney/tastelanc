import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const GOOGLE_API_KEY = 'AIzaSyA2pfw7scIrffb_O_o1Jvj7iimp2Pg3jZE';

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Search for place using Google Places API
async function findPlace(name, lat, lng) {
  const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=100&keyword=${encodeURIComponent(name)}&key=${GOOGLE_API_KEY}`;

  const res = await fetch(url);
  const data = await res.json();

  if (data.status === 'OK' && data.results.length > 0) {
    return data.results[0];
  }

  // Try text search as fallback
  const textUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(name + ' Lancaster PA')}&key=${GOOGLE_API_KEY}`;
  const textRes = await fetch(textUrl);
  const textData = await textRes.json();

  if (textData.status === 'OK' && textData.results.length > 0) {
    return textData.results[0];
  }

  return null;
}

// Get photo from Google Places
async function getPlacePhoto(photoReference) {
  const url = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photo_reference=${photoReference}&key=${GOOGLE_API_KEY}`;

  const res = await fetch(url);
  if (!res.ok) return null;

  const buffer = await res.arrayBuffer();
  return Buffer.from(buffer);
}

// Upload to Supabase Storage
async function uploadToSupabase(imageBuffer, restaurantId) {
  const fileName = `restaurants/${restaurantId}/cover.jpg`;

  const { error } = await supabase.storage
    .from('images')
    .upload(fileName, imageBuffer, {
      contentType: 'image/jpeg',
      upsert: true
    });

  if (error) {
    return null;
  }

  const { data } = supabase.storage.from('images').getPublicUrl(fileName);
  return data.publicUrl;
}

async function main() {
  console.log('\n========== FIX ALL IMAGES VIA GOOGLE PLACES API ==========\n');

  // Get restaurants NOT on Supabase yet
  const { data: restaurants, error } = await supabase
    .from('restaurants')
    .select('id, name, latitude, longitude, cover_image_url')
    .eq('is_active', true);

  if (error) {
    console.error('Error fetching restaurants:', error.message);
    process.exit(1);
  }

  // Filter to those not already on Supabase
  const needsUpdate = restaurants.filter(r => !r.cover_image_url?.includes('supabase.co'));

  console.log(`Total restaurants: ${restaurants.length}`);
  console.log(`Already on Supabase: ${restaurants.length - needsUpdate.length}`);
  console.log(`Need Google Places images: ${needsUpdate.length}\n`);

  let fixed = 0;
  let failed = 0;
  let noPhoto = 0;

  for (let i = 0; i < needsUpdate.length; i++) {
    const r = needsUpdate[i];
    process.stdout.write(`[${i + 1}/${needsUpdate.length}] ${r.name}... `);

    if (!r.latitude || !r.longitude) {
      console.log('❌ No coordinates');
      failed++;
      continue;
    }

    try {
      // Find place
      const place = await findPlace(r.name, r.latitude, r.longitude);

      if (!place) {
        console.log('❌ Place not found');
        failed++;
        continue;
      }

      if (!place.photos || place.photos.length === 0) {
        console.log('❌ No photos available');
        noPhoto++;
        continue;
      }

      // Get photo
      const photoRef = place.photos[0].photo_reference;
      const imageBuffer = await getPlacePhoto(photoRef);

      if (!imageBuffer || imageBuffer.length < 1000) {
        console.log('❌ Failed to download photo');
        failed++;
        continue;
      }

      // Upload to Supabase
      const newUrl = await uploadToSupabase(imageBuffer, r.id);

      if (!newUrl) {
        console.log('❌ Upload failed');
        failed++;
        continue;
      }

      // Update database
      const { error: updateError } = await supabase
        .from('restaurants')
        .update({ cover_image_url: newUrl })
        .eq('id', r.id);

      if (updateError) {
        console.log('❌ DB update failed');
        failed++;
        continue;
      }

      console.log('✓');
      fixed++;

      // Rate limit
      await new Promise(resolve => setTimeout(resolve, 100));

    } catch (err) {
      console.log(`❌ Error: ${err.message}`);
      failed++;
    }
  }

  console.log('\n========== SUMMARY ==========\n');
  console.log(`Fixed:     ${fixed}`);
  console.log(`No photos: ${noPhoto}`);
  console.log(`Failed:    ${failed}`);
  console.log(`Total:     ${needsUpdate.length}`);
  console.log('\n==============================\n');
}

main();
