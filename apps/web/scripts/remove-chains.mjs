import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Chain restaurant patterns to remove
const CHAIN_PATTERNS = [
  // Fast Food
  'waffle house',
  "mcdonald's",
  'mcdonalds',
  'taco bell',
  'burger king',
  "wendy's",
  'wendys',
  'chick-fil-a',
  'chickfila',
  'kfc',
  'kentucky fried chicken',
  'popeyes',
  "arby's",
  'arbys',
  'sonic drive-in',
  "carl's jr",
  "hardee's",
  'jack in the box',
  'whataburger',
  "zaxby's",
  "raising cane's",
  'wingstop',

  // Coffee & Donuts
  'starbucks',
  "dunkin'",
  'dunkin donuts',
  'krispy kreme',
  'tim hortons',

  // Fast Casual
  'panera bread',
  'chipotle',
  'qdoba',
  "moe's southwest",
  'five guys',
  'shake shack',
  "culver's",
  'in-n-out',
  "panda express",
  "noodles & company",

  // Subs & Sandwiches
  'subway',
  "jimmy john's",
  "jersey mike's",
  'firehouse subs',
  "penn station",
  "potbelly",
  "which wich",

  // Pizza Chains
  "domino's",
  'dominos',
  'pizza hut',
  'little caesars',
  "papa john's",
  "papa johns",
  "papa murphy's",
  "marco's pizza",

  // Casual Dining
  "applebee's",
  'applebees',
  "chili's",
  'chilis',
  "tgi friday's",
  'tgi fridays',
  'olive garden',
  'red lobster',
  "outback steakhouse",
  'longhorn steakhouse',
  'texas roadhouse',
  "carrabba's",
  "red robin",
  "buffalo wild wings",
  'bdubs',
  'hooters',
  'twin peaks',

  // Breakfast/Diners
  'cracker barrel',
  'ihop',
  "denny's",
  'dennys',
  'bob evans',
  'waffle house',
  'perkins',

  // Ice Cream & Sweets
  'dairy queen',
  'baskin-robbins',
  'baskin robbins',
  'cold stone',
  "carvel",
  "haagen-dazs",

  // Buffets
  'golden corral',
  "hometown buffet",
  "old country buffet",

  // Other Chains
  "friendly's",
  'friendlys',
  "auntie anne's",
  'auntie annes',
  'cinnabon',
  'great american cookies',
  "wetzel's pretzels",
  "jamba juice",
  "tropical smoothie",
  "smoothie king",
  "orange julius",
  "hot dog on a stick",
  "charleys philly steaks",
  "sbarro",
  "pret a manger",
  "au bon pain",
  "corner bakery",
  "einstein bros",
  "atlanta bread",
  "la madeleine",
  "cosi",
  "bob's big boy",
  "steak 'n shake",
  "checkers",
  "rally's",
  "white castle",
  "krystal",
  "del taco",
  "el pollo loco",
  "waba grill",
  "baja fresh",
  "rubio's",
  "cafe rio",
  "costa vida",
  "pei wei",
  "pick up stix",
  "yoshinoya",
  "teriyaki madness",
  "sarku japan",
  "charleys cheesesteaks",
];

async function removeChains() {
  console.log('\n========== REMOVE CHAIN RESTAURANTS ==========\n');

  // Get current count
  const { count: beforeCount } = await supabase
    .from('restaurants')
    .select('*', { count: 'exact', head: true });

  console.log(`Restaurants before: ${beforeCount}\n`);

  // Find chains to delete
  const { data: restaurants } = await supabase
    .from('restaurants')
    .select('id, name');

  const toDelete = [];

  for (const r of restaurants) {
    const nameLower = r.name.toLowerCase();
    for (const pattern of CHAIN_PATTERNS) {
      if (nameLower.includes(pattern)) {
        toDelete.push({ id: r.id, name: r.name, matchedPattern: pattern });
        break;
      }
    }
  }

  console.log(`Found ${toDelete.length} chain restaurants to remove:\n`);

  // Group by pattern for summary
  const byPattern = {};
  for (const r of toDelete) {
    if (!byPattern[r.matchedPattern]) byPattern[r.matchedPattern] = [];
    byPattern[r.matchedPattern].push(r.name);
  }

  for (const [pattern, names] of Object.entries(byPattern)) {
    console.log(`  ${pattern}: ${names.length} locations`);
  }

  if (toDelete.length === 0) {
    console.log('\nNo chains found to remove.');
    return;
  }

  console.log('\nDeleting...\n');

  // Delete in batches
  const batchSize = 50;
  let deleted = 0;

  for (let i = 0; i < toDelete.length; i += batchSize) {
    const batch = toDelete.slice(i, i + batchSize);
    const ids = batch.map(r => r.id);

    const { error } = await supabase
      .from('restaurants')
      .delete()
      .in('id', ids);

    if (error) {
      console.error(`Error deleting batch: ${error.message}`);
    } else {
      deleted += batch.length;
      console.log(`Deleted ${deleted}/${toDelete.length}...`);
    }
  }

  // Get final count
  const { count: afterCount } = await supabase
    .from('restaurants')
    .select('*', { count: 'exact', head: true });

  console.log('\n========== SUMMARY ==========\n');
  console.log(`Restaurants before: ${beforeCount}`);
  console.log(`Chains removed:     ${deleted}`);
  console.log(`Restaurants after:  ${afterCount}`);
  console.log('\n==============================\n');
}

removeChains();
