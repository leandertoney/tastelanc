/**
 * Round 4: Edge cases — HTML formatting without links/images.
 * Tracking DISABLED on tastelanc.com.
 *
 * We know: clean HTML text = Primary, links/images = Promotions.
 * Now testing: styled text, bold, colors, structured signature.
 *
 * Usage: cd apps/web && npx tsx scripts/test-primary-tab.ts [test-number]
 */

import { Resend } from 'resend';

const RESEND_API_KEY = process.env.RESEND_API_KEY || 're_f5KMkE8W_KuXw5G82AxnPyhzTtxvPGiVG';
const resend = new Resend(RESEND_API_KEY);

const TO = 'leandertoney@gmail.com';
const FROM = 'Leander <leander@tastelanc.com>';
const REPLY_TO = 'leander@in.tastelanc.com';

const BODY_PARAGRAPHS = `<p style="margin:0 0 14px 0;">I came across your restaurant and wanted to reach out. We run TasteLanc — a local app here in Lancaster that helps people find great spots for happy hours and specials.</p>
<p style="margin:0 0 14px 0;">I'd love to get your place listed. There's no cost involved, and it takes about 5 minutes to set up. A few restaurants on your block are already on there.</p>
<p style="margin:0 0 14px 0;">Would you be open to a quick chat this week?</p>`;

const BODY_TEXT = `I came across your restaurant and wanted to reach out. We run TasteLanc — a local app here in Lancaster that helps people find great spots for happy hours and specials.

I'd love to get your place listed. There's no cost involved, and it takes about 5 minutes to set up. A few restaurants on your block are already on there.

Would you be open to a quick chat this week?`;

interface Test {
  id: number;
  label: string;
  subject: string;
  html?: string;
  text?: string;
}

const tests: Test[] = [
  // 30. HTML with bold + styled signature (no links, no images)
  {
    id: 30,
    label: 'HTML + bold text + styled signature',
    subject: 'Test 30 — styled text no links',
    html: `<!DOCTYPE html>
<html><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:20px;background:#ffffff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:15px;color:#1a1a1a;line-height:1.6;">
<p style="margin:0 0 14px 0;">Hello,</p>
<p style="margin:0 0 14px 0;">I came across your restaurant and wanted to reach out. We run <strong>TasteLanc</strong> — a local app here in Lancaster that helps people find great spots for happy hours and specials.</p>
<p style="margin:0 0 14px 0;">I'd love to get your place listed. There's <strong>no cost</strong> involved, and it takes about 5 minutes to set up. A few restaurants on your block are already on there.</p>
<p style="margin:0 0 14px 0;">Would you be open to a quick chat this week?</p>
<p style="margin:28px 0 0 0;font-size:13px;color:#666666;">—<br><strong>Leander Toney</strong><br>Founder, TasteLanc<br>Lancaster, PA</p>
</body></html>`,
    text: `Hello,\n\n${BODY_TEXT}\n\n--\nLeander Toney\nFounder, TasteLanc\nLancaster, PA`,
  },

  // 31. HTML with branded accent color on signature name
  {
    id: 31,
    label: 'HTML + brand-colored signature name (#A41E22)',
    subject: 'Test 31 — branded sig color',
    html: `<!DOCTYPE html>
<html><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:20px;background:#ffffff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:15px;color:#1a1a1a;line-height:1.6;">
<p style="margin:0 0 14px 0;">Hello,</p>
${BODY_PARAGRAPHS}
<p style="margin:28px 0 0 0;padding-top:14px;border-top:1px solid #e5e5e5;font-size:13px;color:#666666;">
<strong style="color:#A41E22;font-size:14px;">Leander Toney</strong><br>
Founder · TasteLanc<br>
Lancaster, PA</p>
</body></html>`,
    text: `Hello,\n\n${BODY_TEXT}\n\n--\nLeander Toney\nFounder · TasteLanc\nLancaster, PA`,
  },

  // 32. HTML with bullet points (no links, no images)
  {
    id: 32,
    label: 'HTML + bullet list (no links)',
    subject: 'Test 32 — bullets no links',
    html: `<!DOCTYPE html>
<html><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:20px;background:#ffffff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:15px;color:#1a1a1a;line-height:1.6;">
<p style="margin:0 0 14px 0;">Hello,</p>
<p style="margin:0 0 14px 0;">I came across your restaurant and wanted to reach out. We run <strong>TasteLanc</strong> — a local app here in Lancaster. Here's what a free listing gets you:</p>
<ul style="margin:0 0 14px 0;padding-left:20px;">
<li>Happy hour & specials visibility to thousands of locals</li>
<li>Event promotion to our growing community</li>
<li>AI-powered recommendations that drive foot traffic</li>
<li>A dedicated profile page for your restaurant</li>
</ul>
<p style="margin:0 0 14px 0;">No cost, takes about 5 minutes. Would you be open to a quick chat this week?</p>
<p style="margin:28px 0 0 0;font-size:13px;color:#666666;">—<br><strong>Leander Toney</strong><br>Founder, TasteLanc<br>Lancaster, PA</p>
</body></html>`,
    text: `Hello,\n\n${BODY_TEXT}\n\n--\nLeander Toney\nFounder, TasteLanc\nLancaster, PA`,
  },

  // 33. HTML + bare URL as text (not wrapped in <a> tag — Gmail auto-links it)
  {
    id: 33,
    label: 'HTML + bare URL as text (no <a> tag)',
    subject: 'Test 33 — bare URL in HTML',
    html: `<!DOCTYPE html>
<html><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:20px;background:#ffffff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:15px;color:#1a1a1a;line-height:1.6;">
<p style="margin:0 0 14px 0;">Hello,</p>
${BODY_PARAGRAPHS}
<p style="margin:0 0 14px 0;">Take a look: tastelanc.com</p>
<p style="margin:28px 0 0 0;font-size:13px;color:#666666;">—<br>Leander Toney<br>Founder, TasteLanc<br>Lancaster, PA</p>
</body></html>`,
    text: `Hello,\n\n${BODY_TEXT}\n\nTake a look: tastelanc.com\n\n--\nLeander Toney\nFounder, TasteLanc\nLancaster, PA`,
  },

  // 34. HTML — full professional template (everything except links/images)
  {
    id: 34,
    label: 'Full professional HTML — no links, no images',
    subject: 'Test 34 — full professional template',
    html: `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:20px;background:#ffffff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:15px;color:#1a1a1a;line-height:1.6;">
<p style="margin:0 0 14px 0;">Hello,</p>
<p style="margin:0 0 14px 0;">I came across your restaurant and wanted to reach out. We run <strong>TasteLanc</strong> — a local app here in Lancaster that helps people find great spots for happy hours and specials.</p>
<p style="margin:0 0 14px 0;">Here's what a free listing includes:</p>
<ul style="margin:0 0 14px 0;padding-left:20px;color:#333333;">
<li style="margin-bottom:4px;">Happy hour & specials visibility to thousands of locals</li>
<li style="margin-bottom:4px;">Event promotion to our growing community</li>
<li style="margin-bottom:4px;">AI-powered recommendations that drive foot traffic</li>
<li style="margin-bottom:4px;">A dedicated profile page for your restaurant</li>
</ul>
<p style="margin:0 0 14px 0;">No cost, takes about 5 minutes to set up. A few restaurants on your block are already on there.</p>
<p style="margin:0 0 14px 0;"><strong>Would you be open to a quick chat this week?</strong> Just reply to this email.</p>
<table cellpadding="0" cellspacing="0" border="0" style="margin-top:28px;border-top:1px solid #e5e5e5;padding-top:14px;">
<tr><td style="padding-top:14px;">
<strong style="color:#A41E22;font-size:14px;">Leander Toney</strong><br>
<span style="font-size:13px;color:#666666;">Founder · TasteLanc</span><br>
<span style="font-size:13px;color:#999999;">Lancaster, PA</span>
</td></tr>
</table>
</body></html>`,
    text: `Hello,\n\n${BODY_TEXT}\n\nWould you be open to a quick chat this week? Just reply to this email.\n\n--\nLeander Toney\nFounder · TasteLanc\nLancaster, PA`,
  },
];

