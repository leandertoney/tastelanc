#!/usr/bin/env node
/**
 * Radar Geofence Sync Script
 *
 * Syncs all restaurants from Supabase to Radar as geofences.
 * - Fetches all active restaurants from Supabase
 * - Creates or updates geofences in Radar
 * - Idempotent: skips existing geofences
 * - Includes retry logic with exponential backoff
 *
 * Usage:
 *   RADAR_SECRET_KEY=prj_live_sk_xxx node scripts/sync_radar_geofences.js
 *
 * Or for production:
 *   RADAR_SECRET_KEY=prj_live_sk_xxx SUPABASE_ENV=prod node scripts/sync_radar_geofences.js
 */

const https = require('https');

// Supabase configuration
const SUPABASE_CONFIGS = {
  dev: {
    url: 'https://kcoszrcubshtsezcktnn.supabase.co',
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtjb3N6cmN1YnNodHNlemNrdG5uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQxMDUzNjYsImV4cCI6MjA3OTY4MTM2Nn0.gG67fXJrb2YW5X_trdMrXUYbs3YgkvIezGG-fyt-M7c',
  },
  prod: {
    url: 'https://kufcxxynjvyharhtfptd.supabase.co',
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt1ZmN4eHluanZ5aGFyaHRmcHRkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY4NTE5ODksImV4cCI6MjA4MjQyNzk4OX0.kvT7tYVtQmj7R26EtjzlhNt3C_TfGWiTwjsyURuNWcQ',
  },
};

const RADAR_API_BASE = 'https://api.radar.io/v1';
const GEOFENCE_RADIUS = 75; // meters
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = 1000; // 1 second

// Stats tracking
const stats = {
  total: 0,
  created: 0,
  skipped: 0,
  failures: [],
};

/**
 * Make an HTTPS request
 */
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
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

/**
 * Sleep for a given number of milliseconds
 */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Retry a function with exponential backoff
 */
async function withRetry(fn, maxRetries = MAX_RETRIES) {
  let lastError;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt < maxRetries - 1) {
        const delay = INITIAL_RETRY_DELAY * Math.pow(2, attempt);
        console.log(`  Retry ${attempt + 1}/${maxRetries - 1} in ${delay}ms...`);
        await sleep(delay);
      }
    }
  }
  throw lastError;
}

/**
 * Fetch restaurants from Supabase
 */
