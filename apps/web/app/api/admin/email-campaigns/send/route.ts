import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { verifyAdminAccess } from '@/lib/auth/admin-access';
import {
  resend,
  getRecipientsBySegment,
  getBusinessLeadsByFilter,
  EMAIL_CONFIG,
  type BusinessLeadFilter,
} from '@/lib/resend';
import { renderPromotionalEmail } from '@/lib/email-templates/promotional-template';
import { renderB2BEmail } from '@/lib/email-templates/b2b-outreach-template';
import { BRAND } from '@/config/market';
import { SENDER_IDENTITIES } from '@/config/sender-identities';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    let admin;
    try { admin = await verifyAdminAccess(supabase); }
    catch (err: any) { return NextResponse.json({ error: err.message }, { status: err.status || 500 }); }

    const body = await request.json();
    const { campaignId } = body;

    if (!campaignId) {
      return NextResponse.json(
        { error: 'Campaign ID is required' },
        { status: 400 }
      );
    }

    // Fetch campaign
    const { data: campaign, error: campaignError } = await supabase
      .from('email_campaigns')
      .select('*')
      .eq('id', campaignId)
      .single();

    if (campaignError || !campaign) {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      );
    }

    if (campaign.status === 'sent') {
      return NextResponse.json(
        { error: 'Campaign already sent' },
        { status: 400 }
      );
    }

    // Update campaign status to sending
    await supabase
      .from('email_campaigns')
      .update({ status: 'sending' })
      .eq('id', campaignId);

    // Determine campaign type (default to consumer for backwards compatibility)
    const campaignType = campaign.campaign_type || 'consumer';
    const isB2B = campaignType === 'b2b';

    // Get recipients based on campaign type
    let recipients: Array<{ id: string; email: string; business_name?: string; contact_name?: string | null }>;

    if (isB2B) {
      // B2B campaign - get business leads
      const filter: BusinessLeadFilter = campaign.business_lead_filter || {};
      recipients = await getBusinessLeadsByFilter(supabase, filter);
    } else {
      // Consumer campaign - get from early_access_signups
      recipients = await getRecipientsBySegment(
        supabase,
        campaign.segment as 'all' | 'unconverted' | 'converted'
      );
    }

    if (recipients.length === 0) {
      await supabase
        .from('email_campaigns')
        .update({ status: 'draft' })
        .eq('id', campaignId);

      return NextResponse.json(
        { error: `No recipients found for this ${isB2B ? 'filter' : 'segment'}` },
        { status: 400 }
      );
    }

    // Send emails in batches
    let totalSent = 0;
    let totalFailed = 0;
    const sendRecords: Array<{
      campaign_id: string;
      recipient_email: string;
      recipient_id: string;
      resend_id: string | null;
      status: string;
      error_message: string | null;
    }> = [];

    // Process in batches of 100 (Resend limit)
    for (let i = 0; i < recipients.length; i += EMAIL_CONFIG.batchSize) {
      const batch = recipients.slice(i, i + EMAIL_CONFIG.batchSize);

      // Prepare emails for this batch
      const emailsToSend = batch.map((recipient) => {
        // Use appropriate unsubscribe table based on campaign type
        const unsubscribeUrl = isB2B
          ? `${process.env.NEXT_PUBLIC_SITE_URL}/api/unsubscribe?email=${encodeURIComponent(recipient.email)}&campaign=${campaignId}&type=b2b`
          : `${process.env.NEXT_PUBLIC_SITE_URL}/api/unsubscribe?email=${encodeURIComponent(recipient.email)}&campaign=${campaignId}`;

        // Use appropriate template based on campaign type
        let html: string;
        let text: string | undefined;
        let subject = campaign.subject;

        if (isB2B) {
          // Replace placeholders in subject for B2B
          if (recipient.business_name) {
            subject = subject.replace(/\{business_name\}/g, recipient.business_name);
          }
          if (recipient.contact_name) {
            subject = subject.replace(/\{contact_name\}/g, recipient.contact_name);
          }

          html = renderB2BEmail({
            headline: campaign.headline,
            body: campaign.body,
            ctaText: campaign.cta_text,
            ctaUrl: campaign.cta_url,
            previewText: campaign.preview_text,
            unsubscribeUrl,
            businessName: recipient.business_name,
            contactName: recipient.contact_name || undefined,
          });
        } else {
          html = renderPromotionalEmail({
            headline: campaign.headline,
            body: campaign.body,
            ctaText: campaign.cta_text,
            ctaUrl: campaign.cta_url,
            previewText: campaign.preview_text,
            unsubscribeUrl,
          });
        }

        // Use personal sender for B2B, generic for consumer
        const fromLine = isB2B
          ? `${SENDER_IDENTITIES[0].name} <${SENDER_IDENTITIES[0].email}>`
          : EMAIL_CONFIG.from;

        return {
          from: fromLine,
          to: recipient.email,
          subject,
          html,
          ...(text && { text }),
          ...(isB2B && { replyTo: SENDER_IDENTITIES[0].replyEmail }),
          headers: {
            'List-Unsubscribe': `<${unsubscribeUrl}>`,
            'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
          },
        };
      });

      try {
        // Send batch
        const result = await resend.batch.send(emailsToSend as unknown as Parameters<typeof resend.batch.send>[0]);

        // Process results
        if (result.data && Array.isArray(result.data)) {
          const batchData = result.data as Array<{ id: string } | { error: { message: string } }>;
          batchData.forEach((sendResult, index) => {
            const recipient = batch[index];
            if ('id' in sendResult) {
              totalSent++;
              sendRecords.push({
                campaign_id: campaignId,
                recipient_email: recipient.email,
                recipient_id: recipient.id,
                resend_id: sendResult.id,
                status: 'sent',
                error_message: null,
              });
            } else if ('error' in sendResult) {
              totalFailed++;
              sendRecords.push({
                campaign_id: campaignId,
                recipient_email: recipient.email,
                recipient_id: recipient.id,
                resend_id: null,
                status: 'failed',
                error_message: sendResult.error?.message || 'Send failed',
              });
            }
          });
        } else if (result.error) {
          // Entire batch failed
          batch.forEach((recipient) => {
            totalFailed++;
            sendRecords.push({
              campaign_id: campaignId,
              recipient_email: recipient.email,
              recipient_id: recipient.id,
              resend_id: null,
              status: 'failed',
              error_message: result.error?.message || 'Batch send failed',
            });
          });
        }
      } catch (batchError) {
        console.error('Batch send error:', batchError);
        batch.forEach((recipient) => {
          totalFailed++;
          sendRecords.push({
            campaign_id: campaignId,
            recipient_email: recipient.email,
            recipient_id: recipient.id,
            resend_id: null,
            status: 'failed',
            error_message: 'Batch send exception',
          });
        });
      }

      // Small delay between batches to avoid rate limiting
      if (i + EMAIL_CONFIG.batchSize < recipients.length) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }

    // Insert send records
    if (sendRecords.length > 0) {
      await supabase.from('email_sends').insert(sendRecords);
    }

    // Update campaign with final stats
    await supabase
      .from('email_campaigns')
      .update({
        status: 'sent',
        total_recipients: recipients.length,
        total_sent: totalSent,
        sent_at: new Date().toISOString(),
      })
      .eq('id', campaignId);

    return NextResponse.json({
      success: true,
      totalRecipients: recipients.length,
      totalSent,
      totalFailed,
    });
  } catch (error) {
    console.error('Error sending campaign:', error);
    return NextResponse.json(
      { error: 'Failed to send campaign' },
      { status: 500 }
    );
  }
}
