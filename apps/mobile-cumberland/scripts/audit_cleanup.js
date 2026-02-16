/**
 * Audit script to identify restaurants needing category/cuisine cleanup
 */
const https = require('https');

const url = 'https://kufcxxynjvyharhtfptd.supabase.co/rest/v1/restaurants?is_active=eq.true&select=id,name,categories,cuisine&order=name';
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

    // 1. Brunch + non-breakfast cuisine
    console.log('=== BRUNCH + NON-BREAKFAST CUISINE (review needed) ===');
    const suspicious = restaurants.filter((r) => {
      const cats = r.categories || [];
      return (
        cats.includes('brunch') &&
        ['asian', 'seafood', 'steakhouse'].includes(r.cuisine)
      );
    });
    suspicious.forEach((r) =>
      console.log(r.id, '|', r.name, '|', JSON.stringify(r.categories), '|', r.cuisine),
    );
    console.log('Total:', suspicious.length);

    // 2. Breweries with wrong cuisine
    console.log('\n=== BREWERIES WITH SUSPICIOUS CUISINE ===');
    const wrongCuisine = restaurants.filter((r) => {
      const name = r.name.toLowerCase();
      return (
        (name.includes('brew') ||
          name.includes('brewery') ||
          name.includes('brewing')) &&
        r.cuisine &&
        r.cuisine !== 'pub_fare' &&
        r.cuisine !== 'american_contemporary'
      );
    });
    wrongCuisine.forEach((r) =>
      console.log(r.id, '|', r.name, '|', r.cuisine, '-> should be pub_fare?'),
    );
    console.log('Total:', wrongCuisine.length);

    // 3. Restaurants with 5+ categories (over-categorized)
    console.log('\n=== OVER-CATEGORIZED (5+ categories) ===');
    const overCategorized = restaurants.filter(
      (r) => (r.categories || []).length >= 5,
    );
    overCategorized.forEach((r) =>
      console.log(r.id, '|', r.name, '|', JSON.stringify(r.categories), '|', r.cuisine),
    );
    console.log('Total:', overCategorized.length);

    // 4. Restaurants named as Chinese/Sushi/Ramen with brunch
    console.log('\n=== CHINESE/SUSHI/RAMEN WITH BRUNCH ===');
    const asianBrunch = restaurants.filter((r) => {
      const name = r.name.toLowerCase();
      const cats = r.categories || [];
      return (
        cats.includes('brunch') &&
        (name.includes('chinese') ||
          name.includes('sushi') ||
          name.includes('ramen') ||
          name.includes('pho') ||
          name.includes('wok') ||
          name.includes('kebab') ||
          name.includes('crab'))
      );
    });
    asianBrunch.forEach((r) =>
      console.log(r.id, '|', r.name, '|', JSON.stringify(r.categories), '|', r.cuisine),
    );
    console.log('Total:', asianBrunch.length);
  });
}).on('error', (e) => console.error('Error:', e.message));
