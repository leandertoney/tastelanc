/**
 * One-time audit script: Check restaurant categories for itinerary quality
 * Run: node scripts/audit_categories.js
 */
const https = require('https');

const url = 'https://kufcxxynjvyharhtfptd.supabase.co/rest/v1/restaurants?is_active=eq.true&select=name,categories,cuisine&order=name';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt1ZmN4eHluanZ5aGFyaHRmcHRkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY4NTE5ODksImV4cCI6MjA4MjQyNzk4OX0.kvT7tYVtQmj7R26EtjzlhNt3C_TfGWiTwjsyURuNWcQ';

const options = {
  headers: {
    'apikey': key,
    'Authorization': 'Bearer ' + key,
  },
};

https.get(url, options, (res) => {
  let data = '';
  res.on('data', (chunk) => (data += chunk));
  res.on('end', () => {
    const restaurants = JSON.parse(data);

    // 1. Find Saint Boniface
    console.log('=== SAINT BONIFACE ===');
    restaurants
      .filter((r) => r.name.toLowerCase().includes('boniface'))
      .forEach((r) =>
        console.log(r.name, '|', JSON.stringify(r.categories), '|', r.cuisine),
      );

    // 2. Brunch + bars/nightlife (will get -25 penalty for breakfast)
    console.log('\n=== BRUNCH + BARS/NIGHTLIFE (breakfast penalty applies) ===');
    const barBrunches = restaurants.filter((r) => {
      const cats = r.categories || [];
      return (
        cats.includes('brunch') &&
        (cats.includes('bars') || cats.includes('nightlife'))
      );
    });
    barBrunches.forEach((r) =>
      console.log(r.name, '|', JSON.stringify(r.categories), '|', r.cuisine),
    );
    console.log('Total:', barBrunches.length);

    // 3. Dedicated brunch (no bars/nightlife — ideal for breakfast)
    console.log('\n=== DEDICATED BRUNCH (ideal for breakfast) ===');
    const dedicated = restaurants.filter((r) => {
      const cats = r.categories || [];
      return (
        cats.includes('brunch') &&
        !cats.includes('bars') &&
        !cats.includes('nightlife')
      );
    });
    dedicated.forEach((r) =>
      console.log(r.name, '|', JSON.stringify(r.categories), '|', r.cuisine),
    );
    console.log('Total:', dedicated.length);

    // 4. Cafe cuisine (passes breakfast via cuisine fallback)
    console.log('\n=== CAFE CUISINE (passes breakfast via cuisine) ===');
    const cafes = restaurants.filter((r) => r.cuisine === 'cafe');
    cafes.forEach((r) =>
      console.log(r.name, '|', JSON.stringify(r.categories), '|', r.cuisine),
    );
    console.log('Total:', cafes.length);

    // 5. Category distribution
    console.log('\n=== CATEGORY DISTRIBUTION ===');
    const cc = {};
    restaurants.forEach((r) =>
      (r.categories || []).forEach((c) => (cc[c] = (cc[c] || 0) + 1)),
    );
    Object.entries(cc)
      .sort((a, b) => b[1] - a[1])
      .forEach(([k, v]) => console.log(k + ':', v));

    // 6. Cuisine distribution
    console.log('\n=== CUISINE DISTRIBUTION ===');
    const cu = {};
    restaurants.forEach(
      (r) => (cu[r.cuisine || '(none)'] = (cu[r.cuisine || '(none)'] || 0) + 1),
    );
    Object.entries(cu)
      .sort((a, b) => b[1] - a[1])
      .forEach(([k, v]) => console.log(k + ':', v));

    // 7. Restaurants with empty categories
    console.log('\n=== EMPTY CATEGORIES ===');
    const empty = restaurants.filter(
      (r) => !r.categories || r.categories.length === 0,
    );
    console.log('Total with empty categories:', empty.length);
    empty.slice(0, 10).forEach((r) => console.log(' ', r.name, '|', r.cuisine));
    if (empty.length > 10) console.log('  ... and', empty.length - 10, 'more');

    // 8. Suspicious: breweries/brewing with brunch
    console.log('\n=== BREWING/BREWERY WITH BRUNCH (suspicious) ===');
    const breweries = restaurants.filter((r) => {
      const name = r.name.toLowerCase();
      const cats = r.categories || [];
      return (
        (name.includes('brew') || name.includes('brewery') || name.includes('brewing')) &&
        cats.includes('brunch')
      );
    });
    breweries.forEach((r) =>
      console.log(r.name, '|', JSON.stringify(r.categories), '|', r.cuisine),
    );
    console.log('Total:', breweries.length);
  });
}).on('error', (e) => console.error('Error:', e.message));
