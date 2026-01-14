import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function uploadImageForRestaurant(restaurantName, imageUrl) {
  console.log(`\nProcessing: ${restaurantName}`);
  console.log(`Image URL: ${imageUrl}`);

  // 1. Find the restaurant
  const { data: restaurants, error: findError } = await supabase
    .from('restaurants')
    .select('id, name')
    .ilike('name', `%${restaurantName}%`);

  if (findError || !restaurants || restaurants.length === 0) {
    console.error('Restaurant not found:', findError?.message || 'No matches');
    return false;
  }

  const restaurant = restaurants[0];
  console.log(`Found: ${restaurant.name} (${restaurant.id})`);

  // 2. Download the image
  console.log('Downloading image...');
  const response = await fetch(imageUrl);
  if (!response.ok) {
    console.error(`Failed to download: ${response.status}`);
    return false;
  }

  const contentType = response.headers.get('content-type') || 'image/jpeg';
  const ext = contentType.includes('png') ? 'png' : 'jpg';
  const buffer = await response.arrayBuffer();

  console.log(`Downloaded: ${buffer.byteLength} bytes (${contentType})`);

  // 3. Upload to Supabase Storage
  const fileName = `restaurants/${restaurant.id}/cover.${ext}`;
  console.log(`Uploading to: ${fileName}`);

  const { data: uploadData, error: uploadError } = await supabase.storage
    .from('images')
    .upload(fileName, buffer, {
      contentType,
      upsert: true
    });

  if (uploadError) {
    // Try creating the bucket if it doesn't exist
    if (uploadError.message.includes('not found') || uploadError.message.includes('Bucket')) {
      console.log('Creating images bucket...');
      await supabase.storage.createBucket('images', { public: true });

      // Retry upload
      const { error: retryError } = await supabase.storage
        .from('images')
        .upload(fileName, buffer, { contentType, upsert: true });

      if (retryError) {
        console.error('Upload failed after bucket creation:', retryError.message);
        return false;
      }
    } else {
      console.error('Upload failed:', uploadError.message);
      return false;
    }
  }

  // 4. Get public URL
  const { data: urlData } = supabase.storage.from('images').getPublicUrl(fileName);
  const publicUrl = urlData.publicUrl;
  console.log(`Public URL: ${publicUrl}`);

  // 5. Update restaurant record
  const { error: updateError } = await supabase
    .from('restaurants')
    .update({ cover_image_url: publicUrl })
    .eq('id', restaurant.id);

  if (updateError) {
    console.error('Failed to update restaurant:', updateError.message);
    return false;
  }

  console.log(`✓ Successfully updated ${restaurant.name} with new image!`);
  return true;
}

// Run for The Fridge
const restaurantName = process.argv[2] || 'The Fridge';
const imageUrl = process.argv[3] || 'https://beerfridgelancaster.com/wp-content/uploads/2021/04/header-sizer-medium-1.jpg';

uploadImageForRestaurant(restaurantName, imageUrl);
