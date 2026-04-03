import type { Config, Context } from '@netlify/functions';
import { google } from 'googleapis';
import OpenAI from 'openai';
import * as crypto from 'crypto';
import { sendEmail } from '../../lib/resend';

/**
 * Google Play Reviews Monitor — Netlify Scheduled Function
 *
 * Runs daily at 8 AM ET. For each of the 3 apps:
 *  - 4–5 star reviews with no reply → Claude generates a warm reply, posts it automatically
 *  - 1–3 star reviews with no reply → Claude drafts a reply, emails leandertoney@gmail.com
 *    with a one-click approve link (valid 72 h)
 */

const APPS = [
  { packageName: 'com.tastelanc.app', displayName: 'TasteLanc' },
  { packageName: 'com.tastelanc.cumberland', displayName: 'TasteCumberland' },
  { packageName: 'com.tastelanc.fayetteville', displayName: 'TasteFayetteville' },
];

const STAR_EMOJIS: Record<number, string> = { 1: '⭐', 2: '⭐⭐', 3: '⭐⭐⭐', 4: '⭐⭐⭐⭐', 5: '⭐⭐⭐⭐⭐' };

async function getServiceAccountJson(): Promise<string> {
  const raw = process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON;
  if (raw) return raw;
  // Fallback: fetch from Supabase app_secrets (avoids Netlify 4KB Lambda env var limit)
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const res = await fetch(`${url}/rest/v1/app_secrets?key=eq.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON&select=value`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  });
  const rows = await res.json() as Array<{ value: string }>;
  if (!rows[0]?.value) throw new Error('GOOGLE_PLAY_SERVICE_ACCOUNT_JSON not found in app_secrets');
  return rows[0].value;
}

async function buildAndroidPublisher() {
  const raw = await getServiceAccountJson();
  const credentials = JSON.parse(raw);
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/androidpublisher'],
  });
  return google.androidpublisher({ version: 'v3', auth });
}

async function generateReply(
  openai: OpenAI,
  reviewText: string,
  stars: number,
  appName: string
): Promise<string> {
  const isPositive = stars >= 4;
  const prompt = isPositive
    ? `You are responding to a Google Play review for ${appName}, a local dining discovery app.
Review (${stars} stars): "${reviewText}"
Write a warm, genuine developer reply in ≤ 280 characters. Be personal, reference something specific they mentioned if possible. No hashtags. End with encouragement to keep using the app. Reply only with the text, no quotes.`
    : `You are drafting a Google Play review response for ${appName}, a local dining discovery app.
Review (${stars} stars): "${reviewText}"
Write a short, empathetic reply in ≤ 280 characters. Acknowledge their specific feedback, mention we're actively improving, and invite them to try again. No promises you can't keep. Reply only with the text, no quotes.`;

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    max_tokens: 150,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = completion.choices[0]?.message?.content?.trim() ?? '';
  // Hard-cap at 350 chars (Play Console limit)
  return text.slice(0, 350);
}

/** HMAC-SHA256 token: base64url(payload) + '.' + base64url(hmac) — expires in ttlMs */
function signToken(payload: object, ttlMs: number): string {
  const secret = process.env.CRON_SECRET!;
  const data = { ...payload, exp: Date.now() + ttlMs };
  const encoded = Buffer.from(JSON.stringify(data)).toString('base64url');
  const sig = crypto.createHmac('sha256', secret).update(encoded).digest('base64url');
  return `${encoded}.${sig}`;
}

function buildApproveUrl(packageName: string, reviewId: string, reply: string): string {
  const base = process.env.URL || 'https://tastelanc.com';
  const token = signToken({ packageName, reviewId, reply }, 72 * 60 * 60 * 1000);
  return `${base}/api/admin/play-review-reply?token=${token}`;
}

