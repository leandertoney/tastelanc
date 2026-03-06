import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import { getAllSenderEmails, SENDER_IDENTITIES } from '@/config/sender-identities';

// Use service role client for webhook processing (no auth context in webhooks)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const dynamic = 'force-dynamic';

const INBOUND_WEBHOOK_SECRET = process.env.RESEND_INBOUND_WEBHOOK_SECRET || '';
const RESEND_API_KEY = process.env.RESEND_API_KEY || '';

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
 * Fetch full email content from Resend Receiving API.
 * Webhook payloads only include metadata — body, headers, and attachments
 * must be retrieved separately via GET /emails/receiving/{id}.
 */
async function fetchEmailContent(emailId: string) {
  const res = await fetch(`https://api.resend.com/emails/receiving/${emailId}`, {
    headers: { Authorization: `Bearer ${RESEND_API_KEY}` },
  });

  if (!res.ok) {
    console.error(`Failed to fetch email content from Resend: ${res.status}`);
    return null;
  }

  return res.json();
}

/**
 * Send push notifications to one or more sales team members.
 * Queries push tokens across ALL app slugs (tastelanc, taste-cumberland, etc.)
 * so reps on any market's app receive notifications.
 */
async function sendSalesTeamPushNotifications(
  supabaseClient: typeof supabase,
  userIds: string[],
  title: string,
  body: string,
  data: Record<string, string>,
) {
  if (userIds.length === 0) return;

  try {
    const { data: tokens } = await supabaseClient
      .from('push_tokens')
      .select('token, app_slug')
      .in('user_id', userIds);

    if (!tokens || tokens.length === 0) return;

    // Group tokens by app_slug — Expo Push API rejects mixed projects in one request
    const tokensByProject = new Map<string, string[]>();
    for (const t of tokens) {
      const slug = t.app_slug || 'tastelanc';
      const list = tokensByProject.get(slug) || [];
      list.push(t.token);
      tokensByProject.set(slug, list);
    }

    // Send one request per project
    for (const [slug, projectTokens] of Array.from(tokensByProject.entries())) {
      const messages = projectTokens.map(token => ({
        to: token,
        title,
        body,
        data,
        sound: 'default' as const,
      }));

      const res = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(messages),
      });

      const result = await res.json();
      if (result.errors) {
        console.error(`Push send error for ${slug}:`, result.errors);
      }
    }

    console.log(`Push notifications sent to ${userIds.length} team member(s) across ${tokensByProject.size} project(s): ${title}`);
  } catch (error) {
    console.error('Failed to send push notifications:', error);
  }
}

/**
 * Resolve an inbound email address to the sales rep user ID.
 * Checks sales_reps.preferred_sender_email, then SENDER_IDENTITIES + profiles.
 */
async function resolveEmailToUserId(
  supabaseClient: typeof supabase,
  toEmail: string,
): Promise<string | null> {
  const normalizedEmail = toEmail.toLowerCase();

  // 1. Check sales_reps by preferred_sender_email or derived reply domain
  const { data: reps } = await supabaseClient
    .from('sales_reps')
    .select('id, preferred_sender_email, name')
    .eq('is_active', true);

  if (reps) {
    for (const rep of reps) {
      if (rep.preferred_sender_email) {
        const localPart = rep.preferred_sender_email.replace(/@.*$/, '');
        if (
          normalizedEmail === rep.preferred_sender_email.toLowerCase() ||
          normalizedEmail === `${localPart}@in.tastelanc.com`
        ) {
          return rep.id;
        }
      }
      // Check by first name match
      if (rep.name) {
        const firstName = rep.name.split(' ')[0].toLowerCase();
        if (
          normalizedEmail === `${firstName}@tastelanc.com` ||
          normalizedEmail === `${firstName}@in.tastelanc.com`
        ) {
          return rep.id;
        }
      }
    }
  }

  // 2. Check SENDER_IDENTITIES → match to profiles by first name
  const matchedIdentity = SENDER_IDENTITIES.find(
    s => s.email.toLowerCase() === normalizedEmail || s.replyEmail.toLowerCase() === normalizedEmail
  );

  if (matchedIdentity) {
    // Find the profile with matching display_name first name
    const { data: profiles } = await supabaseClient
      .from('profiles')
      .select('id, display_name')
      .in('role', ['super_admin', 'co_founder', 'market_admin', 'sales_rep']);

    if (profiles) {
      const match = profiles.find(p =>
        p.display_name?.split(' ')[0].toLowerCase() === matchedIdentity.name.toLowerCase()
      );
      if (match) return match.id;
    }
  }

  return null;
}

