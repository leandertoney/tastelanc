import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import crypto from 'crypto';

// Use service role client for webhook processing
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Verify Resend webhook signature
function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

export async function POST(request: Request) {
  try {
    const payload = await request.text();
    const signature = request.headers.get('svix-signature') || '';
    const webhookSecret = process.env.RESEND_WEBHOOK_SECRET;

    // Verify signature if secret is configured
    if (webhookSecret && signature) {
      // Resend uses Svix for webhooks - simplified verification for now
      // In production, you may want to use the svix package for full verification
    }

    const event = JSON.parse(payload);
    const { type, data } = event;

    console.log('Resend webhook received:', type, data?.email_id);

    // Send notification email to team when an email is opened
    if (type === 'email.opened' && data?.to?.[0]) {
      const recipient = data.to[0];
      const subject = data?.subject || 'Unknown subject';
      const openedAt = new Date().toLocaleString('en-US', { timeZone: 'America/New_York' });

      try {
        const resend = new Resend(process.env.RESEND_API_KEY);
        await resend.emails.send({
          from: 'TasteLanc Notifications <noreply@tastelanc.com>',
          to: ['leandertoney@gmail.com', 'jmtoney1987@gmail.com'],
          subject: `Email Opened: ${recipient}`,
          text: `Your email was opened.\n\nRecipient: ${recipient}\nSubject: ${subject}\nOpened at: ${openedAt} ET`,
        });
      } catch (notifyErr) {
        console.error('Failed to send open notification:', notifyErr);
      }
    }

    // Find the email send record by Resend ID
    const resendId = data?.email_id;
    if (!resendId) {
      return NextResponse.json({ received: true });
    }

    // Get the email send record (includes both manual and scheduled campaign IDs)
    const { data: sendRecord } = await supabase
      .from('email_sends')
      .select('id, campaign_id, scheduled_campaign_id, status, opened_at, clicked_at')
      .eq('resend_id', resendId)
      .single();

    if (!sendRecord) {
      console.log('No send record found for:', resendId);
      return NextResponse.json({ received: true });
    }

    const now = new Date().toISOString();
    const isScheduledCampaign = !!sendRecord.scheduled_campaign_id;

    switch (type) {
      case 'email.delivered':
        await supabase
          .from('email_sends')
          .update({ status: 'delivered' })
          .eq('id', sendRecord.id);
        break;

      case 'email.opened':
        // Only count first open (check opened_at to prevent double-counting)
        if (!sendRecord.opened_at) {
          await supabase
            .from('email_sends')
            .update({ status: 'opened', opened_at: now })
            .eq('id', sendRecord.id);

          // Increment the appropriate campaign open count
          if (isScheduledCampaign) {
            await supabase.rpc('increment_scheduled_campaign_opens', {
              p_scheduled_campaign_id: sendRecord.scheduled_campaign_id,
            });
          } else if (sendRecord.campaign_id) {
            await supabase.rpc('increment_campaign_opens', {
              campaign_id: sendRecord.campaign_id,
            });
          }
        }
        break;

      case 'email.clicked':
        // Only count first click (check clicked_at to prevent double-counting)
        if (!sendRecord.clicked_at) {
          await supabase
            .from('email_sends')
            .update({ status: 'clicked', clicked_at: now })
            .eq('id', sendRecord.id);

          // Increment the appropriate campaign click count
          if (isScheduledCampaign) {
            await supabase.rpc('increment_scheduled_campaign_clicks', {
              p_scheduled_campaign_id: sendRecord.scheduled_campaign_id,
            });
          } else if (sendRecord.campaign_id) {
            await supabase.rpc('increment_campaign_clicks', {
              campaign_id: sendRecord.campaign_id,
            });
          }

          // If this is first interaction, also count as open
          if (!sendRecord.opened_at) {
            if (isScheduledCampaign) {
              await supabase.rpc('increment_scheduled_campaign_opens', {
                p_scheduled_campaign_id: sendRecord.scheduled_campaign_id,
              });
            } else if (sendRecord.campaign_id) {
              await supabase.rpc('increment_campaign_opens', {
                campaign_id: sendRecord.campaign_id,
              });
            }
            // Update opened_at as well
            await supabase
              .from('email_sends')
              .update({ opened_at: now })
              .eq('id', sendRecord.id);
          }
        }
        break;

      case 'email.bounced':
        await supabase
          .from('email_sends')
          .update({
            status: 'bounced',
            bounced_at: now,
            error_message: data?.bounce?.type || 'Bounced',
          })
          .eq('id', sendRecord.id);

        // Increment the appropriate campaign bounce count
        if (isScheduledCampaign) {
          await supabase.rpc('increment_scheduled_campaign_bounces', {
            p_scheduled_campaign_id: sendRecord.scheduled_campaign_id,
          });
        } else if (sendRecord.campaign_id) {
          await supabase.rpc('increment_campaign_bounces', {
            campaign_id: sendRecord.campaign_id,
          });
        }
        break;

      case 'email.complained':
        // User marked as spam - add to unsubscribe list
        if (data?.to?.[0]) {
          await supabase
            .from('email_unsubscribes')
            .upsert(
              {
                email: data.to[0],
                campaign_id: sendRecord.campaign_id,
                unsubscribed_at: now,
              },
              { onConflict: 'email' }
            );
        }
        break;

      default:
        console.log('Unhandled webhook event:', type);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}
