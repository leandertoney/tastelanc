import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Use service role key to bypass RLS for inserts
function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(request: Request) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const { email, source = 'premium_page', referralCode } = await request.json();

    if (!email || !email.includes('@')) {
      return NextResponse.json(
        { error: 'Valid email is required' },
        { status: 400 }
      );
    }

    // Check if email already exists
    const { data: existing } = await supabaseAdmin
      .from('early_access_signups')
      .select('id, created_at')
      .eq('email', email.toLowerCase().trim())
      .single();

    if (existing) {
      // Email already signed up - still return success
      return NextResponse.json({
        success: true,
        message: 'Welcome back! You already have early access.',
        alreadySignedUp: true,
      });
    }

    // Insert new signup
    const { error } = await supabaseAdmin
      .from('early_access_signups')
      .insert({
        email: email.toLowerCase().trim(),
        source,
        referral_code: referralCode || null,
      });

    if (error) {
      console.error('Error saving early access signup:', error);
      return NextResponse.json(
        { error: 'Failed to save signup' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Welcome to TasteLanc+ Early Access!',
      alreadySignedUp: false,
    });
  } catch (error) {
    console.error('Early access signup error:', error);
    return NextResponse.json(
      { error: 'Something went wrong' },
      { status: 500 }
    );
  }
}

// Get signup count for social proof
export async function GET() {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const { count } = await supabaseAdmin
      .from('early_access_signups')
      .select('*', { count: 'exact', head: true });

    return NextResponse.json({ count: count || 0 });
  } catch (error) {
    return NextResponse.json({ count: 0 });
  }
}
