#!/usr/bin/env node

/**
 * Blog Post Audit Script
 *
 * This script audits existing blog posts for:
 * 1. Duplicate cover images (same image used on multiple posts)
 * 2. Missing featured_restaurants tracking
 * 3. Backend data leaking into body_html (IDs, raw URLs, etc.)
 *
 * Run with: node scripts/audit-blog-posts.mjs [--fix]
 * Add --fix flag to actually apply fixes
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const FIX_MODE = process.argv.includes('--fix');

console.log('='.repeat(60));
console.log('BLOG POST AUDIT');
console.log(`Mode: ${FIX_MODE ? 'FIX (will apply changes)' : 'AUDIT ONLY (dry run)'}`);
console.log('='.repeat(60));
console.log();

/**
 * Extract restaurant slugs from blog HTML content
 */
function extractRestaurantSlugs(bodyHtml) {
  if (!bodyHtml) return [];

  const slugs = [];
  const seenSlugs = new Set();
  const linkRegex = /href="\/restaurants\/([^"]+)"/g;
  let match;

  while ((match = linkRegex.exec(bodyHtml)) !== null) {
    const slug = match[1];
    if (!seenSlugs.has(slug)) {
      seenSlugs.add(slug);
      slugs.push(slug);
    }
  }

  return slugs;
}

/**
 * Check for suspicious patterns in body_html
 */
function findSuspiciousContent(bodyHtml) {
  if (!bodyHtml) return [];

  const issues = [];

  // Check for UUIDs (database IDs)
  const uuidRegex = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;
  const uuids = bodyHtml.match(uuidRegex);
  if (uuids && uuids.length > 0) {
    issues.push(`Found ${uuids.length} UUID(s) in content`);
  }

  // Check for raw Supabase URLs (not in img src)
  const supabaseUrlRegex = /[^"]supabase\.co\/storage\/v1\/object\/[^"]+/g;
  const rawUrls = bodyHtml.match(supabaseUrlRegex);
  if (rawUrls && rawUrls.length > 0) {
    issues.push(`Found ${rawUrls.length} raw Supabase URL(s) outside img tags`);
  }

  // Check for JSON-like structures
  const jsonLikeRegex = /\{[^}]*"[a-z_]+"\s*:\s*[^}]*\}/gi;
  const jsonBlocks = bodyHtml.match(jsonLikeRegex);
  if (jsonBlocks) {
    // Filter out legitimate CSS
    const nonCss = jsonBlocks.filter(b => !b.includes('style') && !b.includes('class'));
    if (nonCss.length > 0) {
      issues.push(`Found ${nonCss.length} JSON-like structure(s)`);
    }
  }

  // Check for "slug:" text (likely debug info)
  if (bodyHtml.includes('slug:') && !bodyHtml.includes('class="slug"')) {
    issues.push('Found "slug:" text in content');
  }

  return issues;
}

