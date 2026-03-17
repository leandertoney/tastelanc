import { NextResponse } from 'next/server';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { verifySalesAccess } from '@/lib/auth/sales-access';
import { getUserIdentity } from '@/lib/auth/rep-identity';
import { resend } from '@/lib/resend';
import { renderProfessionalEmail, renderProfessionalEmailPlainText } from '@/lib/email-templates/professional-template';
import { BRAND } from '@/config/market';
import { SENDER_IDENTITIES } from '@/config/sender-identities';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const access = await verifySalesAccess(supabase);

    if (!access.canAccess) {
      return NextResponse.json(
        { error: access.error },
        { status: access.userId ? 403 : 401 }
      );
    }

    const serviceClient = createServiceRoleClient();
    const body = await request.json();
    const {
      recipientEmail,
      recipientName,
      subject,
      headline,
      emailBody,
      ctaText,
      ctaUrl,
      senderName,
      senderEmail,
      inReplyToMessageId,
      threadId,
      attachments,
    } = body;

    if (!recipientEmail || !subject || !emailBody) {
      return NextResponse.json(
        { error: 'Missing required fields: recipientEmail, subject, emailBody' },
        { status: 400 }
      );
    }

    // Validate attachments if provided
    const validatedAttachments: Array<{ url: string; filename: string; size: number; contentType: string }> = [];
    if (attachments && Array.isArray(attachments)) {
      let totalSize = 0;
      for (const att of attachments) {
        if (!att.url || !att.filename) continue;
        totalSize += att.size || 0;
        validatedAttachments.push({
          url: att.url,
          filename: att.filename,
          size: att.size || 0,
          contentType: att.contentType || 'application/octet-stream',
        });
      }
      if (totalSize > 40 * 1024 * 1024) {
        return NextResponse.json(
          { error: 'Total attachment size exceeds 40MB limit' },
          { status: 400 }
        );
      }
    }

    // Verify sender identity — allow known identities OR any @tastelanc.com address (domain-verified)
    const validSender = SENDER_IDENTITIES.find(s => s.email === senderEmail);
    const isDomainEmail = senderEmail && senderEmail.endsWith(`@${BRAND.domain}`);
    if (senderEmail && !validSender && !isDomainEmail) {
      return NextResponse.json(
        { error: 'Invalid sender email. Must use an approved sender identity.' },
        { status: 400 }
      );
    }

    // Sales reps can only send from their own identity (not admin's or other reps')
    if (access.isSalesRep && !access.isAdmin && senderEmail && access.userId) {
      const repIdentity = await getUserIdentity(serviceClient, access);
      if (repIdentity && senderEmail !== repIdentity.email) {
        return NextResponse.json(
          { error: 'You can only send emails from your own identity.' },
          { status: 403 }
        );
      }
    }

    // Check B2B unsubscribes
    const { data: unsub } = await serviceClient
      .from('b2b_unsubscribes')
      .select('id')
      .eq('email', recipientEmail.toLowerCase())
      .single();

    if (unsub) {
      return NextResponse.json(
        { error: 'This recipient has unsubscribed from emails' },
        { status: 400 }
      );
    }

    // Render HTML + plain text (multipart). Resend tracking is DISABLED on tastelanc.com
    // so no tracking markup is injected — clean HTML lands in Gmail Primary.
    const emailProps = {
      headline: headline || subject,
      body: emailBody,
      businessName: recipientName || undefined,
      senderName: senderName || BRAND.name,
      senderTitle: validSender?.title || undefined,
    };
    const html = renderProfessionalEmail(emailProps);
    const text = renderProfessionalEmailPlainText(emailProps);

    // Determine sender
    const fromName = senderName || BRAND.name;
    const fromEmail = senderEmail || `noreply@${BRAND.domain}`;
    const fromLine = `${fromName} <${fromEmail}>`;

    // HTML + text multipart — lands in Gmail Primary with tracking disabled.
    const sendOptions: Parameters<typeof resend.emails.send>[0] = {
      from: fromLine,
      to: recipientEmail,
      subject,
      html,
      text,
      replyTo: validSender?.replyEmail || (isDomainEmail ? fromEmail.replace(`@${BRAND.domain}`, `@${BRAND.replyDomain}`) : fromEmail),
      ...(validatedAttachments.length > 0 && {
        attachments: validatedAttachments.map(att => ({
          filename: att.filename,
          path: att.url,
        })),
      }),
    };

    if (inReplyToMessageId) {
      sendOptions.headers = {
        'In-Reply-To': `<${inReplyToMessageId}@resend.dev>`,
        'References': `<${inReplyToMessageId}@resend.dev>`,
      };
    }

    // Send via Resend
    const { data: resendResult, error: sendError } = await resend.emails.send(sendOptions);

    if (sendError) {
      console.error('Resend error:', sendError);
      return NextResponse.json({ error: 'Failed to send email' }, { status: 500 });
    }

    const resendId = resendResult?.id || null;

    // Auto-link to lead if recipient matches a business lead
    let linkedLeadId: string | null = null;
    const { data: matchedLead } = await serviceClient
      .from('business_leads')
      .select('id, business_name')
      .ilike('email', recipientEmail)
      .limit(1)
      .single();

    if (matchedLead) {
      linkedLeadId = matchedLead.id;
    }

    // Record in email_sends
    await serviceClient.from('email_sends').insert({
      recipient_email: recipientEmail,
      resend_id: resendId,
      status: 'sent',
      lead_id: linkedLeadId,
      sent_by: access.userId,
      subject,
      sender_name: fromName,
      sender_email: fromEmail,
      thread_id: threadId || null,
      in_reply_to_message_id: inReplyToMessageId || null,
      body_text: emailBody,
      headline: headline || subject,
      attachments: validatedAttachments.length > 0 ? validatedAttachments : [],
    });

    // If linked to a lead, log activity
    if (linkedLeadId && access.userId) {
      await serviceClient.from('lead_activities').insert({
        lead_id: linkedLeadId,
        user_id: access.userId,
        activity_type: 'email',
        description: `Sent email: "${subject}"`,
        metadata: {
          subject,
          resend_id: resendId,
          sender_name: fromName,
          sender_email: fromEmail,
          sent_from: 'inbox',
        },
      });

      // Auto-assign rep if unassigned
      const { data: currentLead } = await serviceClient
        .from('business_leads')
        .select('assigned_to')
        .eq('id', linkedLeadId)
        .single();
      const inboxLeadUpdate: Record<string, string> = { last_contacted_at: new Date().toISOString() };
      if (currentLead && !currentLead.assigned_to && access.userId) {
        inboxLeadUpdate.assigned_to = access.userId;
      }
      await serviceClient
        .from('business_leads')
        .update(inboxLeadUpdate)
        .eq('id', linkedLeadId);
    }

    // Save sender preference
    if (senderName && senderEmail && access.isSalesRep) {
      const { data: existingRep } = await serviceClient
        .from('sales_reps')
        .select('id, preferred_sender_name, preferred_sender_email')
        .eq('id', access.userId!)
        .single();

      if (existingRep && (existingRep.preferred_sender_name !== senderName || existingRep.preferred_sender_email !== senderEmail)) {
        await serviceClient
          .from('sales_reps')
          .update({
            preferred_sender_name: senderName,
            preferred_sender_email: senderEmail,
          })
          .eq('id', access.userId!);
      }
    }

    return NextResponse.json({
      success: true,
      resendId,
      linkedLeadId,
      message: `Email sent to ${recipientEmail}`,
    });
  } catch (error) {
    console.error('Error in inbox send API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
