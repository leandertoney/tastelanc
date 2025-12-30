// TasteLanc Email Base Layout
// Dark theme matching the brand

export interface BaseLayoutProps {
  children: string;
  previewText?: string;
  unsubscribeUrl: string;
}

export function renderBaseLayout({
  children,
  previewText,
  unsubscribeUrl,
}: BaseLayoutProps): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>TasteLanc</title>
  <style>
    body { margin:0; padding:0; width:100% !important; background:#0D0D0D; color:#FFFFFF; font-family: Arial, sans-serif; -webkit-font-smoothing: antialiased; }
    table { border-collapse: collapse; }
    a { color:#E63946; text-decoration: underline; }
    img { border:0; outline:none; text-decoration:none; }
  </style>
</head>
<body style="margin:0; padding:0; background:#0D0D0D; background-color:#0D0D0D !important; color:#FFFFFF !important;" bgcolor="#0D0D0D">
  ${previewText ? `
  <!-- Preview text -->
  <div style="display:none; max-height:0; overflow:hidden; mso-hide:all;">
    ${previewText}
    ${'&nbsp;'.repeat(100)}
  </div>
  ` : ''}

  <!-- Full-width dark background -->
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#0D0D0D; background-color:#0D0D0D !important; padding:0; margin:0;" bgcolor="#0D0D0D">
    <tr>
      <td align="center" bgcolor="#0D0D0D" style="background:#0D0D0D; background-color:#0D0D0D !important;">
        <!-- Header with logo -->
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#0D0D0D; background-color:#0D0D0D !important; padding:32px 0;" bgcolor="#0D0D0D">
          <tr>
            <td align="center" bgcolor="#0D0D0D" style="background:#0D0D0D; background-color:#0D0D0D !important;">
              <div style="display:inline-block; background:#0D0D0D; border-radius:12px; padding:12px;">
                <img
                  src="https://tastelanc.com/images/tastelanc_new_dark.png"
                  width="160"
                  alt="TasteLanc"
                  style="display:block;"
                />
              </div>
            </td>
          </tr>
        </table>

        <!-- Content wrapper -->
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="width:100%; max-width:600px; background:#0D0D0D; color:#FFFFFF; padding:32px; font-family: Arial, sans-serif;" bgcolor="#0D0D0D">
          <tr>
            <td style="color:#FFFFFF; font-size:16px; line-height:1.6; text-align:left; background:#0D0D0D;" bgcolor="#0D0D0D">
              ${children}
            </td>
          </tr>
          <tr>
            <td style="padding-top:24px; border-top:1px solid #1F1F1F; color:#CCCCCC; font-size:12px; line-height:1.6; text-align:left; background:#0D0D0D;" bgcolor="#0D0D0D">
              You're receiving this email because you signed up for TasteLanc.
              <br />
              <a href="${unsubscribeUrl}" style="color:#E63946; text-decoration: underline;">Unsubscribe</a>
              &nbsp;&bull;&nbsp;
              <a href="${process.env.NEXT_PUBLIC_SITE_URL || 'https://tastelanc.com'}/privacy" style="color:#E63946; text-decoration: underline;">Privacy</a>
              &nbsp;&bull;&nbsp;
              <a href="${process.env.NEXT_PUBLIC_SITE_URL || 'https://tastelanc.com'}/terms" style="color:#E63946; text-decoration: underline;">Terms</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}
