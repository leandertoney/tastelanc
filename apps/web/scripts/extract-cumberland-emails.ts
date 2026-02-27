/**
 * Cumberland County Email Extraction for Restaurant Outreach
 *
 * Parses the OutScraper CSV and applies a 5-layer filtering pipeline
 * to extract a clean list of independent/local restaurant emails.
 *
 * Usage:
 *   cd apps/web
 *   npx tsx scripts/extract-cumberland-emails.ts
 *
 * Output: /tmp/cumberland-outreach/
 */

import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { parse } from 'csv-parse/sync';

// ─────────────────────────────────────────────────────────
// CONFIG
// ─────────────────────────────────────────────────────────

const CSV_PATH = '/Users/leandertoney/Desktop/TasteCumberland Assets/cumberland_county.csv';
const OUTPUT_DIR = '/tmp/cumberland-outreach';

const VALID_ZIPS = new Set([
  '17007', // Boiling Springs
  '17011', // Camp Hill
  '17013', // Carlisle
  '17015', // Carlisle area
  '17019', // Dillsburg (partially Cumberland)
  '17025', // Enola / East Pennsboro
  '17027', // Grantham
  '17043', // Lemoyne / New Cumberland / Wormleysburg
  '17050', // Mechanicsburg
  '17053', // Marysville (edge)
  '17055', // Mechanicsburg
  '17065', // Mount Holly Springs
  '17070', // New Cumberland
  '17081', // Summerdale
  '17093', // West Fairview
  '17240', // Newburg
  '17241', // Newville
  '17257', // Shippensburg (partially Cumberland)
  '17266', // Walnut Bottom
]);

const BOUNDING_BOX = {
  minLat: 39.95,
  maxLat: 40.35,
  minLng: -77.55,
  maxLng: -76.85,
};

// ─────────────────────────────────────────────────────────
// LAYER 1: NON-FOOD CATEGORY FILTER
// ─────────────────────────────────────────────────────────

const FOOD_CATEGORIES = new Set([
  'restaurants',
  'bars',
  'cafes',
  'coffee shops',
  'Bakery',
  'Brewery',
  'Distillery',
  'Deli',
  'Winery',
  'Ice cream shop',
  'Donut shop',
  'Chocolate shop',
  'Chocolate cafe',
  'Candy store',
  'Cookie shop',
  'Cake shop',
  'Dessert shop',
  'Frozen yogurt shop',
  'Bagel shop',
  'Juice shop',
  'Bubble tea store',
  'Tea house',
  'Coffee roasters',
  'Coffee stand',
  'Poke bar',
  'Hookah bar',
  'Night club',
  'Gay bar',
  'Gay night club',
  'Dance club',
  'Comedy club',
  'Live music venue',
  'Karaoke',
  'Cat cafe',
  'Charcuterie',
  'Fish and chips takeaway',
  'Sushi restaurant',
  'Sushi takeaway',
  'Pizza delivery',
  'Hamburger restaurant',
  'Cheesesteak restaurant',
  'Asian fusion restaurant',
  'Modern Indian restaurant',
  'South Indian restaurant',
  'Southern restaurant (US)',
  'Soul food restaurant',
  'Shawarma restaurant',
  'Kyoto style Japanese restaurant',
  'Pretzel store',
  'Pastelería',
  'Food and drink',
  'Meal delivery',
]);

function isFoodBusiness(row: CsvRow): boolean {
  return FOOD_CATEGORIES.has(row.category?.trim());
}

// ─────────────────────────────────────────────────────────
// LAYER 3: CHAIN DETECTION
// ─────────────────────────────────────────────────────────

