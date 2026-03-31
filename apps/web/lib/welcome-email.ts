import crypto from 'crypto';
import { Resend } from 'resend';
import { createClient } from '@supabase/supabase-js';
import { BRAND, MARKET_CONFIG, type MarketBrand } from '@/config/market';

const resend = new Resend(process.env.RESEND_API_KEY);
const EMAIL_SENDER_DOMAIN = 'tastelanc.com';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseAdminClient = ReturnType<typeof createClient<any>>;

export async function generateSetupToken(
  supabaseAdmin: SupabaseAdminClient,
  userId: string,
  email: string,
  options?: { name?: string; restaurantName?: string; coverImageUrl?: string }
): Promise<string> {
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  await supabaseAdmin.from('password_setup_tokens').insert({
    user_id: userId,
    email,
    token,
    expires_at: expiresAt.toISOString(),
    name: options?.name || null,
    restaurant_name: options?.restaurantName || null,
    cover_image_url: options?.coverImageUrl || null,
  });

  return token;
}

export async function getMarketBrandForRestaurant(
  supabaseAdmin: SupabaseAdminClient,
  restaurantId: string
): Promise<MarketBrand> {
  try {
    const { data } = await supabaseAdmin
      .from('restaurants')
      .select('market_id, markets!inner(slug)')
      .eq('id', restaurantId)
      .single();

    if (data) {
      const market = data.markets as unknown as { slug: string };
      const marketSlug = market?.slug;
      if (marketSlug && MARKET_CONFIG[marketSlug]) {
        return MARKET_CONFIG[marketSlug];
      }
    }
  } catch (err) {
    console.error('Failed to look up market brand for restaurant:', err);
  }
  return BRAND;
}

