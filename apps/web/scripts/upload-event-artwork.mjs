import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { readFileSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const EVENTS_TO_UPDATE = [
  {
    eventName: 'Pajama Jam',
    searchTerms: ['pajama', 'pj party', 'pj jam'],
    imagePath: '/Users/leandertoney/Desktop/TasteLanc Assets/ss_pj_party.JPG',
  },
  {
    eventName: 'Galentines Party',
    searchTerms: ['galentine', 'galentines'],
    imagePath: '/Users/leandertoney/Desktop/TasteLanc Assets/ss_galentine.JPG',
  },
];

async function uploadEventArtwork() {
  // 1. Find Bainbridge Inn
  console.log('Finding Bainbridge Inn...');
  const { data: restaurants, error: findError } = await supabase
    .from('restaurants')
    .select('id, name')
    .ilike('name', '%bainbridge%');

  if (findError || !restaurants || restaurants.length === 0) {
    console.error('Bainbridge Inn not found:', findError?.message || 'No matches');
    return;
  }

  const restaurant = restaurants[0];
  console.log(`Found: ${restaurant.name} (${restaurant.id})`);

  // 2. Find events for Bainbridge Inn
  const { data: events, error: eventsError } = await supabase
    .from('events')
    .select('id, name, event_type, event_date, image_url')
    .eq('restaurant_id', restaurant.id);

  if (eventsError) {
    console.error('Error fetching events:', eventsError.message);
    return;
  }

  console.log(`\nFound ${events.length} events for Bainbridge Inn:`);
  events.forEach((e) => console.log(`  - ${e.name} (${e.event_date || 'recurring'}) - ${e.id}`));

  // 3. Match and update events
  for (const eventConfig of EVENTS_TO_UPDATE) {
    console.log(`\n--- Processing: ${eventConfig.eventName} ---`);

    // Find matching event
    const matchingEvent = events.find((e) =>
      eventConfig.searchTerms.some(
        (term) => e.name.toLowerCase().includes(term.toLowerCase())
      )
    );

    if (!matchingEvent) {
      console.log(`Event not found matching: ${eventConfig.searchTerms.join(', ')}`);
      continue;
    }

    console.log(`Matched event: ${matchingEvent.name} (${matchingEvent.id})`);

    // Read local image file
    console.log(`Reading image: ${eventConfig.imagePath}`);
    let imageBuffer;
    try {
      imageBuffer = readFileSync(eventConfig.imagePath);
    } catch (err) {
      console.error(`Failed to read image: ${err.message}`);
      continue;
    }

    console.log(`Image size: ${imageBuffer.byteLength} bytes`);

    // Upload to Supabase Storage
    const ext = eventConfig.imagePath.toLowerCase().endsWith('.png') ? 'png' : 'jpg';
    const fileName = `events/${restaurant.id}/${matchingEvent.id}.${ext}`;
    console.log(`Uploading to: ${fileName}`);

    const { error: uploadError } = await supabase.storage
      .from('images')
      .upload(fileName, imageBuffer, {
        contentType: ext === 'png' ? 'image/png' : 'image/jpeg',
        upsert: true,
      });

    if (uploadError) {
      console.error(`Upload failed: ${uploadError.message}`);
      continue;
    }

    // Get public URL
    const { data: urlData } = supabase.storage.from('images').getPublicUrl(fileName);
    const publicUrl = urlData.publicUrl;
    console.log(`Public URL: ${publicUrl}`);

    // Update event record
    const { error: updateError } = await supabase
      .from('events')
      .update({ image_url: publicUrl })
      .eq('id', matchingEvent.id);

    if (updateError) {
      console.error(`Failed to update event: ${updateError.message}`);
      continue;
    }

    console.log(`✓ Successfully updated "${matchingEvent.name}" with custom artwork!`);
  }

  console.log('\n--- Done! ---');
}

uploadEventArtwork();
