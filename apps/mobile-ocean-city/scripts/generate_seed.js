#!/usr/bin/env node
/**
 * Script to generate SQL seed data from tastelanc_city.csv
 * Run with: node scripts/generate_seed.js
 */

const fs = require('fs');
const path = require('path');

// CSV file path
const CSV_PATH = '/Users/leandertoney/Desktop/TasteLanc Assets/tastelanc_city.csv';
const OUTPUT_PATH = path.join(__dirname, '../supabase/seed_data.sql');

// Category mapping from subtypes to restaurant_category enum
const CATEGORY_MAP = {
  'bar': 'bars',
  'pub': 'bars',
  'sports bar': 'bars',
  'wine bar': 'bars',
  'cocktail bar': 'bars',
  'beer bar': 'bars',
  'beer garden': 'bars',
  'dive bar': 'bars',
  'whisky bar': 'bars',
  'gay bar': 'bars',
  'lounge': 'nightlife',
  'nightclub': 'nightlife',
  'night club': 'nightlife',
  'karaoke bar': 'nightlife',
  'dance club': 'nightlife',
  'rooftop bar': 'rooftops',
  'brunch restaurant': 'brunch',
  'breakfast restaurant': 'brunch',
  'lunch restaurant': 'lunch',
  'cafe': 'lunch',
  'deli': 'lunch',
  'sandwich shop': 'lunch',
  'restaurant': 'dinner',
  'american restaurant': 'dinner',
  'new american restaurant': 'dinner',
  'italian restaurant': 'dinner',
  'mexican restaurant': 'dinner',
  'asian restaurant': 'dinner',
  'chinese restaurant': 'dinner',
  'japanese restaurant': 'dinner',
  'thai restaurant': 'dinner',
  'indian restaurant': 'dinner',
  'mediterranean restaurant': 'dinner',
  'seafood restaurant': 'dinner',
  'steakhouse': 'dinner',
  'steak house': 'dinner',
  'pizza restaurant': 'dinner',
  'pizzeria': 'dinner',
  'sushi restaurant': 'dinner',
  'bbq restaurant': 'dinner',
  'barbecue restaurant': 'dinner',
  'fine dining restaurant': 'dinner',
  'bar & grill': 'dinner',
  'tapas bar': 'dinner',
  'gastropub': 'dinner',
  'bistro': 'dinner',
  'brasserie': 'dinner',
  'patio': 'outdoor_dining',
  'outdoor seating': 'outdoor_dining',
  'beer garden': 'outdoor_dining',
};

// Parse CSV manually (no external dependencies)
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

// Parse a single CSV line handling quoted fields
function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
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

// Generate slug from name
function generateSlug(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .substring(0, 50);
}

// Extract categories from subtypes
function extractCategories(subtypes) {
  if (!subtypes) return [];

  const categories = new Set();
  const parts = subtypes.toLowerCase().split(',').map(s => s.trim());

  for (const part of parts) {
    // Check direct mapping
    if (CATEGORY_MAP[part]) {
      categories.add(CATEGORY_MAP[part]);
    }

    // Check partial matches
    for (const [key, value] of Object.entries(CATEGORY_MAP)) {
      if (part.includes(key) || key.includes(part)) {
        categories.add(value);
      }
    }
  }

  // Default to 'dinner' if nothing matched but it's some kind of restaurant
  if (categories.size === 0 && subtypes.toLowerCase().includes('restaurant')) {
    categories.add('dinner');
  }

  // Default to 'bars' if nothing matched but it's some kind of bar
  if (categories.size === 0 && subtypes.toLowerCase().includes('bar')) {
    categories.add('bars');
  }

  return Array.from(categories);
}

// Parse address to extract city, state, zip
function parseAddress(fullAddress) {
  // Format: "917 S Prince St, Lancaster, PA 17603"
  const parts = fullAddress.split(',').map(s => s.trim());

  let address = fullAddress;
  let city = 'Lancaster';
  let state = 'PA';
  let zipCode = null;

  if (parts.length >= 3) {
    address = parts[0];
    city = parts[1] || 'Lancaster';

    // Last part contains state and zip
    const stateZip = parts[parts.length - 1];
    const match = stateZip.match(/([A-Z]{2})\s*(\d{5})?/);
    if (match) {
      state = match[1];
      zipCode = match[2] || null;
    }
  }

  return { address, city, state, zipCode };
}

