/**
 * Parse Restaurant Week HTML to extract all restaurant names
 */

import fs from 'fs';

const html = fs.readFileSync('/tmp/rw-website.html', 'utf-8');

console.log('\n🔍 Parsing Restaurant Week HTML...\n');

// Look for all text that might be restaurant names
// Common patterns: Between <h2>, <h3>, <p> tags, or in data attributes

const patterns = [
  // Match h2, h3, h4 tags
  /<h[234][^>]*>([^<]+)<\/h[234]>/gi,
  // Match strong/bold text
  /<strong[^>]*>([^<]+)<\/strong>/gi,
  // Match links
  /<a[^>]*>([^<]+)<\/a>/gi,
  // Match paragraphs
  /<p[^>]*>([^<]+)<\/p>/gi,
];

const allMatches = new Set();

patterns.forEach(pattern => {
  let match;
  while ((match = pattern.exec(html)) !== null) {
    const text = match[1].trim();
    // Filter out obvious non-restaurant names
    if (
      text.length > 2 &&
      text.length < 60 &&
      !text.includes('Restaurant Week') &&
      !text.includes('April') &&
      !text.includes('2026') &&
      !text.includes('Lancaster') &&
      !text.includes('Menu') &&
      !text.includes('Click') &&
      !text.includes('http') &&
      !/^\d+$/.test(text) &&
      !text.includes('Subscribe') &&
      !text.includes('Follow')
    ) {
      allMatches.add(text);
    }
  }
});

// Also search for JSON data
const jsonMatch = html.match(/"restaurantData":\s*(\[.*?\])/s);
if (jsonMatch) {
  console.log('Found restaurantData JSON!');
}

// Search for specific Lancaster restaurants we know exist
const knownRestaurants = [
  'Cork & Cap',
  'The Gloomy Rooster',
  'Decades',
  'Tellus 360',
  'Marion Court Room',
  'The Fridge',
  'Lombardo',
  'Rincon Latino'
];

console.log('\n✅ Known restaurants found in HTML:\n');
knownRestaurants.forEach(name => {
  if (html.includes(name)) {
    console.log(`  ✓ ${name}`);
  }
});

console.log(`\n📊 Total potential matches: ${allMatches.size}\n`);
console.log('Sample matches (first 30):');
const sample = Array.from(allMatches).slice(0, 30);
sample.forEach((text, i) => {
  console.log(`${i + 1}. ${text}`);
});

// Save all matches to file
fs.writeFileSync('/tmp/rw-all-matches.txt', Array.from(allMatches).join('\n'));
console.log('\n✅ Saved all matches to /tmp/rw-all-matches.txt');
