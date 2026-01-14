import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://kufcxxynjvyharhtfptd.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt1ZmN4eHluanZ5aGFyaHRmcHRkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY4NTE5ODksImV4cCI6MjA4MjQyNzk4OX0.kvT7tYVtQmj7R26EtjzlhNt3C_TfGWiTwjsyURuNWcQ'
);

async function testUrls() {
  const { data: restaurants } = await supabase
    .from('restaurants')
    .select('id, name, cover_image_url')
    .eq('is_active', true)
    .not('cover_image_url', 'is', null)
    .limit(50);

  console.log(`Testing ${restaurants.length} image URLs...\n`);

  let working = 0;
  let broken = 0;

  for (const r of restaurants) {
    try {
      const res = await fetch(r.cover_image_url, { method: 'HEAD' });
      if (res.ok) {
        working++;
        console.log(`✓ ${r.name}`);
      } else {
        broken++;
        console.log(`✗ ${r.name} (${res.status})`);
      }
    } catch (e) {
      broken++;
      console.log(`✗ ${r.name} (error)`);
    }
  }

  console.log(`\n--- Results ---`);
  console.log(`Working: ${working}`);
  console.log(`Broken:  ${broken}`);
}

testUrls();
