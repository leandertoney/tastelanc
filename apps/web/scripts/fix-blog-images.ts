/**
 * Fix Broken Blog Images
 *
 * Regenerates cover images for blog posts with expired DALL-E URLs
 * and uploads them to Supabase Storage for permanent hosting.
 *
 * Run with: npx tsx scripts/fix-blog-images.ts
 */
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function getTopicFromTitle(title: string): string {
  const lowTitle = title.toLowerCase();
  if (lowTitle.includes('happy hour')) return 'happy-hour-deep-dive';
  if (lowTitle.includes('date night') || lowTitle.includes('romantic')) return 'date-night-guide';
  if (lowTitle.includes('family') || lowTitle.includes('kid')) return 'family-dining';
  if (lowTitle.includes('tourist') || lowTitle.includes('visit') || lowTitle.includes('48-hour')) return 'tourist-guide';
  if (lowTitle.includes('hidden gem') || lowTitle.includes('locals')) return 'hidden-gems';
  if (lowTitle.includes('budget') || lowTitle.includes('value') || lowTitle.includes('cheap')) return 'budget-eats';
  if (lowTitle.includes('brunch')) return 'brunch-battles';
  if (lowTitle.includes('late night')) return 'late-night-eats';
  if (lowTitle.includes('season')) return 'seasonal-guide';
  if (lowTitle.includes('unpopular') || lowTitle.includes('overrated') || lowTitle.includes('break')) return 'contrarian-take';
  return 'best-of';
}

function getTopicImageSubject(topic: string): string {
  const subjects: Record<string, string> = {
    'happy-hour-deep-dive': 'craft cocktails and appetizers on a bar counter with warm lighting',
    'date-night-guide': 'romantic dinner table with candles, wine glasses, and elegant plating',
    'family-dining': 'family-style dishes on a warm wooden table, casual and inviting',
    'tourist-guide': 'diverse spread of local Lancaster dishes showcasing variety',
    'contrarian-take': 'unexpected food pairing or unique dish presentation',
    'seasonal-guide': 'seasonal ingredients and dishes with natural elements',
    'late-night-eats': 'comfort food under moody, late-night restaurant lighting',
    'brunch-battles': 'brunch spread with eggs, pancakes, coffee, and mimosas',
    'neighborhood-spotlight': 'street-level restaurant scene with outdoor seating',
    'hidden-gems': 'intimate restaurant interior with character and charm',
    'new-openings': 'fresh, modern restaurant interior with clean design',
    'app-feature': 'smartphone displaying food app with dishes in background',
    'best-of': 'award-worthy plated dish with professional presentation',
    'weekend-plans': 'multi-course meal progression from brunch to dinner',
    'budget-eats': 'generous portions of delicious affordable food',
  };
  return subjects[topic] || 'beautifully plated dish in restaurant setting';
}

function getTopicMood(topic: string): string {
  const moods: Record<string, string> = {
    'happy-hour-deep-dive': 'social, energetic, golden hour lighting',
    'date-night-guide': 'romantic, intimate, soft candlelight',
    'family-dining': 'warm, welcoming, comfortable',
    'tourist-guide': 'adventurous, diverse, exciting',
    'contrarian-take': 'bold, surprising, distinctive',
    'seasonal-guide': 'fresh, natural, seasonal colors',
    'late-night-eats': 'moody, cozy, warm against dark background',
    'brunch-battles': 'bright, cheerful, morning sunlight',
    'neighborhood-spotlight': 'authentic, local, neighborhood charm',
    'hidden-gems': 'discovered, special, intimate',
    'new-openings': 'fresh, modern, anticipation',
    'app-feature': 'tech-forward, clean, helpful',
    'best-of': 'excellence, premium, celebratory',
    'weekend-plans': 'relaxed, indulgent, leisurely',
    'budget-eats': 'satisfying, generous, value-focused',
  };
  return moods[topic] || 'inviting, appetizing, professional';
}

async function regenerateImage(title: string, slug: string): Promise<string | null> {
  const topic = getTopicFromTitle(title);
  const subject = getTopicImageSubject(topic);
  const mood = getTopicMood(topic);

  console.log(`   Topic detected: ${topic}`);
  console.log(`   Generating image...`);

  try {
    const response = await openai.images.generate({
      model: 'dall-e-3',
      prompt: `Professional food photography for "${title}".

SUBJECT: ${subject}

STYLE: Editorial food magazine quality, shallow depth of field, professional lighting.

SETTING: Lancaster PA restaurant atmosphere - exposed brick walls, warm wood tones, Edison bulb lighting, rustic-modern aesthetic.

MOOD: ${mood}

TECHNICAL: Shot on professional camera, 50mm lens, f/2.8, natural + warm artificial lighting mix.

CRITICAL RULES:
- ABSOLUTELY NO text, words, letters, numbers, or logos anywhere in the image
- No watermarks or overlays
- Photorealistic, not illustrated
- High-end food magazine quality
- Appetizing and visually striking`,
      n: 1,
      size: '1792x1024',
      quality: 'standard',
    });

    const tempUrl = response.data[0]?.url;
    if (!tempUrl) {
      console.log('   ⚠ No image URL returned');
      return null;
    }

    console.log(`   Uploading to storage...`);

    // Download the image
    const imageResponse = await fetch(tempUrl);
    const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());

    // Generate filename from slug
    const filename = `blog-covers/${slug}.png`;

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('images')
      .upload(filename, imageBuffer, {
        contentType: 'image/png',
        upsert: true,
      });

    if (uploadError) {
      console.log(`   ⚠ Upload failed: ${uploadError.message}`);
      return null;
    }

    // Get public URL
    const { data: publicUrlData } = supabase.storage
      .from('images')
      .getPublicUrl(filename);

    console.log(`   ✓ Image saved`);
    return publicUrlData.publicUrl;
  } catch (error) {
    console.log(`   ⚠ Error: ${error}`);
    return null;
  }
}

async function main() {
  console.log('\n🔧 FIXING BROKEN BLOG IMAGES\n');
  console.log('━'.repeat(50));

  // Get all blog posts with OpenAI blob URLs (expired)
  const { data: posts, error } = await supabase
    .from('blog_posts')
    .select('id, slug, title, cover_image_url')
    .like('cover_image_url', '%oaidalleapiprodscus.blob.core.windows.net%');

  if (error) {
    console.error('Error fetching posts:', error);
    return;
  }

  console.log(`Found ${posts?.length || 0} posts with broken images\n`);

  for (const post of posts || []) {
    console.log(`\n📝 ${post.title}`);
    console.log(`   Slug: ${post.slug}`);

    const newImageUrl = await regenerateImage(post.title, post.slug);

    if (newImageUrl) {
      // Update the post with new image URL
      const { error: updateError } = await supabase
        .from('blog_posts')
        .update({ cover_image_url: newImageUrl })
        .eq('id', post.id);

      if (updateError) {
        console.log(`   ⚠ Failed to update post: ${updateError.message}`);
      } else {
        console.log(`   ✓ Post updated with permanent URL`);
      }
    }

    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  console.log('\n━'.repeat(50));
  console.log('✅ Done!\n');
}

main().catch(console.error);
