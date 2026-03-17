import { NextResponse } from 'next/server';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { verifyRestaurantAccess } from '@/lib/auth/restaurant-access';
import { sendBatchEmails } from '@/lib/resend';
import { BRAND, getMarketConfig } from '@/config/market';
import {
  renderRestaurantCampaign,
  renderRestaurantCampaignPlainText,
} from '@/lib/email-templates/restaurant-campaign-template';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const TIER_CAMPAIGN_LIMITS: Record<string, number> = {
  premium: 4,
  elite: 8,
};

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: campaignId } = await params;
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

    // Get restaurant info (name, address, tier, market)
    const { data: restaurant } = await serviceClient
      .from('restaurants')
      .select('name, address, tier_id, tiers(name), market_id, markets(slug)')
      .eq('id', restaurantId)
      .single();

    if (!restaurant) {
      return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tiers = (restaurant as any).tiers;
    const tierName: string = Array.isArray(tiers) ? tiers[0]?.name || 'basic' : tiers?.name || 'basic';

    // Check tier access
    if (!TIER_CAMPAIGN_LIMITS[tierName]) {
      return NextResponse.json(
        { error: 'Email campaigns require a Premium or Elite subscription' },
        { status: 403 }
      );
    }

    // Check monthly limit
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const { count: monthlyUsage } = await serviceClient
      .from('restaurant_email_campaigns')
      .select('id', { count: 'exact', head: true })
      .eq('restaurant_id', restaurantId)
      .eq('status', 'sent')
      .gte('sent_at', monthStart);

    const limit = TIER_CAMPAIGN_LIMITS[tierName];
    if ((monthlyUsage || 0) >= limit) {
      return NextResponse.json(
        {
          error: 'Monthly email campaign limit reached',
          used: monthlyUsage,
          limit,
        },
        { status: 429 }
      );
    }

    // Get campaign
    const { data: campaign } = await serviceClient
      .from('restaurant_email_campaigns')
      .select('*')
      .eq('id', campaignId)
      .eq('restaurant_id', restaurantId)
      .single();

    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }
    if (campaign.status !== 'draft') {
      return NextResponse.json({ error: 'Campaign has already been sent' }, { status: 400 });
    }

    // Mark as sending
    await serviceClient
      .from('restaurant_email_campaigns')
      .update({ status: 'sending' })
      .eq('id', campaignId);

    // Get active contacts
    const { data: contacts, error: contactsError } = await serviceClient
      .from('restaurant_contacts')
      .select('id, email, name')
      .eq('restaurant_id', restaurantId)
      .eq('is_unsubscribed', false);

    if (contactsError || !contacts || contacts.length === 0) {
      await serviceClient
        .from('restaurant_email_campaigns')
        .update({ status: 'failed' })
        .eq('id', campaignId);
      return NextResponse.json(
        { error: 'No active contacts to send to' },
        { status: 400 }
      );
    }

    // Resolve market brand for correct sender identity
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const marketsData = (restaurant as any)?.markets;
    const marketSlug: string = Array.isArray(marketsData) ? marketsData[0]?.slug || '' : marketsData?.slug || '';
    const marketBrand = getMarketConfig(marketSlug) || BRAND;

    // Build emails — always send from tastelanc.com (verified in Resend)
    // Display name includes market brand for correct branding in inbox
    const fromAddress = `${restaurant.name} via ${marketBrand.name} <campaigns@tastelanc.com>`;
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || `https://${marketBrand.domain}`;

    const emails = contacts.map((contact) => {
      const unsubscribeUrl = `${baseUrl}/api/unsubscribe?type=restaurant&restaurant_id=${restaurantId}&email=${encodeURIComponent(contact.email)}`;

      const brandProps = {
        brandName: marketBrand.name,
        brandDomain: marketBrand.domain,
        brandLogoUrl: `https://${marketBrand.domain}${marketBrand.logoPath}`,
        appStoreUrl: marketBrand.appStoreUrls.ios || undefined,
        playStoreUrl: marketBrand.appStoreUrls.android || undefined,
      };

      const html = renderRestaurantCampaign({
        restaurantName: restaurant.name,
        restaurantAddress: restaurant.address || undefined,
        recipientName: contact.name || undefined,
        body: campaign.body,
        ctaText: campaign.cta_text || undefined,
        ctaUrl: campaign.cta_url || undefined,
        previewText: campaign.preview_text || undefined,
        unsubscribeUrl,
        ...brandProps,
      });

      const text = renderRestaurantCampaignPlainText({
        restaurantName: restaurant.name,
        restaurantAddress: restaurant.address || undefined,
        recipientName: contact.name || undefined,
        body: campaign.body,
        ctaText: campaign.cta_text || undefined,
        ctaUrl: campaign.cta_url || undefined,
        unsubscribeUrl,
        ...brandProps,
      });

      return {
        to: contact.email,
        subject: campaign.subject,
        html,
        text,
        from: fromAddress,
      };
    });

    // Send via Resend
    const results = await sendBatchEmails(emails);

    // Extract Resend IDs from batch results
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const resendIds: string[] = [];
    let hasError = false;
    for (const result of results) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const r = result as any;
      if (r.error) {
        console.error('Resend batch error:', r.error);
        hasError = true;
      } else if (r.data && Array.isArray(r.data)) {
        for (const item of r.data) {
          if (item.id) resendIds.push(item.id);
        }
      } else if (r.data?.id) {
        resendIds.push(r.data.id);
      }
    }

    // If no Resend IDs were returned, the send failed
    if (resendIds.length === 0) {
      await serviceClient
        .from('restaurant_email_campaigns')
        .update({ status: 'failed' })
        .eq('id', campaignId);
      return NextResponse.json(
        { error: 'Failed to send emails. Please check your sending domain configuration.' },
        { status: 500 }
      );
    }

    // Track sends with Resend IDs
    const sendRecords = contacts.map((contact, i) => ({
      campaign_id: campaignId,
      restaurant_id: restaurantId,
      contact_id: contact.id,
      email: contact.email,
      status: 'sent',
      resend_id: resendIds[i] || null,
      sent_at: new Date().toISOString(),
    }));

    if (sendRecords.length > 0) {
      await serviceClient.from('restaurant_email_sends').insert(sendRecords);
    }

    const sentCount = resendIds.length;

    // Update campaign
    await serviceClient
      .from('restaurant_email_campaigns')
      .update({
        status: 'sent',
        recipient_count: contacts.length,
        sent_count: sentCount,
        sent_at: new Date().toISOString(),
      })
      .eq('id', campaignId);

    return NextResponse.json({
      success: true,
      sent: sentCount,
      total: contacts.length,
    });
  } catch (error) {
    console.error('Error sending campaign:', error);
    return NextResponse.json({ error: 'Failed to send campaign' }, { status: 500 });
  }
}
