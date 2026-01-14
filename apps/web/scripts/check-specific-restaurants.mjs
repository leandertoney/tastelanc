import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://kufcxxynjvyharhtfptd.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt1ZmN4eHluanZ5aGFyaHRmcHRkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY4NTE5ODksImV4cCI6MjA4MjQyNzk4OX0.kvT7tYVtQmj7R26EtjzlhNt3C_TfGWiTwjsyURuNWcQ'
);

const names = ['Savoy Truffle', 'The Coffin Bar', 'El Cubano', 'Endo Cafe'];

async function check() {
  for (const name of names) {
    const { data, error } = await supabase
      .from('restaurants')
      .select('id, name, cover_image_url')
      .ilike('name', `%${name}%`);

    if (error) {
      console.log(`Error for ${name}:`, error.message);
      continue;
    }

    if (data.length === 0) {
      console.log(`\n❌ "${name}" - NOT FOUND in database`);
      continue;
    }

    for (const r of data) {
      console.log(`\n📍 ${r.name}`);
      console.log(`   ID: ${r.id}`);
      console.log(`   URL: ${r.cover_image_url || 'NULL'}`);

      if (r.cover_image_url) {
        // Check if URL is valid (no line breaks, starts with http)
        const hasLineBreaks = r.cover_image_url.includes('\n') || r.cover_image_url.includes('\r');
        const startsWithHttp = r.cover_image_url.startsWith('http');

        if (hasLineBreaks) console.log(`   ⚠️  URL HAS LINE BREAKS (corrupted)`);
        if (!startsWithHttp) console.log(`   ⚠️  URL doesn't start with http`);
        if (!hasLineBreaks && startsWithHttp) console.log(`   ✓ URL format looks valid`);
      }
    }
  }
}

check();