function buildApprovalEmail(
  appName: string,
  reviewerName: string,
  stars: number,
  reviewText: string,
  draftReply: string,
  approveUrl: string
): string {
  const starsDisplay = STAR_EMOJIS[stars] ?? `${stars} stars`;
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><style>
  body { font-family: -apple-system, sans-serif; max-width: 600px; margin: 40px auto; color: #1a1a1a; }
  .card { background: #f8f8f8; border-radius: 12px; padding: 20px; margin: 16px 0; }
  .review { border-left: 3px solid #e53e3e; padding-left: 16px; }
  .draft { border-left: 3px solid #38a169; padding-left: 16px; }
  .btn { display: inline-block; background: #38a169; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; margin-top: 16px; }
  .meta { font-size: 13px; color: #666; margin-bottom: 8px; }
</style></head>
<body>
  <h2>📱 New ${appName} Review Needs Your Reply</h2>
  <div class="card review">
    <div class="meta">${starsDisplay} · ${reviewerName}</div>
    <p style="margin:0">"${reviewText}"</p>
  </div>
  <h3>Suggested Reply</h3>
  <div class="card draft">
    <p style="margin:0">${draftReply}</p>
    <div class="meta" style="margin-top:8px">${draftReply.length}/350 characters</div>
  </div>
  <a class="btn" href="${approveUrl}">✅ Post This Reply</a>
  <p style="font-size: 12px; color: #999; margin-top: 24px;">
    This link expires in 72 hours. To edit the reply, go to
    <a href="https://play.google.com/console">Google Play Console</a> directly.
  </p>
</body>
</html>`;
}

export default async function handler(_req: Request, _context: Context) {
  console.log('[Google Play Reviews] Starting daily review check...');

  const androidpublisher = await buildAndroidPublisher();
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const alertEmail = process.env.REVIEW_ALERT_EMAIL || 'leandertoney@gmail.com';

  let totalAutoReplied = 0;
  let totalEmailed = 0;

  for (const app of APPS) {
    console.log(`[Google Play Reviews] Checking ${app.displayName} (${app.packageName})...`);

    let reviews: any[];
    try {
      const res = await androidpublisher.reviews.list({
        packageName: app.packageName,
        maxResults: 50,
        translationLanguage: 'en',
      });
      reviews = res.data.reviews ?? [];
    } catch (err: any) {
      // App not yet published on Play Store — skip silently
      if (err.message?.includes('Package not found') || err.code === 404) {
        console.log(`[Google Play Reviews] ${app.displayName} not found on Play Store — skipping`);
      } else {
        console.error(`[Google Play Reviews] Failed to fetch reviews for ${app.packageName}:`, err.message);
      }
      continue;
    }

    // Only unanswered reviews
    const unanswered = reviews.filter((r) => {
      const comments = r.comments ?? [];
      return !comments.some((c: any) => c.developerComment != null);
    });

    console.log(`[Google Play Reviews] ${app.displayName}: ${reviews.length} total, ${unanswered.length} unanswered`);

    for (const review of unanswered) {
      const reviewId: string = review.reviewId;
      const comments: any[] = review.comments ?? [];
      const userComment = comments.find((c: any) => c.userComment != null)?.userComment;
      if (!userComment) continue;

      const stars: number = userComment.starRating ?? 0;
      const reviewText: string = userComment.text ?? '(no text)';
      const reviewerName: string = review.authorName ?? 'A user';

      console.log(`[Google Play Reviews] Review ${reviewId}: ${stars}★ from ${reviewerName}`);

      let reply: string;
      try {
        reply = await generateReply(openai, reviewText, stars, app.displayName);
      } catch (err: any) {
        console.error(`[Google Play Reviews] Claude error for ${reviewId}:`, err.message);
        continue;
      }

      if (stars >= 4) {
        // Auto-post
        try {
          await androidpublisher.reviews.reply({
            packageName: app.packageName,
            reviewId,
            requestBody: { replyText: reply },
          });
          console.log(`[Google Play Reviews] Auto-replied to ${reviewId} (${stars}★)`);
          totalAutoReplied++;
        } catch (err: any) {
          console.error(`[Google Play Reviews] Failed to post reply for ${reviewId}:`, err.message);
        }
      } else {
        // Email for approval
        const approveUrl = buildApproveUrl(app.packageName, reviewId, reply);
        const html = buildApprovalEmail(
          app.displayName,
          reviewerName,
          stars,
          reviewText,
          reply,
          approveUrl
        );
        try {
          await sendEmail({
            to: alertEmail,
            subject: `[${app.displayName}] ${stars}★ review needs your reply — ${reviewerName}`,
            html,
          });
          console.log(`[Google Play Reviews] Emailed approval request for ${reviewId} (${stars}★)`);
          totalEmailed++;
        } catch (err: any) {
          console.error(`[Google Play Reviews] Failed to send approval email for ${reviewId}:`, err.message);
        }
      }

      // Small delay to avoid rate limiting
      await new Promise((r) => setTimeout(r, 500));
    }
  }

  console.log(`[Google Play Reviews] Done. Auto-replied: ${totalAutoReplied}, Emailed for approval: ${totalEmailed}`);

  return new Response(
    JSON.stringify({ autoReplied: totalAutoReplied, emailedForApproval: totalEmailed }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  );
}

// Daily at 8 AM ET (12 PM UTC)
export const config: Config = {
  schedule: '0 12 * * *',
};
