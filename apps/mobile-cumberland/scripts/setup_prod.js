#!/usr/bin/env node
/**
 * Production Database Setup Script
 * Runs all migrations and seeds the production database
 */

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const PROJECT_REF = 'kufcxxynjvyharhtfptd';

const MIGRATION_FILES = [
  '../supabase/migrations/001_initial_schema.sql',
  '../supabase/migrations/002_row_level_security.sql',
  '../supabase/migrations/003_functions_and_views.sql',
];

const SEED_FILE = '../supabase/seed_data.sql';

async function main() {
  const password = process.env.SUPABASE_DB_PASSWORD;
  if (!password) {
    console.error('Error: SUPABASE_DB_PASSWORD environment variable is required');
    console.error('Get it from: https://supabase.com/dashboard/project/' + PROJECT_REF + '/settings/database');
    process.exit(1);
  }

  console.log('\n🚀 Setting up PRODUCTION database...\n');
  console.log('Project:', PROJECT_REF);
  console.log('');

  const client = new Client({
    host: 'aws-1-us-east-2.pooler.supabase.com',
    port: 6543,
    database: 'postgres',
    user: `postgres.${PROJECT_REF}`,
    password: password,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('Connecting to Supabase...');
    await client.connect();
    console.log('✓ Connected\n');

    // Run migrations
    for (const migrationFile of MIGRATION_FILES) {
      const filePath = path.join(__dirname, migrationFile);
      const fileName = path.basename(migrationFile);

      console.log(`Running migration: ${fileName}...`);
      const sql = fs.readFileSync(filePath, 'utf-8');

      try {
        await client.query(sql);
        console.log(`✓ ${fileName} completed\n`);
      } catch (err) {
        if (err.message.includes('already exists')) {
          console.log(`⚠ ${fileName} - objects already exist (skipping)\n`);
        } else {
          throw err;
        }
      }
    }

    // Run seed
    console.log('Running seed data...');
    const seedPath = path.join(__dirname, SEED_FILE);
    const seedSql = fs.readFileSync(seedPath, 'utf-8');
    await client.query(seedSql);
    console.log('✓ Seed data completed\n');

    console.log('🎉 Production database setup complete!');

  } catch (err) {
    console.error('\n❌ Error:', err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
