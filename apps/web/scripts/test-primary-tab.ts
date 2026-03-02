/**
 * Test: Send a conversational sales email to verify Gmail Primary tab delivery.
 *
 * Usage: cd apps/web && npx tsx scripts/test-primary-tab.ts
 */

import { Resend } from 'resend';
import { renderProfessionalEmailPlainText } from '../lib/email-templates/professional-template';

const RESEND_API_KEY = process.env.RESEND_API_KEY || 're_f5KMkE8W_KuXw5G82AxnPyhzTtxvPGiVG';
const resend = new Resend(RESEND_API_KEY);

const TO = 'leandertoney@gmail.com';

async function main() {
  const emailProps = {
    headline: '',
    body: `I came across your restaurant and wanted to reach out. We run TasteLanc — a local app here in Lancaster that helps people find great spots for happy hours and specials.

I'd love to get your place listed. There's no cost involved, and it takes about 5 minutes to set up. A few restaurants on your block are already on there.

Would you be open to a quick chat this week?`,
    senderName: 'Leander',
    senderTitle: 'Founder',
  };

  const text = renderProfessionalEmailPlainText(emailProps);

  console.log('--- Plain Text Preview ---');
  console.log(text);
  console.log('\n--- Sending to', TO, '---');

  const result = await resend.emails.send({
    from: 'Leander <leander@tastelanc.com>',
    to: TO,
    subject: 'Saw your place on Queen St',
    text,
    replyTo: 'leander@in.tastelanc.com',
  });

  console.log('Resend response:', result);
  console.log('\nCheck Gmail → should land in PRIMARY tab');
}

main().catch(console.error);
