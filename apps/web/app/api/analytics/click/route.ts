import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  // Validate API key
  const apiKey = request.headers.get('x-analytics-api-key');
  if (!apiKey || apiKey !== process.env.ANALYTICS_API_KEY) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { click_type?: string; source?: string; visitor_id?: string; metadata?: Record<string, unknown> };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { click_type, source, visitor_id, metadata } = body;

  if (!click_type || !source) {
    return NextResponse.json({ error: 'click_type and source are required' }, { status: 400 });
  }

  const supabase = createServiceRoleClient();
  const { error } = await supabase.from('analytics_clicks').insert({
    click_type,
    source,
    visitor_id: visitor_id ?? null,
    restaurant_id: null,
    metadata: metadata ?? null,
  });

  if (error) {
    console.error('[analytics/click] insert error:', error);
    return NextResponse.json({ error: 'Failed to record click' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
