/**
 * Test Blog Notification Email
 *
 * Sends a test blog notification email using a REAL blog post from the database.
 * Run with: npx tsx scripts/test-blog-email.ts
 */
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { Resend } from 'resend';
import { createClient } from '@supabase/supabase-js';

const resend = new Resend(process.env.RESEND_API_KEY);
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://tastelanc.com';

// Test recipient
const TEST_EMAIL = 'leandertoney@gmail.com';

async function main() {
  console.log('\n📧 BLOG EMAIL TEST (Using Real Blog Post)\n');
  console.log('━'.repeat(50));

  if (!process.env.RESEND_API_KEY) {
    console.error('❌ RESEND_API_KEY not configured in .env.local');
    process.exit(1);
  }

  // Fetch the most recent blog post from the database
  console.log('📊 Fetching latest blog post from database...');
  const { data: posts, error } = await supabase
    .from('blog_posts')
    .select('title, slug, summary, cover_image_url')
    .order('created_at', { ascending: false })
    .limit(1);

  if (error || !posts || posts.length === 0) {
    console.error('❌ No blog posts found in database');
    console.error(error);
    process.exit(1);
  }

  const testPost = {
    title: posts[0].title,
    slug: posts[0].slug,
    summary: posts[0].summary,
    coverImageUrl: posts[0].cover_image_url,
  };

  console.log(`📬 Sending test email to: ${TEST_EMAIL}`);
  console.log(`📝 Post: "${testPost.title}"`);
  console.log(`🔗 Slug: ${testPost.slug}`);

  const postUrl = `${siteUrl}/blog/${testPost.slug}`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #0D0D0D; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0D0D0D;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; width: 100%;">
          <tr>
            <td align="center" style="padding-bottom: 30px;">
              <img src="${siteUrl}/images/tastelanc_new_dark.png" alt="TasteLanc" width="180" style="display: block;">
            </td>
          </tr>
          ${testPost.coverImageUrl ? `
          <tr>
            <td style="padding-bottom: 24px;">
              <a href="${postUrl}" style="display: block;">
                <img src="${testPost.coverImageUrl}" alt="${testPost.title}" width="600" style="display: block; width: 100%; max-width: 600px; border-radius: 8px;">
              </a>
            </td>
          </tr>
          ` : ''}
          <tr>
            <td style="background-color: #1A1A1A; border-radius: 12px; padding: 32px;">
              <table cellpadding="0" cellspacing="0" style="margin-bottom: 20px;">
                <tr>
                  <td style="background-color: #D4AF37; color: #000; font-size: 11px; font-weight: bold; padding: 4px 10px; border-radius: 4px; text-transform: uppercase; letter-spacing: 0.5px;">
                    New from Rosie
                  </td>
                </tr>
              </table>
              <h1 style="color: #FFFFFF; font-size: 26px; font-weight: bold; margin: 0 0 16px 0; line-height: 1.3;">
                ${testPost.title}
              </h1>
              <p style="color: #A0A0A0; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
                ${testPost.summary}
              </p>
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background-color: #D4AF37; border-radius: 8px;">
                    <a href="${postUrl}" style="display: inline-block; padding: 14px 28px; color: #000000; text-decoration: none; font-weight: bold; font-size: 16px;">
                      Read Now →
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding-top: 32px; text-align: center;">
              <p style="color: #666; font-size: 13px; margin: 0 0 8px 0;">
                You're receiving this because you joined the TasteLanc waitlist.
              </p>
              <p style="color: #666; font-size: 13px; margin: 0;">
                <a href="${siteUrl}/unsubscribe" style="color: #666; text-decoration: underline;">Unsubscribe</a>
              </p>
              <p style="color: #444; font-size: 11px; margin: 16px 0 0 0;">
                ⚠️ This is a TEST email
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

  try {
    const result = await resend.emails.send({
      from: 'TasteLanc <noreply@tastelanc.com>',
      to: TEST_EMAIL,
      subject: `🍽️ ${testPost.title}`,
      html,
    });

    console.log('\n✅ Email sent successfully!');
    console.log(`   ID: ${result.data?.id}`);
    console.log('\n━'.repeat(50));
    console.log(`Check your inbox at ${TEST_EMAIL}`);
    console.log('━'.repeat(50) + '\n');
  } catch (err) {
    console.error('\n❌ Failed to send email:', err);
    process.exit(1);
  }
}

main();
