/**
 * Backfill restaurant_hours for Fayetteville restaurants.
 *
 * The original import script parsed CSV working_hours but never wrote them
 * to the restaurant_hours table. This script fixes that.
 *
 * Usage:
 *   cd apps/web
 *   SUPABASE_SERVICE_ROLE_KEY=<key> npx tsx scripts/backfill-fayetteville-hours.ts
 *   Add --dry-run to preview without writing
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

const SUPABASE_URL = 'https://kufcxxynjvyharhtfptd.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const CSV_PATH = process.env.CSV_PATH
  || '/Users/leandertoney/Desktop/TasteFayetteville/dreamville_csv.csv';
const MARKET_SLUG = 'fayetteville-nc';
const DRY_RUN = process.argv.includes('--dry-run');

// CSV day names → lowercase DB format
const DAY_MAP: Record<string, string> = {
  monday: 'monday',
  tuesday: 'tuesday',
  wednesday: 'wednesday',
  thursday: 'thursday',
  friday: 'friday',
  saturday: 'saturday',
  sunday: 'sunday',
};

// Parse "11AM-10PM", "11:30AM-2:30PM", "4:30-9PM", "12-10PM", "Closed"
// Returns null for "Closed" or unparseable strings
function parseTimeRange(range: string): { open: string; close: string; closed: boolean } | null {
  const r = range.trim();

  // "Closed" variants
  if (/^closed$/i.test(r)) return { open: '', close: '', closed: true };

  // Find the separator dash — it's always the first '-' that comes after a digit or AM/PM
  // Times use colons, never dashes, so any '-' is the open/close separator
  const dashIdx = r.search(/[\dMm]-/i);
  if (dashIdx === -1) return null;

  const openStr = r.slice(0, dashIdx + 1); // up to and including digit/M before dash
  const closeStr = r.slice(dashIdx + 2);   // after dash

  // Parse close first so we can infer AM/PM for open
  const close = parseTime(closeStr, null);
  if (!close) return null;

  const open = parseTime(openStr, close);
  if (!open) return null;

  return { open, close, closed: false };
}

// Parse "11AM", "11:30AM", "4:30" (infer from closeTime if no AM/PM)
function parseTime(s: string, closeTime: string | null): string | null {
  s = s.trim();
  const match = s.match(/^(\d{1,2})(?::(\d{2}))?[ ]*(AM|PM|am|pm)?$/i);
  if (!match) return null;

  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2] || '0', 10);
  const ampm = (match[3] || '').toUpperCase();

  if (ampm === 'PM' && hours !== 12) hours += 12;
  else if (ampm === 'AM' && hours === 12) hours = 0;
  else if (!ampm && closeTime) {
    // Infer from close time: if close is afternoon/evening and this hour is < 12, it's PM
    const closeH = parseInt(closeTime.split(':')[0], 10);
    if (closeH >= 12 && hours < 12 && hours > 0) hours += 12;
    // "12" without AM/PM when close is PM → noon (12PM)
  } else if (!ampm && !closeTime) {
    // No close time context — assume PM for small hours (e.g. open time "4" alone)
    if (hours < 12 && hours > 0) hours += 12;
  }

  if (hours === 24) return '23:59:00';
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00`;
}

// ─── CSV Parsing (minimal — just name + working_hours) ─────────────────────

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
      else inQuotes = !inQuotes;
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

interface CsvRow { name: string; working_hours: string; [key: string]: string; }

function parseCsv(filePath: string): CsvRow[] {
  const lines = fs.readFileSync(filePath, 'utf-8').split('\n');
  const headers = parseCsvLine(lines[0]);
  const rows: CsvRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const values = parseCsvLine(line);
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => { row[h] = values[idx] || ''; });
    rows.push(row as CsvRow);
  }
  return rows;
}

function normalizeName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim();
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n⏰ Fayetteville Hours Backfill');
  console.log(`   CSV: ${CSV_PATH}`);
  console.log(`   Dry run: ${DRY_RUN}\n`);

  if (!SUPABASE_SERVICE_ROLE_KEY && !DRY_RUN) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY required');
  }

  const rows = parseCsv(CSV_PATH);
  console.log(`📄 Parsed ${rows.length} CSV rows`);

  // Build a map: normalizedName → working_hours JSON
  const hoursMap = new Map<string, Record<string, string[]>>();
  for (const row of rows) {
    if (!row.name || !row.working_hours) continue;
    try {
      const parsed = JSON.parse(row.working_hours);
      if (typeof parsed === 'object' && parsed !== null) {
        const key = normalizeName(row.name);
        if (!hoursMap.has(key)) hoursMap.set(key, parsed);
      }
    } catch { /* skip */ }
  }
  console.log(`📅 ${hoursMap.size} restaurants have hours in CSV`);

  if (DRY_RUN) {
    // Preview a few
    let i = 0;
    for (const [name, hours] of hoursMap) {
      if (i++ > 3) break;
      console.log(`\n  ${name}:`);
      for (const [day, slots] of Object.entries(hours)) {
        for (const slot of slots) {
          const parsed = parseTimeRange(slot);
          const display = !parsed ? 'FAILED TO PARSE'
            : parsed.closed ? 'CLOSED'
            : `${parsed.open} - ${parsed.close}`;
          console.log(`    ${day}: "${slot}" → ${display}`);
        }
      }
    }
    console.log('\n✅ DRY RUN complete');
    return;
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // Get market ID
  const { data: market, error: marketError } = await supabase
    .from('markets').select('id').eq('slug', MARKET_SLUG).single();
  if (marketError || !market) throw new Error(`Market '${MARKET_SLUG}' not found`);

  // Fetch all Fayetteville restaurants
  const { data: restaurants, error: restError } = await supabase
    .from('restaurants')
    .select('id, name')
    .eq('market_id', market.id);
  if (restError || !restaurants) throw new Error(`Failed to fetch restaurants: ${restError?.message}`);

  console.log(`🍽️  ${restaurants.length} Fayetteville restaurants in DB`);

  let matched = 0;
  let skipped = 0;
  let hoursInserted = 0;
  let parseFailures = 0;

  for (const restaurant of restaurants) {
    const key = normalizeName(restaurant.name);
    const csvHours = hoursMap.get(key);
    if (!csvHours) { skipped++; continue; }

    const hoursRows: {
      restaurant_id: string;
      day_of_week: string;
      open_time: string | null;
      close_time: string | null;
      is_closed: boolean;
    }[] = [];

    for (const [csvDay, slots] of Object.entries(csvHours)) {
      const day = DAY_MAP[csvDay.toLowerCase()];
      if (!day) continue;

      if (!slots || slots.length === 0) {
        hoursRows.push({ restaurant_id: restaurant.id, day_of_week: day, open_time: null, close_time: null, is_closed: true });
        continue;
      }

      // Use first slot (most restaurants have one; split-hour = open of first, close of last)
      const firstSlot = slots[0];
      const lastSlot = slots[slots.length - 1];
      const openParsed = parseTimeRange(firstSlot);
      const closeParsed = parseTimeRange(lastSlot);

      if (!openParsed) {
        parseFailures++;
        console.warn(`  ⚠️  Failed to parse "${firstSlot}" for ${restaurant.name} ${day}`);
        continue;
      }

      // "Closed" slot
      if (openParsed.closed) {
        hoursRows.push({ restaurant_id: restaurant.id, day_of_week: day, open_time: null, close_time: null, is_closed: true });
        continue;
      }

      hoursRows.push({
        restaurant_id: restaurant.id,
        day_of_week: day,
        open_time: openParsed.open,
        close_time: (closeParsed && !closeParsed.closed) ? closeParsed.close : openParsed.close,
        is_closed: false,
      });
    }

    if (hoursRows.length === 0) { skipped++; continue; }

    const { error: upsertError } = await supabase
      .from('restaurant_hours')
      .upsert(hoursRows, { onConflict: 'restaurant_id,day_of_week' });

    if (upsertError) {
      console.error(`  ❌ ${restaurant.name}: ${upsertError.message}`);
      skipped++;
    } else {
      matched++;
      hoursInserted += hoursRows.length;
    }
  }

  console.log(`\n✅ Done!`);
  console.log(`   Restaurants with hours populated: ${matched}`);
  console.log(`   Hours rows upserted: ${hoursInserted}`);
  console.log(`   Skipped (no CSV match or error): ${skipped}`);
  console.log(`   Parse failures: ${parseFailures}`);
}

main().catch(err => {
  console.error('\n💥 Fatal error:', err.message);
  process.exit(1);
});
