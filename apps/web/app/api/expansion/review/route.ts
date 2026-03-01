// Token-verified vote endpoint for expansion city reviews.
// No login required — HMAC-signed links from email.
// GET /api/expansion/review?city=<id>&email=<email>&vote=<vote>&token=<hmac>

import { NextRequest } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { verifyReviewToken } from '@/lib/expansion-review-token';
import { calculateConsensus, getTeamMember } from '@/config/expansion-team';
import type { ReviewVote } from '@/config/expansion-team';

const VALID_VOTES: ReviewVote[] = ['interested', 'not_now', 'reject'];

const VOTE_LABELS: Record<ReviewVote, string> = {
  interested: 'Interested',
  not_now: 'Not Now',
  reject: 'Reject',
};

const VOTE_COLORS: Record<ReviewVote, string> = {
  interested: '#22c55e',
  not_now: '#eab308',
  reject: '#ef4444',
};

function htmlResponse(body: string, status = 200) {
  return new Response(body, {
    status,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}

function errorPage(title: string, message: string) {
  return htmlResponse(`
    <!DOCTYPE html>
    <html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${title} — TasteLanc Expansion</title>
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #0f172a; color: #e2e8f0; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; }
      .card { background: #1e293b; border-radius: 16px; padding: 40px; max-width: 480px; text-align: center; }
      h1 { color: #f87171; margin-bottom: 12px; }
      p { color: #94a3b8; line-height: 1.6; }
    </style></head><body>
    <div class="card"><h1>${title}</h1><p>${message}</p></div>
    </body></html>
  `, 400);
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const cityId = searchParams.get('city');
  const email = searchParams.get('email');
  const vote = searchParams.get('vote') as ReviewVote | null;
  const token = searchParams.get('token');

  // Validate params
  if (!cityId || !email || !vote || !token) {
    return errorPage('Missing Parameters', 'This voting link is incomplete. Please use the link from your email.');
  }

  if (!VALID_VOTES.includes(vote)) {
    return errorPage('Invalid Vote', `"${vote}" is not a valid vote option.`);
  }

  // Verify HMAC token
  if (!verifyReviewToken(token, cityId, email, vote)) {
    return errorPage('Invalid Token', 'This voting link has been tampered with or is invalid.');
  }

  // Find team member
  const member = getTeamMember(email);
  const reviewerName = member?.name || email.split('@')[0];

  const supabase = createServiceRoleClient();

  // Verify city exists
  const { data: city, error: cityError } = await supabase
    .from('expansion_cities')
    .select('id, city_name, state, market_potential_score')
    .eq('id', cityId)
    .single();

  if (cityError || !city) {
    return errorPage('City Not Found', 'This expansion city no longer exists in the pipeline.');
  }

  // Upsert vote (insert or update if already voted)
  const { error: voteError } = await supabase
    .from('expansion_reviews')
    .upsert(
      {
        city_id: cityId,
        reviewer_email: email,
        reviewer_name: reviewerName,
        vote,
        voted_at: new Date().toISOString(),
      },
      { onConflict: 'city_id,reviewer_email' }
    );

  if (voteError) {
    console.error('[expansion-review] Vote upsert error:', voteError);
    return errorPage('Vote Failed', 'There was an error recording your vote. Please try again.');
  }

  // Fetch all votes for this city to calculate consensus
  const { data: allVotes } = await supabase
    .from('expansion_reviews')
    .select('reviewer_email, vote')
    .eq('city_id', cityId);

  const { status: reviewStatus, priorityDelta } = calculateConsensus(
    (allVotes || []).map(v => ({ reviewer_email: v.reviewer_email, vote: v.vote as ReviewVote }))
  );

  // Update city review_status and priority
  const updatePayload: Record<string, unknown> = { review_status: reviewStatus };
  if (priorityDelta !== 0) {
    // Fetch current priority to apply delta
    const { data: currentCity } = await supabase
      .from('expansion_cities')
      .select('priority')
      .eq('id', cityId)
      .single();
    if (currentCity) {
      updatePayload.priority = Math.max(0, (currentCity.priority || 5) + priorityDelta);
    }
  }

  await supabase
    .from('expansion_cities')
    .update(updatePayload)
    .eq('id', cityId);

  // Log activity
  await supabase.from('expansion_activity_log').insert({
    city_id: cityId,
    action: 'review_vote',
    description: `${reviewerName} voted "${VOTE_LABELS[vote]}" on ${city.city_name}, ${city.state}`,
    metadata: { reviewer_email: email, vote, review_status: reviewStatus },
  });

  // Build vote tally display
  const voteTally = (allVotes || []).map(v => {
    const m = getTeamMember(v.reviewer_email);
    const name = m?.name || v.reviewer_email.split('@')[0];
    const voteLabel = VOTE_LABELS[v.vote as ReviewVote] || v.vote;
    const color = VOTE_COLORS[v.vote as ReviewVote] || '#94a3b8';
    return `<div style="display:flex;align-items:center;gap:8px;padding:8px 0;">
      <span style="width:10px;height:10px;border-radius:50%;background:${color};display:inline-block;"></span>
      <strong>${name}</strong> — ${voteLabel}
    </div>`;
  }).join('');

  const consensusMessage = reviewStatus === 'consensus_interested'
    ? '<div style="background:#166534;color:#bbf7d0;padding:12px 16px;border-radius:8px;margin-top:16px;">Both founders are interested — this city will be fast-tracked!</div>'
    : reviewStatus === 'consensus_not_now'
    ? '<div style="background:#854d0e;color:#fef08a;padding:12px 16px;border-radius:8px;margin-top:16px;">Both agreed to deprioritize — this city has been moved down the list.</div>'
    : reviewStatus === 'consensus_reject'
    ? '<div style="background:#991b1b;color:#fecaca;padding:12px 16px;border-radius:8px;margin-top:16px;">Both agreed to reject — this city has been deprioritized significantly.</div>'
    : reviewStatus === 'split_decision'
    ? '<div style="background:#1e3a5f;color:#93c5fd;padding:12px 16px;border-radius:8px;margin-top:16px;">Split decision — discuss this one with your co-founder.</div>'
    : '';

  const dashboardUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://tastelanc.com'}/admin/expansion/${cityId}`;

  return htmlResponse(`
    <!DOCTYPE html>
    <html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Vote Recorded — TasteLanc Expansion</title>
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #0f172a; color: #e2e8f0; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 20px; }
      .card { background: #1e293b; border-radius: 16px; padding: 40px; max-width: 520px; width: 100%; }
      h1 { margin: 0 0 8px; font-size: 24px; }
      .subtitle { color: #94a3b8; margin-bottom: 24px; }
      .vote-badge { display: inline-block; padding: 6px 16px; border-radius: 20px; font-weight: 600; font-size: 14px; color: white; }
      .city-name { font-size: 20px; font-weight: 600; margin-bottom: 4px; }
      .city-score { color: #94a3b8; font-size: 14px; }
      .divider { border: none; border-top: 1px solid #334155; margin: 20px 0; }
      .tally-title { font-size: 14px; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 8px; }
      .dashboard-link { display: inline-block; margin-top: 20px; padding: 10px 24px; background: #3b82f6; color: white; text-decoration: none; border-radius: 8px; font-weight: 500; }
      .dashboard-link:hover { background: #2563eb; }
    </style></head><body>
    <div class="card">
      <h1>Thanks, ${reviewerName}!</h1>
      <p class="subtitle">Your vote has been recorded.</p>

      <div style="background:#0f172a;border-radius:12px;padding:20px;margin-bottom:20px;">
        <div class="city-name">${city.city_name}, ${city.state}</div>
        <div class="city-score">Market Score: ${city.market_potential_score || 'N/A'}/100</div>
        <div style="margin-top:12px;">
          <span class="vote-badge" style="background:${VOTE_COLORS[vote]};">
            Your vote: ${VOTE_LABELS[vote]}
          </span>
        </div>
      </div>

      <hr class="divider">

      <div class="tally-title">Team Votes</div>
      ${voteTally}

      ${consensusMessage}

      <div style="text-align:center;margin-top:24px;">
        <a href="${dashboardUrl}" class="dashboard-link">View Full Details</a>
      </div>
    </div>
    </body></html>
  `);
}
