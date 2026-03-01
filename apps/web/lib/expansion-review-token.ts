// HMAC-SHA256 signed tokens for email-based voting on expansion cities.
// Each token encodes cityId + email + vote so links are vote-specific
// and can't be forged to cast a different vote.

import { createHmac } from 'crypto';

const SECRET = process.env.CRON_SECRET || 'expansion-review-fallback';

function getSignaturePayload(cityId: string, email: string, vote: string): string {
  return `${cityId}:${email}:${vote}`;
}

export function generateReviewToken(cityId: string, email: string, vote: string): string {
  const payload = getSignaturePayload(cityId, email, vote);
  return createHmac('sha256', SECRET).update(payload).digest('hex');
}

export function verifyReviewToken(
  token: string,
  cityId: string,
  email: string,
  vote: string
): boolean {
  const expected = generateReviewToken(cityId, email, vote);
  // Constant-time comparison to prevent timing attacks
  if (token.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < token.length; i++) {
    diff |= token.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return diff === 0;
}
