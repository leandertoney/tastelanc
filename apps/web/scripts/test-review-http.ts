/**
 * HTTP-level E2E test for the review voting endpoint.
 * Tests the actual API at localhost:3000 — dev server must be running.
 * Run: cd apps/web && DOTENV_CONFIG_PATH=.env.local npx tsx scripts/test-review-http.ts
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { generateReviewToken } from '../lib/expansion-review-token';
import { EXPANSION_TEAM } from '../config/expansion-team';

const BASE = 'http://localhost:3000';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

let passed = 0;
let failed = 0;

function assert(label: string, condition: boolean, detail?: string) {
  if (condition) {
    console.log(`  ✓ ${label}`);
    passed++;
  } else {
    console.log(`  ✗ FAIL: ${label}${detail ? ` — ${detail}` : ''}`);
    failed++;
  }
}

async function runTests() {
  console.log('\n═══ Review System HTTP Tests ═══\n');

  // Find a real city in the DB to test with
  const { data: cities, error: cityErr } = await supabase
    .from('expansion_cities')
    .select('id, city_name, state, market_potential_score, priority')
    .in('status', ['researched', 'brand_ready', 'researching'])
    .order('market_potential_score', { ascending: false })
    .limit(1);

  const testCity = cities?.[0];

  if (!testCity || cityErr) {
    console.error('No test city found. Need at least one city in researched/brand_ready/researching status.');
    process.exit(1);
  }

  console.log(`Using test city: ${testCity.city_name}, ${testCity.state} (${testCity.id})`);
  const cityId = testCity.id;
  const originalPriority = testCity.priority;
  const LEANDER_EMAIL = 'leander@tastelanc.com';
  const JORDAN_EMAIL = 'jordan@tastelanc.com';

  // Clean up any existing test votes
  await supabase.from('expansion_reviews').delete().eq('city_id', cityId);
  await supabase.from('expansion_cities').update({ review_status: 'pending_review' }).eq('id', cityId);

  // ── Test 1: Missing parameters ──
  console.log('\n── Test 1: Missing parameters ──');
  {
    const res = await fetch(`${BASE}/api/expansion/review`);
    assert('Returns 400 for no params', res.status === 400);
    const html = await res.text();
    assert('Error page contains "Missing Parameters"', html.includes('Missing Parameters'));
  }

  {
    const res = await fetch(`${BASE}/api/expansion/review?city=${cityId}`);
    assert('Returns 400 for partial params', res.status === 400);
  }

  // ── Test 2: Invalid token ──
  console.log('\n── Test 2: Invalid token ──');
  {
    const res = await fetch(`${BASE}/api/expansion/review?city=${cityId}&email=${encodeURIComponent(LEANDER_EMAIL)}&vote=interested&token=deadbeef1234567890abcdef`);
    assert('Returns 400 for bad token', res.status === 400);
    const html = await res.text();
    assert('Error page contains "Invalid Token"', html.includes('Invalid Token'));
  }

  // ── Test 3: Invalid vote value ──
  console.log('\n── Test 3: Invalid vote value ──');
  {
    const badToken = generateReviewToken(cityId, LEANDER_EMAIL, 'banana');
    const res = await fetch(`${BASE}/api/expansion/review?city=${cityId}&email=${encodeURIComponent(LEANDER_EMAIL)}&vote=banana&token=${badToken}`);
    assert('Returns 400 for invalid vote', res.status === 400);
    const html = await res.text();
    assert('Error page contains "Invalid Vote"', html.includes('Invalid Vote'));
  }

  // ── Test 4: Valid vote — Leander votes "Interested" ──
  console.log('\n── Test 4: Valid vote (Leander → Interested) ──');
  {
    const token = generateReviewToken(cityId, LEANDER_EMAIL, 'interested');
    const url = `${BASE}/api/expansion/review?city=${cityId}&email=${encodeURIComponent(LEANDER_EMAIL)}&vote=interested&token=${token}`;
    const res = await fetch(url);
    assert('Returns 200 for valid vote', res.status === 200);
    const html = await res.text();
    assert('Confirmation page says "Thanks, Leander!"', html.includes('Thanks, Leander!'));
    assert('Shows vote badge "Interested"', html.includes('Your vote: Interested'));
    assert('Shows city name', html.includes(testCity.city_name));
    assert('Shows team votes section', html.includes('Team Votes'));
    assert('Shows dashboard link', html.includes('/admin/expansion/'));
    assert('Content-Type is text/html', res.headers.get('content-type')?.includes('text/html') || false);
  }

  // Verify in DB
  {
    const { data: vote } = await supabase
      .from('expansion_reviews')
      .select('*')
      .eq('city_id', cityId)
      .eq('reviewer_email', LEANDER_EMAIL)
      .single();
    assert('Vote stored in DB', vote?.vote === 'interested' && vote?.reviewer_name === 'Leander');
  }

  // Check city review_status is still pending (only 1 vote)
  {
    const { data: city } = await supabase
      .from('expansion_cities')
      .select('review_status')
      .eq('id', cityId)
      .single();
    assert('City still pending_review (1 of 2 votes)', city?.review_status === 'pending_review');
  }

  // ── Test 5: Valid vote — Jordan votes "Interested" (triggers consensus) ──
  console.log('\n── Test 5: Valid vote (Jordan → Interested) → consensus ──');
  {
    const token = generateReviewToken(cityId, JORDAN_EMAIL, 'interested');
    const url = `${BASE}/api/expansion/review?city=${cityId}&email=${encodeURIComponent(JORDAN_EMAIL)}&vote=interested&token=${token}`;
    const res = await fetch(url);
    assert('Returns 200 for Jordan vote', res.status === 200);
    const html = await res.text();
    assert('Confirmation page says "Thanks, Jordan!"', html.includes('Thanks, Jordan!'));
    assert('Shows consensus message (fast-tracked)', html.includes('fast-tracked'));
    assert('Shows both votes', html.includes('Leander') && html.includes('Jordan'));
  }

  // Verify consensus in DB
  {
    const { data: city } = await supabase
      .from('expansion_cities')
      .select('review_status, priority')
      .eq('id', cityId)
      .single();
    assert('review_status = consensus_interested', city?.review_status === 'consensus_interested');
    assert('Priority increased by 3', city?.priority === (originalPriority || 5) + 3);
  }

  // Verify activity logs
  {
    const { data: logs } = await supabase
      .from('expansion_activity_log')
      .select('*')
      .eq('city_id', cityId)
      .eq('action', 'review_vote')
      .order('created_at', { ascending: false });
    assert('Two activity log entries', (logs?.length || 0) >= 2);
    const leanderLog = logs?.find(l => l.description?.includes('Leander'));
    const jordanLog = logs?.find(l => l.description?.includes('Jordan'));
    assert('Leander activity logged', !!leanderLog);
    assert('Jordan activity logged', !!jordanLog);
  }

  // ── Test 6: Upsert — Leander changes vote to "Not Now" ──
  console.log('\n── Test 6: Upsert (Leander changes to Not Now) ──');
  {
    const token = generateReviewToken(cityId, LEANDER_EMAIL, 'not_now');
    const url = `${BASE}/api/expansion/review?city=${cityId}&email=${encodeURIComponent(LEANDER_EMAIL)}&vote=not_now&token=${token}`;
    const res = await fetch(url);
    assert('Returns 200 for vote change', res.status === 200);
    const html = await res.text();
    assert('Shows updated vote "Not Now"', html.includes('Your vote: Not Now'));
    assert('Shows split decision message', html.includes('Split decision') || html.includes('discuss'));
  }

  // Verify in DB — vote changed + no duplicate
  {
    const { data: votes, count } = await supabase
      .from('expansion_reviews')
      .select('*', { count: 'exact' })
      .eq('city_id', cityId);
    assert('Still only 2 vote rows (no duplicate)', count === 2);
    const leanderVote = votes?.find(v => v.reviewer_email === LEANDER_EMAIL);
    assert('Leander vote updated to not_now', leanderVote?.vote === 'not_now');
  }

  // Verify review_status changed to split_decision
  {
    const { data: city } = await supabase
      .from('expansion_cities')
      .select('review_status, priority')
      .eq('id', cityId)
      .single();
    assert('review_status = split_decision', city?.review_status === 'split_decision');
    // Priority shouldn't change on split
    // (Note: the endpoint applies delta to current priority, which was already +3)
    // split_decision has delta 0, but the priority was re-read fresh, so it depends on what current is
  }

  // ── Test 7: Non-existent city ──
  console.log('\n── Test 7: Non-existent city ──');
  {
    const fakeCityId = '00000000-0000-0000-0000-000000000000';
    const token = generateReviewToken(fakeCityId, LEANDER_EMAIL, 'interested');
    const url = `${BASE}/api/expansion/review?city=${fakeCityId}&email=${encodeURIComponent(LEANDER_EMAIL)}&vote=interested&token=${token}`;
    const res = await fetch(url);
    assert('Returns 400 for non-existent city', res.status === 400);
    const html = await res.text();
    assert('Error page contains "City Not Found"', html.includes('City Not Found'));
  }

  // ── Test 8: Token from one vote can't be used for another vote ──
  console.log('\n── Test 8: Cross-vote token reuse ──');
  {
    // Generate token for "interested" but try to use it for "reject"
    const interestedToken = generateReviewToken(cityId, LEANDER_EMAIL, 'interested');
    const url = `${BASE}/api/expansion/review?city=${cityId}&email=${encodeURIComponent(LEANDER_EMAIL)}&vote=reject&token=${interestedToken}`;
    const res = await fetch(url);
    assert('Cross-vote token rejected (400)', res.status === 400);
    const html = await res.text();
    assert('Shows invalid token message', html.includes('Invalid Token'));
  }

  // ── Test 9: Token from one email can't be used for another email ──
  console.log('\n── Test 9: Cross-email token reuse ──');
  {
    // Generate token for Leander but try to use it for Jordan
    const leandersToken = generateReviewToken(cityId, LEANDER_EMAIL, 'interested');
    const url = `${BASE}/api/expansion/review?city=${cityId}&email=${encodeURIComponent(JORDAN_EMAIL)}&vote=interested&token=${leandersToken}`;
    const res = await fetch(url);
    assert('Cross-email token rejected (400)', res.status === 400);
  }

  // ── Test 10: Both reject → consensus_reject with big priority drop ──
  console.log('\n── Test 10: Both reject → consensus_reject ──');
  {
    // First, reset both votes to reject
    const token1 = generateReviewToken(cityId, LEANDER_EMAIL, 'reject');
    await fetch(`${BASE}/api/expansion/review?city=${cityId}&email=${encodeURIComponent(LEANDER_EMAIL)}&vote=reject&token=${token1}`);

    const token2 = generateReviewToken(cityId, JORDAN_EMAIL, 'reject');
    const res = await fetch(`${BASE}/api/expansion/review?city=${cityId}&email=${encodeURIComponent(JORDAN_EMAIL)}&vote=reject&token=${token2}`);
    assert('Returns 200 for reject consensus', res.status === 200);
    const html = await res.text();
    assert('Shows reject consensus message', html.includes('reject') || html.includes('deprioritized'));

    const { data: city } = await supabase
      .from('expansion_cities')
      .select('review_status')
      .eq('id', cityId)
      .single();
    assert('review_status = consensus_reject', city?.review_status === 'consensus_reject');
  }

  // ── Cleanup ──
  console.log('\n── Cleanup ──');
  await supabase.from('expansion_reviews').delete().eq('city_id', cityId);
  await supabase.from('expansion_activity_log').delete()
    .eq('city_id', cityId)
    .eq('action', 'review_vote');
  await supabase.from('expansion_cities').update({
    review_status: 'pending_review',
    priority: originalPriority,
  }).eq('id', cityId);
  console.log('  ✓ Test data cleaned up');

  // ── Summary ──
  console.log(`\n═══ Results: ${passed} passed, ${failed} failed ═══\n`);
  if (failed > 0) process.exit(1);
}

runTests().catch((err) => {
  console.error('FATAL:', err);
  process.exit(1);
});
