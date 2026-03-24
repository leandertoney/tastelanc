import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  try {
    const { data: campaigns, error } = await supabaseAdmin
      .from('platform_email_campaigns')
      .select('*, market:markets(name)')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching platform campaigns:', error);
      return NextResponse.json({ error: 'Failed to fetch campaigns' }, { status: 500 });
    }

    return NextResponse.json({ campaigns: campaigns || [] });
  } catch (error) {
    console.error('Error in platform-campaigns GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, subject, preview_text, body: emailBody, cta_text, cta_url, audience_source, audience_market_id } = body;

    if (!name || !subject || !emailBody) {
      return NextResponse.json({ error: 'name, subject, and body are required' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('platform_email_campaigns')
      .insert({
        name,
        subject,
        preview_text: preview_text || null,
        body: emailBody,
        cta_text: cta_text || null,
        cta_url: cta_url || null,
        audience_source: audience_source || null,
        audience_market_id: audience_market_id || null,
        status: 'draft',
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating platform campaign:', error);
      return NextResponse.json({ error: 'Failed to create campaign' }, { status: 500 });
    }

    return NextResponse.json({ campaign: data }, { status: 201 });
  } catch (error) {
    console.error('Error in platform-campaigns POST:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