async function fetchRestaurants(supabaseUrl, anonKey) {
  console.log('\nFetching restaurants from Supabase...');

  const url = new URL(`${supabaseUrl}/rest/v1/restaurants`);
  url.searchParams.set('select', 'id,name,latitude,longitude');
  url.searchParams.set('is_active', 'eq.true');

  const response = await makeRequest(url.toString(), {
    method: 'GET',
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${anonKey}`,
      'Content-Type': 'application/json',
    },
  });

  if (response.status !== 200) {
    throw new Error(`Failed to fetch restaurants: ${JSON.stringify(response.data)}`);
  }

  // Filter out restaurants without coordinates
  const restaurants = response.data.filter(
    (r) => r.latitude != null && r.longitude != null
  );

  console.log(`Found ${restaurants.length} restaurants with coordinates`);
  return restaurants;
}

/**
 * Check if a geofence exists in Radar
 */
async function checkGeofenceExists(radarSecretKey, externalId) {
  const url = `${RADAR_API_BASE}/geofences?externalId=${encodeURIComponent(externalId)}`;

  const response = await makeRequest(url, {
    method: 'GET',
    headers: {
      Authorization: radarSecretKey,
    },
  });

  if (response.status === 200 && response.data.geofences && response.data.geofences.length > 0) {
    return true;
  }

  return false;
}

/**
 * Create a geofence in Radar
 */
async function createGeofence(radarSecretKey, restaurant) {
  const url = `${RADAR_API_BASE}/geofences`;

  const body = {
    type: 'circle',
    externalId: restaurant.id,
    description: restaurant.name,
    tag: 'restaurant',
    radius: GEOFENCE_RADIUS,
    coordinates: [restaurant.latitude, restaurant.longitude],
    enabled: true,
  };

  const response = await makeRequest(
    url,
    {
      method: 'POST',
      headers: {
        Authorization: radarSecretKey,
        'Content-Type': 'application/json',
      },
    },
    body
  );

  if (response.status !== 200 && response.status !== 201) {
    throw new Error(`Radar API error: ${JSON.stringify(response.data)}`);
  }

  return response.data;
}

/**
 * Process a single restaurant
 */
async function processRestaurant(radarSecretKey, restaurant, index, total) {
  const prefix = `[${index + 1}/${total}]`;

  try {
    // Check if geofence already exists
    const exists = await withRetry(() => checkGeofenceExists(radarSecretKey, restaurant.id));

    if (exists) {
      console.log(`${prefix} SKIP: "${restaurant.name}" - geofence exists`);
      stats.skipped++;
      return;
    }

    // Create the geofence
    await withRetry(() => createGeofence(radarSecretKey, restaurant));
    console.log(`${prefix} CREATED: "${restaurant.name}" at (${restaurant.latitude}, ${restaurant.longitude})`);
    stats.created++;
  } catch (error) {
    console.error(`${prefix} FAILED: "${restaurant.name}" - ${error.message}`);
    stats.failures.push({
      restaurant: restaurant.name,
      id: restaurant.id,
      reason: error.message,
    });
  }
}

/**
 * Print summary
 */
function printSummary() {
  console.log('\n' + '='.repeat(50));
  console.log('SYNC SUMMARY');
  console.log('='.repeat(50));
  console.log(`Total restaurants:    ${stats.total}`);
  console.log(`Geofences created:    ${stats.created}`);
  console.log(`Geofences skipped:    ${stats.skipped}`);
  console.log(`Failures:             ${stats.failures.length}`);

  if (stats.failures.length > 0) {
    console.log('\nFailure details:');
    stats.failures.forEach((f, i) => {
      console.log(`  ${i + 1}. ${f.restaurant} (${f.id})`);
      console.log(`     Reason: ${f.reason}`);
    });
  }

  console.log('='.repeat(50) + '\n');
}

/**
 * Main function
 */
async function main() {
  console.log('\n🌐 Radar Geofence Sync\n');

  // Get Radar secret key
  const radarSecretKey = process.env.RADAR_SECRET_KEY;
  if (!radarSecretKey) {
    console.error('Error: RADAR_SECRET_KEY environment variable is required');
    console.error('Usage: RADAR_SECRET_KEY=prj_live_sk_xxx node scripts/sync_radar_geofences.js');
    process.exit(1);
  }

  // Determine environment
  const env = process.env.SUPABASE_ENV || 'prod';
  const config = SUPABASE_CONFIGS[env];
  if (!config) {
    console.error(`Error: Unknown environment "${env}". Use "dev" or "prod".`);
    process.exit(1);
  }

  console.log(`Environment: ${env.toUpperCase()}`);
  console.log(`Supabase URL: ${config.url}`);
  console.log(`Geofence radius: ${GEOFENCE_RADIUS}m`);

  try {
    // Fetch restaurants
    const restaurants = await fetchRestaurants(config.url, config.anonKey);
    stats.total = restaurants.length;

    if (restaurants.length === 0) {
      console.log('No restaurants to sync.');
      return;
    }

    // Process each restaurant
    console.log('\nCreating geofences...\n');
    for (let i = 0; i < restaurants.length; i++) {
      await processRestaurant(radarSecretKey, restaurants[i], i, restaurants.length);
      // Small delay to avoid rate limiting
      await sleep(100);
    }

    // Print summary
    printSummary();

    // Exit with error if there were failures
    if (stats.failures.length > 0) {
      process.exit(1);
    }
  } catch (error) {
    console.error('\n❌ Fatal error:', error.message);
    process.exit(1);
  }
}

main();
