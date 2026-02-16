#!/usr/bin/env node
// Disable SSL verification for Supabase connection
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// Environment configuration
const ENVIRONMENTS = {
  dev: 'kcoszrcubshtsezcktnn',
  prod: 'kufcxxynjvyharhtfptd'
};

// Get environment from command line argument (default: dev)
const env = process.argv[2] || 'dev';
if (!ENVIRONMENTS[env]) {
  console.error(`Unknown environment: ${env}`);
  console.error('Usage: SUPABASE_DB_PASSWORD=xxx node scripts/run_seed.js [dev|prod]');
  process.exit(1);
}

const PROJECT_REF = ENVIRONMENTS[env];
const SEED_FILE = path.join(__dirname, '../supabase/seed_data.sql');

console.log(`\n🎯 Target environment: ${env.toUpperCase()} (${PROJECT_REF})\n`);

async function main() {
  const password = process.env.SUPABASE_DB_PASSWORD;
  if (!password) {
    console.error('Error: SUPABASE_DB_PASSWORD environment variable is required');
    console.error('Get it from: https://supabase.com/dashboard/project/' + PROJECT_REF + '/settings/database');
    process.exit(1);
  }

  // URL-encode the password for special characters
  const encodedPassword = encodeURIComponent(password);
  // Use transaction mode pooler connection on port 6543
  const connectionString = `postgresql://postgres.${PROJECT_REF}:${encodedPassword}@aws-1-us-east-2.pooler.supabase.com:6543/postgres`;

  console.log('Reading seed file...');
  const sql = fs.readFileSync(SEED_FILE, 'utf-8');

  const user = `postgres.${PROJECT_REF}`;
  console.log('Connecting to Supabase as user:', user);
  const client = new Client({
    host: 'aws-1-us-east-2.pooler.supabase.com',
    port: 6543,
    database: 'postgres',
    user: user,
    password: password,
    ssl: { rejectUnauthorized: false }
  });
  await client.connect();

  console.log('Running seed SQL (this may take a minute)...');
  try {
    await client.query(sql);
    console.log('Seed complete!');
  } catch (err) {
    console.error('Error running seed:', err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
