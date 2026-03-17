import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { MARKET_SLUG } from '@/config/market';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, email, phone, business_name, message, interested_plan } = body;

    // Validate required fields
    if (!name || !email || !message) {
      return NextResponse.json(
        { error: 'Name, email, and message are required' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Resolve current deployment's market ID
    const { data: market } = await supabase
      .from('markets')
      .select('id')
      .eq('slug', MARKET_SLUG)
      .single();

    // Store in Supabase
    const { error } = await supabase
      .from('contact_submissions')
      .insert({
        name,
        email,
        phone: phone || null,
        business_name: business_name || null,
        message,
        interested_plan: interested_plan || null,
        market_id: market?.id || null,
      });

    if (error) {
      console.error('Error storing contact submission:', error);
      return NextResponse.json(
        { error: 'Failed to submit contact form' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error processing contact form:', error);
    return NextResponse.json(
      { error: 'Failed to process contact form' },
      { status: 500 }
    );
  }
}
