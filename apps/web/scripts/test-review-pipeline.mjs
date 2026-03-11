#!/usr/bin/env node
/**
 * Test the AI review pipeline end-to-end.
 *
 * Usage:
 *   node apps/web/scripts/test-review-pipeline.mjs --local
 *   node apps/web/scripts/test-review-pipeline.mjs --local --keep   # Don't delete test rows
 *   node apps/web/scripts/test-review-pipeline.mjs                  # Against production
 *
 * Runs TWO tests:
 *   Test A: Positive caption → should be APPROVED
 *   Test B: Negative/profane caption → should be REJECTED
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://kufcxxynjvyharhtfptd.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt1ZmN4eHluanZ5aGFyaHRmcHRkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Njg1MTk4OSwiZXhwIjoyMDgyNDI3OTg5fQ.9wZNnGz5nSxK-RDj41GRXu3s1IG0DZ-Iv5tozPZC6GY';
const CRON_SECRET = '9e98786de33d85396badebb998129d54f879970287be03f1ed5704a8663e6912';

const args = process.argv.slice(2);
const keepRow = args.includes('--keep');
const useLocal = args.includes('--local');
const baseUrl = useLocal ? 'http://localhost:3099' : 'https://tastelanc.com';

const TEST_VIDEO_URL = 'https://www.w3schools.com/html/mov_bbb.mp4';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const TEST_CASES = [
  {
    name: 'POSITIVE — should be APPROVED',
    caption: 'Amazing pizza here! Best in Lancaster, you gotta try the margherita.',
    captionTag: 'must_try_dish',
    expectApproved: true,
  },
  {
    name: 'NEGATIVE/PROFANE — should be REJECTED',
    caption: 'This place is absolute shit. The food was disgusting, the waiter was a damn idiot, and the manager can go f*** himself.',
    captionTag: null,
    expectApproved: false,
  },
  {
    name: 'SPAM/SELF-PROMO — should be REJECTED',
    caption: 'Check out my YouTube channel youtube.com/myfoodchannel for more reviews! Subscribe and like!',
    captionTag: null,
    expectApproved: false,
  },
];

async function runTest(testCase, restaurant, adminUser, testNum) {
  const divider = '─'.repeat(50);
  console.log(`\n${divider}`);
  console.log(`TEST ${testNum}: ${testCase.name}`);
  console.log(divider);

  // Insert test recommendation
  console.log(`\n   Caption: "${testCase.caption}"`);
  const { data: rec, error: insertError } = await supabase
    .from('restaurant_recommendations')
    .insert({
      user_id: adminUser.id,
      restaurant_id: restaurant.id,
      market_id: restaurant.market_id,
      video_url: TEST_VIDEO_URL,
      thumbnail_url: null,
      caption: testCase.caption,
      caption_tag: testCase.captionTag,
      duration_seconds: 10,
      is_visible: false,
      ig_status: 'pending',
    })
    .select()
    .single();

  if (insertError || !rec) {
    console.error('   INSERT FAILED:', insertError?.message);
    return { pass: false };
  }
  console.log(`   Inserted: ${rec.id}`);

  // Call review endpoint
  console.log('   Calling review endpoint...');
  const startTime = Date.now();

  try {
    const response = await fetch(`${baseUrl}/api/instagram/review-recommendation`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${CRON_SECRET}`,
      },
      body: JSON.stringify({ recommendation_id: rec.id }),
    });

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    const result = await response.json();

    console.log(`   Response: ${response.status} (${elapsed}s)`);
    console.log(`   Approved: ${result.approved ? 'YES' : 'NO'}`);
    console.log(`   Notes: ${result.notes}`);
    if (result.flags && result.flags.length > 0) {
      console.log(`   Flags: ${result.flags.join(', ')}`);
    }
    if (result.transcript) {
      console.log(`   Transcript: "${result.transcript}"`);
    }

    // Verify database
    const { data: updated } = await supabase
      .from('restaurant_recommendations')
      .select('ig_status, is_visible, ig_scheduled_at')
      .eq('id', rec.id)
      .single();

    const dbCorrect = testCase.expectApproved
      ? updated?.ig_status === 'ai_approved' && updated?.is_visible === true
      : updated?.ig_status === 'rejected' && updated?.is_visible === false;

    console.log(`   DB state: ig_status=${updated?.ig_status}, is_visible=${updated?.is_visible}`);
    if (updated?.ig_scheduled_at) {
      console.log(`   Scheduled: ${updated.ig_scheduled_at}`);
    }

    const pass = result.approved === testCase.expectApproved && dbCorrect;
    console.log(`\n   ${pass ? 'PASS ✓' : 'FAIL ✗'} — Expected ${testCase.expectApproved ? 'APPROVED' : 'REJECTED'}, got ${result.approved ? 'APPROVED' : 'REJECTED'}`);

    // Cleanup
    if (!keepRow) {
      await supabase.from('restaurant_recommendations').delete().eq('id', rec.id);
      console.log('   (test row cleaned up)');
    } else {
      console.log(`   (keeping row: ${rec.id})`);
    }

    return { pass, elapsed };
  } catch (err) {
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.error(`   REQUEST FAILED (${elapsed}s):`, err.message);

    if (!keepRow) {
      await supabase.from('restaurant_recommendations').delete().eq('id', rec.id);
    }
    return { pass: false, elapsed };
  }
}

async function main() {
  console.log('=== AI Review Pipeline Test Suite ===');
  console.log(`Target: ${baseUrl}\n`);

  // Setup: find restaurant + admin user
  console.log('Setup: Finding test data...');
  const { data: market } = await supabase
    .from('markets')
    .select('id')
    .eq('slug', 'lancaster-pa')
    .single();

  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('id, name, market_id')
    .eq('market_id', market.id)
    .limit(1)
    .single();

  const { data: adminUser } = await supabase
    .from('profiles')
    .select('id, display_name')
    .in('role', ['super_admin', 'co_founder'])
    .limit(1)
    .single();

  if (!restaurant || !adminUser) {
    console.error('Setup failed — no restaurant or admin user found');
    process.exit(1);
  }
  console.log(`Restaurant: ${restaurant.name}`);
  console.log(`User: ${adminUser.display_name}`);

  // Run all tests
  const results = [];
  for (let i = 0; i < TEST_CASES.length; i++) {
    const result = await runTest(TEST_CASES[i], restaurant, adminUser, i + 1);
    results.push(result);
  }

  // Summary
  const passed = results.filter(r => r.pass).length;
  const total = results.length;
  console.log('\n' + '═'.repeat(50));
  console.log(`RESULTS: ${passed}/${total} passed`);
  if (passed === total) {
    console.log('All tests passed — pipeline is working correctly.');
  } else {
    console.log('Some tests failed — review the output above.');
  }
  console.log('═'.repeat(50));
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
