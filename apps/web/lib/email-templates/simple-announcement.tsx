// Simple announcement email template - designed for inbox primary tab
// Uses minimal HTML to avoid spam filters and promotions tab

import { BRAND } from '@/config/market';

export interface SimpleAnnouncementProps {
  recipientName?: string;
  body: string;
  ctaText?: string;
  ctaUrl?: string;
  previewText?: string;
  unsubscribeUrl: string;
}

export function renderSimpleAnnouncement({
  recipientName,
  body,
  ctaText,
  ctaUrl,
  previewText,
  unsubscribeUrl,
}: SimpleAnnouncementProps): string {
  const greeting = recipientName ? `Hi ${recipientName},` : 'Hi there,';

  // Convert body newlines to <br> tags
  const formattedBody = body
    .split('\n')
    .map(line => line.trim())
    .join('<br>\n');

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${BRAND.name}</title>
</head>
<body style="margin:0; padding:20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size:16px; line-height:1.6; color:#333333; background:#ffffff;">
  ${previewText ? `<div style="display:none; max-height:0; overflow:hidden;">${previewText}</div>` : ''}

  <div style="max-width:560px; margin:0 auto;">
    <p style="margin:0 0 16px 0;">${greeting}</p>

    <div style="margin-bottom:24px;">
      ${formattedBody}
    </div>

    ${ctaText && ctaUrl ? `
    <p style="margin:24px 0;">
      <a href="${ctaUrl}" style="display:inline-block; background:#E63946; color:#ffffff; padding:12px 24px; border-radius:6px; text-decoration:none; font-weight:600;">${ctaText}</a>
    </p>
    ` : ''}

    <p style="margin:24px 0 0 0;">
      Cheers,<br>
      The ${BRAND.name} Team
    </p>

    <hr style="border:none; border-top:1px solid #eeeeee; margin:32px 0 16px 0;">

    <p style="font-size:12px; color:#888888; margin:0;">
      <a href="${unsubscribeUrl}" style="color:#888888;">Unsubscribe</a>
    </p>
  </div>
</body>
</html>
  `.trim();
}

// Plain text version for multipart emails
export function renderSimpleAnnouncementPlainText({
  recipientName,
  body,
  ctaText,
  ctaUrl,
  unsubscribeUrl,
}: SimpleAnnouncementProps): string {
  const greeting = recipientName ? `Hi ${recipientName},` : 'Hi there,';

  return `
${greeting}

${body}

${ctaText && ctaUrl ? `${ctaText}: ${ctaUrl}\n` : ''}
Cheers,
The ${BRAND.name} Team

---
Unsubscribe: ${unsubscribeUrl}
  `.trim();
}

// Pre-built launch announcement
export const LAUNCH_ANNOUNCEMENT = {
  subject: `${BRAND.name} is Live! Download Now for iPhone`,
  previewText: `The wait is over - discover ${BRAND.countyShort}'s best dining & nightlife`,
  body: `Big news - ${BRAND.name} is officially live on the App Store!

After months of building and your amazing support as an early member, we're thrilled to announce that you can now download ${BRAND.name} and start discovering ${BRAND.countyShort}'s best restaurants, happy hours, and nightlife.

What's waiting for you:
- Real-time happy hours and specials
- Live events across ${BRAND.countyShort}
- ${BRAND.aiName}, your AI dining assistant
- Rewards for checking in at your favorite spots

As one of our founding members, you've already earned early access perks. Download the app and sign in with the email you used to join the waitlist to unlock them.

Android coming soon - we'll let you know when it's ready!`,
  ctaText: "Download for iPhone",
  ctaUrl: "https://apps.apple.com/us/app/tastelanc/id6755852717",
};
