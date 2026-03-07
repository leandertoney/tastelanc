import { NextResponse } from 'next/server';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { verifySalesAccess } from '@/lib/auth/sales-access';
import { resend } from '@/lib/resend';
import { renderProfessionalEmail, renderProfessionalEmailPlainText } from '@/lib/email-templates/professional-template';
import { BRAND } from '@/config/market';
import { SENDER_IDENTITIES } from '@/config/sender-identities';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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

    if (!subject || !emailBody) {
      return NextResponse.json(
        { error: 'Missing required fields: subject, emailBody' },
        { status: 400 }
      );
    }

    // Verify sender identity is on allowed list
    const validSender = SENDER_IDENTITIES.find((s) => s.email === senderEmail);
    if (senderEmail && !validSender) {
      return NextResponse.json(
        { error: 'Invalid sender email. Must use an approved sender identity.' },
        { status: 400 }
      );
    }

    // Fetch lead with market
    const { data: lead, error: leadError } = await serviceClient
      .from('business_leads')
      .select('id, email, business_name, contact_name, markets(slug)')
      .eq('id', id)
      .single();

    if (leadError || !lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    if (!lead.email) {
      return NextResponse.json(
        { error: 'This lead does not have an email address' },
        { status: 400 }
      );
    }

    // Check B2B unsubscribes
    const { data: unsub } = await serviceClient
      .from('b2b_unsubscribes')
      .select('id')
      .eq('email', lead.email.toLowerCase())
      .single();

    if (unsub) {
      return NextResponse.json(
        { error: 'This lead has unsubscribed from emails' },
        { status: 400 }
      );
    }

    // Render HTML + plain text (multipart). Resend tracking is DISABLED on tastelanc.com
    // so no tracking markup is injected — clean HTML lands in Gmail Primary.
    const marketSlug = (lead as any).markets?.slug as string | undefined;
    const emailProps = {
      headline: headline || subject,
      body: emailBody,
      businessName: lead.business_name,
      contactName: lead.contact_name || undefined,
      senderName: senderName || BRAND.name,
      senderTitle: validSender?.title || undefined,
      marketSlug,
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
      to: lead.email,
      subject,
      html,
      text,
      replyTo: validSender?.replyEmail || fromEmail,
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
      return NextResponse.json(
        { error: 'Failed to send email' },
        { status: 500 }
      );
    }

    const resendId = resendResult?.id || null;

    // Record in email_sends
    await serviceClient.from('email_sends').insert({
      recipient_email: lead.email,
      resend_id: resendId,
      status: 'sent',
      lead_id: id,
      sent_by: access.userId,
      subject,
      sender_name: fromName,
      sender_email: fromEmail,
      thread_id: threadId || null,
      in_reply_to_message_id: inReplyToMessageId || null,
      body_text: emailBody,
      headline: headline || subject,
    });

    // Log activity on lead
    await serviceClient.from('lead_activities').insert({
      lead_id: id,
      user_id: access.userId,
      activity_type: 'email',
      description: `Sent email: "${subject}"`,
      metadata: {
        subject,
        resend_id: resendId,
        sender_name: fromName,
        sender_email: fromEmail,
      },
    });

    // Update last_contacted_at and auto-assign if unassigned
    const leadUpdate: Record<string, string> = { last_contacted_at: new Date().toISOString() };
    // Fetch current assignment
    const { data: currentLead } = await serviceClient
      .from('business_leads')
      .select('assigned_to')
      .eq('id', id)
      .single();
    if (currentLead && !currentLead.assigned_to && access.userId) {
      leadUpdate.assigned_to = access.userId;
    }
    await serviceClient
      .from('business_leads')
      .update(leadUpdate)
      .eq('id', id);

    // Save sender preference if changed
    if (senderName && senderEmail && access.isSalesRep) {
      const { data: existingRep } = await serviceClient
        .from('sales_reps')
        .select('id, preferred_sender_name, preferred_sender_email')
        .eq('id', access.userId)
        .single();

      if (existingRep && (existingRep.preferred_sender_name !== senderName || existingRep.preferred_sender_email !== senderEmail)) {
        await serviceClient
          .from('sales_reps')
          .update({
            preferred_sender_name: senderName,
            preferred_sender_email: senderEmail,
          })
          .eq('id', access.userId);
      }
    }

    return NextResponse.json({
      success: true,
      resendId,
      message: `Email sent to ${lead.email}`,
    });
  } catch (error) {
    console.error('Error in sales email send API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
