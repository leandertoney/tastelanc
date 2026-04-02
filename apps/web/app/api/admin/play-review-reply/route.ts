import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import * as crypto from 'crypto';

/**
 * One-click Google Play review reply approval endpoint.
 *
 * GET /api/admin/play-review-reply?token=<signed-token>
 *
 * The token is an HMAC-SHA256 signed payload (created by the google-play-reviews
 * Netlify function) containing { packageName, reviewId, reply, exp }.
 * Valid for 72 hours.
 */

function buildAndroidPublisher() {
  const raw = process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON;
  if (!raw) throw new Error('GOOGLE_PLAY_SERVICE_ACCOUNT_JSON not set');
  const credentials = JSON.parse(raw);
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/androidpublisher'],
  });
  return google.androidpublisher({ version: 'v3', auth });
}

function verifyToken(token: string): { packageName: string; reviewId: string; reply: string } | null {
  try {
    const secret = process.env.CRON_SECRET!;
    const [encoded, sig] = token.split('.');
    if (!encoded || !sig) return null;

    const expectedSig = crypto.createHmac('sha256', secret).update(encoded).digest('base64url');
    const sigBuf = Buffer.from(sig);
    const expectedBuf = Buffer.from(expectedSig);
    if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) return null;

    const data = JSON.parse(Buffer.from(encoded, 'base64url').toString());
    if (Date.now() > data.exp) return null;

    const { packageName, reviewId, reply } = data;
    if (!packageName || !reviewId || !reply) return null;
    return { packageName, reviewId, reply };
  } catch {
    return null;
  }
}

function htmlPage(title: string, message: string, isError = false): Response {
  const color = isError ? '#e53e3e' : '#38a169';
  const icon = isError ? '❌' : '✅';
  return new Response(
    `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>${title}</title>
<style>body{font-family:-apple-system,sans-serif;max-width:500px;margin:80px auto;text-align:center;color:#1a1a1a}
h1{color:${color};font-size:2rem}p{color:#555;font-size:1.1rem}
a{color:#3182ce;text-decoration:none}</style></head>
<body>
  <h1>${icon} ${title}</h1>
  <p>${message}</p>
  <p><a href="https://play.google.com/console">Go to Play Console →</a></p>
</body>
</html>`,
    { status: isError ? 400 : 200, headers: { 'Content-Type': 'text/html' } }
  );
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token');

  if (!token) {
    return htmlPage('Invalid Link', 'This approval link is missing required information.', true);
  }

  const payload = verifyToken(token);
  if (!payload) {
    return htmlPage('Link Expired or Invalid', 'This approval link has expired or is invalid. Please check Google Play Console directly.', true);
  }

  const { packageName, reviewId, reply } = payload;

  try {
    const androidpublisher = buildAndroidPublisher();
    await androidpublisher.reviews.reply({
      packageName,
      reviewId,
      requestBody: { replyText: reply },
    });

    return htmlPage(
      'Reply Posted!',
      `Your response has been published to Google Play for <strong>${packageName}</strong>.<br><br><em>"${reply}"</em>`
    );
  } catch (err: any) {
    console.error('[play-review-reply] Failed to post reply:', err.message);
    // If reply already exists, treat as success
    if (err.message?.includes('already replied') || err.code === 429) {
      return htmlPage('Already Replied', 'A reply has already been posted for this review.');
    }
    return htmlPage(
      'Failed to Post Reply',
      `Something went wrong: ${err.message}. Please reply manually in <a href="https://play.google.com/console">Play Console</a>.`,
      true
    );
  }
}
