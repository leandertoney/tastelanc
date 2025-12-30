import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

// Read .env.local
const envContent = readFileSync('.env.local', 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const [key, ...valueParts] = line.split('=');
  if (key && valueParts.length) {
    env[key.trim()] = valueParts.join('=').trim();
  }
});

const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY
);

// Valid zip codes (Lancaster area)
const VALID_ZIPS = ['17601', '17602', '17603', '17540', '17551', '17552', '17505'];

// Chain restaurants to remove (national chains only)
const CHAINS = [
  /cold.*stone/i, /dairy.*queen/i, /dunkin/i, /starbucks/i, /mcdonald/i,
  /burger.*king/i, /wendy/i, /taco.*bell/i, /chick-fil-a/i, /chipotle/i,
  /panera/i, /subway/i, /domino/i, /papa.*john/i, /pizza.*hut/i,
  /olive.*garden/i, /applebee/i, /chili.*grill/i, /outback/i, /red.*lobster/i,
  /buffalo.*wild/i, /cracker.*barrel/i, /ihop/i, /denny/i, /waffle.*house/i,
  /bob.*evans/i, /golden.*corral/i, /friendly.*$/i, /bj.*restaurant/i,
  /carrabba/i, /bonefish/i, /cinnabon/i, /auntie.*anne/i, /great.*american.*cookie/i,
  /gertrude.*hawk/i, /five.*guys/i, /miller.*ale.*house/i, /kfc/i, /popeye/i,
  /arby/i, /sonic.*drive/i, /jack.*in.*the.*box/i, /hardee/i, /carl.*jr/i,
  /little.*caesar/i, /checkers/i, /rally/i, /wingstop/i, /jersey.*mike/i,
  /jimmy.*john/i, /firehouse.*sub/i, /which.*wich/i, /potbelly/i,
  /panda.*express/i, /pei.*wei/i, /noodles.*company/i, /qdoba/i,
  /moe.*southwest/i, /del.*taco/i, /taco.*cabana/i, /checkers/i,
];

