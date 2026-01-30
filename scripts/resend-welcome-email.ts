// Resend welcome email with new setup token
// Usage: npx tsx scripts/resend-welcome-email.ts <email>

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

async function resendWelcomeEmail(email: string) {
  console.log(`Looking up user: ${email}`);

  // Find the user
  const { data: users, error: userError } = await supabase.auth.admin.listUsers();
  if (userError) {
    console.error('Failed to list users:', userError);
    return;
  }

  const user = users.users.find(u => u.email === email);
  if (!user) {
    console.error(`User not found: ${email}`);
    return;
  }

  console.log(`Found user: ${user.id}`);

  // Get their profile to find their business name
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, role')
    .eq('id', user.id)
    .single();

  // Check if they're a restaurant owner or self-promoter
  let businessName = profile?.full_name || 'your business';

  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('name')
    .eq('owner_id', user.id)
    .limit(1)
    .single();

  if (restaurant) {
    businessName = restaurant.name;
  }

  const { data: selfPromoter } = await supabase
    .from('self_promoters')
    .select('name')
    .eq('owner_id', user.id)
    .limit(1)
    .single();

  if (selfPromoter) {
    businessName = selfPromoter.name;
  }

  // Generate setup token
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  const { error: insertError } = await supabase.from('password_setup_tokens').insert({
    user_id: user.id,
    email,
    token,
    expires_at: expiresAt.toISOString(),
  });

  if (insertError) {
    console.error('Failed to create setup token:', insertError.message);
    console.log('\nMake sure you have run the migration to create the password_setup_tokens table:');
    console.log(`
CREATE TABLE IF NOT EXISTS public.password_setup_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  token text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_password_setup_tokens_token ON public.password_setup_tokens(token);
ALTER TABLE public.password_setup_tokens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role only" ON public.password_setup_tokens FOR ALL USING (false);
    `);
    return;
  }

  const setupLink = `https://tastelanc.com/setup-account?token=${token}`;
  const firstName = profile?.full_name?.split(' ')[0] || '';

  // Send email
  const { error: emailError } = await resend.emails.send({
    from: 'TasteLanc <hello@tastelanc.com>',
    to: email,
    subject: `Welcome to TasteLanc! Set Up Your ${businessName} Account`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #1a1a1a; font-size: 28px; margin: 0;">Welcome to TasteLanc!</h1>
        </div>

        <p style="font-size: 16px; color: #333; line-height: 1.6;">Hi${firstName ? ` ${firstName}` : ''},</p>

        <p style="font-size: 16px; color: #333; line-height: 1.6;">
          Thank you for joining TasteLanc! Your account for <strong>${businessName}</strong> is ready.
        </p>

        <p style="font-size: 16px; color: #333; line-height: 1.6;">
          To get started, click the button below to set up your password and access your dashboard:
        </p>

        <div style="text-align: center; margin: 35px 0;">
          <a href="${setupLink}" style="background-color: #3b82f6; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: 600; display: inline-block;">
            Set Up Your Account
          </a>
        </div>

        <p style="font-size: 16px; color: #333; line-height: 1.6;">
          Once you're set up, you can manage your profile, update hours, add specials, and more.
        </p>

        <p style="font-size: 16px; color: #333; line-height: 1.6;">
          If you have any questions, just reply to this email - we're here to help!
        </p>

        <p style="font-size: 16px; color: #333; line-height: 1.6;">
          Cheers,<br/>
          <strong>The TasteLanc Team</strong>
        </p>

        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;" />

        <p style="font-size: 12px; color: #9ca3af; text-align: center;">
          TasteLanc - Lancaster's Local Food Guide<br/>
          <a href="https://tastelanc.com" style="color: #6b7280;">tastelanc.com</a>
        </p>
      </div>
    `,
  });

  if (emailError) {
    console.error('Failed to send email:', emailError);
    return;
  }

  console.log(`\n✅ Welcome email sent to ${email}`);
  console.log(`📎 Setup link: ${setupLink}`);
}

const email = process.argv[2];
if (!email) {
  console.log('Usage: npx tsx scripts/resend-welcome-email.ts <email>');
  console.log('Example: npx tsx scripts/resend-welcome-email.ts wyatt@example.com');
  process.exit(1);
}

resendWelcomeEmail(email).catch(console.error);
