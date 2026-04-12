import { NextResponse } from 'next/server';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { verifyAdminAccess } from '@/lib/auth/admin-access';
import { BRAND, getMarketConfig } from '@/config/market';
import { renderPlatformCampaign } from '@/lib/email-templates/platform-campaign-template';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    try { await verifyAdminAccess(supabase); }
    catch (err: unknown) {
      const e = err as { message?: string; status?: number };
      return NextResponse.json({ error: e.message }, { status: e.status || 500 });
    }

    const serviceClient = createServiceRoleClient();

    const { data: campaign, error } = await serviceClient
      .from('platform_email_campaigns')
      .select('*, market:markets(slug)')
      .eq('id', id)
      .single();

    if (error || !campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    // Resolve market brand
    const marketData = (campaign as Record<string, unknown>).market as { slug: string } | null;
    const marketSlug = marketData?.slug || '';
    const brand = getMarketConfig(marketSlug) || BRAND;

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || `https://${brand.domain}`;

    const html = renderPlatformCampaign({
      recipientName: 'Preview User',
      body: campaign.body,
      ctaText: campaign.cta_text || undefined,
      ctaUrl: campaign.cta_url || undefined,
      previewText: campaign.preview_text || undefined,
      unsubscribeUrl: `${baseUrl}/api/unsubscribe?type=platform&email=preview%40example.com&test=true`,
      brandName: brand.name,
      brandDomain: brand.domain,
      brandLogoUrl: `https://${brand.domain}${brand.logoPath}`,
      appStoreUrl: brand.appStoreUrls.ios || undefined,
      playStoreUrl: brand.appStoreUrls.android || undefined,
    });

    return new Response(html, {
      headers: { 'Content-Type': 'text/html' },
    });
  } catch (error) {
    console.error('Error in platform-campaigns [id] preview:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
