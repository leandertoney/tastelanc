/**
 * Fix Missing & Broken Blog Cover Images
 *
 * Assigns cover images to blog posts that have NULL, expired, or broken
 * cover_image_url values by extracting restaurant images from body_html.
 *
 * Handles:
 * - NULL cover_image_url
 * - Expired DALL-E URLs (oaidalleapiprodscus.blob.core.windows.net)
 * - Broken Google Places URLs (gps-cs-s, gps-proxy)
 *
 * Run with: npx tsx scripts/fix-missing-blog-covers.ts
 */
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface CoverImageData {
  type: 'single' | 'dual' | 'triple' | 'quad' | 'none';
  images: string[];
  layout: 'full' | 'split-diagonal' | 'split-vertical' | 'grid' | 'collage';
}

function extractRestaurantImages(
  bodyHtml: string,
  restaurantMap: Map<string, string>
): string[] {
  const images: string[] = [];
  // Match both single and double quoted href attributes
  const linkRegex = /href=["']\/restaurants\/([^"']+)["']/g;
  const seenSlugs = new Set<string>();
  let match;

  while ((match = linkRegex.exec(bodyHtml)) !== null && images.length < 4) {
    const slug = match[1];
    const imageUrl = restaurantMap.get(slug);
    if (!seenSlugs.has(slug) && imageUrl) {
      seenSlugs.add(slug);
      images.push(imageUrl);
    }
  }

  return images;
}

function classifyBrokenUrl(url: string | null): string {
  if (!url) return 'NULL';
  if (url.includes('oaidalleapiprodscus.blob.core.windows.net')) return 'Expired DALL-E';
  if (url.includes('gps-cs-s') || url.includes('gps-proxy')) return 'Broken Google Places';
  return 'Unknown broken';
}

function buildCoverImageData(images: string[]): CoverImageData {
  if (images.length === 0) return { type: 'none', images: [], layout: 'full' };
  if (images.length === 1) return { type: 'single', images, layout: 'full' };
  if (images.length === 2) return { type: 'dual', images, layout: 'split-diagonal' };
  if (images.length === 3) return { type: 'triple', images, layout: 'collage' };
  return { type: 'quad', images: images.slice(0, 4), layout: 'grid' };
}

async function main() {
  console.log('\n🔧 FIXING MISSING & BROKEN BLOG COVER IMAGES\n');
  console.log('━'.repeat(50));

  // 1. Fetch blog posts with missing or broken cover images
  const { data: posts, error: postsErr } = await supabase
    .from('blog_posts')
    .select('id, slug, title, body_html, cover_image_url')
    .or('cover_image_url.is.null,cover_image_url.like.%oaidalleapiprodscus.blob.core.windows.net%,cover_image_url.like.%gps-cs-s%,cover_image_url.like.%gps-proxy%')
    .order('created_at', { ascending: false });

  if (postsErr) {
    console.error('Error fetching posts:', postsErr);
    return;
  }

  if (!posts || posts.length === 0) {
    console.log('All blog posts have valid cover images!');
    return;
  }

  console.log(`Found ${posts.length} posts with missing or broken cover images\n`);

  // 2. Fetch all restaurants with cover images
  const { data: restaurants, error: restErr } = await supabase
    .from('restaurants')
    .select('slug, cover_image_url')
    .eq('is_active', true)
    .not('cover_image_url', 'is', null);

  if (restErr || !restaurants) {
    console.error('Error fetching restaurants:', restErr);
    return;
  }

  const restaurantMap = new Map<string, string>(
    restaurants.map(r => [r.slug, r.cover_image_url!])
  );

  console.log(`Loaded ${restaurantMap.size} restaurants with images\n`);

  // 3. Fix each post
  let fixed = 0;
  let skipped = 0;

  for (const post of posts) {
    const reason = classifyBrokenUrl(post.cover_image_url);
    console.log(`📝 ${post.title}`);
    console.log(`   Slug: ${post.slug}`);
    console.log(`   Issue: ${reason}`);

    if (!post.body_html) {
      console.log('   ⚠ No body_html, skipping\n');
      skipped++;
      continue;
    }

    const images = extractRestaurantImages(post.body_html, restaurantMap);

    if (images.length === 0) {
      console.log('   ⚠ No restaurant images found in content, skipping\n');
      skipped++;
      continue;
    }

    const coverData = buildCoverImageData(images);
    const coverImageUrl = images[0];

    console.log(`   Found ${images.length} image(s) — layout: ${coverData.type}`);

    const { error: updateErr } = await supabase
      .from('blog_posts')
      .update({
        cover_image_url: coverImageUrl,
        cover_image_data: JSON.stringify(coverData),
      })
      .eq('id', post.id);

    if (updateErr) {
      console.log(`   ⚠ Update failed: ${updateErr.message}\n`);
      skipped++;
    } else {
      console.log(`   ✓ Updated with cover image\n`);
      fixed++;
    }
  }

  console.log('━'.repeat(50));
  console.log(`\n✅ Done! Fixed: ${fixed}, Skipped: ${skipped}\n`);
}

main().catch(console.error);
