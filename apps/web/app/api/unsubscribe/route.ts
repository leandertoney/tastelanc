import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Use service role client for unsubscribe (no auth required)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');
    const isTest = searchParams.get('test') === 'true';
    const type = searchParams.get('type'); // 'b2b' for business leads

    if (!email) {
      return NextResponse.redirect(
        new URL('/unsubscribe?error=missing_email', request.url)
      );
    }

    // Don't actually unsubscribe for test emails
    if (isTest) {
      return NextResponse.redirect(
        new URL('/unsubscribe?success=true&test=true', request.url)
      );
    }

    // Handle restaurant-specific unsubscribes
    if (type === 'restaurant') {
      const restaurantIdParam = searchParams.get('restaurant_id');
      if (!restaurantIdParam) {
        return NextResponse.redirect(
          new URL('/unsubscribe?error=missing_restaurant', request.url)
        );
      }

      const { error: restError } = await supabase
        .from('restaurant_contacts')
        .update({
          is_unsubscribed: true,
          unsubscribed_at: new Date().toISOString(),
        })
        .eq('restaurant_id', restaurantIdParam)
        .eq('email', email.toLowerCase());

      if (restError) {
        console.error('Restaurant unsubscribe error:', restError);
        return NextResponse.redirect(
          new URL('/unsubscribe?error=failed', request.url)
        );
      }

      return NextResponse.redirect(
        new URL('/unsubscribe?success=true', request.url)
      );
    }

    // Determine which table to use based on type
    const tableName = type === 'b2b' ? 'b2b_unsubscribes' : 'email_unsubscribes';

    // Add to appropriate unsubscribe list
    const { error } = await supabase.from(tableName).upsert(
      {
        email: email.toLowerCase(),
        unsubscribed_at: new Date().toISOString(),
      },
      { onConflict: 'email' }
    );

    if (error) {
      console.error('Unsubscribe error:', error);
      return NextResponse.redirect(
        new URL('/unsubscribe?error=failed', request.url)
      );
    }

    return NextResponse.redirect(
      new URL('/unsubscribe?success=true', request.url)
    );
  } catch (error) {
    console.error('Unsubscribe error:', error);
    return NextResponse.redirect(
      new URL('/unsubscribe?error=server', request.url)
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Add to unsubscribe list
    const { error } = await supabase.from('email_unsubscribes').upsert(
      {
        email: email.toLowerCase(),
        unsubscribed_at: new Date().toISOString(),
      },
      { onConflict: 'email' }
    );

    if (error) {
      console.error('Unsubscribe error:', error);
      return NextResponse.json(
        { error: 'Failed to unsubscribe' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Unsubscribe error:', error);
    return NextResponse.json(
      { error: 'Server error' },
      { status: 500 }
    );
  }
}