// ─────────────────────────────────────────────────────────
// RUNNER
// ─────────────────────────────────────────────────────────

async function sendTest(test: Test) {
  console.log(`\n📧 Test ${test.id}: ${test.label}`);
  console.log(`   Subject: "${test.subject}"`);

  const sendOptions: Parameters<typeof resend.emails.send>[0] = {
    from: FROM,
    to: TO,
    subject: test.subject,
    replyTo: REPLY_TO,
  };

  if (test.html) sendOptions.html = test.html;
  if (test.text) sendOptions.text = test.text;

  const { data, error } = await resend.emails.send(sendOptions);

  if (error) {
    console.log(`   ❌ Error: ${JSON.stringify(error)}`);
  } else {
    console.log(`   ✅ Sent — ID: ${data?.id}`);
  }

  await new Promise((r) => setTimeout(r, 1000));
}

async function main() {
  const arg = process.argv[2];

  if (!arg) {
    console.log('Available tests:\n');
    for (const t of tests) {
      console.log(`  ${t.id}. ${t.label}`);
    }
    console.log(`\nUsage: npx tsx scripts/test-primary-tab.ts <test-numbers>`);
    console.log('Examples:');
    console.log('  npx tsx scripts/test-primary-tab.ts 30       # Run test 30');
    console.log('  npx tsx scripts/test-primary-tab.ts 30,31,32 # Run tests 30-32');
    console.log('  npx tsx scripts/test-primary-tab.ts all       # Run all tests');
    return;
  }

  const ids = arg === 'all'
    ? tests.map((t) => t.id)
    : arg.split(',').map((s) => parseInt(s.trim(), 10));

  const toRun = tests.filter((t) => ids.includes(t.id));

  if (toRun.length === 0) {
    console.log(`No tests matched IDs: ${arg}`);
    return;
  }

  console.log(`Sending ${toRun.length} test(s) to ${TO}...`);
  console.log('⚠️  Tracking DISABLED on tastelanc.com\n');

  for (const test of toRun) {
    await sendTest(test);
  }

  console.log('\n✅ Done! Check Gmail.');
}

main().catch(console.error);
