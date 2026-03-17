import { NextResponse } from 'next/server';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { verifyRestaurantAccess } from '@/lib/auth/restaurant-access';
import { BRAND, getMarketConfig } from '@/config/market';
import { renderRestaurantCampaign } from '@/lib/email-templates/restaurant-campaign-template';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const restaurantId = searchParams.get('restaurant_id');

    if (!restaurantId) {
      return NextResponse.json({ error: 'restaurant_id is required' }, { status: 400 });
    }

    const supabase = await createClient();
    const accessResult = await verifyRestaurantAccess(supabase, restaurantId);
    if (!accessResult.canAccess) {
      return NextResponse.json(
        { error: accessResult.error || 'Access denied' },
        { status: accessResult.userId ? 403 : 401 }
      );
    }

    const serviceClient = createServiceRoleClient();

    // Get campaign
    const { data: campaign } = await serviceClient
      .from('restaurant_email_campaigns')
      .select('*')
      .eq('id', id)
      .eq('restaurant_id', restaurantId)
      .single();

    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    // Get restaurant info + market
    const { data: restaurant } = await serviceClient
      .from('restaurants')
      .select('name, address, market_id, markets(slug)')
      .eq('id', restaurantId)
      .single();

    if (!restaurant) {
      return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 });
    }

    // Resolve market brand for correct preview branding
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const marketsData = (restaurant as any)?.markets;
    const marketSlug: string = Array.isArray(marketsData) ? marketsData[0]?.slug || '' : marketsData?.slug || '';
    const marketBrand = getMarketConfig(marketSlug) || BRAND;

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || `https://${marketBrand.domain}`;
    const unsubscribeUrl = `${baseUrl}/api/unsubscribe?type=restaurant&restaurant_id=${restaurantId}&email=preview@example.com`;

    const html = renderRestaurantCampaign({
      restaurantName: restaurant.name,
      restaurantAddress: restaurant.address || undefined,
      recipientName: 'Preview User',
      body: campaign.body,
      ctaText: campaign.cta_text || undefined,
      ctaUrl: campaign.cta_url || undefined,
      previewText: campaign.preview_text || undefined,
      unsubscribeUrl,
      brandName: marketBrand.name,
      brandDomain: marketBrand.domain,
      brandLogoUrl: `https://${marketBrand.domain}${marketBrand.logoPath}`,
      appStoreUrl: marketBrand.appStoreUrls.ios || undefined,
      playStoreUrl: marketBrand.appStoreUrls.android || undefined,
    });

    return new NextResponse(html, {
      headers: { 'Content-Type': 'text/html' },
    });
  } catch (error) {
    console.error('Error in campaign preview API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