// Categories to remove by name pattern - EXPANDED for comprehensive cleanup
const removalPatterns = {
  // Specific removals (known non-restaurants or closed)
  'Specific Removals': [
    /alice.*diner/i,
    /federal.*tap.*house/i,  // Closed
    /one.*step.*shopping/i,
    // Non-restaurants with incorrectly assigned dining categories
    /gallery.*grow/i,        // Art gallery
    /^space$/i,              // Creative workspace (exact match)
    /penn.*medicine/i,       // Medical building
    /lancaster.*gift.*box/i, // Gift shop
    /medtrition/i,           // Medical company
    /zanzibar.*romancing/i,  // Gift shop
    /casa.*blanca.*event/i,  // Event space (not restaurant)
    /meduseld.*meadery/i,    // Meadery (may be closed or not a restaurant)
    /hunger.*n.*thirst/i,    // Closed
    // Additional non-restaurants from scrape
    /event.*space/i,         // Event venues (not restaurants)
    /event.*center/i,
    /beneficial.*association/i, // Social clubs
    /aesthetique/i,          // Beauty studio
    /all.*party.*starz/i,    // DJ service
    /angie.*variety.*shop/i, // Variety shop
    /au.*we.*buy/i,          // Pawn shop
    /baker.*event/i,         // Event planning
    /banter.*by.*piercing/i, // Piercing/jewelry
    /blended.*three.*studio/i, // Studio
    /bounce.*kraze/i,        // Play center
    /boxlunch/i,             // Retail store
    /brubaker.*appliance/i,  // Appliance store
    /building.*character/i,  // Unknown
    /burle.*corporate/i,     // Corporate park
    /campus.*plaza/i,        // Shopping plaza
    /cherrywood.*string/i,   // Music group
    /community.*fellowship/i, // Church
    /conestoga.*valley.*seeds/i, // Organization
    /country.*barn.*weddings/i, // Wedding venue only
    /crispus.*attucks/i,     // Community center
    /degel.*israel/i,        // Synagogue
    /deja.*vu.*event/i,      // Event planning
    /demo.*restaurant/i,     // Demo/test entry
    /discover.*lancaster/i,  // Tourism office
    /dog.*star.*books/i,     // Bookstore
    /dutch.*wonderland/i,    // Amusement park
    /ecklin.*events/i,       // Events
    /evermore.*events/i,     // Events
    /expressive.*avenue/i,   // Unknown service
    /farm.*home.*center/i,   // Farm/home store
    /franklin.*marshall.*track/i, // Stadium
    /gerhart.*hall/i,        // Venue/hall only
    /gesino.*venue/i,        // Venue only
    /good.*shepherd.*chapel/i, // Chapel
    /hamilton.*watch/i,      // Watch store
    /harvest.*days/i,        // Event
    /historic.*landis/i,     // Bridge/landmark
    /historic.*rock.*ford/i, // Historic site
    /homestead.*village/i,   // Retirement community
    /horst.*athletic/i,      // Athletic center
    /keystone.*marble/i,     // Marble/granite store
    /kissel.*hill.*commons/i, // Shopping center
    /lancaster.*barns/i,     // Barn venues
    /lancaster.*bbq.*supply/i, // Supply store
    /lancaster.*county.*bed/i, // Association
    /lancaster.*county.*convention/i, // Convention center
    /lancaster.*event/i,     // Event service
    /lancaster.*friends.*meeting/i, // Meeting house
    /lancaster.*improv/i,    // Improv group
    /lancaster.*masonic/i,   // Masonic center
    /lancaster.*musicfest/i, // Festival
    /lancaster.*tennis/i,    // Tennis club
    /lancaster.*venue/i,     // Venue
    /lancaster.*workshop/i,  // Workshop/makerspace
    /lanchester.*furniture/i, // Furniture store
    /lee.*fre.*mobile.*bar/i, // Mobile bar service
    /leveled.*up.*luxe/i,    // Rental service
    /lisa.*bonchek/i,        // Auditorium
    /manheim.*township.*high/i, // School
    /manheim.*township.*stadium/i, // Stadium
    /maple.*grove.*community/i, // Community building
    /melhorn.*manor/i,       // Venue only
    /mikie.*mic.*dj/i,       // DJ service
    /mulberry.*art/i,        // Art studio
    /oaks.*condominium/i,    // Condo clubhouse
    /olewine.*dining.*commons/i, // College dining hall
    /orama.*productions/i,   // Productions
    /pa.*salsa.*bachata/i,   // Dance event
    /party.*mike/i,          // Party service
    /perfuroma/i,            // Perfume store
    /pinspiration/i,         // Activity center
    /potteryworks/i,         // Pottery studio
    /residences.*ballroom/i, // Venue
    /richmond.*square/i,     // Shopping center
    /riverdale.*manor/i,     // Wedding venue
    /robin.*banks.*entertainment/i, // Entertainment
    /rocky.*springs.*entertainment/i, // Entertainment center
    /round1.*bowling/i,      // Bowling alley
    /shadek.*stadium/i,      // Stadium
    /sky.*zone/i,            // Trampoline park
    /snapology/i,            // Kids activity
    /station.*one.*center/i, // Arts center
    /stone.*mill.*plaza/i,   // Shopping plaza
    /strictly.*functional.*pottery/i, // Pottery event
    /stumpy.*hatchet/i,      // Hatchet throwing
    /susquehanna.*ceremonies/i, // Ceremony service
    /the.*bachman.*center/i, // Community center
    /the.*barn.*at.*silverstone/i, // Barn venue
    /the.*clubhouse.*at.*willow/i, // Clubhouse
    /the.*craft.*factory/i,  // Craft studio
    /the.*farm.*at.*eagles/i, // Farm venue
    /the.*gathering.*place/i, // Venue (not restaurant)
    /the.*herb.*shop/i,      // Herb shop
    /the.*imperial.*event/i, // Event center
    /the.*liberty.*event/i,  // Event venue
    /the.*lounge.*at.*hempfield/i, // Dispensary lounge
    /the.*mill.*at.*manor/i, // Wedding venue
    /the.*perfect.*plan/i,   // Planning service
    /the.*restaurant.*store/i, // Restaurant supply
    /the.*trust.*performing/i, // Performing arts
    /universal.*athletic/i,  // Athletic club
    /urban.*air.*trampoline/i, // Trampoline park
    /urban.*arts.*house/i,   // Arts venue
    /vivace.*live.*string/i, // Music group
    /w\.w\.*griest/i,        // Building
    /ware.*center/i,         // Arts center
    /west.*art/i,            // Art-related
    /willis.*martha.*herr/i, // Stadium
    /winter.*visual/i,       // Arts center
    /wiov.*fall.*fest/i,     // Festival
    /woof.*n.*tails/i,       // Pet-related
    /x.*marks.*spot/i,       // Unknown
    /zenkaikon/i,            // Convention
  ],

  // Shopping/Retail
  'Shopping Centers': [
    /shopping.*center/i, /\bmall\b/i, /outlet/i,
  ],
  'Retail Stores': [
    /books.*million/i, /\bat\s*home\b/i, /save.*mart/i,
    /\bvintage\b/i, /redo.*vintage/i, /thrift/i,
  ],

  // Non-food businesses
  'Game/Hobby Stores': [
    /games.*hobbies/i, /\bhobbies\b/i, /owl.*central/i,
  ],
  'Flower Shops': [
    /flower.*shop/i, /florist/i, /nesphil/i,
  ],
  'Jewelry Stores': [
    /jeweler/i, /jewelry/i, /vincent.*company/i, /fine.*jewel/i,
  ],
  'Auto/Motor': [
    /motor.*zone/i, /auto.*parts/i, /\btire\b/i, /mike.*motor/i,
    /auto.*repair/i, /car.*wash/i,
  ],
  'Medical/Health': [
    /meditron/i, /\bmedical\b/i, /vital.*options/i,
    /marijuana/i, /dispensary/i, /cannabis/i,
    /pharmacy/i, /urgent.*care/i, /clinic/i,
  ],
  'Vape/CBD': [
    /\bvape/i, /\bcbd\b/i, /smoke.*shop/i, /ace.*of.*vapes/i,
    /tobacco/i, /cigar/i,
  ],

  // Casinos
  'Casinos': [
    /casino/i, /hollywood.*casino/i, /parx/i, /mohegan/i,
    /slots/i, /gaming/i,
  ],

  // Clubs (social clubs, nightclubs, etc.)
  'Clubs/Nightclubs': [
    /nightclub/i, /gentlemen/i, /strip.*club/i,
    /american.*legion/i, /celtic.*center/i, /alert.*club/i,
    /vfw/i, /moose.*lodge/i, /elks.*lodge/i, /knights.*of/i,
  ],

  // Original categories - keep these
  'Grocery/Markets': [
    /grocery/i, /supermarket/i, /food.*max/i, /\bmarket\b/i,
  ],
  'Liquor/Beverage stores': [
    /beverage.*llc/i, /wine.*spirits/i, /brewers.*outlet/i, /\bcarryout\b/i,
  ],
  'Theaters/Venues': [
    /\btheatre\b/i, /\btheater\b/i, /barshinger/i,
  ],
  'Hotels': [
    /holiday.*inn/i, /\bhotel\b/i, /\bmotel\b/i, /\binn\b(?!.*tavern)/i,
  ],
  'Candy/Chocolate': [
    /\bcandy\b/i, /chocolate/i,
  ],
  'Record stores': [
    /\brecords\b/i,
  ],
  'Chains': CHAINS,
};

