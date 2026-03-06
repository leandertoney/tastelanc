/**
 * Enrich restaurants + business_leads with personal contact data from Cumberland CSV
 *
 * Usage:
 *   cd apps/web
 *   npx tsx scripts/enrich-leads-from-csv.ts --dry-run   # Preview matches
 *   npx tsx scripts/enrich-leads-from-csv.ts              # Apply updates
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import { parse } from 'csv-parse/sync';

// ─── Config ──────────────────────────────────────────────────────

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://kufcxxynjvyharhtfptd.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const CUMBERLAND_MARKET_ID = '0602afe2-fae2-4e46-af2c-7b374bfc9d45';

const CSV_PATH = process.argv.find(a => a.startsWith('--csv='))?.split('=')[1]
  || '/Users/leandertoney/Desktop/TasteCumberland Assets/cumberland_county.csv';

const DRY_RUN = process.argv.includes('--dry-run');

if (!SUPABASE_SERVICE_KEY) {
  console.error('Missing SUPABASE_SERVICE_ROLE_KEY. Run from apps/web with .env.local loaded.');
  console.error('  cd apps/web && npx tsx scripts/enrich-leads-from-csv.ts');
  process.exit(1);
}

// ─── Helpers ─────────────────────────────────────────────────────

function normalize(name: string): string {
  return name
    .toLowerCase()
    .replace(/['']/g, "'")
    .replace(/[^a-z0-9' ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, '').replace(/^1/, '');
}

const GENERIC_PREFIXES = [
  'info', 'hello', 'contact', 'eat', 'drink', 'order', 'reservations',
  'events', 'catering', 'admin', 'office', 'support', 'help', 'hi',
  'sales', 'bookings', 'reserve', 'general', 'mail', 'team',
];

function isPersonalEmail(email: string): boolean {
  const prefix = email.split('@')[0].toLowerCase();
  return !GENERIC_PREFIXES.includes(prefix);
}

function formatPhone(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 11 && digits.startsWith('1')) {
    return `+1 ${digits.slice(1, 4)}-${digits.slice(4, 7)}-${digits.slice(7)}`;
  }
  if (digits.length === 10) {
    return `+1 ${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  return raw;
}

interface DbRow {
  id: string;
  name?: string;
  business_name?: string;
  phone: string | null;
  contact_name: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  contact_title: string | null;
  email?: string | null;
}

function buildUpdates(row: Record<string, string>, record: DbRow): Record<string, string> {
  const update: Record<string, string> = {};

  if (row.full_name?.trim() && (!record.contact_name || record.contact_name === 'unknown')) {
    update.contact_name = row.full_name.trim();
  }

  if (row.title?.trim() && !record.contact_title) {
    update.contact_title = row.title.trim();
  }

  if (row.contact_phone?.trim() && !record.contact_phone) {
    update.contact_phone = formatPhone(row.contact_phone.trim());
  }

  const csvEmail = (row.email || '').trim();
  if (csvEmail && row.full_name?.trim() && isPersonalEmail(csvEmail)) {
    if (!record.contact_email) {
      update.contact_email = csvEmail;
    }
  }

  return update;
}

// ─── Main ────────────────────────────────────────────────────────

async function main() {
  console.log(DRY_RUN ? '--- DRY RUN — no changes will be made ---\n' : '--- LIVE RUN — will update database ---\n');

  // 1. Read CSV
  const csvContent = fs.readFileSync(CSV_PATH, 'utf-8');
  const csvRows: Record<string, string>[] = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });
  console.log(`CSV: ${csvRows.length} rows loaded`);

  const enrichedRows = csvRows.filter(r =>
    r.full_name?.trim() || r.contact_phone?.trim() || r.title?.trim()
  );
  console.log(`CSV: ${enrichedRows.length} rows have personal contact data\n`);

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  // ─── Enrich Restaurants ──────────────────────────────────────
  console.log('=== RESTAURANTS ===\n');

  const { data: restaurants, error: rErr } = await supabase
    .from('restaurants')
    .select('id, name, phone, contact_name, contact_phone, contact_email, contact_title')
    .eq('market_id', CUMBERLAND_MARKET_ID);

  if (rErr) { console.error('Failed to fetch restaurants:', rErr.message); process.exit(1); }
  console.log(`DB: ${restaurants.length} Cumberland restaurants\n`);

  // Build lookup by normalized name
  const restByName = new Map<string, typeof restaurants>();
  for (const r of restaurants) {
    const key = normalize(r.name);
    const arr = restByName.get(key) || [];
    arr.push(r);
    restByName.set(key, arr);
  }

  // Build lookup by phone (10-digit)
  const restByPhone = new Map<string, typeof restaurants>();
  for (const r of restaurants) {
    if (r.phone) {
      const key = normalizePhone(r.phone);
      if (key.length === 10) {
        const arr = restByPhone.get(key) || [];
        arr.push(r);
        restByPhone.set(key, arr);
      }
    }
  }

  // Build prefix lookup for fuzzy matching
  const restByPrefix = new Map<string, typeof restaurants>();
  for (const r of restaurants) {
    const words = normalize(r.name).split(' ').filter(w => w.length > 2);
    if (words.length > 0) {
      const prefix = words.slice(0, 2).join(' ');
      const arr = restByPrefix.get(prefix) || [];
      arr.push(r);
      restByPrefix.set(prefix, arr);
    }
  }

  let rMatched = 0, rUpdated = 0, rSkipped = 0, rUnmatched = 0;
  const restUpdates: Array<{ id: string; name: string; data: Record<string, string> }> = [];

  for (const row of enrichedRows) {
    const csvName = normalize(row.name || '');
    if (!csvName) continue;

    // Try exact name match
    let matches = restByName.get(csvName);

    // Try phone match
    if (!matches && row.phone) {
      const csvPhone = normalizePhone(row.phone);
      if (csvPhone.length === 10) {
        matches = restByPhone.get(csvPhone);
      }
    }

    // Try prefix match (first 2 significant words, only if unique)
    if (!matches) {
      const words = csvName.split(' ').filter(w => w.length > 2);
      if (words.length > 0) {
        const prefix = words.slice(0, 2).join(' ');
        const candidates = restByPrefix.get(prefix);
        if (candidates && candidates.length === 1) {
          matches = candidates;
        }
      }
    }

    if (!matches || matches.length === 0) {
      rUnmatched++;
      continue;
    }

    rMatched++;

    for (const rest of matches) {
      const update = buildUpdates(row, { ...rest, business_name: rest.name });
      if (Object.keys(update).length === 0) { rSkipped++; continue; }
      rUpdated++;
      restUpdates.push({ id: rest.id, name: rest.name, data: update });
      console.log(`  MATCH: "${row.name}" -> "${rest.name}"`);
      for (const [k, v] of Object.entries(update)) console.log(`    ${k}: ${v}`);
    }
  }

  console.log(`\nRestaurants Summary:`);
  console.log(`  Matched: ${rMatched} | Updates: ${rUpdated} | Skipped: ${rSkipped} | Unmatched: ${rUnmatched}`);

  // ─── Enrich Business Leads ──────────────────────────────────
  console.log('\n=== BUSINESS LEADS ===\n');

  const { data: leads, error: lErr } = await supabase
    .from('business_leads')
    .select('id, business_name, phone, contact_name, contact_phone, contact_email, contact_title, email')
    .eq('market_id', CUMBERLAND_MARKET_ID);

  if (lErr) { console.error('Failed to fetch leads:', lErr.message); process.exit(1); }
  console.log(`DB: ${leads.length} Cumberland leads\n`);

  const leadByName = new Map<string, typeof leads>();
  for (const l of leads) {
    const key = normalize(l.business_name);
    const arr = leadByName.get(key) || [];
    arr.push(l);
    leadByName.set(key, arr);
  }

  let lMatched = 0, lUpdated = 0, lSkipped = 0, lUnmatched = 0;
  const leadUpdates: Array<{ id: string; name: string; data: Record<string, string> }> = [];

  for (const row of enrichedRows) {
    const csvName = normalize(row.name || '');
    if (!csvName) continue;

    const matches = leadByName.get(csvName);
    if (!matches || matches.length === 0) { lUnmatched++; continue; }
    lMatched++;

    for (const lead of matches) {
      const update = buildUpdates(row, { ...lead, name: lead.business_name });

      // Also fill business email if missing
      const csvEmail = (row.email || '').trim();
      if (csvEmail && !lead.email) {
        update.email = csvEmail;
      }

      if (Object.keys(update).length === 0) { lSkipped++; continue; }
      lUpdated++;
      leadUpdates.push({ id: lead.id, name: lead.business_name, data: update });
      console.log(`  MATCH: "${row.name}" -> "${lead.business_name}"`);
      for (const [k, v] of Object.entries(update)) console.log(`    ${k}: ${v}`);
    }
  }

  console.log(`\nLeads Summary:`);
  console.log(`  Matched: ${lMatched} | Updates: ${lUpdated} | Skipped: ${lSkipped} | Unmatched: ${lUnmatched}`);

  // ─── Apply ──────────────────────────────────────────────────
  const totalUpdates = restUpdates.length + leadUpdates.length;
  console.log(`\n=== TOTAL: ${totalUpdates} updates ===`);

  if (!DRY_RUN && totalUpdates > 0) {
    console.log('\nApplying restaurant updates...');
    let success = 0, failed = 0;
    for (const { id, name, data } of restUpdates) {
      const { error } = await supabase.from('restaurants').update(data).eq('id', id);
      if (error) { console.error(`  FAILED: ${name} — ${error.message}`); failed++; }
      else success++;
    }
    console.log(`  Restaurants: ${success} updated, ${failed} failed`);

    console.log('Applying lead updates...');
    success = 0; failed = 0;
    for (const { id, name, data } of leadUpdates) {
      const { error } = await supabase.from('business_leads').update(data).eq('id', id);
      if (error) { console.error(`  FAILED: ${name} — ${error.message}`); failed++; }
      else success++;
    }
    console.log(`  Leads: ${success} updated, ${failed} failed`);

    console.log('\nDone!');
  } else if (DRY_RUN) {
    console.log('\nDry run complete. Remove --dry-run to apply changes.');
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
