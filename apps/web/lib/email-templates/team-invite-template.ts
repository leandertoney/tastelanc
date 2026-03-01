/**
 * Email templates for team member invitations.
 * - generateTeamInviteEmail: Restaurant dashboard team (dark theme)
 * - generateAdminTeamInviteEmail: Admin team members (professional light theme for Primary inbox)
 */

import { BRAND } from '@/config/market';

const ROLE_LABELS: Record<string, string> = {
  sales_rep: 'Sales Representative',
  market_admin: 'Market Administrator',
  admin: 'Administrator',
};

/**
 * Admin team invite email — professional light template for Primary inbox delivery.
 */
export function generateAdminTeamInviteEmail(
  setupLink: string,
  name: string,
  role: string | null,
  isNewUser: boolean,
): { html: string; text: string } {
  const roleLabel = role ? (ROLE_LABELS[role] || role.replace(/_/g, ' ')) : 'Team Member';
  const firstName = name.split(' ')[0];
  const actionLink = isNewUser ? setupLink : `https://${BRAND.domain}/sales`;
  const ctaText = isNewUser ? 'Set Up Your Account' : 'Open Dashboard';

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>Welcome to ${BRAND.name}</title>
</head>
<body style="margin:0;padding:0;background-color:#f7f7f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
<div style="display:none;max-height:0;overflow:hidden;">You've been added to the ${BRAND.name} team as a ${roleLabel}.${'&nbsp;'.repeat(60)}</div>

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
Welcome to the ${BRAND.name} Team
</p>

<p style="margin:0 0 14px 0;font-size:15px;line-height:1.6;color:#1a1a1a;">
You've been added as a <strong>${roleLabel}</strong> for ${BRAND.name}.${isNewUser ? ' Click below to set up your account and get started.' : ' Sign in to access your dashboard.'}
</p>

<p style="margin:16px 0 0 0;font-size:15px;line-height:1.6;color:#1a1a1a;">
<a href="${actionLink}" style="color:#E63946;font-weight:600;text-decoration:underline;" target="_blank">${ctaText} &rarr;</a>
</p>

<p style="margin:24px 0 0 0;font-size:14px;line-height:1.6;color:#666;">
Your dashboard includes lead management, activity tracking, email outreach, and more.
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
This is an internal team invitation from ${BRAND.name}. If you didn't expect this, you can safely ignore it.
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

Welcome to the ${BRAND.name} Team

You've been added as a ${roleLabel} for ${BRAND.name}.${isNewUser ? ' Click the link below to set up your account and get started.' : ' Sign in to access your dashboard.'}

${ctaText}: ${actionLink}

Your dashboard includes lead management, activity tracking, email outreach, and more.

--
The ${BRAND.name} Team
${BRAND.name} · ${BRAND.countyShort}, ${BRAND.state}
https://${BRAND.domain}`;

  return { html, text };
}

export function generateTeamInviteEmail(
  actionLink: string,
  restaurantName: string,
  isNewUser: boolean,
): string {
  const heading = isNewUser
    ? `You've been invited to manage a restaurant on ${BRAND.name}`
    : `You've been added to a restaurant on ${BRAND.name}`;

  const bodyText = isNewUser
    ? `You've been invited to help manage <strong style="color: #ffffff;">${restaurantName}</strong> on ${BRAND.name}. Set up your account to get started.`
    : `You've been added as a manager for <strong style="color: #ffffff;">${restaurantName}</strong> on ${BRAND.name}. Sign in to access the dashboard.`;

  const buttonText = isNewUser ? 'Set Up Your Account →' : 'Open Dashboard →';

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0a0a0a;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0a0a0a;">
        <tr>
          <td align="center" style="padding: 40px 20px;">
            <table width="600" cellpadding="0" cellspacing="0" style="background-color: #1a1a1a; border-radius: 16px; overflow: hidden;">
              <tr>
                <td style="padding: 40px;">
                  <!-- Logo -->
                  <img src="https://${BRAND.domain}${BRAND.logoPath}" alt="${BRAND.name}" height="36" style="margin-bottom: 24px;" />

                  <!-- Restaurant Name Badge -->
                  <div style="background-color: #2563eb; color: white; display: inline-block; padding: 8px 16px; border-radius: 8px; font-weight: 600; font-size: 14px; margin-bottom: 20px;">
                    ${restaurantName}
                  </div>

                  <h1 style="color: #ffffff; font-size: 24px; margin: 0 0 16px 0; font-weight: 700;">
                    ${heading}
                  </h1>

                  <p style="color: #a3a3a3; font-size: 16px; line-height: 1.6; margin: 0 0 32px 0;">
                    ${bodyText}
                  </p>

                  <!-- CTA Button -->
                  <table cellpadding="0" cellspacing="0" style="margin-bottom: 32px;">
                    <tr>
                      <td style="background-color: #3b82f6; border-radius: 10px;">
                        <a href="${actionLink}" style="display: inline-block; padding: 16px 40px; color: #ffffff; text-decoration: none; font-weight: 600; font-size: 16px;">
                          ${buttonText}
                        </a>
                      </td>
                    </tr>
                  </table>

                  <p style="color: #737373; font-size: 14px; line-height: 1.6; margin: 0 0 8px 0;">
                    As a manager, you can:
                  </p>
                  <ul style="color: #a3a3a3; font-size: 14px; line-height: 1.8; margin: 0 0 24px 0; padding-left: 20px;">
                    <li>Update restaurant profile & photos</li>
                    <li>Post specials and happy hours</li>
                    <li>Manage events and menus</li>
                  </ul>

                  <p style="color: #737373; font-size: 14px; margin: 0;">
                    Questions? Just reply to this email — we're here to help!
                  </p>

                  <!-- Divider -->
                  <hr style="border: none; border-top: 1px solid #333; margin: 32px 0;" />

                  <p style="color: #525252; font-size: 12px; text-align: center; margin: 0;">
                    ${BRAND.name} — ${BRAND.countyShort}'s Local Food Guide<br/>
                    <a href="https://${BRAND.domain}" style="color: #6b7280;">${BRAND.domain}</a>
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
}
