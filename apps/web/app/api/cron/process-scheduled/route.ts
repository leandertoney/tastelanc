export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  resend,
  getRecipientsBySegment,
  getBusinessLeadsByFilter,
  EMAIL_CONFIG,
} from '@/lib/resend';
import { renderPromotionalEmail } from '@/lib/email-templates/promotional-template';
import { renderB2BEmail } from '@/lib/email-templates/b2b-outreach-template';

// Use service role for cron jobs (no auth context)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Verify cron secret to prevent unauthorized calls
const CRON_SECRET = process.env.CRON_SECRET;

export async function GET(request: Request) {
  try {
    // Verify cron secret (optional but recommended)
    const authHeader = request.headers.get('authorization');
    if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
      // Allow Vercel cron jobs without secret for now
      const isVercelCron = request.headers.get('x-vercel-cron') === '1';
      if (!isVercelCron) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    console.log('Processing scheduled campaigns...');

    // Find due campaigns
    const now = new Date().toISOString();
    const { data: dueCampaigns, error: fetchError } = await supabase
      .from('scheduled_campaigns')
      .select('*')
      .eq('status', 'active')
      .lte('next_run_at', now)
      .not('next_run_at', 'is', null);

    if (fetchError) {
      console.error('Error fetching due campaigns:', fetchError);
      return NextResponse.json(
        { error: 'Failed to fetch campaigns' },
        { status: 500 }
      );
    }

    console.log(`Found ${dueCampaigns?.length || 0} due campaigns`);

    const results = [];

    for (const campaign of dueCampaigns || []) {
      try {
        console.log(`Processing campaign: ${campaign.name}`);

        // Get email content (from campaign or template)
        let emailContent = {
          subject: campaign.subject,
          headline: campaign.headline,
          body: campaign.body,
          cta_text: campaign.cta_text,
          cta_url: campaign.cta_url,
          preview_text: campaign.preview_text,
        };

        if (campaign.template_id) {
          const { data: template } = await supabase
            .from('email_templates')
            .select('*')
            .eq('id', campaign.template_id)
            .single();

          if (template) {
            emailContent = {
              subject: template.subject,
              headline: template.headline,
              body: template.body,
              cta_text: template.cta_text,
              cta_url: template.cta_url,
              preview_text: template.preview_text,
            };
          }
        }

        // Get recipients based on target audience
        let recipients: Array<{
          id: string;
          email: string;
          business_name?: string;
          contact_name?: string | null;
        }>;
        const isB2B = campaign.target_audience === 'business_leads';

        if (isB2B) {
          recipients = await getBusinessLeadsByFilter(
            supabase,
            campaign.business_lead_filter || {}
          );
        } else {
          const segment =
            campaign.target_audience === 'consumer_unconverted'
              ? 'unconverted'
              : campaign.target_audience === 'consumer_converted'
              ? 'converted'
              : 'all';
          recipients = await getRecipientsBySegment(supabase, segment);
        }

        console.log(`Found ${recipients.length} recipients for ${campaign.name}`);

        if (recipients.length === 0) {
          // Log empty recipient list
          await supabase.from('automation_logs').insert({
            scheduled_campaign_id: campaign.id,
            trigger_event: campaign.campaign_type,
            emails_sent: 0,
            emails_failed: 0,
            status: 'completed',
            error_message: 'No recipients found',
          });

          results.push({
            campaign: campaign.name,
            status: 'skipped',
            reason: 'No recipients',
          });
          continue;
        }

        // Send emails
        let totalSent = 0;
        let totalFailed = 0;
        const sendRecords: Array<{
          scheduled_campaign_id: string;
          recipient_email: string;
          recipient_id: string;
          resend_id: string | null;
          status: string;
          error_message: string | null;
        }> = [];

        for (let i = 0; i < recipients.length; i += EMAIL_CONFIG.batchSize) {
          const batch = recipients.slice(i, i + EMAIL_CONFIG.batchSize);

          const emailsToSend = batch.map((recipient) => {
            const unsubscribeUrl = isB2B
              ? `${process.env.NEXT_PUBLIC_SITE_URL}/api/unsubscribe?email=${encodeURIComponent(recipient.email)}&type=b2b`
              : `${process.env.NEXT_PUBLIC_SITE_URL}/api/unsubscribe?email=${encodeURIComponent(recipient.email)}`;

            let html: string;
            let subject = emailContent.subject || '';

            if (isB2B && recipient.business_name) {
              subject = subject.replace(
                /\{business_name\}/g,
                recipient.business_name
              );
              if (recipient.contact_name) {
                subject = subject.replace(
                  /\{contact_name\}/g,
                  recipient.contact_name
                );
              }

              html = renderB2BEmail({
                headline: emailContent.headline || '',
                body: emailContent.body || '',
                ctaText: emailContent.cta_text || undefined,
                ctaUrl: emailContent.cta_url || undefined,
                previewText: emailContent.preview_text || undefined,
                unsubscribeUrl,
                businessName: recipient.business_name,
                contactName: recipient.contact_name || undefined,
              });
            } else {
              html = renderPromotionalEmail({
                headline: emailContent.headline || '',
                body: emailContent.body || '',
                ctaText: emailContent.cta_text || undefined,
                ctaUrl: emailContent.cta_url || undefined,
                previewText: emailContent.preview_text || undefined,
                unsubscribeUrl,
              });
            }

            return {
              from: EMAIL_CONFIG.from,
              to: recipient.email,
              subject,
              html,
            };
          });

          try {
            const result = await resend.batch.send(emailsToSend);

            if (result.data && Array.isArray(result.data)) {
              const batchData = result.data as Array<{ id: string } | { error: { message: string } }>;
              batchData.forEach((sendResult, index) => {
                const recipient = batch[index];
                if ('id' in sendResult) {
                  totalSent++;
                  sendRecords.push({
                    scheduled_campaign_id: campaign.id,
                    recipient_email: recipient.email,
                    recipient_id: recipient.id,
                    resend_id: sendResult.id,
                    status: 'sent',
                    error_message: null,
                  });
                } else if ('error' in sendResult) {
                  totalFailed++;
                  sendRecords.push({
                    scheduled_campaign_id: campaign.id,
                    recipient_email: recipient.email,
                    recipient_id: recipient.id,
                    resend_id: null,
                    status: 'failed',
                    error_message: sendResult.error?.message || 'Send failed',
                  });
                }
              });
            } else if (result.error) {
              batch.forEach((recipient) => {
                totalFailed++;
                sendRecords.push({
                  scheduled_campaign_id: campaign.id,
                  recipient_email: recipient.email,
                  recipient_id: recipient.id,
                  resend_id: null,
                  status: 'failed',
                  error_message: result.error?.message || 'Batch send failed',
                });
              });
            }
          } catch (err) {
            console.error('Batch send error:', err);
            batch.forEach((recipient) => {
              totalFailed++;
              sendRecords.push({
                scheduled_campaign_id: campaign.id,
                recipient_email: recipient.email,
                recipient_id: recipient.id,
                resend_id: null,
                status: 'failed',
                error_message: 'Batch send exception',
              });
            });
          }

          // Small delay between batches
          if (i + EMAIL_CONFIG.batchSize < recipients.length) {
            await new Promise((resolve) => setTimeout(resolve, 100));
          }
        }

        // Insert email send records for tracking
        if (sendRecords.length > 0) {
          const { error: insertError } = await supabase
            .from('email_sends')
            .insert(sendRecords);

          if (insertError) {
            console.error('Error inserting send records:', insertError);
          }
        }

        // Log execution
        await supabase.from('automation_logs').insert({
          scheduled_campaign_id: campaign.id,
          trigger_event: campaign.campaign_type,
          emails_sent: totalSent,
          emails_failed: totalFailed,
          status: totalFailed === 0 ? 'success' : 'partial',
        });

        // Update campaign
        const updates: Record<string, unknown> = {
          last_run_at: new Date().toISOString(),
          total_sent: (campaign.total_sent || 0) + totalSent,
        };

        // For one-time scheduled campaigns, mark as completed
        if (campaign.campaign_type === 'scheduled') {
          updates.status = 'completed';
          updates.next_run_at = null;
        } else if (campaign.campaign_type === 'countdown') {
          // Calculate next countdown date if still applicable
          const targetDate = new Date(campaign.countdown_target_date);
          const today = new Date();
          today.setHours(0, 0, 0, 0);

          if (today >= targetDate) {
            updates.status = 'completed';
            updates.next_run_at = null;
          }
          // Otherwise, next_run_at stays as-is (countdown is one-time per days_before value)
        }

        await supabase
          .from('scheduled_campaigns')
          .update(updates)
          .eq('id', campaign.id);

        results.push({
          campaign: campaign.name,
          status: 'processed',
          sent: totalSent,
          failed: totalFailed,
        });
      } catch (campaignError) {
        console.error(`Error processing campaign ${campaign.name}:`, campaignError);

        await supabase.from('automation_logs').insert({
          scheduled_campaign_id: campaign.id,
          trigger_event: campaign.campaign_type,
          emails_sent: 0,
          emails_failed: 0,
          status: 'error',
          error_message:
            campaignError instanceof Error
              ? campaignError.message
              : 'Unknown error',
        });

        results.push({
          campaign: campaign.name,
          status: 'error',
          error:
            campaignError instanceof Error
              ? campaignError.message
              : 'Unknown error',
        });
      }
    }

    return NextResponse.json({
      success: true,
      processed: results.length,
      results,
    });
  } catch (error) {
    console.error('Cron job error:', error);
    return NextResponse.json(
      { error: 'Cron job failed' },
      { status: 500 }
    );
  }
}
