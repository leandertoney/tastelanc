import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { createClient } from '@supabase/supabase-js';

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(request: Request) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const { pagePath, visitorId } = await request.json();
    const headersList = await headers();

    const userAgent = headersList.get('user-agent') || '';
    const referrer = headersList.get('referer') || '';

    // Don't track bots
    const isBot = /bot|crawl|spider|slurp|googlebot/i.test(userAgent);
    if (isBot) {
      return NextResponse.json({ success: true, tracked: false });
    }

    await supabaseAdmin.from('page_views').insert({
      page_path: pagePath,
      visitor_id: visitorId,
      referrer,
      user_agent: userAgent,
    });

    return NextResponse.json({ success: true, tracked: true });
  } catch (error) {
    console.error('Error tracking page view:', error);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
