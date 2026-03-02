/**
 * Test script: Send a mock expansion review email to @in.tastelanc.com
 * to verify it routes through the inbound webhook into the dashboard inbox.
 *
 * Usage: cd apps/web && npx tsx scripts/test-expansion-inbox.ts
 */

import { Resend } from 'resend';

const RESEND_API_KEY = process.env.RESEND_API_KEY || 're_f5KMkE8W_KuXw5G82AxnPyhzTtxvPGiVG';
const resend = new Resend(RESEND_API_KEY);

const TO_EMAIL = 'leander@in.tastelanc.com';

const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin:0;padding:0;background:#0f172a;color:#e2e8f0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<div style="max-width:640px;margin:0 auto;padding:24px;">
  <div style="text-align:center;margin-bottom:24px;">
    <h1 style="color:white;font-size:22px;margin:0;">Test Expansion Review Email</h1>
    <p style="color:#64748b;font-size:13px;margin:4px 0 0;">This is a test to verify dashboard inbox routing</p>
  </div>

  <div style="background:#1e293b;border-radius:12px;padding:20px;margin-bottom:16px;">
    <div style="font-size:18px;font-weight:700;color:white;margin-bottom:12px;">Test City, PA</div>
    <div style="display:flex;gap:8px;">
      <a href="https://tastelanc.com/admin/expansion" style="flex:1;display:block;text-align:center;padding:10px;background:#166534;color:#bbf7d0;text-decoration:none;border-radius:8px;font-weight:600;font-size:13px;">Interested</a>
      <a href="https://tastelanc.com/admin/expansion" style="flex:1;display:block;text-align:center;padding:10px;background:#854d0e;color:#fef08a;text-decoration:none;border-radius:8px;font-weight:600;font-size:13px;">Not Now</a>
      <a href="https://tastelanc.com/admin/expansion" style="flex:1;display:block;text-align:center;padding:10px;background:#991b1b;color:#fecaca;text-decoration:none;border-radius:8px;font-weight:600;font-size:13px;">Reject</a>
    </div>
  </div>

  <div style="text-align:center;margin-top:24px;padding-top:16px;border-top:1px solid #1e293b;">
    <p style="color:#475569;font-size:11px;">Test email — TasteLanc Expansion Agent</p>
  </div>
</div>
</body>
</html>`;

async function main() {
  console.log(`Sending test expansion email to ${TO_EMAIL}...`);

  const result = await resend.emails.send({
    from: 'TasteLanc Expansion <expansion@tastelanc.com>',
    to: TO_EMAIL,
    subject: 'Test: Expansion Review Inbox Routing',
    html,
  });

  console.log('Resend response:', result);
  console.log('\nNext steps:');
  console.log('1. Wait ~30 seconds for Resend inbound to process');
  console.log('2. Check dashboard inbox at https://tastelanc.com/sales/inbox');
  console.log('3. Look for conversation from "TasteLanc Expansion"');
  console.log('4. Verify HTML renders with voting buttons');
}

main().catch(console.error);
