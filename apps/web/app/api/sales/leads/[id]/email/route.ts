import { NextResponse } from 'next/server';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { verifySalesAccess } from '@/lib/auth/sales-access';
import { resend } from '@/lib/resend';
import { renderB2BEmail } from '@/lib/email-templates/b2b-outreach-template';
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
    } = body;

    if (!subject || !headline || !emailBody) {
      return NextResponse.json(
        { error: 'Missing required fields: subject, headline, emailBody' },
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

    // Fetch lead
    const { data: lead, error: leadError } = await serviceClient
      .from('business_leads')
      .select('id, email, business_name, contact_name')
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

    // Build unsubscribe URL
    const unsubscribeUrl = `https://${BRAND.domain}/api/unsubscribe/b2b?email=${encodeURIComponent(lead.email)}`;

    // Render email HTML
    const html = renderB2BEmail({
      headline,
      body: emailBody,
      ctaText: ctaText || undefined,
      ctaUrl: ctaUrl || undefined,
      previewText: subject,
      unsubscribeUrl,
      businessName: lead.business_name,
      contactName: lead.contact_name || undefined,
    });

    // Determine sender
    const fromName = senderName || BRAND.name;
    const fromEmail = senderEmail || `noreply@${BRAND.domain}`;
    const fromLine = `${fromName} <${fromEmail}>`;

    // Send via Resend
    const { data: resendResult, error: sendError } = await resend.emails.send({
      from: fromLine,
      to: lead.email,
      subject,
      html,
      replyTo: fromEmail,
    });

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

    // Update last_contacted_at
    await serviceClient
      .from('business_leads')
      .update({ last_contacted_at: new Date().toISOString() })
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