const CHAIN_PATTERNS: string[] = [
  // Fast Food
  "mcdonald's", 'mcdonalds', 'taco bell', 'burger king',
  "wendy's", 'wendys', 'chick-fil-a', 'chickfila', 'chick fil a',
  'kfc', 'kentucky fried chicken', 'popeyes', "arby's", 'arbys',
  'sonic drive-in', "carl's jr", "hardee's", 'jack in the box',
  'whataburger', "zaxby's", "raising cane's", 'wingstop',
  'white castle', 'krystal', 'del taco', 'el pollo loco',
  'checkers', "rally's",

  // Coffee & Donuts
  'starbucks', "dunkin'", 'dunkin donuts', 'dunkin ',
  'krispy kreme', 'tim hortons',

  // Fast Casual
  'panera bread', 'panera', 'chipotle', 'qdoba',
  "moe's southwest", 'five guys', 'shake shack', "culver's",
  'in-n-out', 'panda express', "noodles & company", 'noodles and company',
  'waba grill', 'baja fresh', "rubio's", 'cafe rio', 'costa vida',
  'pei wei', 'pick up stix', 'yoshinoya', 'teriyaki madness', 'sarku japan',
  'playa bowls', 'clean eatz',

  // Subs & Sandwiches
  'subway', "jimmy john's", 'jimmy johns', "jersey mike's", 'jersey mikes',
  'firehouse subs', 'penn station east coast', 'potbelly', 'which wich',
  "jason's deli", "mcalister's deli", 'mcalisters deli',

  // Pizza Chains
  "domino's", 'dominos', 'pizza hut', 'little caesars',
  "papa john's", 'papa johns', "papa murphy's", "marco's pizza",

  // Casual Dining
  "applebee's", 'applebees', "chili's", 'chilis',
  "tgi friday's", 'tgi fridays', 'olive garden', 'red lobster',
  'outback steakhouse', 'longhorn steakhouse', 'texas roadhouse',
  "carrabba's", 'red robin', 'buffalo wild wings', 'bdubs',
  'hooters', 'twin peaks', 'ruby tuesday', 'bonefish grill',
  'cheesecake factory', "bj's restaurant",
  'first watch', 'metro diner',

  // Breakfast/Diner chains
  'cracker barrel', 'ihop', "denny's", 'dennys',
  'bob evans', 'waffle house', 'perkins',
  'golden corral', 'hometown buffet', 'old country buffet',

  // Ice Cream & Sweets chains
  'dairy queen', 'baskin-robbins', 'baskin robbins',
  'cold stone', 'carvel', 'haagen-dazs',

  // Other chains
  "friendly's", 'friendlys', "auntie anne's", 'auntie annes',
  'cinnabon', 'great american cookies', "wetzel's pretzels",
  'jamba juice', 'tropical smoothie', 'smoothie king',
  'orange julius', 'charleys philly steaks', 'charleys cheesesteaks',
  'sbarro', 'pret a manger', 'au bon pain', 'corner bakery',
  'einstein bros', 'atlanta bread', 'la madeleine',
  "bob's big boy", "steak 'n shake", 'steak n shake',
  'hot dog on a stick',

  // Gas stations / convenience
  'wawa', 'sheetz', "rutter's", 'rutters', 'turkey hill',
  'royal farms', '7-eleven', '7 eleven', 'cumberland farms',
  'pilot travel center', "love's travel", 'ta travel center',
  'quiktrip', 'speedway', 'circle k',

  // Big box / non-restaurant
  'target', 'walmart', 'costco', "sam's club",

  // ── ADDITIONAL CHAINS (found in Cumberland CSV) ──
  'turning point', "hoss's", 'hosss', "arooga's", 'aroogas',
  "isaac's", 'isaacs restaurant', "marzoni's", 'marzonis',
  'primanti', 'mission bbq', 'wayback burgers',
  'corelife', 'honeygrow', 'crumbl', 'mrbeast burger',
  "dickey's barbecue", 'dickeys', 'vitality bowls',
  '7 brew', '7brew', 'nothing bundt', 'sweet frog',
  'duck donuts', 'gertrude hawk', 'philly pretzel factory',
  'tous les jours', "bruster's", 'brusters',
  "dave & buster", 'dave and buster', 'melting pot',
  'oola bowls', 'edible arrangements', 'krispy krunchy',
  'pizza boli', 'snowfox', "it's just wings",
  "hershey's ice cream", 'lindt chocolate',
  'tropical smoothie cafe', 'smoothie king',
  "tony luke's", 'tony lukes', "capriotti's", 'capriottis',
  'wingstop', "zoup!", 'noodles & company',
  "fazoli's", "steak 'n shake", 'charleys',
];

