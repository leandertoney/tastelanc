import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://kufcxxynjvyharhtfptd.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt1ZmN4eHluanZ5aGFyaHRmcHRkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY4NTE5ODksImV4cCI6MjA4MjQyNzk4OX0.kvT7tYVtQmj7R26EtjzlhNt3C_TfGWiTwjsyURuNWcQ'
);

async function checkImages() {
  console.log('\n========== IMAGE STATUS CHECK ==========\n');

  // Check restaurants
  const { data: restaurants, error: rError } = await supabase
    .from('restaurants')
    .select('id, name, cover_image_url, logo_url, is_active')
    .eq('is_active', true)
    .order('name');

  if (rError) {
    console.error('Error fetching restaurants:', rError);
    return;
  }

  const withImage = restaurants.filter(r => r.cover_image_url);
  const withoutImage = restaurants.filter(r => !r.cover_image_url);

  console.log('=== RESTAURANTS ===');
  console.log(`Total active: ${restaurants.length}`);
  console.log(`With cover_image_url: ${withImage.length}`);
  console.log(`MISSING cover_image_url: ${withoutImage.length}`);

  if (withoutImage.length > 0) {
    console.log('\nRestaurants MISSING images:');
    withoutImage.forEach((r, i) => {
      console.log(`  ${i + 1}. ${r.name} (ID: ${r.id})`);
    });
  }

  if (withImage.length > 0) {
    console.log('\nSample image URLs (first 5):');
    withImage.slice(0, 5).forEach((r, i) => {
      console.log(`  ${i + 1}. ${r.name}:`);
      console.log(`     ${r.cover_image_url}`);
    });

    // Test if first image URL actually loads
    console.log('\nTesting first image URL...');
    try {
      const response = await fetch(withImage[0].cover_image_url, { method: 'HEAD' });
      console.log(`  Status: ${response.status} ${response.statusText}`);
      if (!response.ok) {
        console.log('  ⚠️  Image URL returned error!');
      }
    } catch (e) {
      console.log(`  ❌ Failed to fetch: ${e.message}`);
    }
  }

  // Check blog posts
  console.log('\n\n=== BLOG POSTS ===');
  const { data: posts, error: pError } = await supabase
    .from('blog_posts')
    .select('id, title, slug, cover_image_url')
    .order('created_at', { ascending: false });

  if (pError) {
    console.error('Error fetching posts:', pError);
    return;
  }

  const postsWithImage = posts.filter(p => p.cover_image_url);
  const postsWithoutImage = posts.filter(p => !p.cover_image_url);

  console.log(`Total: ${posts.length}`);
  console.log(`With cover_image_url: ${postsWithImage.length}`);
  console.log(`MISSING cover_image_url: ${postsWithoutImage.length}`);

  if (postsWithoutImage.length > 0) {
    console.log('\nBlog posts MISSING images:');
    postsWithoutImage.forEach((p, i) => {
      console.log(`  ${i + 1}. ${p.title} (slug: ${p.slug})`);
    });
  }

  // Check for expired DALL-E URLs
  const dallEPosts = posts.filter(p =>
    p.cover_image_url && p.cover_image_url.includes('oaidalleapiprodscus')
  );

  if (dallEPosts.length > 0) {
    console.log(`\n⚠️  WARNING: ${dallEPosts.length} posts have EXPIRED DALL-E URLs!`);
    dallEPosts.forEach((p, i) => {
      console.log(`  ${i + 1}. ${p.title}`);
    });
  }

  console.log('\n========================================\n');
}

checkImages();
