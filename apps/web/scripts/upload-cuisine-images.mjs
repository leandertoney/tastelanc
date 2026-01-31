#!/usr/bin/env node
/**
 * Download cuisine food images from Unsplash and upload to Supabase Storage
 * Run: node apps/web/scripts/upload-cuisine-images.mjs
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import https from 'https';
import http from 'http';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '../.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Curated Unsplash image IDs for each cuisine type
// Format: https://images.unsplash.com/photo-{ID}?w=400&h=400&fit=crop&crop=center
const CUISINE_IMAGE_IDS = {
  // American Contemporary - elegant plated dish
  american_contemporary: '1546069901-ba9599a7e63c', // plated fine dining
  // Italian - pasta dish
  italian: '1473093295043-cdd812d0e601', // spaghetti pasta
  // Mediterranean - mezze/hummus
  mediterranean: '1540914124281-342587941389', // mediterranean spread
  // Asian - noodles/ramen
  asian: '1617093727343-374698b1b08d', // ramen bowl
  // Latin - tacos
  latin: '1565299585323-38d6b0865b47', // tacos
  // Seafood - shrimp/lobster
  seafood: '1559339352-11d035aa65de', // seafood platter
  // Steakhouse - grilled steak
  steakhouse: '1558030006-450675393462', // steak
  // Pub Fare - burger
  pub_fare: '1568901346375-23c9450c58cd', // burger
  // Cafe - coffee and pastry
  cafe: '1495474472287-4d71bcdd2085', // coffee
  // Breakfast - eggs and pancakes
  breakfast: '1533089860892-a7c6f0a88666', // breakfast plate
  // Brunch - avocado toast
  brunch: '1525351484163-7529414344d8', // avocado toast
  // Desserts - cake
  desserts: '1578985545062-69928b1d9587', // chocolate cake
};

async function downloadImage(url) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;

    const makeRequest = (requestUrl, redirectCount = 0) => {
      if (redirectCount > 5) {
        reject(new Error('Too many redirects'));
        return;
      }

      protocol.get(requestUrl, (response) => {
        // Handle redirects
        if (response.statusCode === 301 || response.statusCode === 302) {
          const redirectUrl = response.headers.location;
          console.log(`  Redirecting to: ${redirectUrl.substring(0, 60)}...`);
          makeRequest(redirectUrl, redirectCount + 1);
          return;
        }

        if (response.statusCode !== 200) {
          reject(new Error(`Failed to download: ${response.statusCode}`));
          return;
        }

        const chunks = [];
        response.on('data', (chunk) => chunks.push(chunk));
        response.on('end', () => resolve(Buffer.concat(chunks)));
        response.on('error', reject);
      }).on('error', reject);
    };

    makeRequest(url);
  });
}

async function main() {
  console.log('🍽️  Uploading cuisine images to Supabase Storage\n');

  // Check if cuisines folder exists in images bucket, create path if needed
  const bucketName = 'images';
  const folderPath = 'cuisines';

  for (const [cuisine, imageId] of Object.entries(CUISINE_IMAGE_IDS)) {
    const imageUrl = `https://images.unsplash.com/photo-${imageId}?w=400&h=400&fit=crop&crop=center&q=80`;
    const fileName = `${folderPath}/${cuisine}.jpg`;

    console.log(`📸 ${cuisine}:`);
    console.log(`   Downloading from Unsplash...`);

    try {
      const imageBuffer = await downloadImage(imageUrl);
      console.log(`   Downloaded ${(imageBuffer.length / 1024).toFixed(1)} KB`);

      // Upload to Supabase
      const { data, error } = await supabase.storage
        .from(bucketName)
        .upload(fileName, imageBuffer, {
          contentType: 'image/jpeg',
          upsert: true,
        });

      if (error) {
        console.log(`   ❌ Upload failed: ${error.message}`);
      } else {
        const publicUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${bucketName}/${fileName}`;
        console.log(`   ✅ Uploaded: ${publicUrl}`);
      }
    } catch (err) {
      console.log(`   ❌ Error: ${err.message}`);
    }

    console.log('');
  }

  console.log('\n📋 CUISINE_IMAGES constant for your code:\n');
  console.log('const CUISINE_IMAGES: Record<CuisineType, string> = {');
  for (const cuisine of Object.keys(CUISINE_IMAGE_IDS)) {
    const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${bucketName}/${folderPath}/${cuisine}.jpg`;
    console.log(`  ${cuisine}: '${url}',`);
  }
  console.log('};');
}

main().catch(console.error);
