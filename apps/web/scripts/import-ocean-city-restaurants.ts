/**
 * TasteOceanCity Restaurant Import Script
 *
 * Imports restaurants from the Ocean City CSV scrape into Supabase.
 *
 * Logic:
 *  1. Franchise filtering — skip known chains (logged to report)
 *  2. Deduplication — same name+address → merge contacts; same name+different address → keep both
 *  3. Contact consolidation — collect ALL emails/phones per restaurant location
 *  4. Import to `restaurants` table with market_id = ocean-city-md
 *  5. Import contacts to `business_leads` table (one row per contact)
 *
 * Usage:
 *   cd apps/web
 *   SUPABASE_SERVICE_ROLE_KEY=<key> CSV_PATH=<path> npx tsx scripts/import-ocean-city-restaurants.ts
 *   Add --dry-run to preview without writing to DB
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import { migrateImagesBatch } from './lib/ensure-permanent-image';

// ─── Config ────────────────────────────────────────────────────────────────

const SUPABASE_URL = 'https://kufcxxynjvyharhtfptd.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const CSV_PATH = process.env.CSV_PATH
  || '/Users/leandertoney/Desktop/TasteOceanCity/ocean_city_restaurants.csv';
const MARKET_SLUG = 'ocean-city-md';
const DRY_RUN = process.argv.includes('--dry-run');

// ─── Known Franchise Chains ─────────────────────────────────────────────────
// Lowercase for case-insensitive matching

const FRANCHISE_KEYWORDS = new Set([
  "mcdonald's", 'mcdonalds', 'burger king', 'wendy', 'taco bell', 'subway',
  'starbucks', 'dunkin', 'chick-fil-a', 'chick fil a', 'chickfila',
  'domino', 'pizza hut', 'papa john', "papa murphy",
  'panera', 'chipotle', 'five guys', "arby's", 'arbys',
  'sonic drive', 'sonic ', 'dairy queen', 'hardee', "hardee's",
  "raising cane", "raising canes", "zaxby's", "zaxbys",
  "bojangles", "cook out", "cookout", "whataburger",
  "popeyes", "popeye's", "wingstop", "wing stop",
  "little caesars", "little caesar",
  "waffle house", "ihop", "i.h.o.p",
  "denny's", "dennys", "cracker barrel",
  "applebee's", "applebees", "chili's", "chilis",
  "buffalo wild wings", "bdubs", "hooters",
  "olive garden", "red lobster", "longhorn",
  "outback steakhouse", "outback steak",
  "golden corral",
  "jersey mike", "jimmy john", "firehouse subs",
  "potbelly", "quiznos",
  "panda express", "p.f. chang", "pf chang",
  "moe's", "moes", "qdoba",
  "red robin", "dine brands",
  "jack in the box",
  "culver's", "culvers",
  "steak 'n shake", "steak n shake",
  "bob evans", "perkins",
  "church's chicken", "churches chicken",
  "el pollo loco",
  "captain d's", "captain ds",
  "long john silver",
  "kfc", "kentucky fried",
  "pizza inn", "cicis", "cici's",
  "marcos pizza", "marco's pizza",
  "hungry howie",
  "baskin robbins", "baskin-robbins",
  "coldstone creamery", "cold stone",
  "orange julius",
  "great clips", "supercuts",  // these won't be in restaurants but just in case
]);

function isFranchise(name: string): boolean {
  const lower = name.toLowerCase();
  for (const keyword of FRANCHISE_KEYWORDS) {
    if (lower.includes(keyword)) return true;
  }
  return false;
}

// ─── CSV Parsing ─────────────────────────────────────────────────────────────

interface CsvRow {
  name: string;
  subtypes: string;
  category: string;
  type: string;
  phone: string;
  website: string;
  address: string;
  full_name: string;
  title: string;
  email: string;
  contact_phone: string;
  contact_phones: string;
  latitude: string;
  longitude: string;
  rating: string;
  reviews: string;
  photo: string;
  logo: string;
  working_hours: string;
  description: string;
}

function parseCsv(filePath: string): CsvRow[] {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const headers = parseCsvLine(lines[0]);
  const rows: CsvRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const values = parseCsvLine(line);
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => {
      row[h] = values[idx] || '';
    });
    rows.push(row as CsvRow);
  }

  return rows;
}

// Simple CSV line parser that handles quoted fields with commas inside
function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        // Escaped quote
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

// ─── Normalization Helpers ─────────────────────────────────────────────────

function normalizeName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim();
}

function normalizeAddress(address: string): string {
  return address.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim();
}

// Haversine distance in meters
function distanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ─── Contact Parsing ─────────────────────────────────────────────────────────

const FAKE_EMAIL_PATTERNS = [
  /^noreply@/i, /^no-reply@/i, /^donotreply@/i,
  /^test@/i, /^info@example/i, /^admin@example/i,
  /example\.com$/, /placeholder/i, /^null@/i,
];

function isValidEmail(email: string): boolean {
  if (!email || !email.includes('@')) return false;
  if (email.length < 5) return false;
  for (const pattern of FAKE_EMAIL_PATTERNS) {
    if (pattern.test(email)) return false;
  }
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

interface Contact {
  name: string;
  title: string;
  email: string;
  phone: string;
}

function extractContacts(row: CsvRow): Contact[] {
  const contacts: Contact[] = [];

  // Primary email/phone from the row
  if (row.email && isValidEmail(row.email)) {
    contacts.push({
      name: row.full_name || '',
      title: row.title || '',
      email: row.email,
      phone: row.contact_phone || row.phone || '',
    });
  }

  // Parse contact_phones (may be JSON array or comma-separated)
  if (row.contact_phones) {
    try {
      const phones = JSON.parse(row.contact_phones);
      if (Array.isArray(phones)) {
        phones.forEach((p: string) => {
          if (p && !contacts.some(c => c.phone === p)) {
            contacts.push({ name: '', title: '', email: '', phone: p });
          }
        });
      }
    } catch {
      // Not JSON — try comma-separated
      row.contact_phones.split(',').forEach(p => {
        const trimmed = p.trim();
        if (trimmed && !contacts.some(c => c.phone === trimmed)) {
          contacts.push({ name: '', title: '', email: '', phone: trimmed });
        }
      });
    }
  }

  return contacts;
}

// ─── Hours Parsing ────────────────────────────────────────────────────────────

function parseHours(working_hours: string): Record<string, string[]> | null {
  if (!working_hours) return null;
  try {
    const parsed = JSON.parse(working_hours);
    if (typeof parsed === 'object' && parsed !== null) return parsed;
  } catch {
    // Ignore
  }
  return null;
}

// ─── Main Import Logic ────────────────────────────────────────────────────────

interface RestaurantRecord {
  name: string;
  address: string;
  city: string;
  state: string;
  lat: number | null;
  lng: number | null;
  phone: string | null;
  website: string | null;
  google_rating: number | null;
  google_review_count: number;
  cover_image_url: string | null;
  logo_url: string | null;
  description: string | null;
  hours: Record<string, string[]> | null;
  market_slug: string;
  contacts: Contact[];
  is_active: boolean;
  is_verified: boolean;
  // For dedup tracking
  _csvRows: CsvRow[];
}

async function main() {
  console.log(`\n🌟 TasteOceanCity Restaurant Import`);
  console.log(`   CSV: ${CSV_PATH}`);
  console.log(`   Market: ${MARKET_SLUG}`);
  console.log(`   Dry run: ${DRY_RUN}\n`);

  if (!SUPABASE_SERVICE_ROLE_KEY && !DRY_RUN) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is required (or run with --dry-run)');
  }

  // Parse CSV
  const rows = parseCsv(CSV_PATH);
  console.log(`📄 Parsed ${rows.length} rows from CSV`);

  // Stats
  const stats = {
    total: rows.length,
    franchisesFiltered: 0,
    duplicatesMerged: 0,
    restaurantsImported: 0,
    contactsSaved: 0,
    skipped: 0,
    franchiseNames: [] as string[],
    errors: [] as string[],
  };

  // Step 1: Filter franchises
  const nonFranchiseRows = rows.filter(row => {
    if (!row.name) return false;
    if (isFranchise(row.name)) {
      stats.franchisesFiltered++;
      stats.franchiseNames.push(row.name);
      return false;
    }
    return true;
  });

  console.log(`🚫 Filtered ${stats.franchisesFiltered} franchise rows`);

  // Step 2: Deduplicate — group by normalized name
  const nameGroups = new Map<string, CsvRow[]>();
  for (const row of nonFranchiseRows) {
    const key = normalizeName(row.name);
    if (!nameGroups.has(key)) nameGroups.set(key, []);
    nameGroups.get(key)!.push(row);
  }

  // Step 3: For each name group, resolve to final restaurant records
  const restaurantMap = new Map<string, RestaurantRecord>();

  for (const [normalizedName, group] of nameGroups) {
    if (group.length === 1) {
      // No dedup needed
      const row = group[0];
      const lat = parseFloat(row.latitude) || null;
      const lng = parseFloat(row.longitude) || null;
      const key = `${normalizedName}::${normalizeAddress(row.address)}`;

      restaurantMap.set(key, {
        name: row.name,
        address: row.address,
        city: 'Ocean City',
        state: 'MD',
        lat,
        lng,
        phone: row.phone || null,
        website: row.website || null,
        google_rating: parseFloat(row.rating) || null,
        google_review_count: parseInt(row.reviews) || 0,
        cover_image_url: row.photo || null,
        logo_url: row.logo || null,
        description: row.description || null,
        hours: parseHours(row.working_hours),
        market_slug: MARKET_SLUG,
        contacts: extractContacts(row),
        is_active: true,
        is_verified: false,
        _csvRows: [row],
      });
    } else {
      // Multiple rows with the same normalized name
      // Group by approximate location (within 100m = same location)
      const locationGroups: CsvRow[][] = [];

      for (const row of group) {
        const lat = parseFloat(row.latitude) || 0;
        const lng = parseFloat(row.longitude) || 0;

        let foundGroup = false;
        for (const locGroup of locationGroups) {
          const ref = locGroup[0];
          const refLat = parseFloat(ref.latitude) || 0;
          const refLng = parseFloat(ref.longitude) || 0;
          if (lat && lng && distanceMeters(lat, lng, refLat, refLng) < 150) {
            locGroup.push(row);
            foundGroup = true;
            break;
          }
        }

        if (!foundGroup) {
          locationGroups.push([row]);
        }
      }

      // Each location group = one restaurant (merge contacts, keep highest-rated metadata)
      for (const locGroup of locationGroups) {
        const best = locGroup.reduce((a, b) =>
          (parseFloat(b.rating) || 0) > (parseFloat(a.rating) || 0) ? b : a
        );
        const allContacts: Contact[] = [];
        const seenEmails = new Set<string>();
        const seenPhones = new Set<string>();

        for (const row of locGroup) {
          const contacts = extractContacts(row);
          for (const c of contacts) {
            if (c.email && !seenEmails.has(c.email)) {
              seenEmails.add(c.email);
              allContacts.push(c);
            } else if (!c.email && c.phone && !seenPhones.has(c.phone)) {
              seenPhones.add(c.phone);
              allContacts.push(c);
            }
          }
        }

        if (locGroup.length > 1) stats.duplicatesMerged += locGroup.length - 1;

        const lat = parseFloat(best.latitude) || null;
        const lng = parseFloat(best.longitude) || null;
        const key = `${normalizedName}::${normalizeAddress(best.address)}`;

        restaurantMap.set(key, {
          name: best.name,
          address: best.address,
          city: 'Ocean City',
          state: 'MD',
          lat,
          lng,
          phone: best.phone || null,
          website: best.website || null,
          google_rating: parseFloat(best.rating) || null,
          google_review_count: parseInt(best.reviews) || 0,
          cover_image_url: best.photo || null,
          logo_url: best.logo || null,
          description: best.description || null,
          hours: parseHours(best.working_hours),
          market_slug: MARKET_SLUG,
          contacts: allContacts,
          is_active: true,
          is_verified: false,
          _csvRows: locGroup,
        });
      }
    }
  }

  const finalRestaurants = Array.from(restaurantMap.values());
  console.log(`🍽️  ${finalRestaurants.length} unique restaurant locations after dedup`);
  console.log(`🔀 Merged ${stats.duplicatesMerged} duplicate rows`);

  if (DRY_RUN) {
    console.log('\n✅ DRY RUN — no changes written to database');
    console.log('\nSample restaurants that would be imported:');
    finalRestaurants.slice(0, 10).forEach(r => {
      console.log(`  - ${r.name} | ${r.address} | contacts: ${r.contacts.length}`);
    });
    writeReport(stats, finalRestaurants);
    return;
  }

  // Step 4: Connect to Supabase and import
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // Get market ID
  const { data: market, error: marketError } = await supabase
    .from('markets')
    .select('id')
    .eq('slug', MARKET_SLUG)
    .single();

  if (marketError || !market) {
    throw new Error(
      `Market '${MARKET_SLUG}' not found. Run the migration first:\n` +
      `  npx supabase db push --db-url "postgresql://postgres.kufcxxynjvyharhtfptd:LTMackin%2123@aws-0-us-west-2.pooler.supabase.com:5432/postgres"`
    );
  }

  const marketId = market.id;
  console.log(`\n🗺️  Market ID: ${marketId}`);

  // Pre-assign unique slugs globally (prevents duplicate slug conflict within any batch)
  const usedSlugs = new Set<string>();
  const restaurantSlugs = new Map<string, string>(); // restaurant key → final slug
  for (const r of finalRestaurants) {
    const key = `${normalizeName(r.name)}::${normalizeAddress(r.address)}`;
    let base = slugify(r.name) + '-ocean-city';
    let slug = base;
    let counter = 2;
    while (usedSlugs.has(slug)) {
      slug = `${base}-${counter++}`;
    }
    usedSlugs.add(slug);
    restaurantSlugs.set(key, slug);
  }

  // Import restaurants in batches of 50
  const BATCH_SIZE = 50;
  for (let i = 0; i < finalRestaurants.length; i += BATCH_SIZE) {
    const batch = finalRestaurants.slice(i, i + BATCH_SIZE);

    const restaurantInserts = batch.map(r => {
      const key = `${normalizeName(r.name)}::${normalizeAddress(r.address)}`;
      const slug = restaurantSlugs.get(key)!;
      return {
        name: r.name,
        slug,
        address: r.address,
        city: r.city,
        state: r.state,
        latitude: r.lat,
        longitude: r.lng,
        phone: r.phone,
        website: r.website,
        google_rating: r.google_rating,
        google_review_count: r.google_review_count,
        cover_image_url: r.cover_image_url,
        logo_url: r.logo_url,
        description: r.description,
        is_active: true,
        is_verified: false,
        market_id: marketId,
        categories: [],
        features: [],
      };
    });

    const { data: inserted, error: insertError } = await supabase
      .from('restaurants')
      .upsert(restaurantInserts, { onConflict: 'slug', ignoreDuplicates: false })
      .select('id, name, slug, cover_image_url');

    if (insertError) {
      console.error(`  ❌ Batch ${Math.floor(i / BATCH_SIZE) + 1} error:`, insertError.message);
      stats.skipped += batch.length;
      stats.errors.push(`Batch ${Math.floor(i / BATCH_SIZE) + 1}: ${insertError.message}`);
      continue;
    }

    stats.restaurantsImported += inserted?.length || 0;

    // Migrate external image URLs to permanent Supabase Storage
    if (inserted && inserted.length > 0) {
      await migrateImagesBatch(supabase, inserted);
    }

    // Step 5: Import contacts for each restaurant in this batch
    if (inserted && inserted.length > 0) {
      const restaurantBySlug = new Map(inserted.map(r => [r.slug, r.id]));

      for (const r of batch) {
        const key = `${normalizeName(r.name)}::${normalizeAddress(r.address)}`;
        const slug = restaurantSlugs.get(key)!;
        const restaurantId = restaurantBySlug.get(slug);
        if (!restaurantId || r.contacts.length === 0) continue;

        const allContactInserts = r.contacts
          .filter(c => c.email || c.phone)
          .map(c => ({
            business_name: r.name,
            contact_name: c.name || null,
            email: isValidEmail(c.email) ? c.email : null,
            phone: c.phone || null,
            website: r.website || null,
            address: r.address,
            city: 'Ocean City',
            state: 'MD',
            category: 'restaurant',
            source: 'dreamville_csv_import',
            status: 'new',
            restaurant_id: restaurantId,
            market_id: marketId,
          }));

        if (allContactInserts.length === 0) continue;

        // Contacts with email: upsert using the partial unique index
        const withEmail = allContactInserts.filter(c => c.email);
        const withoutEmail = allContactInserts.filter(c => !c.email);

        // Insert with-email contacts (skip duplicates via partial unique index)
        if (withEmail.length > 0) {
          const { data: savedContacts, error: contactError } = await supabase
            .from('business_leads')
            .insert(withEmail)
            .select('id');

          if (contactError && !contactError.message.includes('duplicate')) {
            console.warn(`  ⚠️  Contact (email) insert for "${r.name}":`, contactError.message);
          } else {
            stats.contactsSaved += savedContacts?.length || 0;
          }
        }

        // Insert phone-only contacts directly (no conflict target needed)
        if (withoutEmail.length > 0) {
          const { data: savedPhoneContacts, error: phoneError } = await supabase
            .from('business_leads')
            .insert(withoutEmail)
            .select('id');

          if (phoneError) {
            console.warn(`  ⚠️  Contact (phone) insert for "${r.name}":`, phoneError.message);
          } else {
            stats.contactsSaved += savedPhoneContacts?.length || 0;
          }
        }
      }
    }

    const progress = Math.min(i + BATCH_SIZE, finalRestaurants.length);
    process.stdout.write(`\r  Progress: ${progress}/${finalRestaurants.length} restaurants`);
  }

  console.log('\n');
  writeReport(stats, finalRestaurants);
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
    .slice(0, 60);
}

interface ImportStats {
  total: number;
  franchisesFiltered: number;
  duplicatesMerged: number;
  restaurantsImported: number;
  contactsSaved: number;
  skipped: number;
  franchiseNames: string[];
  errors: string[];
}

function writeReport(stats: ImportStats, restaurants: RestaurantRecord[]) {
  const report = {
    summary: {
      totalCsvRows: stats.total,
      franchisesFiltered: stats.franchisesFiltered,
      duplicatesMerged: stats.duplicatesMerged,
      restaurantsImported: stats.restaurantsImported,
      contactsSaved: stats.contactsSaved,
      skipped: stats.skipped,
    },
    franchisesFiltered: stats.franchiseNames.sort(),
    errors: stats.errors,
  };

  const reportPath = path.join(process.cwd(), 'ocean-city-import-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`\n📊 Import Summary:`);
  console.log(`   Total CSV rows:       ${report.summary.totalCsvRows}`);
  console.log(`   Franchises filtered:  ${report.summary.franchisesFiltered}`);
  console.log(`   Duplicates merged:    ${report.summary.duplicatesMerged}`);
  console.log(`   Restaurants imported: ${report.summary.restaurantsImported}`);
  console.log(`   Contacts saved:       ${report.summary.contactsSaved}`);
  console.log(`   Skipped (errors):     ${report.summary.skipped}`);
  console.log(`\n📝 Full report saved to: ${reportPath}`);
}

main().catch(err => {
  console.error('\n💥 Fatal error:', err.message);
  process.exit(1);
});
