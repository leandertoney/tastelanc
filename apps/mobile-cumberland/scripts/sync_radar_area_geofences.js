#!/usr/bin/env node
/**
 * Radar Area Geofence Sync Script
 *
 * Syncs all areas (neighborhoods/districts) from Supabase to Radar as geofences.
 * - Fetches all active areas from Supabase
 * - Creates or updates geofences in Radar with tag 'area'
 * - Uses per-area radius from database (500-1000m typically)
 * - Idempotent: skips existing geofences
 *
 * Usage:
 *   RADAR_SECRET_KEY=prj_live_sk_xxx node scripts/sync_radar_area_geofences.js
 *
 * For production:
 *   RADAR_SECRET_KEY=prj_live_sk_xxx SUPABASE_ENV=prod node scripts/sync_radar_area_geofences.js
 */

const https = require('https');

// Supabase configuration (same as restaurant sync)
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
const AREA_TAG = 'area'; // Different from 'restaurant' tag
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = 1000;

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
 * Fetch areas from Supabase
 */
async function fetchAreas(supabaseUrl, anonKey) {
  console.log('\nFetching areas from Supabase...');

  const url = new URL(`${supabaseUrl}/rest/v1/areas`);
  url.searchParams.set('select', 'id,name,slug,latitude,longitude,radius');
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
    throw new Error(`Failed to fetch areas: ${JSON.stringify(response.data)}`);
  }

  // Filter out areas without coordinates
  const areas = response.data.filter(
    (a) => a.latitude != null && a.longitude != null
  );

  console.log(`Found ${areas.length} active areas with coordinates`);
  return areas;
}

/**
 * Check if an area geofence exists in Radar
 */
async function checkGeofenceExists(radarSecretKey, externalId) {
  const url = `${RADAR_API_BASE}/geofences?externalId=${encodeURIComponent(externalId)}&tag=${AREA_TAG}`;

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
 * Create an area geofence in Radar
 */
async function createGeofence(radarSecretKey, area) {
  const url = `${RADAR_API_BASE}/geofences`;

  const body = {
    type: 'circle',
    externalId: area.id,
    description: area.name,
    tag: AREA_TAG, // 'area' instead of 'restaurant'
    radius: area.radius, // Use per-area radius from database
    coordinates: [area.latitude, area.longitude],
    enabled: true,
    metadata: {
      slug: area.slug,
    },
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
 * Process a single area
 */
async function processArea(radarSecretKey, area, index, total) {
  const prefix = `[${index + 1}/${total}]`;

  try {
    // Check if geofence already exists
    const exists = await withRetry(() => checkGeofenceExists(radarSecretKey, area.id));

    if (exists) {
      console.log(`${prefix} SKIP: "${area.name}" - geofence exists`);
      stats.skipped++;
      return;
    }

    // Create the geofence
    await withRetry(() => createGeofence(radarSecretKey, area));
    console.log(`${prefix} CREATED: "${area.name}" (${area.radius}m) at (${area.latitude}, ${area.longitude})`);
    stats.created++;
  } catch (error) {
    console.error(`${prefix} FAILED: "${area.name}" - ${error.message}`);
    stats.failures.push({
      area: area.name,
      id: area.id,
      reason: error.message,
    });
  }
}

/**
 * Print summary
 */
function printSummary() {
  console.log('\n' + '='.repeat(50));
  console.log('AREA GEOFENCE SYNC SUMMARY');
  console.log('='.repeat(50));
  console.log(`Total areas:          ${stats.total}`);
  console.log(`Geofences created:    ${stats.created}`);
  console.log(`Geofences skipped:    ${stats.skipped}`);
  console.log(`Failures:             ${stats.failures.length}`);

  if (stats.failures.length > 0) {
    console.log('\nFailure details:');
    stats.failures.forEach((f, i) => {
      console.log(`  ${i + 1}. ${f.area} (${f.id})`);
      console.log(`     Reason: ${f.reason}`);
    });
  }

  console.log('='.repeat(50) + '\n');
}

/**
 * Main function
 */
async function main() {
  console.log('\n📍 Radar Area Geofence Sync\n');

  // Get Radar secret key
  const radarSecretKey = process.env.RADAR_SECRET_KEY;
  if (!radarSecretKey) {
    console.error('Error: RADAR_SECRET_KEY environment variable is required');
    console.error('Usage: RADAR_SECRET_KEY=prj_live_sk_xxx node scripts/sync_radar_area_geofences.js');
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
  console.log(`Geofence tag: ${AREA_TAG}`);

  try {
    // Fetch areas
    const areas = await fetchAreas(config.url, config.anonKey);
    stats.total = areas.length;

    if (areas.length === 0) {
      console.log('No areas to sync.');
      return;
    }

    // Process each area
    console.log('\nCreating area geofences...\n');
    for (let i = 0; i < areas.length; i++) {
      await processArea(radarSecretKey, areas[i], i, areas.length);
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
