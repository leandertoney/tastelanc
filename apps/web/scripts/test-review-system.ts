/**
 * End-to-end test for the collaborative review system.
 * Tests: DB operations, upsert, consensus, token flow, edge cases.
 * Run: npx tsx scripts/test-review-system.ts
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { generateReviewToken, verifyReviewToken } from '../lib/expansion-review-token';
import { calculateConsensus, EXPANSION_TEAM } from '../config/expansion-team';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

const TEST_CITY_ID = 'c64762c9-f29b-4958-a90b-9a53dbb29aa0'; // Madison, WI
const LEANDER_EMAIL = 'leander@tastelanc.com';
const JORDAN_EMAIL = 'jordan@tastelanc.com';

let passed = 0;
let failed = 0;

function assert(label: string, condition: boolean) {
  if (condition) {
    console.log(`  ✓ ${label}`);
    passed++;
  } else {
    console.log(`  ✗ FAIL: ${label}`);
    failed++;
  }
}

async function runTests() {
  console.log('\n═══ Review System E2E Tests ═══\n');

  // ── Phase 1: Database CRUD ──
  console.log('── Phase 1: Database CRUD ──');

  // Clean up
  await supabase.from('expansion_reviews').delete().eq('city_id', TEST_CITY_ID);

  // Insert Leander's vote
  const { error: e1 } = await supabase.from('expansion_reviews').upsert(
    {
      city_id: TEST_CITY_ID,
      reviewer_email: LEANDER_EMAIL,
      reviewer_name: 'Leander',
      vote: 'interested',
      voted_at: new Date().toISOString(),
    },
    { onConflict: 'city_id,reviewer_email' }
  );
  assert('Insert Leander vote', !e1);

  // Verify stored
  const { data: check1 } = await supabase
    .from('expansion_reviews')
    .select('*')
    .eq('city_id', TEST_CITY_ID)
    .eq('reviewer_email', LEANDER_EMAIL)
    .single();
  assert('Vote stored correctly', check1?.vote === 'interested' && check1?.reviewer_name === 'Leander');

  // Insert Jordan's vote
  const { error: e2 } = await supabase.from('expansion_reviews').upsert(
    {
      city_id: TEST_CITY_ID,
      reviewer_email: JORDAN_EMAIL,
      reviewer_name: 'Jordan',
      vote: 'not_now',
      voted_at: new Date().toISOString(),
    },
    { onConflict: 'city_id,reviewer_email' }
  );
  assert('Insert Jordan vote', !e2);

  // ── Phase 2: Consensus calculation from DB data ──
  console.log('\n── Phase 2: Consensus from DB ──');

  const { data: votes1 } = await supabase
    .from('expansion_reviews')
    .select('reviewer_email, vote')
    .eq('city_id', TEST_CITY_ID);

  const consensus1 = calculateConsensus(
    (votes1 || []).map((v) => ({ reviewer_email: v.reviewer_email, vote: v.vote }))
  );
  assert('Split decision (interested vs not_now)', consensus1.status === 'split_decision');
  assert('No priority change on split', consensus1.priorityDelta === 0);

  // ── Phase 3: Upsert (vote change) ──
  console.log('\n── Phase 3: Upsert behavior ──');

  const { error: e3 } = await supabase.from('expansion_reviews').upsert(
    {
      city_id: TEST_CITY_ID,
      reviewer_email: LEANDER_EMAIL,
      reviewer_name: 'Leander',
      vote: 'not_now', // Changed from interested to not_now
      voted_at: new Date().toISOString(),
    },
    { onConflict: 'city_id,reviewer_email' }
  );
  assert('Upsert (change vote)', !e3);

  const { data: allVotes, count } = await supabase
    .from('expansion_reviews')
    .select('*', { count: 'exact' })
    .eq('city_id', TEST_CITY_ID);

  assert('No duplicate rows (count = 2)', count === 2);

  const leanderVote = allVotes?.find((v) => v.reviewer_email === LEANDER_EMAIL);
  assert('Vote actually updated to not_now', leanderVote?.vote === 'not_now');

  const consensus2 = calculateConsensus(
    (allVotes || []).map((v) => ({ reviewer_email: v.reviewer_email, vote: v.vote }))
  );
  assert('Consensus: both not_now', consensus2.status === 'consensus_not_now');
  assert('Priority delta = -3', consensus2.priorityDelta === -3);

  // ── Phase 4: Update city review_status ──
  console.log('\n── Phase 4: City review_status ──');

  const { data: cityBefore } = await supabase
    .from('expansion_cities')
    .select('priority, review_status')
    .eq('id', TEST_CITY_ID)
    .single();

  const oldPriority = cityBefore?.priority || 5;

  const { error: e4 } = await supabase
    .from('expansion_cities')
    .update({
      review_status: consensus2.status,
      priority: Math.max(0, oldPriority + consensus2.priorityDelta),
    })
    .eq('id', TEST_CITY_ID);
  assert('Update review_status on city', !e4);

  const { data: cityAfter } = await supabase
    .from('expansion_cities')
    .select('review_status, priority')
    .eq('id', TEST_CITY_ID)
    .single();
  assert('review_status = consensus_not_now', cityAfter?.review_status === 'consensus_not_now');
  assert('Priority decreased by 3', cityAfter?.priority === Math.max(0, oldPriority - 3));

  // ── Phase 5: Activity log ──
  console.log('\n── Phase 5: Activity log ──');

  const { error: e5 } = await supabase.from('expansion_activity_log').insert({
    city_id: TEST_CITY_ID,
    action: 'review_vote',
    description: 'Leander voted "Not Now" on Madison, WI',
    metadata: {
      reviewer_email: LEANDER_EMAIL,
      vote: 'not_now',
      review_status: 'consensus_not_now',
    },
  });
  assert('Activity log insert', !e5);

  // ── Phase 6: Token + vote URL flow ──
  console.log('\n── Phase 6: Token URL flow ──');

  const token = generateReviewToken(TEST_CITY_ID, LEANDER_EMAIL, 'interested');
  assert('Token generated (64 hex chars)', token.length === 64 && /^[0-9a-f]+$/.test(token));
  assert('Token verifies', verifyReviewToken(token, TEST_CITY_ID, LEANDER_EMAIL, 'interested'));
  assert('Wrong vote fails', !verifyReviewToken(token, TEST_CITY_ID, LEANDER_EMAIL, 'reject'));
  assert('Wrong email fails', !verifyReviewToken(token, TEST_CITY_ID, JORDAN_EMAIL, 'interested'));

  // Build URL same way the email does
  const baseUrl = 'https://tastelanc.com';
  const voteUrl = `${baseUrl}/api/expansion/review?city=${TEST_CITY_ID}&email=${encodeURIComponent(LEANDER_EMAIL)}&vote=interested&token=${token}`;
  assert('Vote URL constructed', voteUrl.includes('city=') && voteUrl.includes('token='));

  // Parse it back and verify
  const parsed = new URL(voteUrl);
  const parsedCity = parsed.searchParams.get('city');
  const parsedEmail = parsed.searchParams.get('email');
  const parsedVote = parsed.searchParams.get('vote');
  const parsedToken = parsed.searchParams.get('token');
  assert('URL round-trips city', parsedCity === TEST_CITY_ID);
  assert('URL round-trips email', parsedEmail === LEANDER_EMAIL);
  assert('URL round-trips vote', parsedVote === 'interested');
  assert('URL token verifies after round-trip', verifyReviewToken(parsedToken || '', parsedCity || '', parsedEmail || '', parsedVote || ''));

  // ── Phase 7: Edge cases ──
  console.log('\n── Phase 7: Edge cases ──');

  // Non-existent city vote
  const { error: e6 } = await supabase.from('expansion_reviews').upsert(
    {
      city_id: '00000000-0000-0000-0000-000000000000',
      reviewer_email: LEANDER_EMAIL,
      reviewer_name: 'Leander',
      vote: 'interested',
      voted_at: new Date().toISOString(),
    },
    { onConflict: 'city_id,reviewer_email' }
  );
  assert('FK constraint blocks bad city_id', !!e6);

  // Invalid vote value via SQL constraint
  const { error: e7 } = await supabase.from('expansion_reviews').upsert(
    {
      city_id: TEST_CITY_ID,
      reviewer_email: 'test@test.com',
      reviewer_name: 'Test',
      vote: 'invalid_vote' as any,
      voted_at: new Date().toISOString(),
    },
    { onConflict: 'city_id,reviewer_email' }
  );
  assert('CHECK constraint blocks invalid vote', !!e7);

  // Invalid review_status on city
  const { error: e8 } = await supabase
    .from('expansion_cities')
    .update({ review_status: 'invalid_status' as any })
    .eq('id', TEST_CITY_ID);
  assert('CHECK constraint blocks invalid review_status', !!e8);

  // ── Cleanup ──
  console.log('\n── Cleanup ──');
  await supabase.from('expansion_reviews').delete().eq('city_id', TEST_CITY_ID);
  await supabase
    .from('expansion_cities')
    .update({ review_status: 'pending_review', priority: oldPriority })
    .eq('id', TEST_CITY_ID);
  await supabase
    .from('expansion_activity_log')
    .delete()
    .eq('city_id', TEST_CITY_ID)
    .eq('action', 'review_vote');
  console.log('  ✓ Test data cleaned up');

  // ── Summary ──
  console.log(`\n═══ Results: ${passed} passed, ${failed} failed ═══\n`);
  if (failed > 0) process.exit(1);
}

runTests().catch((err) => {
  console.error('FATAL:', err);
  process.exit(1);
});
