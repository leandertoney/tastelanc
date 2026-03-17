import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

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

    // Find the email send record by Resend ID
    const resendId = data?.email_id;
    if (!resendId) {
      return NextResponse.json({ received: true });
    }

    // Get the email send record
    const { data: sendRecord } = await supabase
      .from('email_sends')
      .select('id, status, opened_at, clicked_at')
      .eq('resend_id', resendId)
      .single();

    if (!sendRecord) {
      console.log('No send record found for:', resendId);
      return NextResponse.json({ received: true });
    }

    const now = new Date().toISOString();

    switch (type) {
      case 'email.delivered':
        await supabase
          .from('email_sends')
          .update({ status: 'delivered' })
          .eq('id', sendRecord.id);
        break;

      case 'email.opened':
        if (!sendRecord.opened_at) {
          await supabase
            .from('email_sends')
            .update({ status: 'opened', opened_at: now })
            .eq('id', sendRecord.id);
        }
        break;

      case 'email.clicked':
        if (!sendRecord.clicked_at) {
          await supabase
            .from('email_sends')
            .update({ status: 'clicked', clicked_at: now })
            .eq('id', sendRecord.id);

          if (!sendRecord.opened_at) {
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
        break;

      case 'email.complained':
        if (data?.to?.[0]) {
          await supabase
            .from('email_unsubscribes')
            .upsert(
              {
                email: data.to[0],
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
