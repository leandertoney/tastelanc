// Quick test script to verify Pick badge implementation
const SUPABASE_URL = 'https://kufcxxynjvyharhtfptd.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt1ZmN4eHluanZ5aGFyaHRmcHRkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Njg1MTk4OSwiZXhwIjoyMDgyNDI3OTg5fQ.9wZNnGz5nSxK-RDj41GRXu3s1IG0DZ-Iv5tozPZC6GY';

async function testPickBadge() {
  console.log('🧪 Testing Pick Badge Implementation...\n');

  // Test 1: Verify Marion Court Room has badge
  console.log('TEST 1: Marion Court Room Pick Badge');
  const marionResponse = await fetch(
    `${SUPABASE_URL}/rest/v1/restaurants?id=eq.6304c5cf-bdf3-413c-9fff-592562a1ddde&select=id,name,has_pick_badge,tier_id`,
    {
      headers: {
        'apikey': SERVICE_KEY,
        'Authorization': `Bearer ${SERVICE_KEY}`,
      }
    }
  );
  const marion = await marionResponse.json();
  console.log('Marion Court Room:', marion[0] || 'NOT FOUND');
  console.log('✓ Has Pick Badge:', marion[0]?.has_pick_badge === true ? 'YES ✅' : 'NO ❌');
  console.log('');

  // Test 2: Verify Station House has badge
  console.log('TEST 2: Station House Tavern Pick Badge');
  const stationResponse = await fetch(
    `${SUPABASE_URL}/rest/v1/restaurants?id=eq.9134761b-5eb3-4801-ba17-e5fa37de7c08&select=id,name,has_pick_badge,tier_id`,
    {
      headers: {
        'apikey': SERVICE_KEY,
        'Authorization': `Bearer ${SERVICE_KEY}`,
      }
    }
  );
  const station = await stationResponse.json();
  console.log('Station House:', station[0] || 'NOT FOUND');
  console.log('✓ Has Pick Badge:', station[0]?.has_pick_badge === true ? 'YES ✅' : 'NO ❌');
  console.log('');

  // Test 3: Check random restaurant does NOT have badge
  console.log('TEST 3: Random Restaurant (should NOT have badge)');
  const randomResponse = await fetch(
    `${SUPABASE_URL}/rest/v1/restaurants?limit=1&has_pick_badge=eq.false&select=id,name,has_pick_badge`,
    {
      headers: {
        'apikey': SERVICE_KEY,
        'Authorization': `Bearer ${SERVICE_KEY}`,
      }
    }
  );
  const random = await randomResponse.json();
  console.log('Random Restaurant:', random[0]?.name || 'NOT FOUND');
  console.log('✓ Has Pick Badge:', random[0]?.has_pick_badge === false ? 'NO (correct) ✅' : 'YES (wrong) ❌');
  console.log('');

  // Test 4: Count total restaurants with Pick badge
  console.log('TEST 4: Total Restaurants with Pick Badge');
  const countResponse = await fetch(
    `${SUPABASE_URL}/rest/v1/restaurants?has_pick_badge=eq.true&select=id,name`,
    {
      headers: {
        'apikey': SERVICE_KEY,
        'Authorization': `Bearer ${SERVICE_KEY}`,
      }
    }
  );
  const withBadge = await countResponse.json();
  console.log('Total with Pick Badge:', withBadge.length);
  console.log('Expected: 2 (Marion Court + Station House)');
  console.log('✓ Count matches:', withBadge.length === 2 ? 'YES ✅' : `NO (found ${withBadge.length}) ❌`);
  if (withBadge.length > 0) {
    console.log('Restaurants with badge:');
    withBadge.forEach(r => console.log(`  - ${r.name}`));
  }
  console.log('');

  // Summary
  console.log('═══════════════════════════════════════');
  console.log('SUMMARY:');
  console.log('═══════════════════════════════════════');
  const allPass =
    marion[0]?.has_pick_badge === true &&
    station[0]?.has_pick_badge === true &&
    withBadge.length === 2;

  if (allPass) {
    console.log('✅ ALL TESTS PASSED - Database ready!');
  } else {
    console.log('❌ SOME TESTS FAILED - Check output above');
  }
}

testPickBadge().catch(console.error);
