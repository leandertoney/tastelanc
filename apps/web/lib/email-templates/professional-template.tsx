/**
 * Professional Email Template — Plain Personal Style
 *
 * Designed to land in Gmail PRIMARY tab by mimicking a human-sent email.
 * No logos, no styled containers, no colored CTAs, no marketing signals.
 *
 * This template is used for all CRM/inbox 1:1 sales emails.
 */

import { BRAND } from '@/config/market';

export interface ProfessionalEmailProps {
  headline: string;
  body: string;
  ctaText?: string;
  ctaUrl?: string;
  previewText?: string;
  unsubscribeUrl?: string; // optional — not rendered in template, kept for interface compat
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
        `<p style="margin:0 0 14px 0;">${paragraph.replace(/\n/g, '<br>')}</p>`
    )
    .join('');

  const greeting = contactName
    ? `Hi ${contactName},`
    : 'Hello,';

  const signatureName = senderName || 'The Team';
  const signatureTitle = senderTitle ? ` | ${senderTitle}` : '';

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
</head>
<body style="margin:0;padding:20px;background-color:#ffffff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:15px;color:#1a1a1a;line-height:1.6;">

<p style="margin:0 0 14px 0;">${greeting}</p>

${formattedBody}

${ctaText && ctaUrl ? `<p style="margin:14px 0 0 0;"><a href="${ctaUrl}" style="color:#1a73e8;" target="_blank">${ctaText}</a></p>` : ''}

<p style="margin:28px 0 0 0;font-size:13px;color:#666666;">—<br>${signatureName}${signatureTitle}<br>${BRAND.name} · ${BRAND.countyShort}, ${BRAND.state}</p>

</body>
</html>`;

  return html;
}

/**
 * Generate a plain-text version of the email for multipart sending.
 */
export function renderProfessionalEmailPlainText({
  headline,
  body,
  ctaText,
  ctaUrl,
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
  const signatureTitle = senderTitle ? ` | ${senderTitle}` : '';

  let text = `${greeting}\n\n${personalizedBody}`;

  if (ctaText && ctaUrl) {
    text += `\n\n${ctaText}: ${ctaUrl}`;
  }

  text += `\n\n--\n${signatureName}${signatureTitle}\n${BRAND.name} · ${BRAND.countyShort}, ${BRAND.state}`;

  return text;
}
