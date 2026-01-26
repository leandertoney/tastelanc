import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { resend, getRecipientsBySegment, EMAIL_CONFIG } from '@/lib/resend';
import { renderPromotionalEmail } from '@/lib/email-templates/promotional-template';

const HIRING_EMAIL = {
  subject: "We're Hiring! Join the TasteLanc Team",
  previewText: "Help us connect Lancaster's best restaurants with the community",
  headline: 'TasteLanc Is Hiring!',
  body: `We're growing! TasteLanc is looking for passionate, self-motivated people who love Lancaster's local food scene to join our team.

We're currently hiring for:

**Restaurant Partnership Manager**
• Commission-based role with uncapped earnings
• Flexible schedule, in-person in Lancaster, PA
• Build relationships with local restaurants and help them grow
• Be part of a fast-moving startup shaping how Lancaster discovers food

This is a relationship-first role — not traditional sales. If you're a people person who loves local food and nightlife, this could be the perfect fit.

Know someone who'd be great? Share this with them!`,
  ctaText: 'View Open Positions & Apply',
  ctaUrl: 'https://tastelanc.com/careers',
  from: 'TasteLanc Careers <careers@tastelanc.com>',
};

const PUSH_NOTIFICATION = {
  title: 'TasteLanc Is Hiring!',
  message:
    "We're looking for passionate people to join our team. Tap to see open positions.",
  data: { url: 'https://tastelanc.com/careers' },
};

export async function GET() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user || user.email !== 'admin@tastelanc.com') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const emailRecipients = await getRecipientsBySegment(supabase, 'all');

    const { count: pushCount } = await supabase
      .from('push_tokens')
      .select('*', { count: 'exact', head: true });

    return NextResponse.json({
      emailRecipients: emailRecipients.length,
      pushRecipients: pushCount || 0,
      email: {
        subject: HIRING_EMAIL.subject,
        headline: HIRING_EMAIL.headline,
        from: HIRING_EMAIL.from,
      },
      push: PUSH_NOTIFICATION,
    });
  } catch (error) {
    console.error('Error fetching preview:', error);
    return NextResponse.json(
      { error: 'Failed to load preview' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user || user.email !== 'admin@tastelanc.com') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { testEmail } = body;

    // --- Test email mode ---
    if (testEmail) {
      const html = renderPromotionalEmail({
        headline: HIRING_EMAIL.headline,
        body: HIRING_EMAIL.body,
        ctaText: HIRING_EMAIL.ctaText,
        ctaUrl: HIRING_EMAIL.ctaUrl,
        previewText: HIRING_EMAIL.previewText,
        unsubscribeUrl: `${process.env.NEXT_PUBLIC_SITE_URL}/api/unsubscribe?email=${encodeURIComponent(testEmail)}`,
      });

      await resend.emails.send({
        from: HIRING_EMAIL.from,
        to: testEmail,
        subject: `[TEST] ${HIRING_EMAIL.subject}`,
        html,
        replyTo: 'careers@tastelanc.com',
      });

      return NextResponse.json({
        success: true,
        message: `Test email sent to ${testEmail}`,
      });
    }

    // --- Full send mode ---
    const recipients = await getRecipientsBySegment(supabase, 'all');

    if (recipients.length === 0) {
      return NextResponse.json(
        { error: 'No recipients found' },
        { status: 400 }
      );
    }

    // Send emails in batches
    let totalSent = 0;
    let totalFailed = 0;

    for (let i = 0; i < recipients.length; i += EMAIL_CONFIG.batchSize) {
      const batch = recipients.slice(i, i + EMAIL_CONFIG.batchSize);

      const emailsToSend = batch.map((recipient) => {
        const unsubscribeUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/api/unsubscribe?email=${encodeURIComponent(recipient.email)}`;

        const html = renderPromotionalEmail({
          headline: HIRING_EMAIL.headline,
          body: HIRING_EMAIL.body,
          ctaText: HIRING_EMAIL.ctaText,
          ctaUrl: HIRING_EMAIL.ctaUrl,
          previewText: HIRING_EMAIL.previewText,
          unsubscribeUrl,
        });

        return {
          from: HIRING_EMAIL.from,
          to: recipient.email,
          subject: HIRING_EMAIL.subject,
          html,
          reply_to: 'careers@tastelanc.com',
        };
      });

      try {
        const result = await resend.batch.send(emailsToSend);

        if (result.data && Array.isArray(result.data)) {
          const batchData = result.data as Array<
            { id: string } | { error: { message: string } }
          >;
          batchData.forEach((r) => {
            if ('id' in r) totalSent++;
            else totalFailed++;
          });
        } else if (result.error) {
          totalFailed += batch.length;
        }
      } catch {
        totalFailed += batch.length;
      }

      // Delay between batches
      if (i + EMAIL_CONFIG.batchSize < recipients.length) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }

    // Send push notification broadcast
    let pushSent = 0;
    let pushTotal = 0;

    try {
      const pushResponse = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/send-notifications/broadcast`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
          },
          body: JSON.stringify(PUSH_NOTIFICATION),
        }
      );

      if (pushResponse.ok) {
        const pushResult = await pushResponse.json();
        pushSent = pushResult.sent || 0;
        pushTotal = pushResult.total || 0;
      }
    } catch (pushError) {
      console.error('Push notification error:', pushError);
    }

    return NextResponse.json({
      success: true,
      emailsSent: totalSent,
      emailsFailed: totalFailed,
      emailsTotal: recipients.length,
      pushSent,
      pushTotal,
    });
  } catch (error) {
    console.error('Error sending hiring announcement:', error);
    return NextResponse.json(
      { error: 'Failed to send announcement' },
      { status: 500 }
    );
  }
}