// Dining-related categories
const diningCategories = ['bars', 'nightlife', 'rooftops', 'brunch', 'lunch', 'dinner', 'outdoor_dining'];

async function cleanupRestaurants() {
  console.log('=== RESTAURANT CLEANUP ===\n');

  // Step 1: Update Boba Cha Bubble Tea zip code
  console.log('Step 1: Updating Boba Cha Bubble Tea zip code to 17601...');
  const { error: updateError } = await supabase
    .from('restaurants')
    .update({ zip_code: '17601' })
    .ilike('name', '%Boba Cha%');

  if (updateError) {
    console.error('Error updating Boba Cha:', updateError);
  } else {
    console.log('  ✓ Updated Boba Cha Bubble Tea zip code\n');
  }

  // Step 2: Get all restaurants
  const { data: restaurants, error } = await supabase
    .from('restaurants')
    .select('id, name, categories, city, zip_code')
    .order('name');

  if (error) {
    console.error('Error fetching restaurants:', error);
    return;
  }

  console.log(`Total restaurants: ${restaurants.length}\n`);

  // Collect IDs to delete
  const toDelete = [];
  const reasons = {};

  for (const r of restaurants) {
    const name = r.name || '';
    const cats = r.categories || [];
    const zip = r.zip_code;
    let deleteReason = null;

    // Check 1: Outside valid zips (including null/missing)
    if (!zip || !VALID_ZIPS.includes(zip)) {
      deleteReason = `Outside valid zips (${zip || 'no zip'})`;
    }
    // Check 2: Within valid zips but matches removal patterns
    else {
      // Check name patterns
      for (const [category, patterns] of Object.entries(removalPatterns)) {
        for (const pattern of patterns) {
          if (pattern.test(name)) {
            deleteReason = category;
            break;
          }
        }
        if (deleteReason) break;
      }

      // Check no categories (unless brewery/distillery)
      if (!deleteReason && cats.length === 0 && !/brew|distill|winery|vineyard/i.test(name)) {
        deleteReason = 'No dining categories';
      }
    }

    if (deleteReason) {
      toDelete.push(r.id);
      if (!reasons[deleteReason]) reasons[deleteReason] = [];
      reasons[deleteReason].push(r.name);
    }
  }

  console.log('Step 2: Restaurants to delete:\n');
  for (const [reason, names] of Object.entries(reasons).sort((a, b) => b[1].length - a[1].length)) {
    console.log(`${reason}: ${names.length}`);
  }
  console.log(`\nTotal to delete: ${toDelete.length}`);
  console.log(`Will remain: ${restaurants.length - toDelete.length}\n`);

  // Step 3: Delete in batches
  console.log('Step 3: Deleting restaurants...');

  const batchSize = 50;
  let deleted = 0;

  for (let i = 0; i < toDelete.length; i += batchSize) {
    const batch = toDelete.slice(i, i + batchSize);
    const { error: deleteError } = await supabase
      .from('restaurants')
      .delete()
      .in('id', batch);

    if (deleteError) {
      console.error(`Error deleting batch ${i / batchSize + 1}:`, deleteError);
    } else {
      deleted += batch.length;
      console.log(`  Deleted ${deleted}/${toDelete.length}...`);
    }
  }

  console.log(`\n✓ Cleanup complete! Deleted ${deleted} restaurants.`);

  // Verify final count
  const { count } = await supabase
    .from('restaurants')
    .select('*', { count: 'exact', head: true });

  console.log(`Final restaurant count: ${count}`);
}

cleanupRestaurants();
