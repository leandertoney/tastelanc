import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { randomUUID } from 'crypto';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, '../.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);
const GOOGLE_API_KEY = 'AIzaSyA2pfw7scIrffb_O_o1Jvj7iimp2Pg3jZE';

async function restoreStubbys() {
  // Get existing Stubby's to copy tier_id and other fields
  const { data: existing } = await supabase
    .from('restaurants')
    .select('*')
    .ilike('name', '%stubby%')
    .single();

  if (!existing) {
    console.log("Could not find existing Stubby's");
    return;
  }

  console.log("Found existing Stubby's at:", existing.address);

  // Search Google Places for the Olde Hickory location
  const query = encodeURIComponent("Stubby's Bar and Grille 701 Olde Hickory Rd Lancaster PA");
  const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${query}&key=${GOOGLE_API_KEY}`;

  const res = await fetch(url);
  const data = await res.json();

  if (data.status !== 'OK' || !data.results.length) {
    console.log('Could not find on Google Places');
    return;
  }

  const place = data.results[0];
  console.log('Found on Google:', place.name, place.formatted_address);

  // Get photo
  let coverImageUrl = null;
  const newId = randomUUID();

  if (place.photos && place.photos.length > 0) {
    const photoRef = place.photos[0].photo_reference;
    const photoUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photo_reference=${photoRef}&key=${GOOGLE_API_KEY}`;
    const photoRes = await fetch(photoUrl);
    const buffer = await photoRes.arrayBuffer();

    // Upload to Supabase
    const fileName = `restaurants/${newId}/cover.jpg`;
    await supabase.storage.from('images').upload(fileName, Buffer.from(buffer), { contentType: 'image/jpeg', upsert: true });
    const { data: urlData } = supabase.storage.from('images').getPublicUrl(fileName);
    coverImageUrl = urlData.publicUrl;
    console.log('Uploaded image:', coverImageUrl);
  }

  // Insert the restaurant
  const { error } = await supabase.from('restaurants').insert({
    id: newId,
    name: "Stubby's Bar and Grille",
    slug: 'stubbys-bar-and-grille-olde-hickory',
    address: '701 Olde Hickory Rd',
    city: 'Lancaster',
    state: 'PA',
    zip_code: '17601',
    latitude: place.geometry.location.lat,
    longitude: place.geometry.location.lng,
    cover_image_url: coverImageUrl,
    categories: existing.categories,
    tier_id: existing.tier_id,
    is_active: true,
    is_verified: false
  });

  if (error) {
    console.log('Insert error:', error.message);
  } else {
    console.log("✓ Restored Stubby's Bar and Grille at 701 Olde Hickory Rd");
  }
}

restoreStubbys();
