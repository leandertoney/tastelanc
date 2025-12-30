import { readFileSync } from 'fs';
import { parse } from 'csv-parse/sync';

const csvPath = '/Users/leandertoney/Desktop/TasteLanc Assets/all_of_lanc.csv';
const csvContent = readFileSync(csvPath, 'utf8');
const rows = parse(csvContent, { columns: true, skip_empty_lines: true });

// Patterns from cleanup script
const patterns = {
  'Theaters/Venues': [/\btheatre\b/i, /\btheater\b/i, /barshinger/i],
  'Candy/Chocolate': [/\bcandy\b/i, /chocolate/i],
  'Hotels': [/holiday.*inn/i, /\bhotel\b/i],
};

// Parse address to get zip
function getZip(addr: string): string | null {
  const match = (addr || '').match(/(\d{5})/);
  return match ? match[1] : null;
}

const VALID_ZIPS = ['17601', '17602', '17603', '17540', '17551', '17552', '17505'];

console.log('=== NO ZIP CODE ===\n');
let noZipCount = 0;
for (const row of rows) {
  const zip = getZip(row.full_address);
  // Show entries with Lancaster in address but no valid zip
  if (!zip || !VALID_ZIPS.includes(zip)) {
    const addr = row.full_address || '';
    if (addr.toLowerCase().includes('lancaster') && !zip) {
      noZipCount++;
      console.log(`${noZipCount}. ${row.name}`);
      console.log(`   Address: ${row.full_address || 'N/A'}`);
      console.log(`   Type: ${row.type}`);
      console.log('');
    }
  }
}

console.log('\n=== THEATERS/VENUES ===\n');
let theaterCount = 0;
for (const row of rows) {
  const name = row.name || '';
  for (const p of patterns['Theaters/Venues']) {
    if (p.test(name)) {
      theaterCount++;
      console.log(`${theaterCount}. ${name}`);
      console.log(`   Address: ${row.full_address}`);
      console.log(`   Type: ${row.type}`);
      console.log('');
      break;
    }
  }
}

console.log('\n=== CANDY/CHOCOLATE ===\n');
let candyCount = 0;
for (const row of rows) {
  const name = row.name || '';
  for (const p of patterns['Candy/Chocolate']) {
    if (p.test(name)) {
      candyCount++;
      console.log(`${candyCount}. ${name}`);
      console.log(`   Address: ${row.full_address}`);
      console.log(`   Type: ${row.type}`);
      console.log('');
      break;
    }
  }
}

console.log('\n=== HOTELS ===\n');
let hotelCount = 0;
for (const row of rows) {
  const name = row.name || '';
  for (const p of patterns['Hotels']) {
    if (p.test(name)) {
      hotelCount++;
      console.log(`${hotelCount}. ${name}`);
      console.log(`   Address: ${row.full_address}`);
      console.log(`   Type: ${row.type}`);
      console.log('');
      break;
    }
  }
}

console.log(`\nTOTAL: ${noZipCount + theaterCount + candyCount + hotelCount}`);
