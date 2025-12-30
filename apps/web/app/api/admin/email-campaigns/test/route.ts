import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { sendEmail } from '@/lib/resend';
import { renderPromotionalEmail } from '@/lib/email-templates/promotional-template';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    // Verify user is admin
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isAdmin = user.email === 'admin@tastelanc.com';
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { testEmail, subject, headline, body: emailBody, previewText, ctaText, ctaUrl } = body;

    if (!testEmail || !subject || !headline || !emailBody) {
      return NextResponse.json(
        { error: 'Missing required fields: testEmail, subject, headline, body' },
        { status: 400 }
      );
    }

    // Generate unsubscribe URL (test mode)
    const unsubscribeUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/api/unsubscribe?email=${encodeURIComponent(testEmail)}&test=true`;

    // Render email
    const html = renderPromotionalEmail({
      headline,
      body: emailBody,
      ctaText,
      ctaUrl,
      previewText,
      unsubscribeUrl,
    });

    // Send test email
    const result = await sendEmail({
      to: testEmail,
      subject: `[TEST] ${subject}`,
      html,
    });

    if (result.error) {
      console.error('Test email error:', result.error);
      return NextResponse.json(
        { error: result.error.message || 'Failed to send test email' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Test email sent to ${testEmail}`,
      id: result.data?.id,
    });
  } catch (error) {
    console.error('Error sending test email:', error);
    return NextResponse.json(
      { error: 'Failed to send test email' },
      { status: 500 }
    );
  }
}