// Parse working hours to day-by-day format
function parseWorkingHours(hoursStr) {
  if (!hoursStr) return [];

  // Format: "Monday:11:30AM-2AM|Tuesday:11:30AM-2AM|..."
  const days = hoursStr.split('|');
  const hours = [];

  const dayMap = {
    'monday': 'monday',
    'tuesday': 'tuesday',
    'wednesday': 'wednesday',
    'thursday': 'thursday',
    'friday': 'friday',
    'saturday': 'saturday',
    'sunday': 'sunday',
  };

  for (const day of days) {
    const [dayName, times] = day.split(':');
    if (!dayName || !times) continue;

    const dayKey = dayName.toLowerCase();
    if (!dayMap[dayKey]) continue;

    // Check if closed
    if (times.toLowerCase() === 'closed') {
      hours.push({
        day: dayMap[dayKey],
        isClosed: true,
        openTime: null,
        closeTime: null,
      });
      continue;
    }

    // Parse time range like "11:30AM-2AM" or "11AM-12AM"
    const timeMatch = times.match(/(\d{1,2}(?::\d{2})?(?:AM|PM)?)-(\d{1,2}(?::\d{2})?(?:AM|PM)?)/i);
    if (timeMatch) {
      const openTime = parseTime(timeMatch[1]);
      const closeTime = parseTime(timeMatch[2]);

      hours.push({
        day: dayMap[dayKey],
        isClosed: false,
        openTime,
        closeTime,
      });
    }
  }

  return hours;
}

// Parse time string to 24-hour format
function parseTime(timeStr) {
  if (!timeStr) return null;

  const match = timeStr.match(/(\d{1,2})(?::(\d{2}))?(?:\s)?(AM|PM)?/i);
  if (!match) return null;

  let hours = parseInt(match[1], 10);
  const minutes = match[2] ? parseInt(match[2], 10) : 0;
  const period = (match[3] || 'AM').toUpperCase();

  if (period === 'PM' && hours !== 12) {
    hours += 12;
  } else if (period === 'AM' && hours === 12) {
    hours = 0;
  }

  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:00`;
}

// Escape string for SQL
function escapeSQL(str) {
  if (str === null || str === undefined || str === '') return 'NULL';
  return `'${str.replace(/'/g, "''")}'`;
}

