/**
 * scrape-restaurant-week-descriptions.ts
 *
 * Scrapes the Lancaster City Restaurant Week website for each participating
 * restaurant's description and stores it in restaurants.rw_description.
 *
 * Usage:
 *   cd apps/web
 *   npx tsx scripts/scrape-restaurant-week-descriptions.ts
 *
 * The script will:
 *   1. Fetch the main restaurant week page and extract all restaurant slugs
 *   2. For each slug, fetch the page and pull the description paragraph
 *   3. Match to our DB restaurants by name (fuzzy if needed)
 *   4. Update restaurants.rw_description
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load .env.local before anything else
config({ path: resolve(__dirname, '../.env.local') });

const BASE_URL = 'https://www.lancastercityrestaurantweek.com';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://kufcxxynjvyharhtfptd.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

// ─── HTML helpers ──────────────────────────────────────────────────────────────

/** Extract text content from the first match of a regex against raw HTML */
function extractFirst(html: string, pattern: RegExp): string | null {
  const match = html.match(pattern);
  return match ? match[1].trim() : null;
}

/** Strip all HTML tags and decode common entities */
function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ')
    .replace(/&rsquo;/g, "'")
    .replace(/&lsquo;/g, "'")
    .replace(/&rdquo;/g, '"')
    .replace(/&ldquo;/g, '"')
    .replace(/&ndash;/g, '–')
    .replace(/&mdash;/g, '—')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

/** Fetch a URL and return the raw HTML string */
async function fetchHtml(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; TasteLancBot/1.0)',
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.text();
}

// ─── Slug extraction ───────────────────────────────────────────────────────────

/**
 * Fetch the main page and extract all restaurant slug paths.
 * Falls back to the hardcoded list if parsing yields nothing.
 */
async function getSlugs(): Promise<{ slug: string; name: string }[]> {
  const HARDCODED: { slug: string; name: string }[] = [
    { slug: 'cabbagehillschnitzelhaus', name: 'Cabbage Hill Schnitzel Haus' },
    { slug: 'corkandcaprestaurant',    name: 'Cork & Cap Restaurant' },
    { slug: 'decades',                  name: 'Decades' },
    { slug: 'denimcoffee',              name: 'Denim Coffee' },
    { slug: 'lacajita',                 name: 'La Cajita' },
    { slug: 'layalielsham',             name: 'Layali El Sham' },
    { slug: 'mekatoseatery',            name: 'Mekatos Eatery' },
    { slug: 'rachelscreperie',          name: "Rachel's Cafe and Creperie" },
    { slug: 'raggamuffinkitchen',       name: 'Raggamuffin Kitchen' },
    { slug: 'savoytruffle',             name: 'Savoy Truffle' },
    { slug: 'sproutvietnameseeatery',   name: 'Sprout Vietnamese Eatery' },
    { slug: 'thegloomyrooster',         name: 'The Gloomy Rooster' },
  ];

  try {
    const html = await fetchHtml(BASE_URL);
    // Look for internal links that look like restaurant slugs (no dashes, no extensions, no special paths)
    const linkPattern = /href="\/([a-z][a-z0-9]+)"[^>]*>([^<]{3,})</gi;
    const seen = new Set<string>();
    const results: { slug: string; name: string }[] = [];
    let m: RegExpExecArray | null;
    while ((m = linkPattern.exec(html)) !== null) {
      const slug = m[1];
      const name = stripHtml(m[2]);
      // Skip known non-restaurant paths
      if (['home', 'about', 'contact', 'sponsors', 'map', 'faq', 'rsvp', 'party'].includes(slug)) continue;
      if (!seen.has(slug) && name.length > 3) {
        seen.add(slug);
        results.push({ slug, name });
      }
    }
    if (results.length >= 5) {
      console.log(`✔ Parsed ${results.length} slugs from main page`);
      return results;
    }
  } catch (err) {
    console.warn('Could not parse main page, using hardcoded list:', err);
  }

  console.log(`Using hardcoded list of ${HARDCODED.length} restaurants`);
  return HARDCODED;
}

// ─── Description extraction ────────────────────────────────────────────────────

/**
 * Fetch a restaurant's page and extract the description paragraph.
 * Targets Squarespace's `.sqs-html-content p.sqsrte-small` structure,
 * falling back to any substantial paragraph in the content area.
 */
