/**
 * Test the email HTML builder (buildCityReviewCard) + admin reviews API.
 * Run: cd apps/web && DOTENV_CONFIG_PATH=.env.local npx tsx scripts/test-review-email.ts
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { generateReviewToken, verifyReviewToken } from '../lib/expansion-review-token';
import { EXPANSION_TEAM, calculateConsensus } from '../config/expansion-team';

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
  console.log('\n═══ Email Builder + Admin API Tests ═══\n');

  // ── Part 1: Validate vote URLs from email builder contain correct tokens ──
  console.log('── Part 1: Email voting link integrity ──');

  // Simulate what buildCityReviewCard does: generate vote URLs
  const cityId = 'c64762c9-f29b-4958-a90b-9a53dbb29aa0'; // Madison, WI
  const baseUrl = 'https://tastelanc.com';

  for (const member of EXPANSION_TEAM) {
    const votes = ['interested', 'not_now', 'reject'] as const;
    for (const vote of votes) {
      const token = generateReviewToken(cityId, member.workEmail, vote);
      const url = `${baseUrl}/api/expansion/review?city=${cityId}&email=${encodeURIComponent(member.workEmail)}&vote=${vote}&token=${token}`;

      // Parse URL and verify round-trip
      const parsed = new URL(url);
      const pCity = parsed.searchParams.get('city')!;
      const pEmail = parsed.searchParams.get('email')!;
      const pVote = parsed.searchParams.get('vote')!;
      const pToken = parsed.searchParams.get('token')!;

      const valid = verifyReviewToken(pToken, pCity, pEmail, pVote);
      assert(`${member.name} ${vote} URL round-trips correctly`, valid);
    }
  }

  // Verify cross-member tokens don't work
  const leandersToken = generateReviewToken(cityId, 'leander@tastelanc.com', 'interested');
  assert(
    "Leander's interested token doesn't work for Jordan",
    !verifyReviewToken(leandersToken, cityId, 'jordan@tastelanc.com', 'interested')
  );

  // ── Part 2: Email HTML structure validation ──
  console.log('\n── Part 2: Email HTML link structure ──');

  // The email builder produces links like:
  // <a href=".../api/expansion/review?city=...&email=...&vote=interested&token=..."
  // Verify the URLs would actually be valid if clicked

  // Simulate a real city with research data
  const { data: realCity } = await supabase
    .from('expansion_cities')
    .select('id, city_name, state, market_potential_score, population, median_income, research_data')
    .eq('id', cityId)
    .single();

  if (realCity) {
    const rd = realCity.research_data || {};

    // Check that the research data has the fields the email template expects
    assert('City has population', typeof realCity.population === 'number');
    assert('City has market_potential_score', typeof realCity.market_potential_score === 'number');

    // Check research data fields that the email card uses
    const hasColleges = Array.isArray(rd.colleges) && rd.colleges.length > 0;
    const hasEnrollment = typeof rd.total_college_enrollment === 'number';
    const hasTourism = rd.tourism_economic_data != null;
    const hasRestaurants = typeof rd.google_places_restaurant_count === 'number' || rd.venue_breakdown != null;
    const hasCuisine = Array.isArray(rd.cuisine_distribution);

    console.log(`  Info: colleges=${hasColleges}, enrollment=${hasEnrollment}, tourism=${hasTourism}, restaurants=${hasRestaurants}, cuisine=${hasCuisine}`);
    assert('City has at least some research data', hasColleges || hasEnrollment || hasTourism || hasRestaurants);

    // Generate a token for this city and verify the vote URL format the email would produce
    for (const vote of ['interested', 'not_now', 'reject'] as const) {
      const token = generateReviewToken(realCity.id, 'leander@tastelanc.com', vote);
      const voteUrl = `${baseUrl}/api/expansion/review?city=${realCity.id}&email=${encodeURIComponent('leander@tastelanc.com')}&vote=${vote}&token=${token}`;

      // The URL must not exceed reasonable email client limits (~2000 chars)
      assert(`${vote} URL length OK (${voteUrl.length} chars)`, voteUrl.length < 500);
    }
  } else {
    console.log('  SKIP: Could not fetch test city');
  }

  // ── Part 3: Admin reviews API ──
  console.log('\n── Part 3: Admin Reviews API ──');

  // First insert some test votes
  await supabase.from('expansion_reviews').delete().eq('city_id', cityId);
  await supabase.from('expansion_reviews').upsert(
    { city_id: cityId, reviewer_email: 'leander@tastelanc.com', reviewer_name: 'Leander', vote: 'interested', voted_at: new Date().toISOString() },
    { onConflict: 'city_id,reviewer_email' }
  );
  await supabase.from('expansion_reviews').upsert(
    { city_id: cityId, reviewer_email: 'jordan@tastelanc.com', reviewer_name: 'Jordan', vote: 'not_now', voted_at: new Date().toISOString() },
    { onConflict: 'city_id,reviewer_email' }
  );

  // Hit the admin API (will return 401 since we're not authenticated as admin)
  const res = await fetch(`${BASE}/api/admin/expansion/reviews`);
  assert('Admin API returns 401 when unauthenticated', res.status === 401);

  // Verify the data is in the DB directly
  const { data: reviews } = await supabase
    .from('expansion_reviews')
    .select('*')
    .eq('city_id', cityId)
    .order('reviewer_email', { ascending: true });

  assert('Two reviews exist in DB', (reviews?.length || 0) === 2);

  if (reviews && reviews.length === 2) {
    const leander = reviews.find((r: any) => r.reviewer_email === 'leander@tastelanc.com');
    const jordan = reviews.find((r: any) => r.reviewer_email === 'jordan@tastelanc.com');
    assert('Leander review is "interested"', leander?.vote === 'interested');
    assert('Jordan review is "not_now"', jordan?.vote === 'not_now');
  }

  // ── Part 4: Consensus edge cases via HTTP ──
  console.log('\n── Part 4: Consensus state transitions via HTTP ──');

  // Clean slate
  await supabase.from('expansion_reviews').delete().eq('city_id', cityId);
  await supabase.from('expansion_cities').update({ review_status: 'pending_review' }).eq('id', cityId);

  // Vote 1: Leander → interested (should stay pending)
  const t1 = generateReviewToken(cityId, 'leander@tastelanc.com', 'interested');
  await fetch(`${BASE}/api/expansion/review?city=${cityId}&email=${encodeURIComponent('leander@tastelanc.com')}&vote=interested&token=${t1}`);

  const { data: c1 } = await supabase.from('expansion_cities').select('review_status').eq('id', cityId).single();
  assert('After 1 vote: still pending_review', c1?.review_status === 'pending_review');

  // Vote 2: Jordan → not_now (should be split_decision)
  const t2 = generateReviewToken(cityId, 'jordan@tastelanc.com', 'not_now');
  await fetch(`${BASE}/api/expansion/review?city=${cityId}&email=${encodeURIComponent('jordan@tastelanc.com')}&vote=not_now&token=${t2}`);

  const { data: c2 } = await supabase.from('expansion_cities').select('review_status').eq('id', cityId).single();
  assert('Split votes → split_decision', c2?.review_status === 'split_decision');

  // Jordan changes to interested (should be consensus_interested)
  const t3 = generateReviewToken(cityId, 'jordan@tastelanc.com', 'interested');
  await fetch(`${BASE}/api/expansion/review?city=${cityId}&email=${encodeURIComponent('jordan@tastelanc.com')}&vote=interested&token=${t3}`);

  const { data: c3 } = await supabase.from('expansion_cities').select('review_status').eq('id', cityId).single();
  assert('Both interested → consensus_interested', c3?.review_status === 'consensus_interested');

  // Leander changes to reject (should be split_decision again)
  const t4 = generateReviewToken(cityId, 'leander@tastelanc.com', 'reject');
  await fetch(`${BASE}/api/expansion/review?city=${cityId}&email=${encodeURIComponent('leander@tastelanc.com')}&vote=reject&token=${t4}`);

  const { data: c4 } = await supabase.from('expansion_cities').select('review_status').eq('id', cityId).single();
  assert('Reject vs interested → split_decision', c4?.review_status === 'split_decision');

  // Jordan changes to reject too (consensus_reject)
  const t5 = generateReviewToken(cityId, 'jordan@tastelanc.com', 'reject');
  await fetch(`${BASE}/api/expansion/review?city=${cityId}&email=${encodeURIComponent('jordan@tastelanc.com')}&vote=reject&token=${t5}`);

  const { data: c5 } = await supabase.from('expansion_cities').select('review_status').eq('id', cityId).single();
  assert('Both reject → consensus_reject', c5?.review_status === 'consensus_reject');

  // ── Cleanup ──
  console.log('\n── Cleanup ──');
  await supabase.from('expansion_reviews').delete().eq('city_id', cityId);
  await supabase.from('expansion_activity_log').delete().eq('city_id', cityId).eq('action', 'review_vote');
  await supabase.from('expansion_cities').update({ review_status: 'pending_review' }).eq('id', cityId);
  console.log('  ✓ Test data cleaned up');

  // ── Summary ──
  console.log(`\n═══ Results: ${passed} passed, ${failed} failed ═══\n`);
  if (failed > 0) process.exit(1);
}

runTests().catch((err) => {
  console.error('FATAL:', err);
  process.exit(1);
});
