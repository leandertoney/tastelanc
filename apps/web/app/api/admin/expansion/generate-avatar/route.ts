/**
 * Generate a single DALL-E avatar for one brand draft.
 * Called one at a time from the dashboard to stay within Netlify's 26s timeout.
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createSupabaseAdmin } from '@supabase/supabase-js';
import { verifyAdminAccess } from '@/lib/auth/admin-access';
import { generateAvatarImage } from '@/lib/ai/expansion-agent';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function POST(request: Request) {
  try {
    const authClient = await createClient();
    const admin = await verifyAdminAccess(authClient);
    if (admin.role !== 'super_admin' && admin.role !== 'co_founder') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { brandDraftId, autoNext } = await request.json();

  const supabase = createSupabaseAdmin(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  let draft: Record<string, unknown> | null = null;
  let remainingCount = 0;

  if (autoNext) {
    // Find the next brand draft that needs an avatar
    const { data: drafts, count } = await supabase
      .from('expansion_brand_drafts')
      .select('*, expansion_cities(*)', { count: 'exact' })
      .is('avatar_image_url', null)
      .order('created_at', { ascending: true })
      .limit(1);

    if (!drafts || drafts.length === 0) {
      return NextResponse.json({ done: true, remaining: 0 });
    }

    draft = drafts[0];
    remainingCount = (count ?? 1) - 1;
  } else {
    if (!brandDraftId) {
      return NextResponse.json({ error: 'brandDraftId or autoNext required' }, { status: 400 });
    }

    // Fetch specific brand draft
    const { data: d, error: draftError } = await supabase
      .from('expansion_brand_drafts')
      .select('*, expansion_cities(*)')
      .eq('id', brandDraftId)
      .single();

    if (draftError || !d) {
      return NextResponse.json({ error: 'Brand draft not found' }, { status: 404 });
    }

    if (d.avatar_image_url) {
      return NextResponse.json({ avatarUrl: d.avatar_image_url, alreadyExists: true });
    }

    draft = d;
  }

  if (!draft) {
    return NextResponse.json({ error: 'No draft found' }, { status: 404 });
  }

  const city = draft.expansion_cities;
  const regionName = (city.research_data as Record<string, unknown>)?.suggested_region_name as string
    || city.city_name;
  const slug = city.slug || regionName.toLowerCase().replace(/[^a-z0-9]+/g, '-');

  const localCulture = [
    (city.research_data as Record<string, unknown>)?.local_food_traditions,
    (city.research_data as Record<string, unknown>)?.tourism_factors,
    city.dining_scene_description,
  ].filter(Boolean).join('. ').slice(0, 300) || `the ${regionName} area`;

  const avatarUrl = await generateAvatarImage(
    draft.ai_assistant_name,
    regionName,
    draft.colors?.accent || '#4A90D9',
    localCulture,
    slug,
    draft.variant_number || 1
  );

  if (!avatarUrl) {
    return NextResponse.json({ error: 'Avatar generation failed' }, { status: 500 });
  }

  // Update the brand draft with the avatar URL
  await supabase
    .from('expansion_brand_drafts')
    .update({
      avatar_image_url: avatarUrl,
      market_config_json: {
        ...(draft.market_config_json || {}),
        aiAvatarImage: avatarUrl,
      },
    })
    .eq('id', brandDraftId);

  return NextResponse.json({
    avatarUrl,
    brandDraftId: draft.id,
    brandName: draft.ai_assistant_name,
    cityName: (draft.expansion_cities as Record<string, unknown>)?.city_name,
    hasMore: remainingCount > 0,
    remaining: remainingCount,
  });
}
