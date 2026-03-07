/**
 * Professional Email Template — Gmail Primary Tab Safe
 *
 * Tested & confirmed to land in Gmail PRIMARY tab when sent via Resend
 * with open/click tracking DISABLED on the domain.
 *
 * SAFE:     <p>, <strong>, <br>, inline styles (margin, font-size, color:#666)
 * UNSAFE:   <a>, <img>, <ul>/<li>, <table>, border-top, brand accent colors
 *
 * Any links, images, or list elements will trigger Promotions tab.
 * CTA should be conversational ("reply to this email") not a link.
 */

import { BRAND, MARKET_CONFIG, type MarketBrand } from '@/config/market';

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
  // Market
  marketSlug?: string;
}

function resolveBrand(marketSlug?: string): MarketBrand {
  if (marketSlug && MARKET_CONFIG[marketSlug]) return MARKET_CONFIG[marketSlug];
  return BRAND;
}

export function renderProfessionalEmail({
  body,
  businessName,
  contactName,
  senderName,
  senderTitle,
  marketSlug,
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

  const brand = resolveBrand(marketSlug);
  const signatureName = senderName || 'The Team';
  const titleLine = senderTitle ? `${senderTitle}, ${brand.name}` : brand.name;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
</head>
<body style="margin:0;padding:20px;background-color:#ffffff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:15px;color:#1a1a1a;line-height:1.6;">

<p style="margin:0 0 14px 0;">${greeting}</p>

${formattedBody}

<p style="margin:28px 0 0 0;font-size:13px;color:#666666;">—<br><strong>${signatureName}</strong><br>${titleLine}<br>${brand.countyShort}, ${brand.state}</p>

</body>
</html>`;

  return html;
}

/**
 * Generate a plain-text version of the email for multipart sending.
 */
export function renderProfessionalEmailPlainText({
  body,
  businessName,
  contactName,
  senderName,
  senderTitle,
  marketSlug,
}: ProfessionalEmailProps): string {
  let personalizedBody = body;
  if (businessName) {
    personalizedBody = personalizedBody.replace(/\{business_name\}/g, businessName);
  }
  if (contactName) {
    personalizedBody = personalizedBody.replace(/\{contact_name\}/g, contactName);
  }

  const brand = resolveBrand(marketSlug);
  const greeting = contactName ? `Hi ${contactName},` : 'Hello,';
  const signatureName = senderName || 'The Team';
  const titleLine = senderTitle ? `${senderTitle}, ${brand.name}` : brand.name;

  let text = `${greeting}\n\n${personalizedBody}`;

  text += `\n\n--\n${signatureName}\n${titleLine}\n${brand.countyShort}, ${brand.state}`;

  return text;
}
