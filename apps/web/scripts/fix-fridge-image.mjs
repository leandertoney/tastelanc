import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, '../.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);
const GOOGLE_API_KEY = 'AIzaSyA2pfw7scIrffb_O_o1Jvj7iimp2Pg3jZE';

async function fixFridge() {
  // Get The Fridge
  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('id, name, latitude, longitude')
    .ilike('name', '%fridge%')
    .single();

  console.log('Found:', restaurant.name);
  console.log('Coordinates:', restaurant.latitude, restaurant.longitude);

  // Search Google Places with text search for better results
  const textUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent('The Fridge beer Lancaster PA 534 Mulberry')}&key=${GOOGLE_API_KEY}`;
  const textRes = await fetch(textUrl);
  const textData = await textRes.json();

  if (textData.status !== 'OK' || !textData.results || textData.results.length === 0) {
    console.log('No results found');
    return;
  }

  const place = textData.results[0];
  console.log('Found place:', place.name);

  if (!place.photos || place.photos.length === 0) {
    console.log('No photos for this place');
    return;
  }

  const photoRef = place.photos[0].photo_reference;
  console.log('Got photo reference');

  // Download photo
  const photoUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photo_reference=${photoRef}&key=${GOOGLE_API_KEY}`;
  const photoRes = await fetch(photoUrl);
  const buffer = await photoRes.arrayBuffer();
  console.log('Downloaded:', buffer.byteLength, 'bytes');

  // Upload to Supabase (overwrite)
  const fileName = `restaurants/${restaurant.id}/cover.jpg`;
  const { error: uploadError } = await supabase.storage
    .from('images')
    .upload(fileName, Buffer.from(buffer), { contentType: 'image/jpeg', upsert: true });

  if (uploadError) {
    console.log('Upload error:', uploadError.message);
    return;
  }

  console.log('✓ Uploaded new image for The Fridge');

  // Verify
  const { data: urlData } = supabase.storage.from('images').getPublicUrl(fileName);
  console.log('URL:', urlData.publicUrl);
}

fixFridge();
