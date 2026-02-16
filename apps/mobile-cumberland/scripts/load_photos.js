#!/usr/bin/env node
/**
 * Restore restaurant cover photos from CSV to Supabase
 *
 * Reads the all_of_lanc.csv file and updates restaurants.cover_image_url
 * with the original photo URLs from the CSV.
 *
 * Usage:
 *   SUPABASE_ACCESS_TOKEN=xxx node scripts/load_photos.js
 */

const https = require('https');
const fs = require('fs');

const PROJECT_REF = 'kufcxxynjvyharhtfptd';
const CSV_PATH = '/Users/leandertoney/Desktop/TasteLanc Assets/all_of_lanc.csv';

// Simple CSV parser
function parseCSV(content) {
  const lines = content.split('\n');
  const headers = parseCSVLine(lines[0]);
  const records = [];

  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    const values = parseCSVLine(lines[i]);
    const record = {};
    headers.forEach((header, idx) => {
      record[header] = values[idx] || '';
    });
    records.push(record);
  }
  return records;
}

function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

// Make HTTPS request
function makeRequest(url, options, body = null) {
  return new Promise((resolve, reject) => {
    const req = https.request(url, options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          const parsed = data ? JSON.parse(data) : {};
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });
    req.on('error', reject);
    if (body) {
      req.write(body);
    }
    req.end();
  });
}

// Execute SQL via Management API
async function executeSQL(accessToken, sql) {
  const response = await makeRequest(
    `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    },
    JSON.stringify({ query: sql })
  );
  return response;
}

async function main() {
  const accessToken = process.env.SUPABASE_ACCESS_TOKEN;
  if (!accessToken) {
    console.error('Error: SUPABASE_ACCESS_TOKEN environment variable is required');
    process.exit(1);
  }

  console.log('\n📸 Restoring original restaurant photos from CSV\n');

  // Read CSV
  console.log('Reading CSV file...');
  const csvContent = fs.readFileSync(CSV_PATH, 'utf-8');
  const records = parseCSV(csvContent);
  console.log(`Found ${records.length} records in CSV`);

  // Filter records with photos
  const recordsWithPhotos = records.filter(r => r.photo && r.photo.startsWith('http'));
  console.log(`${recordsWithPhotos.length} records have photo URLs`);

  // Get all restaurants from database
  console.log('\nFetching restaurants from database...');
  const restaurantsResult = await executeSQL(accessToken, 'SELECT id, name FROM restaurants');

  if (restaurantsResult.status !== 201 || !restaurantsResult.data) {
    console.error('Failed to fetch restaurants:', restaurantsResult);
    process.exit(1);
  }

  const restaurants = restaurantsResult.data;
  console.log(`Found ${restaurants.length} restaurants in database`);

  // Create name -> id map (normalize names for matching)
  const nameToId = {};
  restaurants.forEach(r => {
    const normalizedName = r.name.toLowerCase().trim();
    nameToId[normalizedName] = r.id;
  });

  // Match CSV records to database and build UPDATE statements
  let matched = 0;
  let unmatched = 0;
  const updates = [];

  for (const record of recordsWithPhotos) {
    const normalizedName = record.name.toLowerCase().trim();
    const restaurantId = nameToId[normalizedName];

    if (restaurantId) {
      matched++;
      // Escape single quotes in URL
      const photoUrl = record.photo.replace(/'/g, "''");
      updates.push({ id: restaurantId, url: photoUrl, name: record.name });
    } else {
      unmatched++;
    }
  }

  console.log(`\nMatched: ${matched} restaurants`);
  console.log(`Unmatched: ${unmatched} restaurants`);

  if (updates.length === 0) {
    console.log('No photos to update');
    return;
  }

  // Update cover_image_url in batches
  const batchSize = 50;
  let updated = 0;

  console.log(`\nUpdating ${updates.length} restaurant cover images...`);

  for (let i = 0; i < updates.length; i += batchSize) {
    const batch = updates.slice(i, i + batchSize);

    // Build a single UPDATE with CASE statement for efficiency
    const cases = batch.map(u => `WHEN '${u.id}' THEN '${u.url}'`).join('\n      ');
    const ids = batch.map(u => `'${u.id}'`).join(', ');

    const sql = `
      UPDATE restaurants
      SET cover_image_url = CASE id
      ${cases}
      END
      WHERE id IN (${ids})
    `;

    const result = await executeSQL(accessToken, sql);

    if (result.status === 201) {
      updated += batch.length;
      console.log(`  Updated batch ${Math.floor(i / batchSize) + 1}: ${batch.length} restaurants`);
    } else {
      console.error(`  Failed batch ${Math.floor(i / batchSize) + 1}:`, result.data);
    }
  }

  // Verify by checking a sample
  const sampleResult = await executeSQL(accessToken,
    "SELECT name, cover_image_url FROM restaurants WHERE cover_image_url LIKE '%googleusercontent%' LIMIT 5"
  );

  console.log(`\n✅ Done! Updated ${updated} restaurants with original photo URLs`);
  console.log('\nSample results:');
  if (sampleResult.data && Array.isArray(sampleResult.data)) {
    sampleResult.data.forEach(r => {
      console.log(`  ${r.name}: ${r.cover_image_url?.substring(0, 60)}...`);
    });
  }
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
