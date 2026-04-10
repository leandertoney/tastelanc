import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { generateCarouselSlides } from '@/lib/instagram/overlay';

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { id } = params;
  const { borderColor, accentColor } = await request.json();

  const supabase = createServiceRoleClient();

  // Get the existing post to know what content to regenerate
  const { data: post, error: postErr } = await supabase
    .from('instagram_posts')
    .select('*')
    .eq('id', id)
    .single();

  if (postErr || !post) {
    return NextResponse.json({ error: 'Post not found' }, { status: 404 });
  }

  // Get the market
  const { data: market } = await supabase
    .from('markets')
    .select('id, slug, name')
    .eq('id', post.market_id)
    .single();

  if (!market) {
    return NextResponse.json({ error: 'Market not found' }, { status: 404 });
  }

  // Get restaurants with uploaded photos for this market
  const { data: bars } = await supabase
    .from('happy_hours')
    .select('restaurant_id, start_time, end_time, restaurants!inner(name, cover_image_url)')
    .eq('restaurants.market_id', market.id)
    .not('restaurants.cover_image_url', 'is', null)
    .limit(30);

  const seen = new Set<string>();
  const goodBars = (bars || []).filter(b => {
    const r = b.restaurants as any;
    if (seen.has(r.name) || !r.cover_image_url?.includes('supabase')) return false;
    seen.add(r.name);
    return true;
  }).slice(0, 4);

  if (goodBars.length === 0) {
    return NextResponse.json({ error: 'No restaurants with photos found' }, { status: 400 });
  }

  function formatTime(t: string | null): string {
    if (!t) return '';
    const [h, m] = t.split(':');
    const hr = parseInt(h);
    const ampm = hr >= 12 ? 'pm' : 'am';
    const h12 = hr % 12 || 12;
    return m === '00' ? `${h12}${ampm}` : `${h12}:${m}${ampm}`;
  }

  const candidates = goodBars.map(b => {
    const r = b.restaurants as any;
    const start = formatTime(b.start_time);
    const end = formatTime(b.end_time);
    const timeStr = start && end ? `${start}–${end}` : start || 'daily';
    return {
      restaurant_name: r.name,
      detail_text: `Happy Hour ${timeStr}`,
      image_url: r.cover_image_url,
      cover_image_url: r.cover_image_url,
    };
  });

  const marketConfig = {
    market_slug: market.slug,
    market_id: market.id,
    market_name: market.name,
    county: '',
    state: 'PA',
    instagram_account: null,
  };

  const today = post.post_date || new Date().toISOString().split('T')[0];

  try {
    // TODO: Pass borderColor and accentColor through to composeCoverSlide
    // For now, regenerate with the default pipeline
    const urls = await generateCarouselSlides({
      supabase,
      market: marketConfig,
      candidates,
      headline: { count: '15', label: 'Happy Hours', dayLabel: 'Happy Hour Tonight' },
      totalCount: 45,
      date: today,
    });

    // Update the post with new slide URLs
    await supabase
      .from('instagram_posts')
      .update({ media_urls: urls })
      .eq('id', id);

    return NextResponse.json({ media_urls: urls });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
