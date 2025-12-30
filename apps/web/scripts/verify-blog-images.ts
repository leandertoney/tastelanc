/**
 * Verify Blog Image Accuracy
 * Cross-checks that cover images match restaurants mentioned in posts
 */
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
  console.log('\n📊 BLOG IMAGE ACCURACY VERIFICATION\n');
  console.log('━'.repeat(60));

  // Fetch all blog posts
  const { data: posts, error: postErr } = await supabase
    .from('blog_posts')
    .select('slug, title, body_html, cover_image_url, cover_image_data')
    .order('created_at', { ascending: false });

  if (postErr || !posts) {
    console.error('Error fetching posts:', postErr);
    process.exit(1);
  }

  // Fetch all restaurants with images
  const { data: restaurants, error: restErr } = await supabase
    .from('restaurants')
    .select('name, slug, cover_image_url')
    .eq('is_active', true);

  if (restErr || !restaurants) {
    console.error('Error fetching restaurants:', restErr);
    process.exit(1);
  }

  // Create lookup maps
  const slugToName = new Map(restaurants.map(r => [r.slug, r.name]));
  const imageToSlug = new Map(
    restaurants
      .filter(r => r.cover_image_url)
      .map(r => [r.cover_image_url, r.slug])
  );
  const slugToImage = new Map(
    restaurants
      .filter(r => r.cover_image_url)
      .map(r => [r.slug, r.cover_image_url])
  );

  console.log(`\nFound ${posts.length} blog posts to verify\n`);

  for (const post of posts) {
    console.log('━'.repeat(60));
    console.log(`\n📝 ${post.title}\n`);

    // Extract restaurant links from body
    const linkRegex = /href="\/restaurants\/([^"]+)"/g;
    const mentionedSlugs: string[] = [];
    let match;
    while ((match = linkRegex.exec(post.body_html || '')) !== null) {
      if (!mentionedSlugs.includes(match[1])) {
        mentionedSlugs.push(match[1]);
      }
    }

    console.log('📍 RESTAURANTS MENTIONED IN ARTICLE:');
    if (mentionedSlugs.length === 0) {
      console.log('   ⚠️  No restaurant links found in article!');
    } else {
      mentionedSlugs.forEach((slug, i) => {
        const name = slugToName.get(slug) || 'UNKNOWN';
        const hasImage = slugToImage.has(slug);
        console.log(`   ${i + 1}. ${name} (${slug}) ${hasImage ? '✓ has image' : '✗ NO IMAGE'}`);
      });
    }

    // Parse cover image data
    let coverData: { type: string; images: string[]; layout: string } | null = null;
    if (post.cover_image_data) {
      try {
        coverData = typeof post.cover_image_data === 'string'
          ? JSON.parse(post.cover_image_data)
          : post.cover_image_data;
      } catch {
        console.log('\n   ⚠️  Could not parse cover_image_data');
      }
    }

    console.log('\n🖼️  COVER IMAGES USED:');
    if (!coverData || coverData.images.length === 0) {
      if (post.cover_image_url) {
        const coverSlug = imageToSlug.get(post.cover_image_url);
        const coverName = coverSlug ? slugToName.get(coverSlug) : 'UNKNOWN';
        console.log(`   Single image: ${coverName} (${coverSlug || 'unknown slug'})`);

        if (coverSlug && mentionedSlugs.includes(coverSlug)) {
          console.log('   ✅ MATCH - Image is from a mentioned restaurant');
        } else {
          console.log('   ❌ MISMATCH - Image is NOT from a mentioned restaurant!');
        }
      } else {
        console.log('   ⚠️  No cover image set');
      }
    } else {
      console.log(`   Layout: ${coverData.type} (${coverData.layout})`);
      console.log(`   Images: ${coverData.images.length}\n`);

      let allMatch = true;
      coverData.images.forEach((imgUrl, i) => {
        const imgSlug = imageToSlug.get(imgUrl);
        const imgName = imgSlug ? slugToName.get(imgSlug) : 'UNKNOWN';
        const isMentioned = imgSlug ? mentionedSlugs.includes(imgSlug) : false;

        console.log(`   ${i + 1}. ${imgName}`);
        if (isMentioned) {
          console.log(`      ✅ Mentioned in article`);
        } else {
          console.log(`      ❌ NOT mentioned in article!`);
          allMatch = false;
        }
      });

      console.log('\n   ' + (allMatch ? '✅ ALL IMAGES VERIFIED' : '❌ SOME IMAGES DO NOT MATCH'));
    }

    console.log('');
  }

  console.log('━'.repeat(60));
  console.log('\n✅ Verification complete!\n');
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