// Main function
function main() {
  console.log('Reading CSV file...');
  const csvContent = fs.readFileSync(CSV_PATH, 'utf-8');
  const records = parseCSV(csvContent);
  console.log(`Found ${records.length} records`);

  // Track used slugs to ensure uniqueness
  const usedSlugs = new Map();

  let sql = `-- TasteLanc Seed Data
-- Generated from tastelanc_city.csv on ${new Date().toISOString()}
-- Total records: ${records.length}
-- ================================================

-- Disable triggers temporarily for faster inserts
SET session_replication_role = replica;

-- Get the basic tier ID
DO $$
DECLARE
  basic_tier_id UUID;
BEGIN
  SELECT id INTO basic_tier_id FROM public.tiers WHERE name = 'basic';

  IF basic_tier_id IS NULL THEN
    RAISE EXCEPTION 'Basic tier not found. Please run migrations first.';
  END IF;
END $$;

-- Insert restaurants
INSERT INTO public.restaurants (
  tier_id,
  name,
  slug,
  address,
  city,
  state,
  zip_code,
  phone,
  website,
  latitude,
  longitude,
  logo_url,
  cover_image_url,
  description,
  categories,
  is_active,
  is_verified
)
SELECT
  (SELECT id FROM public.tiers WHERE name = 'basic'),
  r.name,
  r.slug,
  r.address,
  r.city,
  r.state,
  r.zip_code,
  r.phone,
  r.website,
  r.latitude,
  r.longitude,
  r.logo_url,
  r.cover_image_url,
  r.description,
  r.categories::restaurant_category[],
  TRUE,
  FALSE
FROM (VALUES
`;

  const restaurantValues = [];
  const hoursData = [];

  for (let i = 0; i < records.length; i++) {
    const record = records[i];

    if (!record.name || !record.full_address) {
      console.log(`Skipping record ${i + 1}: missing name or address`);
      continue;
    }

    // Generate unique slug
    let baseSlug = generateSlug(record.name);
    let slug = baseSlug;
    let slugCounter = 1;

    while (usedSlugs.has(slug)) {
      slug = `${baseSlug}-${slugCounter}`;
      slugCounter++;
    }
    usedSlugs.set(slug, true);

    // Parse address
    const { address, city, state, zipCode } = parseAddress(record.full_address);

    // Extract categories
    const categories = extractCategories(record.subtypes);
    const categoriesArray = categories.length > 0
      ? `{${categories.join(',')}}`
      : '{}';

    // Parse coordinates
    const latitude = record.latitude ? parseFloat(record.latitude) : null;
    const longitude = record.longitude ? parseFloat(record.longitude) : null;

    // Build value tuple
    const value = `  (
    ${escapeSQL(record.name)},
    ${escapeSQL(slug)},
    ${escapeSQL(address)},
    ${escapeSQL(city)},
    ${escapeSQL(state)},
    ${escapeSQL(zipCode)},
    ${escapeSQL(record.phone || null)},
    ${escapeSQL(record.site || null)},
    ${latitude !== null ? latitude : 'NULL'},
    ${longitude !== null ? longitude : 'NULL'},
    ${escapeSQL(record.logo || null)},
    ${escapeSQL(record.photo || null)},
    ${escapeSQL(record.description || null)},
    ${escapeSQL(categoriesArray)}
  )`;

    restaurantValues.push(value);

    // Collect hours data for this restaurant
    const hours = parseWorkingHours(record.working_hours_old_format);
    if (hours.length > 0) {
      hoursData.push({ slug, hours });
    }
  }

  sql += restaurantValues.join(',\n');
  sql += `
) AS r(name, slug, address, city, state, zip_code, phone, website, latitude, longitude, logo_url, cover_image_url, description, categories)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  address = EXCLUDED.address,
  phone = EXCLUDED.phone,
  website = EXCLUDED.website,
  latitude = EXCLUDED.latitude,
  longitude = EXCLUDED.longitude,
  logo_url = EXCLUDED.logo_url,
  cover_image_url = EXCLUDED.cover_image_url,
  description = EXCLUDED.description,
  categories = EXCLUDED.categories,
  updated_at = NOW();

`;

  // Generate hours inserts
  if (hoursData.length > 0) {
    sql += `-- Insert restaurant hours
`;

    for (const { slug, hours } of hoursData) {
      for (const h of hours) {
        sql += `INSERT INTO public.restaurant_hours (restaurant_id, day_of_week, open_time, close_time, is_closed)
SELECT r.id, '${h.day}'::day_of_week, ${h.openTime ? `'${h.openTime}'::TIME` : 'NULL'}, ${h.closeTime ? `'${h.closeTime}'::TIME` : 'NULL'}, ${h.isClosed}
FROM public.restaurants r WHERE r.slug = ${escapeSQL(slug)}
ON CONFLICT (restaurant_id, day_of_week) DO UPDATE SET
  open_time = EXCLUDED.open_time,
  close_time = EXCLUDED.close_time,
  is_closed = EXCLUDED.is_closed,
  updated_at = NOW();
`;
      }
    }
  }

  sql += `
-- Re-enable triggers
SET session_replication_role = DEFAULT;

-- Summary
DO $$
DECLARE
  restaurant_count INTEGER;
  hours_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO restaurant_count FROM public.restaurants;
  SELECT COUNT(*) INTO hours_count FROM public.restaurant_hours;
  RAISE NOTICE 'Seed complete: % restaurants, % hour entries', restaurant_count, hours_count;
END $$;
`;

  console.log('Writing SQL file...');
  fs.writeFileSync(OUTPUT_PATH, sql);
  console.log(`Generated ${OUTPUT_PATH}`);
  console.log(`Total restaurants: ${restaurantValues.length}`);
  console.log(`Total hour entries: ${hoursData.reduce((sum, d) => sum + d.hours.length, 0)}`);
}

main();