function generateBrandedWelcomeEmail(
  setupLink: string,
  contactName: string,
  restaurantName: string,
  coverImageUrl?: string,
  marketBrand: MarketBrand = BRAND
): string {
  const firstName = contactName?.split(' ')[0] || '';

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
                <tr>
                  <td style="position: relative;">
                    <img src="${coverImageUrl}" alt="${restaurantName}" width="600" style="display: block; width: 100%; height: 280px; object-fit: cover;" />
                    <div style="position: absolute; bottom: 0; left: 0; right: 0; padding: 30px; background: linear-gradient(transparent, rgba(0,0,0,0.8));"></div>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 40px;">
                    <img src="https://${marketBrand.domain}${marketBrand.logoPath}" alt="${marketBrand.name}" height="36" style="margin-bottom: 24px;" />
                    <div style="background-color: #2563eb; color: white; display: inline-block; padding: 8px 16px; border-radius: 8px; font-weight: 600; font-size: 14px; margin-bottom: 20px;">
                      ${restaurantName}
                    </div>
                    <h1 style="color: #ffffff; font-size: 28px; margin: 0 0 16px 0; font-weight: 700;">
                      Hey ${firstName}! 👋
                    </h1>
                    <p style="color: #a3a3a3; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
                      Welcome to ${marketBrand.name}! Your <strong style="color: #ffffff;">${restaurantName}</strong> dashboard is ready and waiting for you.
                    </p>
                    <p style="color: #a3a3a3; font-size: 16px; line-height: 1.6; margin: 0 0 32px 0;">
                      Just one quick step — set your password and you're in. Takes less than a minute.
                    </p>
                    <table cellpadding="0" cellspacing="0" style="margin-bottom: 32px;">
                      <tr>
                        <td style="background-color: #3b82f6; border-radius: 10px;">
                          <a href="${setupLink}" style="display: inline-block; padding: 16px 40px; color: #ffffff; text-decoration: none; font-weight: 600; font-size: 16px;">
                            Set Up Your Account →
                          </a>
                        </td>
                      </tr>
                    </table>
                    <p style="color: #737373; font-size: 14px; line-height: 1.6; margin: 0 0 8px 0;">Once you're in, you can:</p>
                    <ul style="color: #a3a3a3; font-size: 14px; line-height: 1.8; margin: 0 0 24px 0; padding-left: 20px;">
                      <li>Update your restaurant profile &amp; photos</li>
                      <li>Post specials and happy hours</li>
                      <li>See your analytics and engagement</li>
                      <li>Connect with ${marketBrand.countyShort} foodies</li>
                    </ul>
                    <p style="color: #737373; font-size: 14px; margin: 0;">Questions? Just reply to this email — we're here to help!</p>
                    <hr style="border: none; border-top: 1px solid #333; margin: 32px 0;" />
                    <p style="color: #525252; font-size: 12px; text-align: center; margin: 0;">
                      ${marketBrand.name} — ${marketBrand.countyShort}'s Local Food Guide<br/>
                      <a href="https://${marketBrand.domain}" style="color: #6b7280;">${marketBrand.domain}</a>
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
                  <img src="https://${marketBrand.domain}${marketBrand.logoPath}" alt="${marketBrand.name}" height="36" style="margin-bottom: 24px;" />
                  <div style="background-color: #2563eb; color: white; display: inline-block; padding: 8px 16px; border-radius: 8px; font-weight: 600; font-size: 14px; margin-bottom: 20px;">
                    ${restaurantName}
                  </div>
                  <h1 style="color: #ffffff; font-size: 28px; margin: 0 0 16px 0; font-weight: 700;">
                    Hey ${firstName}! 👋
                  </h1>
                  <p style="color: #a3a3a3; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
                    Welcome to ${marketBrand.name}! Your <strong style="color: #ffffff;">${restaurantName}</strong> dashboard is ready and waiting for you.
                  </p>
                  <p style="color: #a3a3a3; font-size: 16px; line-height: 1.6; margin: 0 0 32px 0;">
                    Just one quick step — set your password and you're in. Takes less than a minute.
                  </p>
                  <table cellpadding="0" cellspacing="0" style="margin-bottom: 32px;">
                    <tr>
                      <td style="background-color: #3b82f6; border-radius: 10px;">
                        <a href="${setupLink}" style="display: inline-block; padding: 16px 40px; color: #ffffff; text-decoration: none; font-weight: 600; font-size: 16px;">
                          Set Up Your Account →
                        </a>
                      </td>
                    </tr>
                  </table>
                  <p style="color: #737373; font-size: 14px; line-height: 1.6; margin: 0 0 8px 0;">Once you're in, you can:</p>
                  <ul style="color: #a3a3a3; font-size: 14px; line-height: 1.8; margin: 0 0 24px 0; padding-left: 20px;">
                    <li>Update your restaurant profile &amp; photos</li>
                    <li>Post specials and happy hours</li>
                    <li>See your analytics and engagement</li>
                    <li>Connect with ${marketBrand.countyShort} foodies</li>
                  </ul>
                  <p style="color: #737373; font-size: 14px; margin: 0;">Questions? Just reply to this email — we're here to help!</p>
                  <hr style="border: none; border-top: 1px solid #333; margin: 32px 0;" />
                  <p style="color: #525252; font-size: 12px; text-align: center; margin: 0;">
                    ${marketBrand.name} — ${marketBrand.countyShort}'s Local Food Guide<br/>
                    <a href="https://${marketBrand.domain}" style="color: #6b7280;">${marketBrand.domain}</a>
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

export async function sendBrandedWelcomeEmailWithToken(
  supabaseAdmin: SupabaseAdminClient,
  email: string,
  contactName: string,
  restaurantName: string,
  coverImageUrl?: string,
  userId?: string,
  marketBrand: MarketBrand = BRAND,
): Promise<void> {
  if (!userId) return;

  const setupToken = await generateSetupToken(supabaseAdmin, userId, email, {
    name: contactName,
    restaurantName,
    coverImageUrl,
  });
  const setupLink = `https://${marketBrand.domain}/setup-account?token=${setupToken}`;

  await resend.emails.send({
    from: `${marketBrand.name} <hello@${EMAIL_SENDER_DOMAIN}>`,
    to: email,
    subject: `Welcome to ${marketBrand.name}! Set Up Your ${restaurantName} Account`,
    html: generateBrandedWelcomeEmail(setupLink, contactName, restaurantName, coverImageUrl, marketBrand),
  });
  console.log(`Branded welcome email sent to ${email} (market: ${marketBrand.name})`);
}
