import { BRAND } from '@/config/market';

export function generateDeliverabilityCheckEmail({
  ownerName,
  restaurantName,
}: {
  ownerName: string;
  restaurantName: string;
}): { html: string; text: string } {
  const firstName = ownerName.split(' ')[0] || ownerName;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>Reply to confirm — ${BRAND.name}</title>
</head>
<body style="margin:0;padding:0;background-color:#f7f7f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
<div style="display:none;max-height:0;overflow:hidden;">Reply to this email to ensure your campaigns reach customers' inboxes.${'&nbsp;'.repeat(60)}</div>

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

<p style="margin:0 0 16px 0;font-size:15px;line-height:1.6;color:#1a1a1a;">
Hi ${firstName},
</p>

<p style="margin:0 0 18px 0;font-size:17px;font-weight:600;line-height:1.5;color:#111111;">
Make sure our emails reach you
</p>

<p style="margin:0 0 14px 0;font-size:15px;line-height:1.6;color:#1a1a1a;">
We send you campaign reports, performance updates, and important notifications about <strong>${restaurantName}</strong> through ${BRAND.name}. To make sure those emails land in your inbox — not spam — please <strong>reply to this email</strong> right now.
</p>

<p style="margin:0 0 14px 0;font-size:15px;line-height:1.6;color:#1a1a1a;">
Replying tells your email provider that messages from us are safe. You only need to do this once.
</p>

<p style="margin:0 0 24px 0;font-size:15px;line-height:1.6;color:#1a1a1a;">
A simple "got it" reply is all it takes.
</p>

<table role="presentation" cellspacing="0" cellpadding="0" style="margin-bottom:24px;">
<tr>
<td style="background-color:#E63946;border-radius:8px;">
<a href="mailto:noreply@${BRAND.domain}?subject=Re%3A+Reply+to+confirm+%E2%80%94+${encodeURIComponent(restaurantName)}" style="display:inline-block;padding:14px 32px;color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;">
Reply to this email &rarr;
</a>
</td>
</tr>
</table>

<p style="margin:0;font-size:13px;line-height:1.6;color:#999;">
After you reply, go back to your ${BRAND.name} dashboard and click <strong>"I replied ✓"</strong> to complete the setup.
</p>

<!-- Signature -->
<table role="presentation" cellspacing="0" cellpadding="0" style="margin-top:28px;border-top:1px solid #eee;padding-top:16px;width:100%;">
<tr>
<td style="padding-top:16px;">
<p style="margin:0 0 2px 0;font-size:14px;font-weight:600;color:#1a1a1a;">The ${BRAND.name} Team</p>
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
You received this because you manage <strong>${restaurantName}</strong> on ${BRAND.name}. This is a one-time deliverability setup email.
</p>
</td>
</tr>

</table>
</td>
</tr>
</table>
</body>
</html>`;

  const text = `Hi ${firstName},

Make sure our emails reach you

We send you campaign reports, performance updates, and important notifications about ${restaurantName} through ${BRAND.name}. To make sure those emails land in your inbox — not spam — please reply to this email right now.

Replying tells your email provider that messages from us are safe. You only need to do this once. A simple "got it" reply is all it takes.

After you reply, go back to your ${BRAND.name} dashboard and click "I replied ✓" to complete the setup.

--
The ${BRAND.name} Team
${BRAND.name} · ${BRAND.countyShort}, ${BRAND.state}
https://${BRAND.domain}`;

  return { html, text };
}
