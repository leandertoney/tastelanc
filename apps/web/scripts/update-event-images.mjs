import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const SITE_URL = 'https://tastelanc.com';

const DEFAULT_IMAGES = {
  trivia: `${SITE_URL}/images/events/trivia.png`,
  live_music: `${SITE_URL}/images/events/live_music.png`,
  karaoke: `${SITE_URL}/images/events/karaoke.png`,
  dj: `${SITE_URL}/images/events/dj.png`,
  comedy: `${SITE_URL}/images/events/comedy.png`,
  sports: `${SITE_URL}/images/events/sports.png`,
  other: `${SITE_URL}/images/events/other.png`,
};

// Get all events
const { data: events, error } = await supabase
  .from('events')
  .select('id, name, event_type, image_url');

if (error) {
  console.error('Error fetching events:', error);
  process.exit(1);
}

console.log(`Found ${events.length} events`);

// Update each event with the correct image_url based on event_type
for (const event of events) {
  const correctImageUrl = DEFAULT_IMAGES[event.event_type] || DEFAULT_IMAGES.other;

  const { error: updateError } = await supabase
    .from('events')
    .update({ image_url: correctImageUrl })
    .eq('id', event.id);

  if (updateError) {
    console.error(`Error updating ${event.name}:`, updateError);
  } else {
    console.log(`Updated: ${event.name} (${event.event_type}) -> ${correctImageUrl}`);
  }
}

console.log('\nDone! Events now have correct image_url in database.');
console.log('The TestFlight app should now show correct images on refresh.');
