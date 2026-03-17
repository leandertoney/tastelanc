/**
 * Find Instagram handles for all restaurants across all markets.
 *
 * Strategy (in order of reliability):
 * 1. Scrape restaurant websites for instagram.com links
 * 2. Google search fallback for restaurants without websites or where scraping fails
 * 3. Verify all found handles via Instagram Business Discovery API
 *
 * Usage:
 *   npx tsx scripts/find-instagram-handles.ts                    # All markets
 *   npx tsx scripts/find-instagram-handles.ts --market=lancaster-pa
 *   npx tsx scripts/find-instagram-handles.ts --verify-only      # Re-verify existing handles
 *   npx tsx scripts/find-instagram-handles.ts --dry-run           # Don't write to DB
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://kufcxxynjvyharhtfptd.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY || '';
const GOOGLE_CX = process.env.GOOGLE_CX || ''; // Custom Search Engine ID

// Load env from .env.local if running locally
import { readFileSync } from 'fs';
import { resolve } from 'path';

let envVars: Record<string, string> = {};
try {
  const envFile = readFileSync(resolve(__dirname, '../.env.local'), 'utf-8');
  for (const line of envFile.split('\n')) {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match) envVars[match[1].trim()] = match[2].trim();
  }
} catch {}

const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_KEY || envVars.SUPABASE_SERVICE_ROLE_KEY || ''
);

const googleApiKey = GOOGLE_API_KEY || envVars.GOOGLE_API_KEY || '';

// ─── Instagram handle extraction ────────────────────────────────────────

// ONLY match explicit instagram.com URLs — do NOT match bare @handles (too many CSS false positives)
const IG_URL_PATTERN = /(?:https?:\/\/)?(?:www\.)?instagram\.com\/([a-zA-Z0-9_.]{2,30})\/?(?:[?#"'\s<>]|$)/gi;

const IGNORE_HANDLES = new Set([
  'p', 'explore', 'accounts', 'stories', 'reels', 'reel',
  'direct', 'tv', 'about', 'developer', 'legal', 'privacy',
  'terms', 'help', 'press', 'api', 'blog', 'tags', 'locations',
  'nametag', 'ar', 'shopping', 'guides', 'web', 'embed',
  'share', 'intent', 'oauth', 'static', 'images', 'assets',
  // CSS/JS false positives that look like handles
  'font', 'media', 'keyframes', 'context', 'original', 'formatjs',
  '400', '1.5.1', '100', '200', '300', '500',
]);

function extractInstagramHandles(html: string): string[] {
  const handles = new Set<string>();

  IG_URL_PATTERN.lastIndex = 0;
  let match;
  while ((match = IG_URL_PATTERN.exec(html)) !== null) {
    const handle = match[1].toLowerCase().replace(/\/$/, '');
    if (
      !IGNORE_HANDLES.has(handle) &&
      handle.length > 1 &&
      !handle.startsWith('.') &&
      !handle.match(/^\d+$/) && // pure numbers aren't handles
      !handle.includes('.js') &&
      !handle.includes('.css')
    ) {
      handles.add(handle);
    }
  }

  return [...handles];
}

// ─── Website scraping ───────────────────────────────────────────────────

async function scrapeWebsite(url: string, timeoutMs = 8000): Promise<string | null> {
  try {
    // Ensure URL has protocol
    if (!url.startsWith('http')) url = 'https://' + url;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml',
      },
      redirect: 'follow',
    });

    clearTimeout(timeout);

    if (!res.ok) return null;

    const text = await res.text();
    return text;
  } catch {
    return null;
  }
}

// ─── DuckDuckGo Search fallback ─────────────────────────────────────────

async function searchInstagram(restaurantName: string, city: string): Promise<string | null> {
  const query = `${restaurantName} ${city} instagram.com`;
  const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    });

    clearTimeout(timeout);
    if (!res.ok) return null;

    const html = await res.text();
    const matches = html.matchAll(/instagram\.com\/([a-zA-Z0-9_.]{2,30})/g);
    const seen = new Set<string>();

    for (const match of matches) {
      const handle = match[1].toLowerCase().replace(/\/$/, '');
      if (!IGNORE_HANDLES.has(handle) && !seen.has(handle) && !/^\d+$/.test(handle)) {
        return handle; // Return first valid match
      }
      seen.add(handle);
    }

    return null;
  } catch {
    return null;
  }
}

// ─── Instagram Business Discovery verification ─────────────────────────

interface IGVerification {
  username: string;
  name: string;
  biography: string;
  followers_count: number;
  media_count: number;
  verified: boolean;
}

async function verifyInstagramHandle(
  handle: string,
  igAccountId: string,
  accessToken: string,
): Promise<IGVerification | null> {
  try {
    const fields = 'username,name,biography,followers_count,media_count';
    const url = `https://graph.facebook.com/v19.0/${igAccountId}?fields=business_discovery.fields(${fields}){username=${handle}}&access_token=${accessToken}`;

    const res = await fetch(url);
    if (!res.ok) return null;

    const data = await res.json();
    const bd = data.business_discovery;
    if (!bd) return null;

    return {
      username: bd.username,
      name: bd.name || '',
      biography: bd.biography || '',
      followers_count: bd.followers_count || 0,
      media_count: bd.media_count || 0,
      verified: true,
    };
  } catch {
    return null;
  }
}

// ─── Name matching / confidence scoring ─────────────────────────────────

function normalizeForComparison(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .replace(/restaurant|bar|grill|cafe|kitchen|eatery|bistro|pub|tavern|llc|inc|the/g, '');
}

function calculateConfidence(
  restaurantName: string,
  restaurantCity: string,
  igProfile: IGVerification,
): number {
  let score = 0;

  const normName = normalizeForComparison(restaurantName);
  const normIG = normalizeForComparison(igProfile.name);
  const normUsername = normalizeForComparison(igProfile.username);
  const normBio = igProfile.biography.toLowerCase();

  // Exact name match in IG display name
  if (normIG === normName) score += 40;
  else if (normIG.includes(normName) || normName.includes(normIG)) score += 30;

  // Username contains restaurant name
  if (normUsername.includes(normName) || normName.includes(normUsername)) score += 25;

  // City mentioned in bio
  if (normBio.includes(restaurantCity.toLowerCase())) score += 15;

  // Has posts (active account)
  if (igProfile.media_count > 5) score += 10;
  if (igProfile.media_count > 20) score += 5;

  // Has followers (real account)
  if (igProfile.followers_count > 50) score += 5;
  if (igProfile.followers_count > 200) score += 5;

  return Math.min(score, 100);
}

// ─── Pick best handle from candidates ───────────────────────────────────

function pickBestHandle(
  handles: string[],
  restaurantName: string,
): string | null {
  if (handles.length === 0) return null;
  if (handles.length === 1) return handles[0];

  const normName = normalizeForComparison(restaurantName);

  // Score each handle by how close it is to the restaurant name
  const scored = handles.map(h => {
    const normH = normalizeForComparison(h);
    let score = 0;
    if (normH === normName) score = 100;
    else if (normH.includes(normName)) score = 80;
    else if (normName.includes(normH)) score = 60;
    else {
      // Levenshtein-like partial match
      const shorter = normName.length < normH.length ? normName : normH;
      const longer = normName.length >= normH.length ? normName : normH;
      if (longer.includes(shorter)) score = 50;
    }
    return { handle: h, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored[0].handle;
}

// ─── Main ───────────────────────────────────────────────────────────────

interface Restaurant {
  id: string;
  name: string;
  website: string | null;
  city: string;
  market_id: string;
  instagram_handle: string | null;
  google_place_id: string | null;
}

async function main() {
  const args = process.argv.slice(2);
  const marketFilter = args.find(a => a.startsWith('--market='))?.split('=')[1];
  const verifyOnly = args.includes('--verify-only');
  const dryRun = args.includes('--dry-run');
  const skipVerify = args.includes('--skip-verify');

  console.log('🔍 Instagram Handle Finder');
  console.log(`   Market: ${marketFilter || 'all'}`);
  console.log(`   Mode: ${verifyOnly ? 'verify-only' : dryRun ? 'dry-run' : 'live'}`);
  console.log('');

  // Get markets
  const { data: markets } = await supabase.from('markets').select('id, name, slug');
  if (!markets?.length) {
    console.error('No markets found');
    return;
  }

  // Get IG accounts for verification
  const { data: igAccounts } = await supabase
    .from('instagram_accounts')
    .select('market_id, instagram_business_account_id, access_token_encrypted, meta_app_id, meta_app_secret');

  // Use first available IG account for Business Discovery verification
  const verifyAccount = igAccounts?.[0];

  for (const market of markets) {
    if (marketFilter && market.slug !== marketFilter) continue;

    console.log(`\n${'═'.repeat(60)}`);
    console.log(`  Market: ${market.name} (${market.slug})`);
    console.log(`${'═'.repeat(60)}\n`);

    // Get restaurants
    let query = supabase
      .from('restaurants')
      .select('id, name, website, city, market_id, instagram_handle, google_place_id')
      .eq('market_id', market.id)
      .eq('is_active', true)
      .order('name');

    if (verifyOnly) {
      query = query.not('instagram_handle', 'is', null);
    }

    const { data: restaurants, error } = await query;
    if (error || !restaurants?.length) {
      console.log(`  No restaurants found (${error?.message || 'empty'})`);
      continue;
    }

    console.log(`  Total restaurants: ${restaurants.length}`);

    const stats = {
      total: restaurants.length,
      alreadyHad: 0,
      foundFromWebsite: 0,
      foundFromSearch: 0,
      verified: 0,
      failed: 0,
      skipped: 0,
    };

    const results: Array<{
      id: string;
      name: string;
      handle: string;
      source: string;
      confidence: number;
      followers: number;
    }> = [];

    // Process in batches of 10 for rate limiting
    const batchSize = 10;
    for (let i = 0; i < restaurants.length; i += batchSize) {
      const batch = restaurants.slice(i, i + batchSize);

      await Promise.all(batch.map(async (restaurant) => {
        // Skip if already has a handle and we're not in verify mode
        if (restaurant.instagram_handle && !verifyOnly) {
          stats.alreadyHad++;
          return;
        }

        let handle: string | null = restaurant.instagram_handle;
        let source = 'existing';

        // Step 1: Scrape website
        if (!handle && restaurant.website) {
          const html = await scrapeWebsite(restaurant.website);
          if (html) {
            const handles = extractInstagramHandles(html);
            handle = pickBestHandle(handles, restaurant.name);
            if (handle) source = 'website';
          }
        }

        // Step 2: DuckDuckGo search fallback
        if (!handle) {
          const city = restaurant.city || '';
          handle = await searchInstagram(restaurant.name, city);
          if (handle) source = 'search';
          // Rate limit searches
          await new Promise(r => setTimeout(r, 300));
        }

        if (!handle) {
          stats.failed++;
          return;
        }

        // Step 3: Verify via Instagram Business Discovery
        let followers = 0;
        let confidence = 50; // default if we skip verification

        if (!skipVerify && verifyAccount) {
          const verification = await verifyInstagramHandle(
            handle,
            verifyAccount.instagram_business_account_id,
            verifyAccount.access_token_encrypted,
          );

          if (verification) {
            const city = restaurant.city || '';
            confidence = calculateConfidence(restaurant.name, city, verification);
            followers = verification.followers_count;
            stats.verified++;
          } else {
            // Handle doesn't exist on Instagram
            confidence = 0;
          }
        }

        if (source === 'website') stats.foundFromWebsite++;
        if (source === 'google') stats.foundFromSearch++;

        results.push({
          id: restaurant.id,
          name: restaurant.name,
          handle,
          source,
          confidence,
          followers,
        });

        // Save to database
        if (!dryRun && confidence > 0) {
          await supabase
            .from('restaurants')
            .update({
              instagram_handle: handle,
              instagram_handle_verified: confidence >= 60,
              instagram_followers: followers || null,
              instagram_found_at: new Date().toISOString(),
            })
            .eq('id', restaurant.id);
        }
      }));

      // Progress update
      const processed = Math.min(i + batchSize, restaurants.length);
      process.stdout.write(`\r  Processed: ${processed}/${restaurants.length}`);

      // Rate limit between batches (IG Business Discovery: ~200/hr)
      if (!skipVerify) await new Promise(r => setTimeout(r, 500));
    }

    console.log('\n');

    // Print results
    console.log(`  ─── Results ───`);
    console.log(`  Already had handle: ${stats.alreadyHad}`);
    console.log(`  Found from website: ${stats.foundFromWebsite}`);
    console.log(`  Found from search:  ${stats.foundFromSearch}`);
    console.log(`  Verified on IG:     ${stats.verified}`);
    console.log(`  Not found:          ${stats.failed}`);
    console.log('');

    // Print found handles
    if (results.length > 0) {
      console.log(`  ─── Found Handles ───`);
      const sorted = results.sort((a, b) => b.confidence - a.confidence);
      for (const r of sorted.slice(0, 30)) {
        const marker = r.confidence >= 60 ? '✅' : r.confidence > 0 ? '⚠️' : '❌';
        console.log(`  ${marker} ${r.name.padEnd(35)} @${r.handle.padEnd(25)} ${r.source.padEnd(10)} conf:${r.confidence}% ${r.followers > 0 ? `(${r.followers} followers)` : ''}`);
      }
      if (sorted.length > 30) {
        console.log(`  ... and ${sorted.length - 30} more`);
      }
    }
  }

  console.log('\n\nDone!');
}

main().catch(console.error);
