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

async function getPlaceAndPhoto(searchQuery) {
  const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(searchQuery)}&key=${GOOGLE_API_KEY}`;
  const res = await fetch(url);
  const data = await res.json();

  if (data.status !== 'OK' || !data.results.length) {
    return null;
  }

  const place = data.results[0];
  let coverImageUrl = null;

  if (place.photos && place.photos.length > 0) {
    const photoRef = place.photos[0].photo_reference;
    const photoUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photo_reference=${photoRef}&key=${GOOGLE_API_KEY}`;
    const photoRes = await fetch(photoUrl);
    const buffer = await photoRes.arrayBuffer();

    const newId = randomUUID();
    const fileName = `restaurants/${newId}/cover.jpg`;
    await supabase.storage.from('images').upload(fileName, Buffer.from(buffer), { contentType: 'image/jpeg', upsert: true });
    const { data: urlData } = supabase.storage.from('images').getPublicUrl(fileName);
    coverImageUrl = urlData.publicUrl;

    return { place, coverImageUrl, newId };
  }

  return { place, coverImageUrl: null, newId: randomUUID() };
}

async function restoreAndRename() {
  console.log('\n========== RESTORE AND RENAME DUPLICATES ==========\n');

  // 1. Rename existing Lancaster Cupcake
  console.log('1. Lancaster Cupcake...');
  const { data: lcExisting } = await supabase
    .from('restaurants')
    .select('*')
    .ilike('name', 'lancaster cupcake')
    .single();

  if (lcExisting) {
    await supabase
      .from('restaurants')
      .update({ name: 'Lancaster Cupcake - Granite Run', slug: 'lancaster-cupcake-granite-run' })
      .eq('id', lcExisting.id);
    console.log('   Renamed existing to: Lancaster Cupcake - Granite Run');

    // Restore Downtown location
    const lcInfo = await getPlaceAndPhoto('Lancaster Cupcake 24 W Orange St Lancaster PA');
    if (lcInfo) {
      await supabase.from('restaurants').insert({
        id: lcInfo.newId,
        name: 'Lancaster Cupcake - Downtown',
        slug: 'lancaster-cupcake-downtown',
        address: '24 W Orange St',
        city: 'Lancaster',
        state: 'PA',
        latitude: lcInfo.place.geometry.location.lat,
        longitude: lcInfo.place.geometry.location.lng,
        cover_image_url: lcInfo.coverImageUrl,
        categories: lcExisting.categories,
        tier_id: lcExisting.tier_id,
        is_active: true
      });
      console.log('   Restored: Lancaster Cupcake - Downtown');
    }
  }

  // 2. Rename existing Latte Luv
  console.log('\n2. Latte Luv...');
  const { data: llExisting } = await supabase
    .from('restaurants')
    .select('*')
    .ilike('name', 'latte luv')
    .single();

  if (llExisting) {
    await supabase
      .from('restaurants')
      .update({ name: 'Latte Luv - Paradise', slug: 'latte-luv-paradise' })
      .eq('id', llExisting.id);
    console.log('   Renamed existing to: Latte Luv - Paradise');

    // Restore Ronks location
    const llInfo = await getPlaceAndPhoto('Latte Luv 214 Hartman Bridge Rd Ronks PA');
    if (llInfo) {
      await supabase.from('restaurants').insert({
        id: llInfo.newId,
        name: 'Latte Luv - Ronks',
        slug: 'latte-luv-ronks',
        address: '214 Hartman Bridge Rd',
        city: 'Ronks',
        state: 'PA',
        latitude: llInfo.place.geometry.location.lat,
        longitude: llInfo.place.geometry.location.lng,
        cover_image_url: llInfo.coverImageUrl,
        categories: llExisting.categories,
        tier_id: llExisting.tier_id,
        is_active: true
      });
      console.log('   Restored: Latte Luv - Ronks');
    }
  }

  // 3. Rename existing New Holland Coffee Company
  console.log('\n3. New Holland Coffee Company...');
  const { data: nhExisting } = await supabase
    .from('restaurants')
    .select('*')
    .ilike('name', 'new holland coffee company')
    .single();

  if (nhExisting) {
    await supabase
      .from('restaurants')
      .update({ name: 'New Holland Coffee Company - New Holland', slug: 'new-holland-coffee-company-new-holland' })
      .eq('id', nhExisting.id);
    console.log('   Renamed existing to: New Holland Coffee Company - New Holland');

    // Restore Lititz location
    const nhInfo = await getPlaceAndPhoto('New Holland Coffee Company 51 W Kleine Ln Lititz PA');
    if (nhInfo) {
      await supabase.from('restaurants').insert({
        id: nhInfo.newId,
        name: 'New Holland Coffee Company - Lititz',
        slug: 'new-holland-coffee-company-lititz',
        address: '51 W Kleine Ln',
        city: 'Lititz',
        state: 'PA',
        latitude: nhInfo.place.geometry.location.lat,
        longitude: nhInfo.place.geometry.location.lng,
        cover_image_url: nhInfo.coverImageUrl,
        categories: nhExisting.categories,
        tier_id: nhExisting.tier_id,
        is_active: true
      });
      console.log('   Restored: New Holland Coffee Company - Lititz');
    }
  }

  // 4. Rename existing Stubby's locations
  console.log('\n4. Stubby\'s Bar and Grille...');
  const { data: stubbys } = await supabase
    .from('restaurants')
    .select('*')
    .ilike('name', '%stubby%');

  for (const s of stubbys || []) {
    if (s.address.includes('Frederick')) {
      await supabase
        .from('restaurants')
        .update({ name: "Stubby's Bar and Grille - Downtown", slug: 'stubbys-bar-and-grille-downtown' })
        .eq('id', s.id);
      console.log('   Renamed to: Stubby\'s Bar and Grille - Downtown');
    } else if (s.address.includes('Olde Hickory')) {
      await supabase
        .from('restaurants')
        .update({ name: "Stubby's Bar and Grille - Olde Hickory", slug: 'stubbys-bar-and-grille-olde-hickory' })
        .eq('id', s.id);
      console.log('   Renamed to: Stubby\'s Bar and Grille - Olde Hickory');
    }
  }

  // Final count
  const { count } = await supabase
    .from('restaurants')
    .select('*', { count: 'exact', head: true })
    .eq('is_active', true);

  console.log('\n========== DONE ==========');
  console.log('Total restaurants:', count);
  console.log('==========================\n');
}

restoreAndRename();