const FRANCHISE_PATTERNS = [
  /\s#\d{2,}/,
  /\bllc\b/i,
  /\binc\.?\b/i,
  /\bcorp\.?\b/i,
  /\bfranchise\b/i,
  /\bstore\s*#?\d+/i,
  /\blocation\s*#?\d+/i,
  /\bunit\s*#?\d+/i,
];

function isChain(name: string, description?: string): { isChain: boolean; matchedPattern: string } {
  const normalized = name.toLowerCase().trim();

  for (const pattern of CHAIN_PATTERNS) {
    if (normalized.includes(pattern)) {
      return { isChain: true, matchedPattern: pattern };
    }
  }

  for (const regex of FRANCHISE_PATTERNS) {
    if (regex.test(name)) {
      return { isChain: true, matchedPattern: `franchise pattern: ${regex.source}` };
    }
  }

  // Check description for chain indicators
  if (description) {
    const descLower = description.toLowerCase();
    if (descLower.includes('chain ') || descLower.includes('franchise')) {
      // Only flag if the description explicitly says "chain"
      const chainPhrases = ['chain for', 'chain known', 'chain offering', 'chain serving',
        'chain restaurant', 'chain eatery', 'chain featuring', 'cafe chain',
        'diner chain', 'grill chain', 'franchise'];
      for (const phrase of chainPhrases) {
        if (descLower.includes(phrase)) {
          return { isChain: true, matchedPattern: `description: "${phrase}"` };
        }
      }
    }
  }

  return { isChain: false, matchedPattern: '' };
}

// ─────────────────────────────────────────────────────────
// LAYER 5: EMAIL QUALITY FILTER
// ─────────────────────────────────────────────────────────

const BLOCKED_EMAIL_DOMAINS = new Set([
  // Third-party restaurant platforms
  'beyondmenu.com',
  'mealkeyway.com',
  'getbento.com',
  'chinesemenuonline.com',
  'fromtherestaurant.com',
  // Web builders / hosting
  'mediatech.group',
  'webador.com',
  'edan.io',
  'company.site',
  // Generic / placeholder
  'mystore.com',
  'contactme.com',
  'travlu.com',
  // Property management (not restaurants)
  'iloveleasing.com',
  'aptleasing.info',
  'entrata.com',
  // Corporate chain domains
  'bonefishgrill.com',
  'perkinsrestaurants.com',
  'choicehotels.com',
  'sodexo.com',
  'pncbank.com',
  'centrehotel.com',
  'panera-colorado.com',
  'cleaneatz.com',
  'monmouth.edu', // university, not restaurant
  'c21bp.com', // realtor, not restaurant
  'qq.com', // Chinese email service, likely scraped junk
]);

// Patterns for emails that are clearly not the restaurant's own
const JUNK_EMAIL_PATTERNS = [
  /^customerservice@/i,
  /^customercare@/i,
  /^socialmedia@/i,
  /^comments@/i,
  /^support@/i,
  /^abuse@/i,
  /^help@/i,
  /^hosting@/i,
  /^addinfo@/i,
  /^noreply@/i,
  /^no-reply@/i,
  /^donotreply@/i,
  /^mailer-daemon@/i,
  /^webmaster@/i,
  /^postmaster@/i,
];

interface EmailQualityResult {
  valid: boolean;
  reason?: string;
  flagged?: boolean; // passed but suspicious
  flagReason?: string;
}

