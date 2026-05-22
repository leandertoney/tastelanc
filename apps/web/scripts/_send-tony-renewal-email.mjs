// Sends Tony's consolidated Q2 renewal invoice email via Resend.
// Run: node scripts/_send-tony-renewal-email.mjs --apply
import { config } from 'dotenv';
import { Resend } from 'resend';
config({ path: new URL('../.env.local', import.meta.url) });

const resend = new Resend(process.env.RESEND_API_KEY);
const APPLY = process.argv.includes('--apply');

const TO = 'tony@triobarandgrill.com';
const FROM = 'TasteLanc Billing <partners@tastelanc.com>';
const REPLY_TO = 'info@tastelanc.com';
const CC = ['info@tastelanc.com'];
const BCC = ['leandertoney@gmail.com'];
const SUBJECT = 'Invoice #HTYJ2DQR-0011 — TasteLanc Q2 Renewal ($600.00)';
const INVOICE_URL = 'https://invoice.stripe.com/i/acct_1SZg5wLikRpMKEPP/live_YWNjdF8xU1pnNXdMaWtScE1LRVBQLF9VU1B1SEpWazlFeDJ4eFFvUldOaUVjRUtvVU9GWWZpLDE2ODQ3NDkxNA0200GrXWIdqZ?s=ap';

const html = `<!DOCTYPE html>
<html>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #1a1a1a; line-height: 1.5;">
  <div style="border-bottom: 2px solid #c41e3a; padding-bottom: 12px; margin-bottom: 24px;">
    <h1 style="margin: 0; font-size: 22px; color: #1a1a1a;">TasteLanc Billing</h1>
    <div style="font-size: 13px; color: #666; margin-top: 4px;">Invoice #HTYJ2DQR-0011</div>
  </div>

  <p>Hi Tony,</p>

  <p>Your TasteLanc Q2 2026 renewal is ready. To keep all 5 of your accounts active, please confirm your card on the consolidated invoice below — same rate as your original signup ($200 × 3 quarterly subscriptions).</p>

  <div style="background: #f7f7f7; border-radius: 8px; padding: 20px; margin: 24px 0;">
    <div style="font-size: 13px; color: #666; text-transform: uppercase; letter-spacing: 0.5px;">Amount Due</div>
    <div style="font-size: 32px; font-weight: 600; margin: 4px 0 16px 0;">$600.00</div>

    <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
      <thead>
        <tr style="border-bottom: 1px solid #ddd;">
          <th align="left" style="padding: 8px 0; color: #666; font-weight: 500;">Location</th>
          <th align="left" style="padding: 8px 0; color: #666; font-weight: 500;">Period</th>
          <th align="right" style="padding: 8px 0; color: #666; font-weight: 500;">Amount</th>
        </tr>
      </thead>
      <tbody>
        <tr style="border-bottom: 1px solid #eee;">
          <td style="padding: 10px 0;">Antonio's Pizza House</td>
          <td style="padding: 10px 0;">May 4 – Aug 4, 2026</td>
          <td align="right" style="padding: 10px 0;">$200.00</td>
        </tr>
        <tr style="border-bottom: 1px solid #eee;">
          <td style="padding: 10px 0;">Queen Street Bistro</td>
          <td style="padding: 10px 0;">May 4 – Aug 4, 2026</td>
          <td align="right" style="padding: 10px 0;">$200.00</td>
        </tr>
        <tr>
          <td style="padding: 10px 0;">Josie's Pub</td>
          <td style="padding: 10px 0;">May 4 – Aug 4, 2026</td>
          <td align="right" style="padding: 10px 0;">$200.00</td>
        </tr>
      </tbody>
    </table>
  </div>

  <div style="text-align: center; margin: 32px 0;">
    <a href="${INVOICE_URL}" style="display: inline-block; background: #c41e3a; color: white; padding: 14px 32px; border-radius: 6px; text-decoration: none; font-weight: 600; font-size: 16px;">View and pay invoice</a>
  </div>

  <p style="color: #555; font-size: 14px;">Trio Bar and Grill and The Bunker at Crossgates are on annual plans through February 2027 — once you confirm your card here, those will renew automatically too. No further action needed.</p>

  <hr style="border: none; border-top: 1px solid #eee; margin: 32px 0 16px 0;">

  <p style="color: #888; font-size: 12px; margin: 0;">
    TasteLanc Billing<br>
    <a href="mailto:info@tastelanc.com" style="color: #888;">info@tastelanc.com</a>
  </p>
</body>
</html>`;

const text = `Hi Tony,

Your TasteLanc Q2 2026 renewal is ready. To keep all 5 of your accounts active, please confirm your card on the consolidated invoice below — same rate as your original signup ($200 × 3 quarterly subscriptions).

Invoice #HTYJ2DQR-0011
Amount due: $600.00

  Antonio's Pizza House  | May 4 – Aug 4, 2026 | $200.00
  Queen Street Bistro    | May 4 – Aug 4, 2026 | $200.00
  Josie's Pub            | May 4 – Aug 4, 2026 | $200.00

View and pay: ${INVOICE_URL}

Trio Bar and Grill and The Bunker at Crossgates are on annual plans through February 2027 — once you confirm your card here, those will renew automatically too. No further action needed.

— TasteLanc Billing
info@tastelanc.com`;

console.log(`MODE: ${APPLY ? '🔴 SENDING' : 'DRY RUN — preview only'}\n`);
console.log(`From:    ${FROM}`);
console.log(`To:      ${TO}`);
console.log(`CC:      ${CC.join(', ')}`);
console.log(`BCC:     ${BCC.join(', ')}`);
console.log(`Reply-to: ${REPLY_TO}`);
console.log(`Subject: ${SUBJECT}`);
console.log();

if (!APPLY) {
  console.log('--- TEXT VERSION ---');
  console.log(text);
  console.log('\nDRY RUN — re-run with --apply');
  process.exit(0);
}

const result = await resend.emails.send({
  from: FROM,
  to: [TO],
  cc: CC,
  bcc: BCC,
  replyTo: REPLY_TO,
  subject: SUBJECT,
  html,
  text,
});

if (result.error) {
  console.error('❌ Send failed:', result.error);
  process.exit(1);
}
console.log('✅ Sent:', result.data?.id);
