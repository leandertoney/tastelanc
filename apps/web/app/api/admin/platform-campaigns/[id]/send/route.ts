import { NextResponse } from 'next/server';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { verifyAdminAccess } from '@/lib/auth/admin-access';
import { sendBatchEmails } from '@/lib/resend';
import { BRAND, getMarketConfig } from '@/config/market';
import {
  renderPlatformCampaign,
  renderPlatformCampaignPlainText,
} from '@/lib/email-templates/platform-campaign-template';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: campaignId } = await params;

    const supabase = await createClient();
    try { await verifyAdminAccess(supabase); }
    catch (err: unknown) {
      const e = err as { message?: string; status?: number };
      return NextResponse.json({ error: e.message }, { status: e.status || 500 });
    }

    const serviceClient = createServiceRoleClient();

    // Get campaign
    const { data: campaign } = await serviceClient
      .from('platform_email_campaigns')
      .select('*, market:markets(slug, name)')
      .eq('id', campaignId)
      .single();

    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }
    if (campaign.status !== 'draft') {
      return NextResponse.json({ error: 'Campaign has already been sent' }, { status: 400 });
    }

    // Mark as sending
    await serviceClient
      .from('platform_email_campaigns')
      .update({ status: 'sending' })
      .eq('id', campaignId);

    // Get active contacts filtered by audience
    let contactsQuery = serviceClient
      .from('platform_contacts')
      .select('id, email, name')
      .eq('is_unsubscribed', false);

    if (campaign.audience_market_id) {
      contactsQuery = contactsQuery.eq('market_id', campaign.audience_market_id);
    }
    if (campaign.audience_source) {
      contactsQuery = contactsQuery.eq('source_label', campaign.audience_source);
    }

    const { data: contacts, error: contactsError } = await contactsQuery;

    if (contactsError || !contacts || contacts.length === 0) {
      await serviceClient
        .from('platform_email_campaigns')
        .update({ status: 'failed' })
        .eq('id', campaignId);
      return NextResponse.json(
        { error: 'No active contacts to send to' },
        { status: 400 }
      );
    }

    // Resolve market brand
    const marketData = (campaign as Record<string, unknown>).market as { slug: string; name: string } | null;
    const marketSlug = marketData?.slug || '';
    const brand = getMarketConfig(marketSlug) || BRAND;

    // All markets send from tastelanc.com (verified Resend domain)
    const fromAddress = `${brand.name} <campaigns@tastelanc.com>`;
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || `https://${brand.domain}`;

    const brandProps = {
      brandName: brand.name,
      brandDomain: brand.domain,
      brandLogoUrl: `https://${brand.domain}${brand.logoPath}`,
      appStoreUrl: brand.appStoreUrls.ios || undefined,
      playStoreUrl: brand.appStoreUrls.android || undefined,
    };

    // Build emails
    const emails = contacts.map((contact) => {
      const unsubscribeUrl = `${baseUrl}/api/unsubscribe?type=platform&email=${encodeURIComponent(contact.email)}`;

      const html = renderPlatformCampaign({
        recipientName: contact.name || undefined,
        body: campaign.body,
        ctaText: campaign.cta_text || undefined,
        ctaUrl: campaign.cta_url || undefined,
        previewText: campaign.preview_text || undefined,
        unsubscribeUrl,
        ...brandProps,
      });

      const text = renderPlatformCampaignPlainText({
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
    const resendIds: string[] = [];
    for (const result of results) {
      const r = result as Record<string, unknown>;
      if (r.error) {
        console.error('Resend batch error:', r.error);
      } else if (r.data && Array.isArray(r.data)) {
        for (const item of r.data as { id?: string }[]) {
          if (item.id) resendIds.push(item.id);
        }
      } else if (r.data && (r.data as { id?: string }).id) {
        resendIds.push((r.data as { id: string }).id);
      }
    }

    // If no Resend IDs were returned, the send failed
    if (resendIds.length === 0) {
      await serviceClient
        .from('platform_email_campaigns')
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
      contact_id: contact.id,
      email: contact.email,
      status: 'sent',
      resend_id: resendIds[i] || null,
      sent_at: new Date().toISOString(),
    }));

    if (sendRecords.length > 0) {
      await serviceClient.from('platform_email_sends').insert(sendRecords);
    }

    const sentCount = resendIds.length;

    // Update campaign
    await serviceClient
      .from('platform_email_campaigns')
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
    console.error('Error sending platform campaign:', error);
    return NextResponse.json({ error: 'Failed to send campaign' }, { status: 500 });
  }
}
