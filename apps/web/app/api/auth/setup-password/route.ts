import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Generate a setup token for a user (internal utility, not exported)
async function generateSetupToken(userId: string, email: string): Promise<string> {
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  await supabaseAdmin.from('password_setup_tokens').insert({
    user_id: userId,
    email,
    token,
    expires_at: expiresAt.toISOString(),
  });

  return token;
}

// Verify a setup token and set the password
export async function POST(request: Request) {
  try {
    const { token, password } = await request.json();

    if (!token || !password) {
      return NextResponse.json({ error: 'Token and password required' }, { status: 400 });
    }

    if (password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
    }

    // Look up the token
    const { data: tokenData, error: tokenError } = await supabaseAdmin
      .from('password_setup_tokens')
      .select('*')
      .eq('token', token)
      .is('used_at', null)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (tokenError || !tokenData) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 400 });
    }

    // Update the user's password
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      tokenData.user_id,
      { password }
    );

    if (updateError) {
      return NextResponse.json({ error: 'Failed to set password' }, { status: 500 });
    }

    // Mark token as used
    await supabaseAdmin
      .from('password_setup_tokens')
      .update({ used_at: new Date().toISOString() })
      .eq('id', tokenData.id);

    return NextResponse.json({ success: true, email: tokenData.email });
  } catch (error) {
    console.error('Setup password error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// Verify a token is valid (for the setup page to check before showing the form)
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const token = url.searchParams.get('token');

    if (!token) {
      return NextResponse.json({ valid: false, error: 'No token provided' }, { status: 400 });
    }

    const { data: tokenData, error } = await supabaseAdmin
      .from('password_setup_tokens')
      .select('email, expires_at, used_at')
      .eq('token', token)
      .single();

    if (error || !tokenData) {
      return NextResponse.json({ valid: false, error: 'Token not found' }, { status: 404 });
    }

    if (tokenData.used_at) {
      return NextResponse.json({ valid: false, error: 'Token already used' }, { status: 400 });
    }

    if (new Date(tokenData.expires_at) < new Date()) {
      return NextResponse.json({ valid: false, error: 'Token expired' }, { status: 400 });
    }

    return NextResponse.json({ valid: true, email: tokenData.email });
  } catch (error) {
    console.error('Verify token error:', error);
    return NextResponse.json({ valid: false, error: 'Server error' }, { status: 500 });
  }
}