async function main() {
  try {
    // Fetch all blog posts
    console.log('Fetching blog posts...');
    const { data: posts, error: postsError } = await supabase
      .from('blog_posts')
      .select('*')
      .order('created_at', { ascending: false });

    if (postsError) throw postsError;
    console.log(`Found ${posts.length} blog posts\n`);

    // Fetch all restaurants for cover image lookup
    const { data: restaurants } = await supabase
      .from('restaurants')
      .select('slug, cover_image_url')
      .not('cover_image_url', 'is', null);

    const restaurantImageMap = new Map(
      (restaurants || []).map(r => [r.slug, r.cover_image_url])
    );

    // Track issues
    const duplicateCoverImages = new Map(); // image -> [posts]
    const postsNeedingFeaturedRestaurants = [];
    const postsWithSuspiciousContent = [];
    const fixesToApply = [];

    // Analyze each post
    for (const post of posts) {
      // Check for duplicate cover images
      if (post.cover_image_url) {
        if (!duplicateCoverImages.has(post.cover_image_url)) {
          duplicateCoverImages.set(post.cover_image_url, []);
        }
        duplicateCoverImages.get(post.cover_image_url).push(post);
      }

      // Check if featured_restaurants is missing
      const extractedSlugs = extractRestaurantSlugs(post.body_html);
      if ((!post.featured_restaurants || post.featured_restaurants.length === 0) && extractedSlugs.length > 0) {
        postsNeedingFeaturedRestaurants.push({
          post,
          slugs: extractedSlugs,
        });
      }

      // Check for suspicious content
      const issues = findSuspiciousContent(post.body_html);
      if (issues.length > 0) {
        postsWithSuspiciousContent.push({
          post,
          issues,
        });
      }
    }

    // Report: Duplicate Cover Images
    console.log('--- DUPLICATE COVER IMAGES ---');
    let duplicateCount = 0;
    for (const [imageUrl, postsWithImage] of duplicateCoverImages) {
      if (postsWithImage.length > 1) {
        duplicateCount++;
        console.log(`\nImage used ${postsWithImage.length} times:`);
        console.log(`  URL: ${imageUrl.substring(0, 80)}...`);
        for (const p of postsWithImage) {
          console.log(`  - "${p.title}" (${p.slug})`);
        }

        // Find alternative images for all but the first post
        if (FIX_MODE) {
          for (let i = 1; i < postsWithImage.length; i++) {
            const p = postsWithImage[i];
            const slugs = extractRestaurantSlugs(p.body_html);

            // Find an image from a restaurant that isn't the current cover
            for (const slug of slugs) {
              const altImage = restaurantImageMap.get(slug);
              if (altImage && altImage !== imageUrl) {
                fixesToApply.push({
                  type: 'cover_image',
                  postId: p.id,
                  postSlug: p.slug,
                  oldValue: imageUrl,
                  newValue: altImage,
                });
                break;
              }
            }
          }
        }
      }
    }
    console.log(`\nTotal: ${duplicateCount} duplicate cover image sets`);

    // Report: Missing Featured Restaurants
    console.log('\n--- MISSING FEATURED_RESTAURANTS ---');
    console.log(`${postsNeedingFeaturedRestaurants.length} posts need featured_restaurants backfill:`);
    for (const { post, slugs } of postsNeedingFeaturedRestaurants.slice(0, 10)) {
      console.log(`  - "${post.title}" (${slugs.length} restaurants found)`);

      if (FIX_MODE) {
        fixesToApply.push({
          type: 'featured_restaurants',
          postId: post.id,
          postSlug: post.slug,
          newValue: slugs,
        });
      }
    }
    if (postsNeedingFeaturedRestaurants.length > 10) {
      console.log(`  ... and ${postsNeedingFeaturedRestaurants.length - 10} more`);
    }

    // Report: Suspicious Content
    console.log('\n--- SUSPICIOUS CONTENT ---');
    if (postsWithSuspiciousContent.length === 0) {
      console.log('No suspicious content found!');
    } else {
      console.log(`${postsWithSuspiciousContent.length} posts with potential issues:`);
      for (const { post, issues } of postsWithSuspiciousContent) {
        console.log(`\n  "${post.title}" (${post.slug}):`);
        for (const issue of issues) {
          console.log(`    - ${issue}`);
        }
      }
    }

    // Apply fixes if in fix mode
    if (FIX_MODE && fixesToApply.length > 0) {
      console.log('\n--- APPLYING FIXES ---');

      for (const fix of fixesToApply) {
        try {
          if (fix.type === 'cover_image') {
            const { error } = await supabase
              .from('blog_posts')
              .update({ cover_image_url: fix.newValue })
              .eq('id', fix.postId);

            if (error) throw error;
            console.log(`[FIXED] Cover image for "${fix.postSlug}"`);
          } else if (fix.type === 'featured_restaurants') {
            const { error } = await supabase
              .from('blog_posts')
              .update({ featured_restaurants: fix.newValue })
              .eq('id', fix.postId);

            if (error) throw error;
            console.log(`[FIXED] Featured restaurants for "${fix.postSlug}" (${fix.newValue.length} restaurants)`);
          }
        } catch (err) {
          console.error(`[ERROR] Failed to fix ${fix.type} for "${fix.postSlug}":`, err.message);
        }
      }

      console.log(`\nApplied ${fixesToApply.length} fixes`);
    } else if (fixesToApply.length > 0) {
      console.log(`\n--- FIXES AVAILABLE ---`);
      console.log(`${fixesToApply.length} fixes can be applied. Run with --fix to apply them.`);
    }

    console.log('\n' + '='.repeat(60));
    console.log('AUDIT COMPLETE');
    console.log('='.repeat(60));

  } catch (error) {
    console.error('Audit failed:', error.message);
    process.exit(1);
  }
}

main();
