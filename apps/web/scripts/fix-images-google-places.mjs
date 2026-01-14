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

// Check if URL is broken (gps-cs-s format)
function isBrokenUrl(url) {
  if (!url) return true;
  if (url.includes('gps-cs-s')) return true;
  if (url.includes('gps-proxy')) return true;
  return false;
}

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
  console.log('\n========== FIX IMAGES VIA GOOGLE PLACES API ==========\n');

  // Get restaurants with broken images
  const { data: restaurants, error } = await supabase
    .from('restaurants')
    .select('id, name, latitude, longitude, cover_image_url')
    .eq('is_active', true);

  if (error) {
    console.error('Error fetching restaurants:', error.message);
    process.exit(1);
  }

  const broken = restaurants.filter(r => isBrokenUrl(r.cover_image_url));
  console.log(`Total restaurants: ${restaurants.length}`);
  console.log(`With broken images: ${broken.length}\n`);

  let fixed = 0;
  let failed = 0;
  let noPhoto = 0;

  for (let i = 0; i < broken.length; i++) {
    const r = broken[i];
    process.stdout.write(`[${i + 1}/${broken.length}] ${r.name}... `);

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

      // Rate limit - be nice to Google
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
  console.log(`Total:     ${broken.length}`);
  console.log('\n==============================\n');

  if (fixed > 0) {
    console.log('✅ Images fixed! Pull-to-refresh in the app to see them.\n');
  }
}

main();
