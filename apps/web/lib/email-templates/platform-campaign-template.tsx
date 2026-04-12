// Platform campaign email template
// Sent by TasteLanc / TasteCumberland / TasteFayetteville to platform contacts

export interface PlatformCampaignProps {
  recipientName?: string;
  body: string;
  ctaText?: string;
  ctaUrl?: string;
  previewText?: string;
  unsubscribeUrl: string;
  brandName?: string;
  brandDomain?: string;
  brandLogoUrl?: string;
  appStoreUrl?: string;
  playStoreUrl?: string;
}

export function renderPlatformCampaign({
  recipientName,
  body,
  ctaText,
  ctaUrl,
  previewText,
  unsubscribeUrl,
  brandName = 'TasteLanc',
  brandDomain = 'tastelanc.com',
  brandLogoUrl,
  appStoreUrl,
  playStoreUrl,
}: PlatformCampaignProps): string {
  const greeting = recipientName ? `Hi ${recipientName},` : 'Hi there,';

  // Convert body newlines to <br> tags
  const formattedBody = body
    .split('\n')
    .map((line) => line.trim())
    .join('<br>\n');

  // Build app download links
  const appLinks: string[] = [];
  if (appStoreUrl) appLinks.push(`<a href="${appStoreUrl}" style="color:#E63946; text-decoration:none; font-weight:600;">Download on iPhone</a>`);
  if (playStoreUrl) appLinks.push(`<a href="${playStoreUrl}" style="color:#E63946; text-decoration:none; font-weight:600;">Get on Android</a>`);
  const appLinksHtml = appLinks.length > 0
    ? `<p style="font-size:13px; margin:8px 0 12px 0;">${appLinks.join(' &nbsp;&bull;&nbsp; ')}</p>`
    : '';

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${brandName}</title>
</head>
<body style="margin:0; padding:20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size:16px; line-height:1.6; color:#333333; background:#f8f8f8;">
  ${previewText ? `<div style="display:none; max-height:0; overflow:hidden;">${previewText}</div>` : ''}

  <div style="max-width:560px; margin:0 auto; background:#ffffff; border-radius:8px; overflow:hidden; border:1px solid #e5e5e5;">
    <!-- Header with brand logo -->
    <div style="padding:24px 32px 16px 32px; border-bottom:1px solid #f0f0f0;">
      ${brandLogoUrl ? `
      <a href="https://${brandDomain}" style="text-decoration:none;">
        <img src="${brandLogoUrl}" alt="${brandName}" width="140" style="display:block; max-width:140px; height:auto;" />
      </a>
      ` : `
      <p style="margin:0; font-size:18px; font-weight:700; color:#E63946; text-decoration:none;">${brandName}</p>
      `}
    </div>

    <!-- Body content -->
    <div style="padding:24px 32px;">
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
        Best,<br>
        The ${brandName} Team
      </p>
    </div>

    <!-- Footer -->
    <div style="padding:20px 32px; background:#f9f9f9; border-top:1px solid #f0f0f0;">
      <p style="font-size:12px; color:#888888; margin:0 0 4px 0;">
        Sent by <a href="https://${brandDomain}" style="color:#888888; text-decoration:underline;">${brandName}</a>
      </p>
      ${appLinksHtml}
      <p style="font-size:12px; color:#888888; margin:0;">
        <a href="${unsubscribeUrl}" style="color:#888888;">Unsubscribe</a> from ${brandName} emails
      </p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

export function renderPlatformCampaignPlainText({
  recipientName,
  body,
  ctaText,
  ctaUrl,
  unsubscribeUrl,
  brandName = 'TasteLanc',
  appStoreUrl,
  playStoreUrl,
}: PlatformCampaignProps): string {
  const greeting = recipientName ? `Hi ${recipientName},` : 'Hi there,';

  const appLinks: string[] = [];
  if (appStoreUrl) appLinks.push(`Download on iPhone: ${appStoreUrl}`);
  if (playStoreUrl) appLinks.push(`Get on Android: ${playStoreUrl}`);
  const appLinksText = appLinks.length > 0 ? `\n${appLinks.join('\n')}\n` : '';

  return `
${brandName}

${greeting}

${body}

${ctaText && ctaUrl ? `${ctaText}: ${ctaUrl}\n` : ''}
Best,
The ${brandName} Team

---
Sent by ${brandName}${appLinksText}
Unsubscribe from ${brandName} emails: ${unsubscribeUrl}
  `.trim();
}
