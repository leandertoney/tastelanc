import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { createMobileClient } from '@/lib/supabase/mobile-auth';
import { verifySalesAccess } from '@/lib/auth/sales-access';
import { getUserIdentity } from '@/lib/auth/rep-identity';
import { resend } from '@/lib/resend';
import { renderProfessionalEmail, renderProfessionalEmailPlainText } from '@/lib/email-templates/professional-template';
import { BRAND } from '@/config/market';
import { SENDER_IDENTITIES } from '@/config/sender-identities';

export async function POST(request: Request) {
  try {
    const supabase = createMobileClient(request);
    if (!supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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
      senderName,
      senderEmail,
      cc,
      inReplyToMessageId,
      threadId,
    } = body;

    if (!recipientEmail || !subject || !headline || !emailBody) {
      return NextResponse.json(
        { error: 'Missing required fields: recipientEmail, subject, headline, emailBody' },
        { status: 400 }
      );
    }

    // Basic email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(recipientEmail)) {
      return NextResponse.json(
        { error: 'Invalid recipient email format' },
        { status: 400 }
      );
    }

    // Auto-resolve sender identity if not provided by client
    const repIdentity = await getUserIdentity(serviceClient, access);
    const resolvedSenderEmail = senderEmail || repIdentity?.email;
    const resolvedSenderName = senderName || repIdentity?.name;

    // Verify sender identity
    const validSender = SENDER_IDENTITIES.find(s => s.email === resolvedSenderEmail);
    const isDomainEmail = resolvedSenderEmail && resolvedSenderEmail.endsWith(`@${BRAND.domain}`);
    if (resolvedSenderEmail && !validSender && !isDomainEmail) {
      return NextResponse.json(
        { error: 'Invalid sender email.' },
        { status: 400 }
      );
    }

    // Sales reps can only send from their own identity
    if (access.isSalesRep && !access.isAdmin && resolvedSenderEmail && repIdentity) {
      if (resolvedSenderEmail !== repIdentity.email) {
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

    const fromName = resolvedSenderName || BRAND.name;
    const fromEmail = resolvedSenderEmail || `noreply@${BRAND.domain}`;
    const fromLine = `${fromName} <${fromEmail}>`;

    // Render HTML + plain text
    const emailProps = {
      headline,
      body: emailBody,
      businessName: recipientName || undefined,
      senderName: fromName,
      senderTitle: validSender?.title || repIdentity?.title || (isDomainEmail ? 'Sales Representative' : undefined),
    };
    const html = renderProfessionalEmail(emailProps);
    const text = renderProfessionalEmailPlainText(emailProps);

    const sendOptions: Parameters<typeof resend.emails.send>[0] = {
      from: fromLine,
      to: recipientEmail,
      subject,
      html,
      text,
      replyTo: validSender?.replyEmail || repIdentity?.replyEmail || (isDomainEmail ? fromEmail.replace(`@${BRAND.domain}`, `@${BRAND.replyDomain}`) : fromEmail),
    };

    // Add CC if provided and valid
    const emailRegexCc = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (cc && emailRegexCc.test(cc)) {
      sendOptions.cc = [cc];
    }

    if (inReplyToMessageId) {
      sendOptions.headers = {
        'In-Reply-To': `<${inReplyToMessageId}@resend.dev>`,
        'References': `<${inReplyToMessageId}@resend.dev>`,
      };
    }

    const { data: resendResult, error: sendError } = await resend.emails.send(sendOptions);

    if (sendError) {
      console.error('Resend error:', sendError);
      return NextResponse.json({ error: 'Failed to send email' }, { status: 500 });
    }

    if (!resendResult?.id) {
      console.error('Resend returned no ID:', resendResult);
      return NextResponse.json({ error: 'Failed to send email — no confirmation from provider' }, { status: 500 });
    }
    const resendId = resendResult.id;

    // Auto-link to lead
    let linkedLeadId: string | null = null;
    const { data: matchedLead } = await serviceClient
      .from('business_leads')
      .select('id')
      .ilike('email', recipientEmail)
      .limit(1)
      .single();

    if (matchedLead) linkedLeadId = matchedLead.id;

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
      attachments: [],
    });

    // Log activity on lead
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
          sent_from: 'mobile_inbox',
        },
      });

      await serviceClient
        .from('business_leads')
        .update({ last_contacted_at: new Date().toISOString() })
        .eq('id', linkedLeadId);
    }

    return NextResponse.json({
      success: true,
      resendId,
      linkedLeadId,
      message: `Email sent to ${recipientEmail}`,
    });
  } catch (error) {
    console.error('Error in mobile inbox send API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