/**
 * POST /api/inbound-email
 *
 * Resend Inbound webhook endpoint.
 * Verifies the Svix signature, fetches full email content, then stores it.
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

    // Fetch the full email content from Resend API (webhook only has metadata)
    const emailContent = data.email_id ? await fetchEmailContent(data.email_id) : null;

    // Parse sender info — try API response first, fall back to webhook data
    const fromRaw = emailContent?.from || data.from || '';
    let fromEmail = fromRaw;
    let fromName: string | null = null;

    // Handle "Name <email>" format
    const nameMatch = fromRaw.match(/^(.+?)\s*<(.+?)>$/);
    if (nameMatch) {
      fromName = nameMatch[1].trim();
      fromEmail = nameMatch[2].trim();
    }

    // Parse recipients
    const toRaw = emailContent?.to || data.to;
    const toEmail = Array.isArray(toRaw) ? toRaw[0] : (toRaw || '');

    // Parse headers from API response
    const headers: Record<string, string> = {};
    if (emailContent?.headers && typeof emailContent.headers === 'object') {
      for (const [key, value] of Object.entries(emailContent.headers)) {
        if (typeof value === 'string') {
          headers[key] = value;
        }
      }
    }

    // Parse attachments metadata
    const rawAttachments = emailContent?.attachments || data.attachments || [];
    const attachments = Array.isArray(rawAttachments)
      ? rawAttachments.map((att: { filename?: string; content_type?: string; size?: number }) => ({
          filename: att.filename || 'unknown',
          content_type: att.content_type || 'application/octet-stream',
          size: att.size || 0,
        }))
      : [];

    // Get body text/html from Resend API (not in webhook payload)
    const bodyText = emailContent?.text || null;
    const bodyHtml = emailContent?.html || null;
    const subject = emailContent?.subject || data.subject || null;

    // Insert into inbound_emails table
    const { data: email, error } = await supabase
      .from('inbound_emails')
      .insert({
        from_email: fromEmail,
        from_name: fromName,
        to_email: toEmail,
        subject,
        body_text: bodyText,
        body_html: bodyHtml,
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

    console.log(`Inbound email stored: ${email.id} from ${fromEmail} — "${subject}"`);

    // --- CRM Lead Matching ---
    // Try to match this inbound email to an existing lead for the Sales CRM
    let matchedLeadId: string | null = null;
    let matchedSendId: string | null = null;
    let threadId: string | null = null;

    // Strategy 1: Header-based matching (In-Reply-To → email_sends.resend_id)
    const inReplyTo = headers['In-Reply-To'] || headers['in-reply-to'] || '';
    const referencesHeader = headers['References'] || headers['references'] || '';

    if (inReplyTo) {
      // Resend Message-IDs look like "<resend_id@resend.dev>"
      const resendIdMatch = inReplyTo.match(/<([^@]+)@resend\.dev>/);
      if (resendIdMatch) {
        const { data: sendRecord } = await supabase
          .from('email_sends')
          .select('id, lead_id, thread_id')
          .eq('resend_id', resendIdMatch[1])
          .single();
        if (sendRecord?.lead_id) {
          matchedLeadId = sendRecord.lead_id;
          matchedSendId = sendRecord.id;
          threadId = sendRecord.thread_id || sendRecord.id;
        }
      }
    }

    // Strategy 2: Email address matching (from_email → business_leads.email)
    if (!matchedLeadId) {
      const allSalesEmails = getAllSenderEmails();
      const isToSalesRep = allSalesEmails.some(addr =>
        toEmail.toLowerCase().includes(addr.toLowerCase())
      );
      if (isToSalesRep && fromEmail) {
        const { data: leads } = await supabase
          .from('business_leads')
          .select('id')
          .ilike('email', fromEmail.trim())
          .order('updated_at', { ascending: false })
          .limit(1);
        if (leads && leads.length === 1) {
          matchedLeadId = leads[0].id;
        }
      }
    }

    // If matched, create CRM records
    if (matchedLeadId) {
      // Insert into lead_email_replies
      await supabase.from('lead_email_replies').insert({
        lead_id: matchedLeadId,
        from_email: fromEmail,
        from_name: fromName,
        to_email: toEmail,
        subject,
        body_text: bodyText,
        body_html: bodyHtml,
        in_reply_to: inReplyTo || null,
        references_header: referencesHeader || null,
        original_send_id: matchedSendId,
        thread_id: threadId,
        inbound_email_id: email.id,
        is_read: false,
      });

      // Get lead's assigned_to for user_id (required NOT NULL)
      const { data: lead } = await supabase
        .from('business_leads')
        .select('assigned_to')
        .eq('id', matchedLeadId)
        .single();

      // Use assigned rep or fall back to a known admin
      const activityUserId = lead?.assigned_to || '2c5ec9f7-fc9a-4289-b835-9f5d76d6cbc5';

      // Log activity on lead timeline
      await supabase.from('lead_activities').insert({
        lead_id: matchedLeadId,
        user_id: activityUserId,
        activity_type: 'email_reply',
        description: `Reply from ${fromName || fromEmail}: "${subject || '(no subject)'}"`,
        metadata: {
          from_email: fromEmail,
          from_name: fromName,
          subject,
          reply_id: email.id,
        },
      });

      // Set unread flag on lead
      await supabase
        .from('business_leads')
        .update({ has_unread_replies: true })
        .eq('id', matchedLeadId);

      // Link inbound email to lead
      await supabase
        .from('inbound_emails')
        .update({ linked_lead_id: matchedLeadId })
        .eq('id', email.id);

      console.log(`Inbound email matched to lead ${matchedLeadId}`);

      // Notify the assigned rep only (everyone gets their own notifications)
      if (lead?.assigned_to) {
        await sendSalesTeamPushNotifications(
          supabase,
          [lead.assigned_to],
          `New Reply from ${fromName || fromEmail}`,
          subject || '(No subject)',
          { screen: 'EmailThread', counterpartyEmail: fromEmail },
        );
      }
    } else {
      // Unmatched email to a rep address — notify only the rep it was sent to
      const repUserId = await resolveEmailToUserId(supabase, toEmail);

      if (repUserId) {
        await sendSalesTeamPushNotifications(
          supabase,
          [repUserId],
          `New Email from ${fromName || fromEmail}`,
          subject || '(No subject)',
          { screen: 'EmailThread', counterpartyEmail: fromEmail },
        );
      }
    }

    return NextResponse.json({ received: true, id: email.id });
  } catch (error) {
    console.error('Error processing inbound email webhook:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
