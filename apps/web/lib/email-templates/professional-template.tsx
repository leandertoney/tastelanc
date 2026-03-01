/**
 * Professional Email Template
 *
 * Designed for Primary inbox delivery. Key principles:
 * - Light/white background (not marketing dark theme)
 * - Minimal HTML, high text-to-HTML ratio
 * - Small brand logo (not hero image)
 * - No large CTA buttons — inline text links instead
 * - No marketing sections ("Why partner with us?")
 * - Personal signature style (like a real person sent it)
 * - Plain text alternative included
 *
 * This template is used for all CRM/inbox emails.
 */

import { BRAND } from '@/config/market';

export interface ProfessionalEmailProps {
  headline: string;
  body: string;
  ctaText?: string;
  ctaUrl?: string;
  previewText?: string;
  unsubscribeUrl: string;
  // Personalization
  businessName?: string;
  contactName?: string;
  // Sender
  senderName?: string;
  senderTitle?: string;
}

export function renderProfessionalEmail({
  headline,
  body,
  ctaText,
  ctaUrl,
  previewText,
  unsubscribeUrl,
  businessName,
  contactName,
  senderName,
  senderTitle,
}: ProfessionalEmailProps): string {
  // Replace placeholders in body
  let personalizedBody = body;
  if (businessName) {
    personalizedBody = personalizedBody.replace(/\{business_name\}/g, businessName);
  }
  if (contactName) {
    personalizedBody = personalizedBody.replace(/\{contact_name\}/g, contactName);
  }

  // Convert body newlines to <br> and paragraphs
  const formattedBody = personalizedBody
    .split('\n\n')
    .map(
      (paragraph) =>
        `<p style="margin:0 0 14px 0;font-size:15px;line-height:1.6;color:#1a1a1a;">${paragraph.replace(/\n/g, '<br>')}</p>`
    )
    .join('');

  const greeting = contactName
    ? `Hi ${contactName},`
    : 'Hello,';

  const signatureName = senderName || 'The Team';
  const signatureTitle = senderTitle || '';

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<title>${headline}</title>
</head>
<body style="margin:0;padding:0;background-color:#f7f7f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
${previewText ? `<div style="display:none;max-height:0;overflow:hidden;">${previewText}${'&nbsp;'.repeat(60)}</div>` : ''}

<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#f7f7f7;">
<tr>
<td align="center" style="padding:24px 16px;">
<table role="presentation" width="580" cellspacing="0" cellpadding="0" style="width:100%;max-width:580px;">

<!-- Brand mark -->
<tr>
<td align="left" style="padding:0 0 20px 0;">
<img src="https://${BRAND.domain}${BRAND.logoPath}" width="120" alt="${BRAND.name}" style="display:block;border:0;" />
</td>
</tr>

<!-- Content card -->
<tr>
<td style="background-color:#ffffff;border-radius:8px;padding:32px 28px;border:1px solid #e5e5e5;">

<!-- Greeting -->
<p style="margin:0 0 16px 0;font-size:15px;line-height:1.6;color:#1a1a1a;">
${greeting}
</p>

<!-- Headline (subtle, not H1-screaming) -->
<p style="margin:0 0 18px 0;font-size:17px;font-weight:600;line-height:1.5;color:#111111;">
${headline}
</p>

<!-- Body -->
${formattedBody}

${ctaText && ctaUrl ? `
<!-- CTA as inline link (not a big button) -->
<p style="margin:16px 0 0 0;font-size:15px;line-height:1.6;color:#1a1a1a;">
<a href="${ctaUrl}" style="color:#E63946;font-weight:600;text-decoration:underline;" target="_blank">${ctaText}</a>
</p>
` : ''}

<!-- Signature -->
<table role="presentation" cellspacing="0" cellpadding="0" style="margin-top:28px;border-top:1px solid #eee;padding-top:16px;width:100%;">
<tr>
<td style="padding-top:16px;">
<p style="margin:0 0 2px 0;font-size:14px;font-weight:600;color:#1a1a1a;">${signatureName}</p>
${signatureTitle ? `<p style="margin:0 0 2px 0;font-size:13px;color:#666;">${signatureTitle}</p>` : ''}
<p style="margin:0;font-size:13px;color:#999;">
<a href="https://${BRAND.domain}" style="color:#E63946;text-decoration:none;">${BRAND.name}</a> &middot; ${BRAND.countyShort}, ${BRAND.state}
</p>
</td>
</tr>
</table>

</td>
</tr>

<!-- Footer -->
<tr>
<td style="padding:16px 4px 0 4px;">
<p style="margin:0;font-size:11px;color:#999;line-height:1.5;">
You're receiving this because we reached out to ${businessName || 'your business'} about ${BRAND.name}.
<a href="${unsubscribeUrl}" style="color:#999;text-decoration:underline;">Unsubscribe</a>
</p>
</td>
</tr>

</table>
</td>
</tr>
</table>
</body>
</html>`;

  return html;
}

/**
 * Generate a plain-text version of the email for multipart sending.
 * High text-to-HTML ratio improves deliverability.
 */
export function renderProfessionalEmailPlainText({
  headline,
  body,
  ctaText,
  ctaUrl,
  unsubscribeUrl,
  businessName,
  contactName,
  senderName,
  senderTitle,
}: ProfessionalEmailProps): string {
  let personalizedBody = body;
  if (businessName) {
    personalizedBody = personalizedBody.replace(/\{business_name\}/g, businessName);
  }
  if (contactName) {
    personalizedBody = personalizedBody.replace(/\{contact_name\}/g, contactName);
  }

  const greeting = contactName ? `Hi ${contactName},` : 'Hello,';
  const signatureName = senderName || 'The Team';
  const signatureTitle = senderTitle ? `\n${senderTitle}` : '';

  let text = `${greeting}\n\n${headline}\n\n${personalizedBody}`;

  if (ctaText && ctaUrl) {
    text += `\n\n${ctaText}: ${ctaUrl}`;
  }

  text += `\n\n--\n${signatureName}${signatureTitle}\n${BRAND.name} · ${BRAND.countyShort}, ${BRAND.state}\nhttps://${BRAND.domain}`;
  text += `\n\n---\nUnsubscribe: ${unsubscribeUrl}`;

  return text;
}
