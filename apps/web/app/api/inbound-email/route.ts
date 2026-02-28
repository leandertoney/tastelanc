import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

// Use service role client for webhook processing (no auth context in webhooks)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const dynamic = 'force-dynamic';

const INBOUND_WEBHOOK_SECRET = process.env.RESEND_INBOUND_WEBHOOK_SECRET || '';

/**
 * Verify Svix webhook signature (used by Resend for all webhooks).
 * Checks the svix-signature header against the payload using HMAC-SHA256.
 */
function verifySignature(payload: string, headers: Headers): boolean {
  if (!INBOUND_WEBHOOK_SECRET) return true; // Skip if not configured

  const svixId = headers.get('svix-id');
  const svixTimestamp = headers.get('svix-timestamp');
  const svixSignature = headers.get('svix-signature');

  if (!svixId || !svixTimestamp || !svixSignature) {
    console.warn('Missing Svix headers on inbound email webhook');
    return false;
  }

  // Svix signs: "${svix-id}.${svix-timestamp}.${body}"
  const signedContent = `${svixId}.${svixTimestamp}.${payload}`;

  // The secret is base64-encoded after the "whsec_" prefix
  const secretBytes = Buffer.from(
    INBOUND_WEBHOOK_SECRET.startsWith('whsec_')
      ? INBOUND_WEBHOOK_SECRET.slice(6)
      : INBOUND_WEBHOOK_SECRET,
    'base64'
  );

  const expectedSignature = crypto
    .createHmac('sha256', secretBytes)
    .update(signedContent)
    .digest('base64');

  // svix-signature header contains "v1,<base64>" — may have multiple signatures
  const signatures = svixSignature.split(' ');
  for (const sig of signatures) {
    const sigValue = sig.startsWith('v1,') ? sig.slice(3) : sig;
    try {
      if (
        crypto.timingSafeEqual(
          Buffer.from(expectedSignature),
          Buffer.from(sigValue)
        )
      ) {
        return true;
      }
    } catch {
      // Length mismatch — try next signature
    }
  }

  return false;
}

/**
 * POST /api/inbound-email
 *
 * Resend Inbound webhook endpoint.
 * Verifies the Svix signature, then parses and stores the email.
 */
export async function POST(request: Request) {
  try {
    const rawPayload = await request.text();

    // Verify webhook signature
    if (!verifySignature(rawPayload, request.headers)) {
      console.error('Inbound email webhook signature verification failed');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const payload = JSON.parse(rawPayload);

    // Resend Inbound sends event type "email.received"
    const eventType = payload.type;
    if (eventType !== 'email.received') {
      // Acknowledge non-email events without processing
      return NextResponse.json({ received: true });
    }

    const data = payload.data;
    if (!data) {
      return NextResponse.json({ error: 'Missing data' }, { status: 400 });
    }

    // Parse sender info
    const fromRaw = data.from || '';
    let fromEmail = fromRaw;
    let fromName: string | null = null;

    // Handle "Name <email>" format
    const nameMatch = fromRaw.match(/^(.+?)\s*<(.+?)>$/);
    if (nameMatch) {
      fromName = nameMatch[1].trim();
      fromEmail = nameMatch[2].trim();
    }

    // Parse recipients
    const toEmail = Array.isArray(data.to) ? data.to[0] : (data.to || '');

    // Parse headers into a clean object
    const headers: Record<string, string> = {};
    if (Array.isArray(data.headers)) {
      for (const header of data.headers) {
        if (header.name && header.value) {
          headers[header.name] = header.value;
        }
      }
    }

    // Parse attachments metadata (don't store file content, just metadata)
    const attachments = Array.isArray(data.attachments)
      ? data.attachments.map((att: { filename?: string; content_type?: string; size?: number }) => ({
          filename: att.filename || 'unknown',
          content_type: att.content_type || 'application/octet-stream',
          size: att.size || 0,
        }))
      : [];

    // Insert into inbound_emails table
    const { data: email, error } = await supabase
      .from('inbound_emails')
      .insert({
        from_email: fromEmail,
        from_name: fromName,
        to_email: toEmail,
        subject: data.subject || null,
        body_text: data.text || null,
        body_html: data.html || null,
        headers,
        attachments,
        is_read: false,
        is_archived: false,
        category: 'inquiry',
      })
      .select()
      .single();

    if (error) {
      console.error('Error storing inbound email:', error);
      return NextResponse.json({ error: 'Failed to store email' }, { status: 500 });
    }

    console.log(`Inbound email stored: ${email.id} from ${fromEmail} — "${data.subject}"`);

    return NextResponse.json({ received: true, id: email.id });
  } catch (error) {
    console.error('Error processing inbound email webhook:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
