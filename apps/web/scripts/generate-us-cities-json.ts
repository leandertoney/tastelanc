/**
 * Generate static US cities and counties JSON for autocomplete.
 * Data source: GeoNames (CC BY 4.0) — https://download.geonames.org/export/dump/
 *
 * Downloads GeoNames US.zip and admin2Codes.txt, processes them into compact
 * JSON files for client-side autocomplete in the expansion pipeline.
 *
 * Usage: cd apps/web && npx tsx scripts/generate-us-cities-json.ts
 */

import { mkdirSync, readFileSync, writeFileSync, existsSync, createWriteStream, unlinkSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';
import { get } from 'https';

const TMP_DIR = '/tmp/geonames-gen';
const OUT_DIR = join(__dirname, '..', 'public', 'data');

// GeoNames feature codes for populated places
const PLACE_CODES = new Set(['PPL', 'PPLA', 'PPLA2', 'PPLA3', 'PPLC', 'PPLS', 'PPLX']);

// Valid US state abbreviations
const US_STATES = new Set([
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'DC', 'FL', 'GA', 'HI',
  'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD', 'MA', 'MI', 'MN',
  'MO', 'MS', 'MT', 'NE', 'NV', 'NH', 'NJ', 'NM', 'NY', 'NC', 'ND', 'OH',
  'OK', 'OR', 'PA', 'RI', 'SC', 'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA',
  'WV', 'WI', 'WY',
]);

function downloadFile(url: string, dest: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const file = createWriteStream(dest);
    get(url, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        file.close();
        if (existsSync(dest)) unlinkSync(dest);
        return downloadFile(res.headers.location!, dest).then(resolve, reject);
      }
      res.pipe(file);
      file.on('finish', () => { file.close(); resolve(); });
    }).on('error', (err) => { file.close(); reject(err); });
  });
}

async function main() {
  mkdirSync(TMP_DIR, { recursive: true });
  mkdirSync(OUT_DIR, { recursive: true });

  const usZipPath = join(TMP_DIR, 'US.zip');
  const usTxtPath = join(TMP_DIR, 'US.txt');
  const admin2Path = join(TMP_DIR, 'admin2Codes.txt');

  // Download and extract US places
  if (!existsSync(usTxtPath)) {
    console.log('Downloading GeoNames US.zip...');
    await downloadFile('https://download.geonames.org/export/dump/US.zip', usZipPath);
    console.log('Extracting...');
    execSync(`unzip -o "${usZipPath}" US.txt -d "${TMP_DIR}"`);
  } else {
    console.log('Using cached US.txt');
  }

  // Download admin2 codes (county names)
  if (!existsSync(admin2Path)) {
    console.log('Downloading admin2Codes.txt...');
    await downloadFile('https://download.geonames.org/export/dump/admin2Codes.txt', admin2Path);
  } else {
    console.log('Using cached admin2Codes.txt');
  }

  // Parse admin2 codes — format: "US.AL.003\tBaldwin County\tBaldwin County\t4049189"
  console.log('Parsing county name mappings...');
  const admin2Lines = readFileSync(admin2Path, 'utf-8').split('\n');
  const countyMap = new Map<string, string>(); // "AL.003" → "Baldwin County"

  for (const line of admin2Lines) {
    if (!line.startsWith('US.')) continue;
    const parts = line.split('\t');
    const code = parts[0].replace('US.', ''); // "AL.003"
    const name = parts[1]; // "Baldwin County"
    countyMap.set(code, name);
  }
  console.log(`  Loaded ${countyMap.size} US county mappings`);

  // Parse US places — GeoNames TSV columns:
  // 0=id, 1=name, 2=asciiname, 3=altnames, 4=lat, 5=lng,
  // 6=feature_class, 7=feature_code, 8=country, 9=cc2, 10=admin1(state),
  // 11=admin2(county FIPS), 12=admin3, 13=admin4, 14=population
  console.log('Parsing US places...');
  const usLines = readFileSync(usTxtPath, 'utf-8').split('\n');

  interface CityEntry { c: string; co: string; s: string; p: number }
  const cities: CityEntry[] = [];
  const countyPopMap = new Map<string, number>();

  for (const line of usLines) {
    if (!line.trim()) continue;
    const cols = line.split('\t');

    const featureClass = cols[6];
    const featureCode = cols[7];
    const state = cols[10];
    const admin2 = cols[11];
    const population = parseInt(cols[14] || '0', 10);

    if (featureClass !== 'P') continue;
    if (!PLACE_CODES.has(featureCode)) continue;
    if (!US_STATES.has(state)) continue;
    if (population <= 0) continue;

    const countyKey = `${state}.${admin2}`;
    const countyName = countyMap.get(countyKey);
    if (!countyName) continue;

    // Prefer asciiname, clean up suffixes
    let cityName = (cols[2] || cols[1]).trim();
    cityName = cityName
      .replace(/ \(historical\)$/i, '')
      .replace(/ \(balance\)$/i, '')
      .trim();

    cities.push({ c: cityName, co: countyName, s: state, p: population });

    // Track county population
    countyPopMap.set(countyKey, (countyPopMap.get(countyKey) || 0) + population);
  }

  cities.sort((a, b) => b.p - a.p);
  console.log(`  Parsed ${cities.length} cities with population > 0`);

  // Build counties list
  interface CountyEntry { co: string; s: string; p: number }
  const counties: CountyEntry[] = [];

  for (const [key, name] of countyMap) {
    const [state] = key.split('.');
    if (!US_STATES.has(state)) continue;
    counties.push({ co: name, s: state, p: countyPopMap.get(key) || 0 });
  }
  counties.sort((a, b) => b.p - a.p);
  console.log(`  Parsed ${counties.length} counties`);

  // Write JSON files
  const citiesPath = join(OUT_DIR, 'us-cities.json');
  const countiesPath = join(OUT_DIR, 'us-counties.json');

  writeFileSync(citiesPath, JSON.stringify(cities));
  writeFileSync(countiesPath, JSON.stringify(counties));

  const citiesSize = readFileSync(citiesPath).length;
  const countiesSize = readFileSync(countiesPath).length;
  console.log(`\nOutput:`);
  console.log(`  ${citiesPath} — ${cities.length} cities, ${(citiesSize / 1024).toFixed(0)}KB`);
  console.log(`  ${countiesPath} — ${counties.length} counties, ${(countiesSize / 1024).toFixed(0)}KB`);

  // Sample output
  console.log('\nTop 10 US cities:');
  cities.slice(0, 10).forEach(c =>
    console.log(`  ${c.c}, ${c.s} — ${c.co} (pop ${c.p.toLocaleString()})`)
  );

  console.log('\nTop 10 PA cities:');
  cities.filter(c => c.s === 'PA').slice(0, 10).forEach(c =>
    console.log(`  ${c.c}, ${c.s} — ${c.co} (pop ${c.p.toLocaleString()})`)
  );
}

main().catch((err) => {
  console.error('FATAL:', err);
  process.exit(1);
});