function checkEmailQuality(email: string, businessName: string): EmailQualityResult {
  if (!email || !email.trim()) {
    return { valid: false, reason: 'empty' };
  }

  const trimmed = email.trim().toLowerCase();

  // Basic format check
  if (!trimmed.includes('@') || !trimmed.includes('.')) {
    return { valid: false, reason: 'invalid format' };
  }

  const domain = trimmed.split('@')[1];
  if (!domain) {
    return { valid: false, reason: 'no domain' };
  }

  // Blocked domains
  if (BLOCKED_EMAIL_DOMAINS.has(domain)) {
    return { valid: false, reason: `blocked domain: ${domain}` };
  }

  // Junk email patterns
  for (const pattern of JUNK_EMAIL_PATTERNS) {
    if (pattern.test(trimmed)) {
      return { valid: false, reason: `junk pattern: ${pattern.source}` };
    }
  }

  // Flag (but don't reject) emails that look like they might belong to a different entity
  // e.g., a gmail address that doesn't match the business name at all
  const genericDomains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'aol.com', 'comcast.net', 'verizon.net', 'msn.com', 'icloud.com'];
  if (genericDomains.includes(domain)) {
    return { valid: true, flagged: true, flagReason: `generic email provider (${domain}) — may not reach decision maker` };
  }

  return { valid: true };
}

// ─────────────────────────────────────────────────────────
// CSV ROW INTERFACE
// ─────────────────────────────────────────────────────────

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
  description: string;
}

// ─────────────────────────────────────────────────────────
// ADDRESS PARSING
// ─────────────────────────────────────────────────────────

function parseAddress(fullAddress: string): { street: string; city: string; state: string; zip: string } {
  const parts = fullAddress.split(',').map(s => s.trim());

  if (parts.length < 2) {
    return { street: fullAddress, city: '', state: 'PA', zip: '' };
  }

  const street = parts[0];
  const lastPart = parts[parts.length - 1] || '';
  const stateZipMatch = lastPart.match(/([A-Z]{2})\s*(\d{5})/);

  const state = stateZipMatch ? stateZipMatch[1] : 'PA';
  const zip = stateZipMatch ? stateZipMatch[2] : '';

  let city = '';
  if (parts.length >= 3) {
    city = parts[parts.length - 2];
  } else {
    city = parts[1].replace(/\s*[A-Z]{2}\s*\d{5}/, '').trim();
  }

  return { street, city, state, zip };
}

// ─────────────────────────────────────────────────────────
// CSV WRITER
// ─────────────────────────────────────────────────────────

function writeCsv(filename: string, rows: Record<string, string>[]) {
  if (rows.length === 0) {
    writeFileSync(`${OUTPUT_DIR}/${filename}`, '(empty)\n');
    return;
  }
  const headers = Object.keys(rows[0]);
  const lines = [
    headers.join(','),
    ...rows.map(r => headers.map(h => `"${(r[h] || '').replace(/"/g, '""')}"`).join(',')),
  ];
  writeFileSync(`${OUTPUT_DIR}/${filename}`, lines.join('\n') + '\n');
}

// ─────────────────────────────────────────────────────────
// OUTREACH RECORD
// ─────────────────────────────────────────────────────────

interface OutreachRecord {
  name: string;
  email: string;
  contact_name: string;
  contact_title: string;
  category: string;
  subtypes: string;
  address: string;
  city: string;
  phone: string;
  website: string;
  rating: string;
  reviews: string;
}

// ─────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────