async function scrapeDescription(slug: string): Promise<string | null> {
  const url = `${BASE_URL}/${slug}`;
  const html = await fetchHtml(url);

  // Primary: extract from within .sqs-html-content blocks
  // We find each sqs-html-content block and collect <p> text inside
  const contentBlocks = html.match(/<div[^>]*class="[^"]*sqs-html-content[^"]*"[^>]*>([\s\S]*?)<\/div>/gi) || [];
  const candidates: string[] = [];

  for (const block of contentBlocks) {
    // Grab all <p> tags inside
    const pTags = block.match(/<p[^>]*>([\s\S]*?)<\/p>/gi) || [];
    for (const p of pTags) {
      const text = stripHtml(p);
      // Must be substantial (more than 40 chars) and sentence-like
      if (text.length > 40 && text.includes(' ')) {
        candidates.push(text);
      }
    }
  }

  if (candidates.length > 0) {
    // Return the longest candidate (most likely the full description)
    return candidates.sort((a, b) => b.length - a.length)[0];
  }

  // Fallback: any <p> on the page with substantial text
  const allP = html.match(/<p[^>]*>([\s\S]*?)<\/p>/gi) || [];
  const fallbacks = allP
    .map(p => stripHtml(p))
    .filter(t => t.length > 60 && t.includes(' ') && !t.startsWith('©'));

  return fallbacks.sort((a, b) => b.length - a.length)[0] ?? null;
}

// ─── DB matching ───────────────────────────────────────────────────────────────

/** Normalize a name for comparison: lowercase, strip punctuation */
function normalize(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim();
}

/** Find the DB restaurant ID that best matches the given name */
async function findRestaurantId(name: string): Promise<{ id: string; dbName: string } | null> {
  // Fetch all restaurants in the lancaster market to match against
  const { data: markets } = await supabase.from('markets').select('id').eq('slug', 'lancaster-pa').single();
  const marketId = (markets as any)?.id;

  const { data: restaurants } = await supabase
    .from('restaurants')
    .select('id, name')
    .eq('market_id', marketId);

  if (!restaurants) return null;

  const target = normalize(name);

  // Exact match first
  for (const r of restaurants) {
    if (normalize(r.name) === target) return { id: r.id, dbName: r.name };
  }

  // Partial match: target contains DB name or vice versa
  for (const r of restaurants) {
    const n = normalize(r.name);
    if (target.includes(n) || n.includes(target)) return { id: r.id, dbName: r.name };
  }

  // Word-overlap score
  const targetWords = new Set(target.split(' ').filter(w => w.length > 2));
  let bestScore = 0;
  let bestMatch: { id: string; dbName: string } | null = null;
  for (const r of restaurants) {
    const words = normalize(r.name).split(' ').filter(w => w.length > 2);
    const overlap = words.filter(w => targetWords.has(w)).length;
    const score = overlap / Math.max(targetWords.size, words.length);
    if (score > bestScore && score >= 0.5) {
      bestScore = score;
      bestMatch = { id: r.id, dbName: r.name };
    }
  }

  return bestMatch;
}

// ─── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ SUPABASE_SERVICE_ROLE_KEY is not set in apps/web/.env.local');
    process.exit(1);
  }

  console.log('🍽  Scraping Lancaster City Restaurant Week descriptions...\n');

  const slugs = await getSlugs();
  let updated = 0;
  let skipped = 0;
  let failed = 0;

  for (const { slug, name } of slugs) {
    process.stdout.write(`  ${name} (/${slug}) ... `);

    let description: string | null = null;
    try {
      description = await scrapeDescription(slug);
    } catch (err) {
      console.log(`❌ fetch error: ${err}`);
      failed++;
      continue;
    }

    if (!description) {
      console.log('⚠️  no description found');
      skipped++;
      continue;
    }

    // Find the matching restaurant in our DB
    const match = await findRestaurantId(name);
    if (!match) {
      console.log(`⚠️  no DB match for "${name}"`);
      skipped++;
      continue;
    }

    // Update rw_description
    const { error } = await supabase
      .from('restaurants')
      .update({ rw_description: description })
      .eq('id', match.id);

    if (error) {
      console.log(`❌ DB error: ${error.message}`);
      failed++;
    } else {
      console.log(`✅ matched → "${match.dbName}"`);
      console.log(`     "${description.slice(0, 80)}${description.length > 80 ? '…' : ''}"`);
      updated++;
    }

    // Be polite to the server
    await new Promise(r => setTimeout(r, 800));
  }

  console.log(`\n─────────────────────────────────────`);
  console.log(`✅ Updated: ${updated}`);
  console.log(`⚠️  Skipped: ${skipped}`);
  console.log(`❌ Failed:  ${failed}`);
  console.log(`\nDeploy the migration first if you haven't yet:`);
  console.log(`  npx supabase db push --db-url "postgresql://postgres.kufcxxynjvyharhtfptd:LTMackin%2123@aws-0-us-west-2.pooler.supabase.com:5432/postgres"\n`);
}

main().catch(err => { console.error(err); process.exit(1); });
