/**
 * Email template for team member invitations.
 * Two variants: new user (needs password setup) and existing user (already has account).
 */

export function generateTeamInviteEmail(
  actionLink: string,
  restaurantName: string,
  isNewUser: boolean,
): string {
  const heading = isNewUser
    ? "You've been invited to manage a restaurant on TasteLanc"
    : "You've been added to a restaurant on TasteLanc";

  const bodyText = isNewUser
    ? `You've been invited to help manage <strong style="color: #ffffff;">${restaurantName}</strong> on TasteLanc. Set up your account to get started.`
    : `You've been added as a manager for <strong style="color: #ffffff;">${restaurantName}</strong> on TasteLanc. Sign in to access the dashboard.`;

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
                  <img src="https://tastelanc.com/images/tastelanc_new_dark.png" alt="TasteLanc" height="36" style="margin-bottom: 24px;" />

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
                    TasteLanc — Lancaster's Local Food Guide<br/>
                    <a href="https://tastelanc.com" style="color: #6b7280;">tastelanc.com</a>
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
