import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function uploadHappyHourImage(restaurantName, imagePath) {
  console.log(`\nProcessing happy hour image for: ${restaurantName}`);
  console.log(`Image path: ${imagePath}`);

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

  // 2. Find the happy hour for this restaurant
  const { data: happyHours, error: hhError } = await supabase
    .from('happy_hours')
    .select('id, name')
    .eq('restaurant_id', restaurant.id);

  if (hhError || !happyHours || happyHours.length === 0) {
    console.error('No happy hour found for restaurant:', hhError?.message || 'No matches');
    return false;
  }

  const happyHour = happyHours[0];
  console.log(`Found happy hour: ${happyHour.name} (${happyHour.id})`);

  // 3. Read the image file
  if (!fs.existsSync(imagePath)) {
    console.error(`File not found: ${imagePath}`);
    return false;
  }

  const buffer = fs.readFileSync(imagePath);
  const ext = imagePath.split('.').pop() || 'jpg';
  const contentType = ext === 'png' ? 'image/png' : 'image/jpeg';

  console.log(`Read file: ${buffer.length} bytes (${contentType})`);

  // 4. Upload to Supabase Storage
  const fileName = `happy-hours/${happyHour.id}/banner.${ext}`;
  console.log(`Uploading to: ${fileName}`);

  const { data: uploadData, error: uploadError } = await supabase.storage
    .from('images')
    .upload(fileName, buffer, {
      contentType,
      upsert: true
    });

  if (uploadError) {
    console.error('Upload failed:', uploadError.message);
    return false;
  }

  // 5. Get public URL
  const { data: urlData } = supabase.storage.from('images').getPublicUrl(fileName);
  const publicUrl = urlData.publicUrl;
  console.log(`Public URL: ${publicUrl}`);

  // 6. Update happy hour record
  const { error: updateError } = await supabase
    .from('happy_hours')
    .update({ image_url: publicUrl })
    .eq('id', happyHour.id);

  if (updateError) {
    console.error('Failed to update happy hour:', updateError.message);
    return false;
  }

  console.log(`\n✓ Successfully updated ${restaurant.name}'s happy hour with new image!`);
  console.log(`  Image URL: ${publicUrl}`);
  return true;
}

// Run with command line args
const restaurantName = process.argv[2] || 'Imperial';
const imagePath = process.argv[3] || `${process.env.HOME}/Desktop/imperial_hh.jpg`;

uploadHappyHourImage(restaurantName, imagePath);
