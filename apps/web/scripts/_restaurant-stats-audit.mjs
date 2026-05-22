import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
config({ path: new URL('../.env.local', import.meta.url) });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Lancaster market only (where these 6 customers operate)
const LANCASTER_MARKET = '38a85076-0fea-4b1f-9af9-ea11ce5f4ef0';

const TARGETS = [
  { id: 'd937c870', email: 'thozeguyz333@gmail.com', name: 'Vinny & Thoze Guyz Pizzeria', contact: 'Steve Allegretti' },
  { id: '69067dc3', email: 'mariettatavernonmarket@gmail.com', name: 'Marietta Tavern on Market', contact: 'Brandi Erisman' },
  { id: '4f7f5e1b', email: 'grace.perrone@yahoo.com', name: "Fiorentino's Italian Restaurant", contact: 'Grace Perrone' },
  { id: '986f5834', email: 'craigtrissler@gmail.com', name: '551 West', contact: 'Craig Trissler' },
  { id: '9134761b', email: 'kaylapagan49@gmail.com', name: 'Station House Tavern & Sports Bar', contact: 'Kayla Pagan' },
  { id: 'a1ce96aa', email: 'bills@tellus360.com', name: 'Tellus 360', contact: 'Bill Speakman' },
];

// First, find the actual market_id for Lancaster (in case the UUID above is wrong)
const { data: markets } = await supabase.from('markets').select('id, slug, name').eq('slug', 'lancaster-pa');
const lancasterMarket = markets?.[0];
console.log(`Market: ${lancasterMarket?.name} (${lancasterMarket?.id})\n`);

// Get full restaurant list in Lancaster
const { data: allRestaurants, error: restErr } = await supabase
  .from('restaurants')
  .select('id, name, is_active')
  .eq('market_id', lancasterMarket.id)
  .eq('is_active', true);

if (restErr) { console.error(restErr); process.exit(1); }
console.log(`Lancaster active restaurants: ${allRestaurants.length}\n`);

// Discover which stat tables exist by trying common ones
const TABLES_TO_TRY = ['favorites', 'restaurant_views', 'restaurant_saves', 'checkins', 'restaurant_visits', 'votes', 'plans'];
const availableTables = {};
for (const t of TABLES_TO_TRY) {
  const { data, error } = await supabase.from(t).select('*').limit(1);
  if (!error) {
    availableTables[t] = Object.keys(data?.[0] || {});
    console.log(`✓ ${t} columns: ${availableTables[t].join(', ')}`);
  }
}
console.log();

// Build a per-restaurant counts map for each available metric
const restaurantStats = {};
for (const r of allRestaurants) {
  restaurantStats[r.id] = { name: r.name, favorites: 0, checkins: 0, votes: 0, plans: 0 };
}

if (availableTables.favorites) {
  let from = 0;
  while (true) {
    const { data: favs, error } = await supabase.from('favorites').select('restaurant_id').range(from, from + 999);
    if (error || !favs || favs.length === 0) break;
    for (const f of favs) {
      if (restaurantStats[f.restaurant_id]) restaurantStats[f.restaurant_id].favorites++;
    }
    if (favs.length < 1000) break;
    from += 1000;
  }
}

async function paginatedCount(tableName, restaurantField, statField) {
  let from = 0;
  while (true) {
    const { data, error } = await supabase.from(tableName).select(restaurantField).range(from, from + 999);
    if (error || !data || data.length === 0) break;
    for (const row of data) {
      const rid = row[restaurantField];
      if (rid && restaurantStats[rid]) restaurantStats[rid][statField]++;
    }
    if (data.length < 1000) break;
    from += 1000;
  }
}

if (availableTables.checkins) await paginatedCount('checkins', 'restaurant_id', 'checkins');
if (availableTables.votes) await paginatedCount('votes', 'restaurant_id', 'votes');

// Compute rankings for each metric
const allIds = Object.keys(restaurantStats);
const total = allIds.length;
const rankByMetric = (metric) => {
  const sorted = [...allIds].sort((a, b) => restaurantStats[b][metric] - restaurantStats[a][metric]);
  return Object.fromEntries(sorted.map((id, idx) => [id, { rank: idx + 1, value: restaurantStats[id][metric] }]));
};

const ranks = {
  favorites: rankByMetric('favorites'),
  checkins: rankByMetric('checkins'),
  votes: rankByMetric('votes'),
};

// Find each target restaurant by name match (since IDs are short prefixes)
console.log('═'.repeat(110));
console.log(`PER-CUSTOMER STATS (out of ${total} active Lancaster restaurants)`);
console.log('═'.repeat(110));

for (const t of TARGETS) {
  // Find by name fuzzy match
  const match = allRestaurants.find(r => {
    const tn = t.name.toLowerCase();
    const rn = r.name.toLowerCase();
    return rn.includes(tn.slice(0, 10)) || tn.includes(rn.slice(0, 10));
  });

  if (!match) {
    console.log(`\n❌ ${t.name} — not found in Lancaster`);
    continue;
  }

  const stats = restaurantStats[match.id];
  console.log(`\n📍 ${match.name}  (contact: ${t.contact})`);
  console.log(`   email: ${t.email}`);
  for (const metric of ['favorites', 'checkins', 'votes']) {
    const r = ranks[metric][match.id];
    if (!r) continue;
    const pct = Math.round((r.rank / total) * 100);
    let badge = '';
    if (r.rank <= 3) badge = '🏆 TOP 3';
    else if (r.rank <= 10) badge = '⭐ Top 10';
    else if (pct <= 25) badge = '🔥 Top 25%';
    else if (pct <= 50) badge = 'Top half';
    console.log(`   ${metric.padEnd(10)} ${String(r.value).padStart(4)} | rank #${r.rank}/${total} (top ${pct}%) ${badge}`);
  }
}
