import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
// Use the same working key Cumberland uses. The AIzaSyA2... key has billing disabled.
const GOOGLE_API_KEY = 'AIzaSyCs5oTNGnEoBbyvsnOhv86MDwkokILqM2g';
const FAYETTEVILLE_MARKET_ID = 'c7b79d18-0bb6-434d-926a-0f8cdf420acb';

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const args = process.argv.slice(2);
const limitArg = args.find(a => a.startsWith('--limit='));
const LIMIT = limitArg ? parseInt(limitArg.split('=')[1]) : null;
const dryRun = args.includes('--dry-run');

// Find place via Google Places (nearbysearch first, textsearch fallback)
async function findPlace(name, lat, lng) {
  if (lat && lng) {
    const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=200&keyword=${encodeURIComponent(name)}&key=${GOOGLE_API_KEY}`;
    const res = await fetch(url);
    const data = await res.json();
    if (data.status === 'OK' && data.results.length > 0) return data.results[0];
  }
  const textUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(name + ' Fayetteville NC')}&key=${GOOGLE_API_KEY}`;
  const textRes = await fetch(textUrl);
  const textData = await textRes.json();
  if (textData.status === 'OK' && textData.results.length > 0) return textData.results[0];
  return null;
}

async function getPlacePhoto(photoReference) {
  const url = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photo_reference=${photoReference}&key=${GOOGLE_API_KEY}`;
  const res = await fetch(url, { redirect: 'follow' });
  if (!res.ok) return null;
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 1000) return null;
  return buf;
}

async function uploadToSupabase(imageBuffer, restaurantId) {
  const fileName = `restaurants/${restaurantId}/cover.jpg`;
  const { error } = await supabase.storage
    .from('images')
    .upload(fileName, imageBuffer, { contentType: 'image/jpeg', upsert: true });
  if (error) return null;
  const { data } = supabase.storage.from('images').getPublicUrl(fileName);
  return data.publicUrl;
}

async function main() {
  console.log('========== FAYETTEVILLE IMAGE BACKFILL (Google Places API) ==========\n');

  const { data: restaurants, error } = await supabase
    .from('restaurants')
    .select('id, name, latitude, longitude, cover_image_url')
    .eq('market_id', FAYETTEVILLE_MARKET_ID)
    .eq('is_active', true);

  if (error) {
    console.error('Query error:', error.message);
    process.exit(1);
  }

  // Target rows NOT already on Supabase Storage
  const needsFix = restaurants.filter(
    r => !r.cover_image_url?.includes('supabase.co')
  );

  console.log(`Total Fayetteville restaurants:      ${restaurants.length}`);
  console.log(`Already on Supabase Storage:         ${restaurants.length - needsFix.length}`);
  console.log(`Need fresh Google Places photo:      ${needsFix.length}`);
  if (LIMIT) console.log(`Limit:                               ${LIMIT}`);
  console.log();

  const target = LIMIT ? needsFix.slice(0, LIMIT) : needsFix;

  if (dryRun) {
    console.log('--- DRY RUN (first 10) ---');
    for (const r of target.slice(0, 10)) {
      console.log(`  ${r.name} | coords=${r.latitude},${r.longitude} | has_url=${!!r.cover_image_url}`);
    }
    return;
  }

  let fixed = 0, failed = 0, noPhoto = 0, noPlace = 0;
  const startTime = Date.now();

  for (let i = 0; i < target.length; i++) {
    const r = target[i];
    const progress = `[${i + 1}/${target.length}]`;
    process.stdout.write(`${progress} ${r.name.substring(0, 40).padEnd(40)} ... `);

    try {
      const place = await findPlace(r.name, r.latitude, r.longitude);
      if (!place) {
        console.log('✗ place not found on Google');
        noPlace++;
        continue;
      }

      if (!place.photos || place.photos.length === 0) {
        console.log('✗ Google has place but no photos');
        noPhoto++;
        continue;
      }

      const imageBuffer = await getPlacePhoto(place.photos[0].photo_reference);
      if (!imageBuffer) {
        console.log('✗ photo download failed');
        failed++;
        continue;
      }

      const newUrl = await uploadToSupabase(imageBuffer, r.id);
      if (!newUrl) {
        console.log('✗ upload failed');
        failed++;
        continue;
      }

      const { error: updateError } = await supabase
        .from('restaurants')
        .update({ cover_image_url: newUrl })
        .eq('id', r.id);

      if (updateError) {
        console.log(`✗ db: ${updateError.message}`);
        failed++;
        continue;
      }

      console.log(`✓ ${(imageBuffer.length / 1024).toFixed(0)}kb`);
      fixed++;

      // Rate limit: ~10 qps. Each restaurant = 2 requests (find + photo).
      await new Promise(r => setTimeout(r, 100));
    } catch (err) {
      console.log(`✗ error: ${err.message}`);
      failed++;
    }

    if ((i + 1) % 50 === 0) {
      const elapsed = ((Date.now() - startTime) / 1000 / 60).toFixed(1);
      console.log(`--- progress: ${fixed} fixed, ${failed} failed, ${noPhoto} no-photo, ${noPlace} no-place (${elapsed}m) ---`);
    }
  }

  const totalMin = ((Date.now() - startTime) / 1000 / 60).toFixed(1);
  console.log('\n========== SUMMARY ==========');
  console.log(`Fixed:     ${fixed} (fresh images on Supabase Storage)`);
  console.log(`No photos: ${noPhoto} (Google has the place but no uploaded photos)`);
  console.log(`No place:  ${noPlace} (Google couldn't match this restaurant)`);
  console.log(`Failed:    ${failed}`);
  console.log(`Total:     ${target.length}`);
  console.log(`Elapsed:   ${totalMin} min`);
}

main().catch(err => { console.error(err); process.exit(1); });
