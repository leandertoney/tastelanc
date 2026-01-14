import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { parse } from 'csv-parse/sync';

// Supabase connection
const supabase = createClient(
  'https://kufcxxynjvyharhtfptd.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt1ZmN4eHluanZ5aGFyaHRmcHRkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY4NTE5ODksImV4cCI6MjA4MjQyNzk4OX0.kvT7tYVtQmj7R26EtjzlhNt3C_TfGWiTwjsyURuNWcQ'
);

// CSV path - update this if your CSV is elsewhere
const CSV_PATH = '/Users/leandertoney/Desktop/TasteLanc Assets/all_of_lanc.csv';

async function fixImageUrls() {
  console.log('\n========== FIX IMAGE URLS FROM CSV ==========\n');

  // Read CSV
  console.log(`Reading CSV from: ${CSV_PATH}`);
  let csvContent;
  try {
    csvContent = readFileSync(CSV_PATH, 'utf8');
  } catch (e) {
    console.error(`\n❌ Could not read CSV file: ${e.message}`);
    console.error(`\nMake sure the file exists at: ${CSV_PATH}`);
    console.error('Or update CSV_PATH in this script to point to your CSV file.\n');
    process.exit(1);
  }

  const rows = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
  });

  console.log(`Found ${rows.length} rows in CSV\n`);

  // Build lookup map: name -> { photo, logo }
  const csvData = new Map();
  for (const row of rows) {
    if (row.name?.trim()) {
      const name = row.name.trim().toLowerCase();
      csvData.set(name, {
        photo: row.photo?.trim() || null,
        logo: row.logo?.trim() || null,
      });
    }
  }

  console.log(`Built lookup map with ${csvData.size} restaurants\n`);

  // Get all restaurants from database
  const { data: restaurants, error } = await supabase
    .from('restaurants')
    .select('id, name, cover_image_url, logo_url');

  if (error) {
    console.error('❌ Error fetching restaurants:', error.message);
    process.exit(1);
  }

  console.log(`Found ${restaurants.length} restaurants in database\n`);

  // Match and update
  let updated = 0;
  let notFound = 0;
  let noChange = 0;
  let failed = 0;

  for (const restaurant of restaurants) {
    const nameLower = restaurant.name.toLowerCase();
    const csvRow = csvData.get(nameLower);

    if (!csvRow) {
      notFound++;
      continue;
    }

    // Check if update needed
    const newPhoto = csvRow.photo;
    const newLogo = csvRow.logo;

    if (restaurant.cover_image_url === newPhoto && restaurant.logo_url === newLogo) {
      noChange++;
      continue;
    }

    // Update the restaurant
    const updateData = {};
    if (newPhoto && restaurant.cover_image_url !== newPhoto) {
      updateData.cover_image_url = newPhoto;
    }
    if (newLogo && restaurant.logo_url !== newLogo) {
      updateData.logo_url = newLogo;
    }

    if (Object.keys(updateData).length === 0) {
      noChange++;
      continue;
    }

    const { error: updateError } = await supabase
      .from('restaurants')
      .update(updateData)
      .eq('id', restaurant.id);

    if (updateError) {
      console.error(`❌ Failed to update "${restaurant.name}": ${updateError.message}`);
      failed++;
    } else {
      console.log(`✓ Updated: ${restaurant.name}`);
      updated++;
    }
  }

  // Summary
  console.log('\n========== SUMMARY ==========\n');
  console.log(`Total restaurants in DB: ${restaurants.length}`);
  console.log(`Updated with new URLs:   ${updated}`);
  console.log(`Already correct:         ${noChange}`);
  console.log(`Not found in CSV:        ${notFound}`);
  console.log(`Failed to update:        ${failed}`);
  console.log('\n==============================\n');

  if (updated > 0) {
    console.log('✅ Image URLs have been fixed! Refresh your app to see the images.\n');
  } else if (noChange === restaurants.length) {
    console.log('ℹ️  All URLs already match the CSV. No updates needed.\n');
  }
}

fixImageUrls();
