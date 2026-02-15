/**
 * Email template for sales rep invitations.
 * Two variants: new user (needs password setup) and existing user (already has account).
 */

export function generateSalesRepInviteEmail(
  actionLink: string,
  name: string,
  isNewUser: boolean,
): string {
  const heading = 'Welcome to the TasteLanc Sales Team';

  const bodyText = isNewUser
    ? `Hi <strong style="color: #ffffff;">${name}</strong>, you've been added as a Sales Representative for TasteLanc. Set up your account to access your sales CRM dashboard.`
    : `Hi <strong style="color: #ffffff;">${name}</strong>, you've been added as a Sales Representative for TasteLanc. Sign in to access your sales CRM dashboard.`;

  const buttonText = isNewUser ? 'Set Up Your Account →' : 'Open Sales Dashboard →';

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

                  <!-- Role Badge -->
                  <div style="background-color: #A41E22; color: white; display: inline-block; padding: 8px 16px; border-radius: 8px; font-weight: 600; font-size: 14px; margin-bottom: 20px;">
                    Sales Team
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
                      <td style="background-color: #A41E22; border-radius: 10px;">
                        <a href="${actionLink}" style="display: inline-block; padding: 16px 40px; color: #ffffff; text-decoration: none; font-weight: 600; font-size: 16px;">
                          ${buttonText}
                        </a>
                      </td>
                    </tr>
                  </table>

                  <p style="color: #666666; font-size: 14px; line-height: 1.5; margin: 0 0 16px 0;">
                    Your dashboard includes:
                  </p>
                  <ul style="color: #a3a3a3; font-size: 14px; line-height: 1.8; padding-left: 20px; margin: 0 0 32px 0;">
                    <li>Business lead management & tracking</li>
                    <li>Activity logging for calls, emails, and meetings</li>
                    <li>Contact inquiry conversion</li>
                    <li>Sales checkout creation</li>
                    <li>Restaurant directory reference</li>
                  </ul>

                  <!-- Divider -->
                  <hr style="border: none; border-top: 1px solid #333333; margin: 24px 0;" />

                  <p style="color: #666666; font-size: 12px; margin: 0;">
                    This email was sent by TasteLanc. If you didn't expect this invitation, you can safely ignore this email.
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
