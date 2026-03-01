import { NextResponse } from 'next/server';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { verifySalesAccess } from '@/lib/auth/sales-access';
import { resend } from '@/lib/resend';
import { renderProfessionalEmail, renderProfessionalEmailPlainText } from '@/lib/email-templates/professional-template';
import { BRAND } from '@/config/market';
import { SENDER_IDENTITIES } from '@/config/sender-identities';

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
    } = body;

    if (!recipientEmail || !subject || !headline || !emailBody) {
      return NextResponse.json(
        { error: 'Missing required fields: recipientEmail, subject, headline, emailBody' },
        { status: 400 }
      );
    }

    // Verify sender identity
    const validSender = SENDER_IDENTITIES.find(s => s.email === senderEmail);
    if (senderEmail && !validSender) {
      return NextResponse.json(
        { error: 'Invalid sender email. Must use an approved sender identity.' },
        { status: 400 }
      );
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

    // Build unsubscribe URL
    const unsubscribeUrl = `https://${BRAND.domain}/api/unsubscribe/b2b?email=${encodeURIComponent(recipientEmail)}`;

    // Render email HTML + plain text (professional template for Primary inbox delivery)
    const emailProps = {
      headline,
      body: emailBody,
      ctaText: ctaText || undefined,
      ctaUrl: ctaUrl || undefined,
      previewText: subject,
      unsubscribeUrl,
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

    // Build unsubscribe mailto for List-Unsubscribe header (improves deliverability)
    const listUnsubscribeUrl = `https://${BRAND.domain}/api/unsubscribe/b2b?email=${encodeURIComponent(recipientEmail)}`;

    // Build send options (include plain text for deliverability)
    const sendOptions: Parameters<typeof resend.emails.send>[0] = {
      from: fromLine,
      to: recipientEmail,
      subject,
      html,
      text,
      replyTo: validSender?.replyEmail || fromEmail,
      headers: {
        'List-Unsubscribe': `<${listUnsubscribeUrl}>`,
        'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
      },
    };

    if (inReplyToMessageId) {
      sendOptions.headers = {
        ...sendOptions.headers,
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
      headline,
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

      await serviceClient
        .from('business_leads')
        .update({ last_contacted_at: new Date().toISOString() })
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