function main() {
  console.log('══════════════════════════════════════════════════════');
  console.log('  CUMBERLAND COUNTY EMAIL EXTRACTION');
  console.log('══════════════════════════════════════════════════════');
  console.log(`CSV:    ${CSV_PATH}`);
  console.log(`Output: ${OUTPUT_DIR}/`);
  console.log('');

  mkdirSync(OUTPUT_DIR, { recursive: true });

  // Read CSV
  const csvContent = readFileSync(CSV_PATH, 'utf8');
  const rows: CsvRow[] = parse(csvContent, { columns: true, skip_empty_lines: true });

  // Count emails in raw data
  const rowsWithEmail = rows.filter(r => r.email?.trim());
  const rowsWithoutEmail = rows.length - rowsWithEmail.length;

  console.log(`Total CSV rows:              ${rows.length}`);
  console.log(`Rows with email field:       ${rowsWithEmail.length}`);
  console.log(`Rows without email:          ${rowsWithoutEmail}`);
  console.log('');

  // ── Filtering Pipeline ──
  const rejectedNonFood: Record<string, string>[] = [];
  const rejectedOutside: Record<string, string>[] = [];
  const rejectedChains: Record<string, string>[] = [];
  const rejectedNoEmail: Record<string, string>[] = [];
  const rejectedBadEmail: Record<string, string>[] = [];
  const flaggedEmails: Record<string, string>[] = [];
  const outreachReady: OutreachRecord[] = [];

  // Sub-categories for non-food breakdown
  let nonFoodHotels = 0;
  let nonFoodEvents = 0;
  let nonFoodRetail = 0;
  let nonFoodOrgs = 0;
  let nonFoodServices = 0;
  let nonFoodOther = 0;

  for (const row of rows) {
    const name = row.name?.trim();
    if (!name) continue;

    // ── Layer 1: Non-food filter ──
    if (!isFoodBusiness(row)) {
      const cat = (row.category || '').toLowerCase();
      const type = (row.type || '').toLowerCase();

      if (cat.includes('hotel') || type.includes('hotel') || cat.includes('bed and breakfast') || type.includes('resort')) {
        nonFoodHotels++;
      } else if (cat.includes('event') || type.includes('event') || cat.includes('convention') || cat.includes('wedding')) {
        nonFoodEvents++;
      } else if (cat.includes('store') || cat.includes('shop') || cat.includes('retail') || cat.includes('mall')) {
        nonFoodRetail++;
      } else if (cat.includes('church') || cat.includes('nonprofit') || cat.includes('association') || cat.includes('community')) {
        nonFoodOrgs++;
      } else if (cat.includes('salon') || cat.includes('spa') || cat.includes('medical') || cat.includes('dental') || cat.includes('fitness')) {
        nonFoodServices++;
      } else {
        nonFoodOther++;
      }

      rejectedNonFood.push({
        name,
        category: row.category || '',
        type: row.type || '',
        address: row.address || '',
        email: row.email || '',
      });
      continue;
    }

    // ── Layer 2: Geographic filter ──
    const parsed = parseAddress(row.address || '');
    const zipOk = parsed.zip && VALID_ZIPS.has(parsed.zip);
    const lat = parseFloat(row.latitude);
    const lng = parseFloat(row.longitude);
    const coordsOk = !isNaN(lat) && !isNaN(lng)
      && lat >= BOUNDING_BOX.minLat && lat <= BOUNDING_BOX.maxLat
      && lng >= BOUNDING_BOX.minLng && lng <= BOUNDING_BOX.maxLng;

    if (!zipOk && !coordsOk) {
      rejectedOutside.push({
        name,
        address: row.address || '',
        zip: parsed.zip,
        email: row.email || '',
      });
      continue;
    }

    // ── Layer 3: Chain detection ──
    const chainCheck = isChain(name, row.description);
    if (chainCheck.isChain) {
      rejectedChains.push({
        name,
        matched_pattern: chainCheck.matchedPattern,
        address: row.address || '',
        email: row.email || '',
      });
      continue;
    }

    // ── Layer 4: Email existence ──
    if (!row.email?.trim()) {
      rejectedNoEmail.push({
        name,
        category: row.category || '',
        address: row.address || '',
        phone: row.phone || '',
        website: row.website || '',
      });
      continue;
    }

    // ── Layer 5: Email quality ──
    const emailCheck = checkEmailQuality(row.email, name);
    if (!emailCheck.valid) {
      rejectedBadEmail.push({
        name,
        email: row.email.trim(),
        reason: emailCheck.reason || 'unknown',
        address: row.address || '',
      });
      continue;
    }

    // Build outreach record
    const record: OutreachRecord = {
      name,
      email: row.email.trim(),
      contact_name: row.full_name?.trim() || '',
      contact_title: row.title?.trim() || '',
      category: row.category || '',
      subtypes: row.subtypes || '',
      address: row.address || '',
      city: parsed.city,
      phone: row.phone?.trim() || row.contact_phone?.trim() || '',
      website: row.website?.trim() || '',
      rating: row.rating || '',
      reviews: row.reviews || '',
    };

    outreachReady.push(record);

    // Track flagged (still included in outreach_ready but also in flagged list)
    if (emailCheck.flagged) {
      flaggedEmails.push({
        name,
        email: row.email.trim(),
        flag_reason: emailCheck.flagReason || '',
        contact_name: row.full_name?.trim() || '',
        address: row.address || '',
      });
    }
  }

  // ── Dedup by email (keep first occurrence) ──
  const seenEmails = new Set<string>();
  const dedupedReady: OutreachRecord[] = [];
  let dupeCount = 0;

  for (const record of outreachReady) {
    const emailLower = record.email.toLowerCase();
    if (seenEmails.has(emailLower)) {
      dupeCount++;
      continue;
    }
    seenEmails.add(emailLower);
    dedupedReady.push(record);
  }

  // ── Write output files ──

  // outreach_ready.csv
  writeCsv('outreach_ready.csv', dedupedReady.map(r => ({
    name: r.name,
    email: r.email,
    contact_name: r.contact_name,
    contact_title: r.contact_title,
    category: r.category,
    city: r.city,
    phone: r.phone,
    website: r.website,
    rating: r.rating,
    reviews: r.reviews,
  })));

  // outreach_ready.json
  writeFileSync(`${OUTPUT_DIR}/outreach_ready.json`, JSON.stringify(dedupedReady, null, 2));

  // flagged_emails.csv
  writeCsv('flagged_emails.csv', flaggedEmails);

  // Rejection CSVs
  writeCsv('rejected_non_food.csv', rejectedNonFood);
  writeCsv('rejected_outside_county.csv', rejectedOutside);
  writeCsv('rejected_chains.csv', rejectedChains);
  writeCsv('rejected_no_email.csv', rejectedNoEmail);
  writeCsv('rejected_bad_email.csv', rejectedBadEmail);

  // Stats JSON
  const stats = {
    total_csv_rows: rows.length,
    rows_with_email: rowsWithEmail.length,
    rows_without_email: rowsWithoutEmail,
    rejected_non_food: rejectedNonFood.length,
    rejected_non_food_breakdown: {
      hotels: nonFoodHotels,
      events: nonFoodEvents,
      retail: nonFoodRetail,
      organizations: nonFoodOrgs,
      services: nonFoodServices,
      other: nonFoodOther,
    },
    rejected_outside_county: rejectedOutside.length,
    rejected_chains: rejectedChains.length,
    rejected_no_email: rejectedNoEmail.length,
    rejected_bad_email: rejectedBadEmail.length,
    duplicate_emails_removed: dupeCount,
    flagged_suspicious: flaggedEmails.length,
    outreach_ready: dedupedReady.length,
    with_contact_name: dedupedReady.filter(r => r.contact_name).length,
    without_contact_name: dedupedReady.filter(r => !r.contact_name).length,
  };
  writeFileSync(`${OUTPUT_DIR}/stats.json`, JSON.stringify(stats, null, 2));

  // ── Console Report ──
  console.log('── FILTERING PIPELINE ──');
  console.log(`Rejected (non-food category):    ${rejectedNonFood.length}`);
  console.log(`  Hotels & B&Bs:                 ${nonFoodHotels}`);
  console.log(`  Event venues:                  ${nonFoodEvents}`);
  console.log(`  Retail/shopping:               ${nonFoodRetail}`);
  console.log(`  Organizations/non-profits:     ${nonFoodOrgs}`);
  console.log(`  Services (salons, medical):    ${nonFoodServices}`);
  console.log(`  Other:                         ${nonFoodOther}`);
  console.log(`Rejected (outside county):       ${rejectedOutside.length}`);
  console.log(`Rejected (chain/franchise):      ${rejectedChains.length}`);
  console.log(`Rejected (no email):             ${rejectedNoEmail.length}`);
  console.log(`Rejected (bad/junk email):       ${rejectedBadEmail.length}`);
  console.log(`Duplicate emails removed:        ${dupeCount}`);
  console.log(`Flagged (suspicious but kept):   ${flaggedEmails.length}`);
  console.log('');

  // Chain breakdown
  if (rejectedChains.length > 0) {
    console.log('── CHAINS FILTERED ──');
    const chainCounts: Record<string, number> = {};
    for (const c of rejectedChains) {
      chainCounts[c.matched_pattern] = (chainCounts[c.matched_pattern] || 0) + 1;
    }
    const sorted = Object.entries(chainCounts).sort((a, b) => b[1] - a[1]);
    for (const [pattern, count] of sorted.slice(0, 25)) {
      console.log(`  ${pattern}: ${count}`);
    }
    if (sorted.length > 25) console.log(`  ... and ${sorted.length - 25} more patterns`);
    console.log('');
  }

  // Bad email breakdown
  if (rejectedBadEmail.length > 0) {
    console.log('── BAD EMAILS FILTERED ──');
    for (const e of rejectedBadEmail) {
      console.log(`  ${e.name}: ${e.email} (${e.reason})`);
    }
    console.log('');
  }

  // Flagged emails
  if (flaggedEmails.length > 0) {
    console.log('── FLAGGED EMAILS (review these) ──');
    for (const e of flaggedEmails) {
      console.log(`  ${e.name}: ${e.email} — ${e.flag_reason}`);
    }
    console.log('');
  }

  // Results
  console.log('══════════════════════════════════════════════════════');
  console.log('  RESULT');
  console.log('══════════════════════════════════════════════════════');
  console.log(`Ready for outreach:              ${dedupedReady.length}`);
  console.log(`  With contact name:             ${stats.with_contact_name}`);
  console.log(`  Without contact name:          ${stats.without_contact_name}`);
  console.log('');

  // Sample
  console.log('── SAMPLE (first 20) ──');
  for (const r of dedupedReady.slice(0, 20)) {
    const contact = r.contact_name ? ` [${r.contact_name}${r.contact_title ? `, ${r.contact_title}` : ''}]` : '';
    console.log(`  ${r.name} <${r.email}>${contact} — ${r.city}`);
  }
  if (dedupedReady.length > 20) {
    console.log(`  ... and ${dedupedReady.length - 20} more`);
  }
  console.log('');

  console.log(`Artifacts written to: ${OUTPUT_DIR}/`);
  console.log(`  outreach_ready.csv   (${dedupedReady.length} rows)`);
  console.log(`  outreach_ready.json  (${dedupedReady.length} rows)`);
  console.log(`  flagged_emails.csv   (${flaggedEmails.length} rows — REVIEW THESE)`);
  console.log(`  rejected_non_food.csv`);
  console.log(`  rejected_outside_county.csv`);
  console.log(`  rejected_chains.csv`);
  console.log(`  rejected_no_email.csv`);
  console.log(`  rejected_bad_email.csv`);
  console.log(`  stats.json`);
}

main();
