/**
 * Blog Notification Email
 *
 * Sends email to waitlisters when a new blog post is published
 */
import { sendBatchEmails, getRecipientsBySegment, type BatchEmailParams } from '@/lib/resend';
import { createClient } from '@supabase/supabase-js';
import { BRAND } from '@/config/market';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface BlogPost {
  title: string;
  slug: string;
  summary: string;
  cover_image_url?: string;
}

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || `https://${BRAND.domain}`;

function buildBlogEmailHtml(post: BlogPost): string {
  const postUrl = `${siteUrl}/blog/${post.slug}`;
  const unsubscribeUrl = `${siteUrl}/unsubscribe?email={{email}}`;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New from ${BRAND.aiName}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0D0D0D; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0D0D0D;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; width: 100%;">
          <!-- Header -->
          <tr>
            <td align="center" style="padding-bottom: 30px;">
              <img src="${siteUrl}${BRAND.logoPath}" alt="${BRAND.name}" width="180" style="display: block;">
            </td>
          </tr>

          <!-- Cover Image -->
          ${post.cover_image_url ? `
          <tr>
            <td style="padding-bottom: 24px;">
              <a href="${postUrl}" style="display: block;">
                <img src="${post.cover_image_url}" alt="${post.title}" width="600" style="display: block; width: 100%; max-width: 600px; border-radius: 8px;">
              </a>
            </td>
          </tr>
          ` : ''}

          <!-- Content Card -->
          <tr>
            <td style="background-color: #1A1A1A; border-radius: 12px; padding: 32px;">
              <!-- Rosie Badge -->
              <table cellpadding="0" cellspacing="0" style="margin-bottom: 20px;">
                <tr>
                  <td style="background-color: ${BRAND.colors.gold}; color: #000; font-size: 11px; font-weight: bold; padding: 4px 10px; border-radius: 4px; text-transform: uppercase; letter-spacing: 0.5px;">
                    New from ${BRAND.aiName}
                  </td>
                </tr>
              </table>

              <!-- Title -->
              <h1 style="color: #FFFFFF; font-size: 26px; font-weight: bold; margin: 0 0 16px 0; line-height: 1.3;">
                ${post.title}
              </h1>

              <!-- Summary -->
              <p style="color: #A0A0A0; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
                ${post.summary}
              </p>

              <!-- CTA Button -->
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background-color: ${BRAND.colors.gold}; border-radius: 8px;">
                    <a href="${postUrl}" style="display: inline-block; padding: 14px 28px; color: #000000; text-decoration: none; font-weight: bold; font-size: 16px;">
                      Read Now →
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding-top: 32px; text-align: center;">
              <p style="color: #666; font-size: 13px; margin: 0 0 8px 0;">
                You're receiving this because you joined the ${BRAND.name} waitlist.
              </p>
              <p style="color: #666; font-size: 13px; margin: 0;">
                <a href="${unsubscribeUrl}" style="color: #666; text-decoration: underline;">Unsubscribe</a>
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

export async function sendBlogNotificationEmail(post: BlogPost): Promise<{
  success: boolean;
  sent: number;
  errors: number;
}> {
  console.log(`📧 Sending blog notification for: ${post.title}`);

  // Get all waitlist subscribers (not converted)
  const recipients = await getRecipientsBySegment(supabase, 'all');
  console.log(`   Found ${recipients.length} recipients`);

  if (recipients.length === 0) {
    return { success: true, sent: 0, errors: 0 };
  }

  // Build email HTML
  const html = buildBlogEmailHtml(post);
  const subject = `🍽️ ${post.title}`;

  // Prepare batch emails
  const emails: BatchEmailParams[] = recipients.map((r) => ({
    to: r.email,
    subject,
    html: html.replace('{{email}}', encodeURIComponent(r.email)),
  }));

  // Send in batches
  const results = await sendBatchEmails(emails);

  let sent = 0;
  let errors = 0;

  for (const result of results) {
    if ('error' in result) {
      errors++;
    } else {
      sent += 100; // Approximate per batch
    }
  }

  // Adjust sent count
  sent = Math.min(sent, recipients.length);

  console.log(`   ✓ Sent: ${sent}, Errors: ${errors}`);

  return { success: errors === 0, sent, errors };
}
