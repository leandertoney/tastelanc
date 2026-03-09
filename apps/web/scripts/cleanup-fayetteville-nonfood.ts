/**
 * Remove non-food businesses from the Fayetteville market.
 *
 * The original import had no category filter, so convenience stores, hotels,
 * salons, gyms, auto shops, etc. all got imported alongside restaurants.
 *
 * Strategy:
 *  1. Build an allowlist of food/beverage categories from the CSV
 *  2. Any Fayetteville restaurant whose CSV category is NOT food-related → delete
 *  3. Any restaurant with EMPTY category but whose name matches known non-food
 *     patterns (e.g. "Circle K", "Food Lion", "Holiday Inn") → delete
 *
 * Usage:
 *   cd apps/web
 *   SUPABASE_SERVICE_ROLE_KEY=<key> npx tsx scripts/cleanup-fayetteville-nonfood.ts
 *   Add --dry-run to preview
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

const SUPABASE_URL = 'https://kufcxxynjvyharhtfptd.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const CSV_PATH = process.env.CSV_PATH
  || '/Users/leandertoney/Desktop/TasteFayetteville/dreamville_csv.csv';
const MARKET_SLUG = 'fayetteville-nc';
const DRY_RUN = process.argv.includes('--dry-run');

// ─── Food-related categories to KEEP ────────────────────────────────────────
// Everything not in this list (and not EMPTY) gets deleted.

const FOOD_CATEGORIES = new Set([
  'restaurants',
  'coffee shops',
  'pizza delivery',
  'bakery',
  'bars',
  'cafes',
  'ice cream shop',
  'juice shop',
  'hamburger restaurant',
  'meal delivery',
  'bubble tea store',
  'dessert shop',
  'deli',
  'night club',        // entertainment venues often serve food/drinks
  'hookah bar',       // same
  'seafood market',
  'donut shop',
  'brewery',
  'korean barbecue restaurant',
  'cookie shop',
  'puerto rican restaurant',
  'chocolate shop',
  'cake shop',
  'soul food restaurant',
  'sushi restaurant',
  'cheesesteak restaurant',
  'traditional american restaurant',
  'pie shop',
  'southern restaurant (us)',
  'sushi takeaway',
  "farmers' market",
  'açaí shop',
  'frozen yogurt shop',
  'bagel shop',
  'ramen restaurant',
  'hot dog stand',
  'afghan restaurant',
  'vegan restaurant',
  'teppanyaki restaurant',
  'german restaurant',
  'poke bar',
  'tea house',
  'charcuterie',
  'cupcake shop',
  'popcorn store',    // borderline but food
  'chocolate artisan',
  'coffee roastery',
  'pastelería',
  'snack bar',
  'caterer',
  'food court',
  'mobile caterer',
]);

// ─── Name-based patterns to DELETE even if category is empty ─────────────────
// These are unambiguous non-food businesses that slipped in with no category.

const NON_FOOD_NAME_PATTERNS = [
  // Convenience stores / gas stations
  /^circle k/i, /^7-eleven/i, /^wawa$/i, /^kangaroo express/i, /^speedway$/i,
  /^exxon$/i, /^sunoco/i, /^sun-do gas/i, /^han-dee hugo/i, /^handee hugo/i,
  /^short stop \d+/i, /^express mart/i, /^five star mini mart/i,
  /^aa mart$/i, /^sam food mart/i, /^lucky stop food mart/i,
  /^skylite fastmart/i, /^haymount truck stop/i, /^ramsey 24 food mart/i,
  /^eastover food mart/i, /^eastover deli & c-store/i, /^cross creek convenience/i,
  /^cedar creek country store/i, /^snack attack food mart/i,
  /^365 fast mart/i, /^cumberland's food mart/i, /^freddy tobacco mart/i,
  /^haymount convenience/i, /^mr\.yadkin mini mart/i,
  // Pharmacies / drug stores
  /^cvs$/i,
  // Grocery / supermarkets
  /^aldi$/i, /^food lion/i, /^harris teeter/i, /^publix/i, /^sam's club/i,
  /^lidl$/i, /^sprouts farmers market/i, /^carlie c's iga/i,
  /^super compare foods/i, /^kinlaw's supermarket/i,
  // Hotels / motels / inns
  /^baymont by wyndham/i, /^doubletree by hilton/i, /^hampton inn/i,
  /^holiday inn/i, /^home2 suites/i, /^homewood suites/i, /^fairfield by marriott/i,
  /^comfort inn/i, /^country inn/i, /^days inn/i, /^deluxe inn/i, /^econo lodge/i,
  /^red roof inn/i, /^regency inn/i, /^royal inn/i, /^sleep inn/i,
  /^springhill suites/i, /^mt rose hotel/i, /^ambassador inn/i,
  // Rest areas
  /rest area/i, /^i-95 cumberland/i, /^i-95 south rest/i,
  // Gyms / fitness
  /^planet fitness/i, /^fit4life health clubs/i, /^legacy athletics/i,
  // Auto / tire / repair
  /^firestone complete auto/i, /^all okay! auto repair/i, /^nj new and used tires/i,
  /^associates asset recovery/i,
  // Hair / beauty / nails / tattoo
  /^adonai & yoky dominican salon/i, /^blaqdiamond glam bar/i,
  /^desire threading and waxing/i, /^evolution ink studio/i,
  /^g'nique's spa services/i, /^iconic lash & brow/i,
  /^inkvill/i, /^kuts by delo/i, /^lavish beauty/i, /^mama african braids/i,
  /^mimosas nail bar/i, /^new addiction tattoo/i, /^awesome tattoos/i,
  /^rae of beauty salon/i, /^ras studio & salon/i, /^skin specialists/i,
  /^sue me's barber shop/i, /^talk of the town salon/i,
  /^the detail shop/i, /^the royal hair bar/i, /^the take down beauty bar/i,
  /^eyecarecenter/i, /^prima elements colonic/i,
  // Shopping / retail / malls
  /^barnes & noble/i, /^big lots/i, /^five below/i, /^michaels$/i,
  /^ollie's bargain outlet/i, /^pOpshelf/i, /^roses express/i,
  /^sally beauty/i, /^cliffdale square/i, /^tallywood shopping center/i,
  /^marketfair mall/i, /^eastside shopping center/i, /^northgate$/i,
  /^riverside shopping/i,
  // Apartments / housing
  /^autumn view apartments/i, /^cottages on elm/i, /^highland at haymount/i,
  /^goodhomes bordeaux/i, /^the park apartment homes/i, /^belmont village/i,
  /^eutaw village/i, /^elmwood crossing/i, /^river landing shopping/i,
  // Vape / tobacco / cannabis
  /^j&m vapor/i, /^blue sky discount tobacco/i, /^exotic smoke shop/i,
  /^kure vaporium/i, /^madvapes/i, /^midway mart tobacco/i,
  /^puff & stuff vape/i, /^rj tobacco mart/i, /^royal cigars/i,
  /^sandhills premium cigars/i, /^smokers box/i, /^smokers heaven/i,
  /^the airborne cigar/i, /^the livery cigar/i, /^anstead's tobacco/i,
  /^tgh hemp/i, /^freddy's food mart/i,
  // Events / venues / entertainment (non-food)
  /^fayetteville motorsports park/i, /^epic fun park/i,
  /^black ops paintball/i, /^backwoods terror ranch/i, /^axes and armor/i,
  /^jp's jump masters/i, /^jumpers$/i, /^jumpin'/i, /^putt-putt fun center/i,
  /^main event fayetteville/i, /^sweet tea shakespeare/i,
  /^five star entertainment/i,
  // Museums / parks / landmarks / attractions
  /^airborne & special operations museum/i, /^fascinate-u children's museum/i,
  /^fayetteville history museum/i, /^arnette park/i, /^festival park/i,
  /^nc civil war/i, /^the north carolina civil war/i,
  /^fayetteville regional airport/i,
  // Florists / garden
  /^ann's flower shop/i, /^angelic floral creations/i, /^owen's florist/i,
  /^ladybug greenhouse/i, /^green side up garden/i,
  // Cleaning / utilities / industrial
  /^cintas facility/i, /^bass air conditioning/i, /^rotech$/i,
  /^atlantic dominion distributors/i, /^freeco inc/i, /^gli food services/i,
  /^bragg ventures/i, /^bragg lucky 7/i,
  // Misc non-food
  /^tesla supercharger/i, /^e z pass$/i, /^pure store/i,
  /^airport plaza/i, /^cape fear plaza/i, /^bronco square/i,
  /^bordeaux center/i, /^hope mills marketplace/i, /^southlawn$/i,
  /^fort liberty/i, /^north post commissary/i, /^main post\/commissary/i,
  /^child nutrition services/i, /^nc food commissary/i,
  /^strickland's portion pak/i, /^morty pride meats/i,
  /^back around records/i, /^reminisce antiques/i, /^the coop deville/i,
  /^the pickin coop/i, /^blue bike antiques/i, /^crafts frames/i,
  /^carolyn's hallmark/i, /^curate essentials/i, /^love charms usa/i,
  /^latinxs infuzion/i, /^revolve goods/i, /^reverie goods/i,
  /^scented wicks/i, /^fld studios/i, /^dixie rose studios/i,
  /^da vegas studio/i, /^new addiction tattoo/i,
  /^garnet skull/i, /^royal tea$/i,
  /^highland country club/i, /^king's grant golf/i,
  /^spacious skies campgrounds/i, /^paradise acres/i,
  /^jackson family farm/i, /^pate's farm market/i, /^gillis hill farm/i,
  /^cedar creek fish farm/i,
  // Poorly-named / location-only entries
  /^2726 raeford rd$/i, /^e fayettevlle/i, /^fayetteville, nc \d{5}$/i,
  /^downtown fayetteville$/i, /^-$/i,
  /^mexican restaurant$/i, /^submarine sandwiches$/i,
];

// ─── CSV Helpers ─────────────────────────────────────────────────────────────

function parseCsvLine(line: string): string[] {
  const result: string[] = []; let current = ''; let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') { if (inQuotes && line[i+1] === '"') { current += '"'; i++; } else inQuotes = !inQuotes; }
    else if (char === ',' && !inQuotes) { result.push(current.trim()); current = ''; }
    else current += char;
  }
  result.push(current.trim());
  return result;
}

interface CsvRow { name: string; category: string; [k: string]: string; }

function parseCsv(filePath: string): CsvRow[] {
  const lines = fs.readFileSync(filePath, 'utf-8').split('\n');
  const headers = parseCsvLine(lines[0]);
  return lines.slice(1).filter(l => l.trim()).map(l => {
    const vals = parseCsvLine(l);
    const row: Record<string, string> = {};
    headers.forEach((h, i) => { row[h] = vals[i] || ''; });
    return row as CsvRow;
  });
}

function normalizeName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim();
}

function isNonFoodByName(name: string): boolean {
  return NON_FOOD_NAME_PATTERNS.some(p => p.test(name));
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n🧹 Fayetteville Non-Food Cleanup');
  console.log(`   Dry run: ${DRY_RUN}\n`);

  if (!SUPABASE_SERVICE_ROLE_KEY && !DRY_RUN) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY required');
  }

  // Build name → category map from CSV
  const rows = parseCsv(CSV_PATH);
  const csvCategoryMap = new Map<string, string>();
  for (const row of rows) {
    if (!row.name) continue;
    const key = normalizeName(row.name);
    if (!csvCategoryMap.has(key) && row.category) {
      csvCategoryMap.set(key, row.category.trim());
    }
  }
  console.log(`📄 CSV: ${csvCategoryMap.size} name→category mappings`);

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  const { data: market } = await supabase.from('markets').select('id').eq('slug', MARKET_SLUG).single();
  if (!market) throw new Error('Market not found');

  const { data: restaurants, error } = await supabase
    .from('restaurants').select('id, name').eq('market_id', market.id);
  if (error || !restaurants) throw new Error(`Failed to fetch: ${error?.message}`);

  console.log(`🍽️  ${restaurants.length} restaurants in DB\n`);

  const toDelete: { id: string; name: string; reason: string }[] = [];

  for (const r of restaurants) {
    const key = normalizeName(r.name);
    const csvCat = csvCategoryMap.get(key) || '';
    const catLower = csvCat.toLowerCase();

    if (csvCat && !FOOD_CATEGORIES.has(catLower)) {
      // Has a category but it's not food
      toDelete.push({ id: r.id, name: r.name, reason: `category: "${csvCat}"` });
    } else if (!csvCat || csvCat === '') {
      // No category in CSV — check name patterns
      if (isNonFoodByName(r.name)) {
        toDelete.push({ id: r.id, name: r.name, reason: 'name pattern match' });
      }
    }
  }

  console.log(`🗑️  ${toDelete.length} businesses to remove:\n`);
  toDelete.forEach(r => console.log(`   - ${r.name} (${r.reason})`));

  if (DRY_RUN) {
    console.log('\n✅ DRY RUN — no changes written');
    return;
  }

  // Delete in batches
  const ids = toDelete.map(r => r.id);
  const BATCH = 100;
  let deleted = 0;
  for (let i = 0; i < ids.length; i += BATCH) {
    const batch = ids.slice(i, i + BATCH);
    const { error: delError } = await supabase
      .from('restaurants').delete().in('id', batch);
    if (delError) {
      console.error(`  ❌ Batch delete error: ${delError.message}`);
    } else {
      deleted += batch.length;
    }
  }

  console.log(`\n✅ Deleted ${deleted} non-food businesses`);
  console.log(`   Remaining: ~${restaurants.length - deleted} food businesses`);
}

main().catch(err => {
  console.error('\n💥 Fatal error:', err.message);
  process.exit(1);
});
