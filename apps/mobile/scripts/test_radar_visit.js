#!/usr/bin/env node
/**
 * Radar Visit Test Script
 *
 * Simulates a Radar geofence entry event for testing visit tracking
 * without being physically present at a restaurant.
 *
 * Usage:
 *   node scripts/test_radar_visit.js <user_id> <restaurant_id>
 *
 * Example:
 *   node scripts/test_radar_visit.js abc123 def456
 *
 * For production:
 *   SUPABASE_ENV=prod node scripts/test_radar_visit.js <user_id> <restaurant_id>
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
 * Verify restaurant exists
 */
async function verifyRestaurant(config, restaurantId) {
  const url = `${config.url}/rest/v1/restaurants?id=eq.${restaurantId}&select=id,name`;

  const response = await makeRequest(url, {
    method: 'GET',
    headers: {
      apikey: config.anonKey,
      Authorization: `Bearer ${config.anonKey}`,
    },
  });

  if (response.status !== 200 || !response.data || response.data.length === 0) {
    return null;
  }

  return response.data[0];
}

/**
 * Check if visit already recorded today
 */
async function checkExistingVisit(config, userId, restaurantId) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const url = `${config.url}/rest/v1/visits?user_id=eq.${userId}&restaurant_id=eq.${restaurantId}&visited_at=gte.${today.toISOString()}&select=id`;

  const response = await makeRequest(url, {
    method: 'GET',
    headers: {
      apikey: config.anonKey,
      Authorization: `Bearer ${config.anonKey}`,
    },
  });

  if (response.status !== 200) {
    return { exists: false, error: response.data };
  }

  return { exists: response.data && response.data.length > 0, error: null };
}

/**
 * Record a mock visit
 */
async function recordVisit(config, userId, restaurantId) {
  const url = `${config.url}/rest/v1/visits`;

  const body = {
    user_id: userId,
    restaurant_id: restaurantId,
    source: 'manual', // Mark as manual for testing
    visited_at: new Date().toISOString(),
  };

  const response = await makeRequest(
    url,
    {
      method: 'POST',
      headers: {
        apikey: config.anonKey,
        Authorization: `Bearer ${config.anonKey}`,
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
      },
    },
    body
  );

  return response;
}

/**
 * Main function
 */
async function main() {
  const args = process.argv.slice(2);

  if (args.length < 2) {
    console.log('\n📍 Radar Visit Test Script\n');
    console.log('Usage: node scripts/test_radar_visit.js <user_id> <restaurant_id>\n');
    console.log('Options:');
    console.log('  SUPABASE_ENV=prod  Use production database (default: dev)\n');
    console.log('Example:');
    console.log('  node scripts/test_radar_visit.js abc123-user-uuid def456-restaurant-uuid\n');
    process.exit(1);
  }

  const [userId, restaurantId] = args;
  const env = process.env.SUPABASE_ENV || 'dev';
  const config = SUPABASE_CONFIGS[env];

  console.log('\n📍 Radar Visit Test\n');
  console.log(`Environment: ${env.toUpperCase()}`);
  console.log(`User ID:     ${userId}`);
  console.log(`Restaurant:  ${restaurantId}\n`);

  try {
    // 1. Verify restaurant exists
    console.log('Verifying restaurant...');
    const restaurant = await verifyRestaurant(config, restaurantId);

    if (!restaurant) {
      console.error('❌ Restaurant not found');
      process.exit(1);
    }

    console.log(`✓ Found: "${restaurant.name}"\n`);

    // 2. Check for existing visit today
    console.log('Checking for existing visits today...');
    const { exists, error } = await checkExistingVisit(config, userId, restaurantId);

    if (error) {
      console.error('❌ Error checking visits:', error);
      process.exit(1);
    }

    if (exists) {
      console.log('⚠️  Visit already recorded today for this user/restaurant\n');
      console.log('Note: The visit tracking system prevents duplicate visits per day.');
      console.log('Try again tomorrow or use a different restaurant.\n');
      process.exit(0);
    }

    console.log('✓ No existing visit today\n');

    // 3. Simulate geofence entry and record visit
    console.log('Simulating geofence entry...');
    console.log(`  → Event: user.entered_geofence`);
    console.log(`  → Geofence: ${restaurant.name}`);
    console.log(`  → External ID: ${restaurantId}`);
    console.log(`  → Confidence: high\n`);

    console.log('Recording visit to Supabase...');
    const response = await recordVisit(config, userId, restaurantId);

    if (response.status !== 201 && response.status !== 200) {
      console.error('❌ Failed to record visit:', response.data);
      process.exit(1);
    }

    console.log('✓ Visit recorded successfully!\n');
    console.log('Visit Details:');
    console.log(`  ID:          ${response.data[0]?.id || 'N/A'}`);
    console.log(`  User ID:     ${userId}`);
    console.log(`  Restaurant:  ${restaurant.name}`);
    console.log(`  Source:      manual (test)`);
    console.log(`  Timestamp:   ${new Date().toISOString()}\n`);

    console.log('✅ Test complete! The visit will now affect recommendation scoring.\n');
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

main();
