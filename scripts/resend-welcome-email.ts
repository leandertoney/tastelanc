// Resend branded welcome email with new setup token
// Usage: npx tsx scripts/resend-welcome-email.ts <email>
// Test mode: npx tsx scripts/resend-welcome-email.ts <email> --test <your-email>

import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import { config } from 'dotenv';
import { resolve } from 'path';
import crypto from 'crypto';

config({ path: resolve(__dirname, '../apps/web/.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const resend = new Resend(process.env.RESEND_API_KEY);

// Generate branded welcome email HTML with restaurant cover image
function generateBrandedWelcomeEmail(
  setupLink: string,
  contactName: string,
  restaurantName: string,
  coverImageUrl?: string
): string {
  const firstName = contactName?.split(' ')[0] || '';

  // If we have a cover image, use the branded split-screen style
  if (coverImageUrl) {
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
            <td align="center" style="padding: 20px;">
              <table width="600" cellpadding="0" cellspacing="0" style="background-color: #1a1a1a; border-radius: 16px; overflow: hidden;">
                <!-- Restaurant Cover Image -->
                <tr>
                  <td style="position: relative;">
                    <img src="${coverImageUrl}" alt="${restaurantName}" width="600" style="display: block; width: 100%; height: 280px; object-fit: cover;" />
                    <div style="position: absolute; bottom: 0; left: 0; right: 0; padding: 30px; background: linear-gradient(transparent, rgba(0,0,0,0.8));">
                    </div>
                  </td>
                </tr>

                <!-- Content -->
                <tr>
                  <td style="padding: 40px;">
                    <!-- Logo -->
                    <img src="https://tastelanc.com/images/tastelanc_new_dark.png" alt="TasteLanc" height="36" style="margin-bottom: 24px;" />

                    <!-- Restaurant Name Badge -->
                    <div style="background-color: #2563eb; color: white; display: inline-block; padding: 8px 16px; border-radius: 8px; font-weight: 600; font-size: 14px; margin-bottom: 20px;">
                      ${restaurantName}
                    </div>

                    <h1 style="color: #ffffff; font-size: 28px; margin: 0 0 16px 0; font-weight: 700;">
                      Hey ${firstName}! 👋
                    </h1>

                    <p style="color: #a3a3a3; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
                      Welcome to TasteLanc! Your <strong style="color: #ffffff;">${restaurantName}</strong> dashboard is ready and waiting for you.
                    </p>

                    <p style="color: #a3a3a3; font-size: 16px; line-height: 1.6; margin: 0 0 32px 0;">
                      Just one quick step — set your password and you're in. Takes less than a minute.
                    </p>

                    <!-- CTA Button -->
                    <table cellpadding="0" cellspacing="0" style="margin-bottom: 32px;">
                      <tr>
                        <td style="background-color: #3b82f6; border-radius: 10px;">
                          <a href="${setupLink}" style="display: inline-block; padding: 16px 40px; color: #ffffff; text-decoration: none; font-weight: 600; font-size: 16px;">
                            Set Up Your Account →
                          </a>
                        </td>
                      </tr>
                    </table>

                    <p style="color: #737373; font-size: 14px; line-height: 1.6; margin: 0 0 8px 0;">
                      Once you're in, you can:
                    </p>
                    <ul style="color: #a3a3a3; font-size: 14px; line-height: 1.8; margin: 0 0 24px 0; padding-left: 20px;">
                      <li>Update your restaurant profile & photos</li>
                      <li>Post specials and happy hours</li>
                      <li>See your analytics and engagement</li>
                      <li>Connect with Lancaster foodies</li>
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

  // Fallback to simpler branded email without image
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

                  <h1 style="color: #ffffff; font-size: 28px; margin: 0 0 16px 0; font-weight: 700;">
                    Hey ${firstName}! 👋
                  </h1>

                  <p style="color: #a3a3a3; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
                    Welcome to TasteLanc! Your <strong style="color: #ffffff;">${restaurantName}</strong> dashboard is ready and waiting for you.
                  </p>

                  <p style="color: #a3a3a3; font-size: 16px; line-height: 1.6; margin: 0 0 32px 0;">
                    Just one quick step — set your password and you're in. Takes less than a minute.
                  </p>

                  <!-- CTA Button -->
                  <table cellpadding="0" cellspacing="0" style="margin-bottom: 32px;">
                    <tr>
                      <td style="background-color: #3b82f6; border-radius: 10px;">
                        <a href="${setupLink}" style="display: inline-block; padding: 16px 40px; color: #ffffff; text-decoration: none; font-weight: 600; font-size: 16px;">
                          Set Up Your Account →
                        </a>
                      </td>
                    </tr>
                  </table>

                  <p style="color: #737373; font-size: 14px; line-height: 1.6; margin: 0 0 8px 0;">
                    Once you're in, you can:
                  </p>
                  <ul style="color: #a3a3a3; font-size: 14px; line-height: 1.8; margin: 0 0 24px 0; padding-left: 20px;">
                    <li>Update your restaurant profile & photos</li>
                    <li>Post specials and happy hours</li>
                    <li>See your analytics and engagement</li>
                    <li>Connect with Lancaster foodies</li>
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

async function resendWelcomeEmail(targetEmail: string, testEmail?: string) {
  console.log(`Looking up user: ${targetEmail}`);

  // Find the user
  const { data: users, error: userError } = await supabase.auth.admin.listUsers();
  if (userError) {
    console.error('Failed to list users:', userError);
    return;
  }

  const user = users.users.find(u => u.email === targetEmail);
  if (!user) {
    console.error(`User not found: ${targetEmail}`);
    return;
  }

  console.log(`Found user: ${user.id}`);

  // Get their profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, role')
    .eq('id', user.id)
    .single();

  // Find their restaurant and get branding info
  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('name, cover_image_url')
    .eq('owner_id', user.id)
    .limit(1)
    .single();

  const contactName = profile?.full_name || '';
  const restaurantName = restaurant?.name || 'your business';
  const coverImageUrl = restaurant?.cover_image_url || undefined;

  console.log(`Restaurant: ${restaurantName}`);
  console.log(`Cover image: ${coverImageUrl ? 'yes' : 'no'}`);

  // Generate setup token with personalization
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  const { error: insertError } = await supabase.from('password_setup_tokens').insert({
    user_id: user.id,
    email: targetEmail,
    token,
    expires_at: expiresAt.toISOString(),
    name: contactName || null,
    restaurant_name: restaurantName || null,
    cover_image_url: coverImageUrl || null,
  });

  if (insertError) {
    console.error('Failed to create setup token:', insertError.message);
    return;
  }

  const setupLink = `https://tastelanc.com/setup-account?token=${token}`;
  const sendToEmail = testEmail || targetEmail;

  // Send branded email
  const { error: emailError } = await resend.emails.send({
    from: 'TasteLanc <hello@tastelanc.com>',
    to: sendToEmail,
    subject: `Welcome to TasteLanc! Set Up Your ${restaurantName} Account`,
    html: generateBrandedWelcomeEmail(setupLink, contactName, restaurantName, coverImageUrl),
  });

  if (emailError) {
    console.error('Failed to send email:', emailError);
    return;
  }

  console.log(`\n✅ Branded welcome email sent to ${sendToEmail}`);
  if (testEmail) {
    console.log(`   (Test mode: email for ${targetEmail} sent to ${testEmail})`);
  }
  console.log(`📎 Setup link: ${setupLink}`);
  console.log(`🖼️  Cover image: ${coverImageUrl ? 'included' : 'not available'}`);
}

// Parse command line args
const targetEmail = process.argv[2];
const testFlag = process.argv[3];
const testEmail = testFlag === '--test' ? process.argv[4] : undefined;

if (!targetEmail) {
  console.log('Usage: npx tsx scripts/resend-welcome-email.ts <email>');
  console.log('       npx tsx scripts/resend-welcome-email.ts <email> --test <your-email>');
  console.log('');
  console.log('Examples:');
  console.log('  npx tsx scripts/resend-welcome-email.ts wyatt@example.com');
  console.log('  npx tsx scripts/resend-welcome-email.ts wyatt@example.com --test leandertoney@gmail.com');
  process.exit(1);
}

resendWelcomeEmail(targetEmail, testEmail).catch(console.error);
