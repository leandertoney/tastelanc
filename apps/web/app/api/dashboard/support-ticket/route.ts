import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { verifyRestaurantAccess } from '@/lib/auth/restaurant-access';
import { resend, EMAIL_CONFIG } from '@/lib/resend';

export const dynamic = 'force-dynamic';

const SUPPORT_EMAIL = 'info@tastelanc.com';

function buildSupportEmailHtml(params: {
  restaurantName: string;
  userEmail: string;
  marketId: string;
  subject: string;
  message: string;
  timestamp: string;
}): string {
  const { restaurantName, userEmail, marketId, subject, message, timestamp } = params;

  const marketLabels: Record<string, string> = {
    'lancaster-pa': 'TasteLanc (Lancaster, PA)',
    'cumberland-pa': 'TasteCumberland (Cumberland County, PA)',
    'fayetteville-nc': 'TasteFayetteville (Fayetteville, NC)',
  };
  const marketLabel = marketLabels[marketId] ?? marketId;

  const escapedMessage = message
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '<br>');

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Support Request</title></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f5f5f5; padding: 20px; margin: 0;">
  <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 8px; overflow: hidden; border: 1px solid #e0e0e0;">

    <div style="background: #A41E22; padding: 20px 24px;">
      <h1 style="color: #ffffff; margin: 0; font-size: 18px; font-weight: 600;">Dashboard Support Request</h1>
      <p style="color: rgba(255,255,255,0.75); margin: 4px 0 0; font-size: 13px;">TasteLanc Restaurant Dashboard</p>
    </div>

    <div style="padding: 24px;">
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
        <tr>
          <td style="padding: 7px 0; color: #888; font-size: 13px; width: 140px; vertical-align: top;">Restaurant</td>
          <td style="padding: 7px 0; color: #111; font-size: 13px; font-weight: 600;">${restaurantName}</td>
        </tr>
        <tr>
          <td style="padding: 7px 0; color: #888; font-size: 13px; vertical-align: top;">Owner Email</td>
          <td style="padding: 7px 0; color: #111; font-size: 13px;">${userEmail}</td>
        </tr>
        <tr>
          <td style="padding: 7px 0; color: #888; font-size: 13px; vertical-align: top;">Market</td>
          <td style="padding: 7px 0; color: #111; font-size: 13px;">${marketLabel}</td>
        </tr>
        <tr>
          <td style="padding: 7px 0; color: #888; font-size: 13px; vertical-align: top;">Subject</td>
          <td style="padding: 7px 0;">
            <span style="background: #f0f0f0; border-radius: 4px; padding: 3px 10px; font-size: 12px; color: #333; display: inline-block;">${subject}</span>
          </td>
        </tr>
        <tr>
          <td style="padding: 7px 0; color: #888; font-size: 13px; vertical-align: top;">Submitted</td>
          <td style="padding: 7px 0; color: #111; font-size: 13px;">${timestamp}</td>
        </tr>
      </table>

      <hr style="border: none; border-top: 1px solid #e8e8e8; margin-bottom: 24px;">

      <h3 style="font-size: 12px; color: #888; margin: 0 0 12px; text-transform: uppercase; letter-spacing: 0.08em;">Message</h3>
      <div style="background: #f8f8f8; border-left: 3px solid #A41E22; padding: 14px 16px; border-radius: 0 4px 4px 0; font-size: 14px; color: #222; line-height: 1.65;">
        ${escapedMessage}
      </div>
    </div>

    <div style="background: #f5f5f5; padding: 14px 24px; border-top: 1px solid #e8e8e8;">
      <p style="margin: 0; font-size: 12px; color: #999;">
        Sent from the TasteLanc Restaurant Dashboard support form.
        Reply directly to this email to respond to the restaurant owner.
      </p>
    </div>
  </div>
</body>
</html>`;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { restaurantId, subject, message, attachmentBase64, attachmentName } = body as {
      restaurantId: string;
      subject: string;
      message: string;
      attachmentBase64?: string;
      attachmentName?: string;
    };

    if (!restaurantId) {
      return NextResponse.json({ error: 'Restaurant ID is required' }, { status: 400 });
    }
    if (!subject || !message?.trim()) {
      return NextResponse.json({ error: 'Subject and message are required' }, { status: 400 });
    }

    const supabase = await createClient();
    const accessResult = await verifyRestaurantAccess(supabase, restaurantId);
    if (!accessResult.canAccess) {
      return NextResponse.json(
        { error: accessResult.error || 'Access denied' },
        { status: accessResult.userId ? 403 : 401 }
      );
    }

    const { data: { user } } = await supabase.auth.getUser();
    const userEmail = user?.email ?? 'unknown@unknown.com';

    const restaurant = accessResult.restaurant!;
    const timestamp = new Date().toLocaleString('en-US', {
      timeZone: 'America/New_York',
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      timeZoneName: 'short',
    });

    const html = buildSupportEmailHtml({
      restaurantName: restaurant.name,
      userEmail,
      marketId: restaurant.market_id ?? '',
      subject,
      message,
      timestamp,
    });

    await resend.emails.send({
      from: EMAIL_CONFIG.from,
      to: SUPPORT_EMAIL,
      replyTo: userEmail,
      subject: `[Dashboard Support] ${subject} — ${restaurant.name}`,
      html,
      ...(attachmentBase64 && attachmentName
        ? { attachments: [{ filename: attachmentName, content: attachmentBase64 }] }
        : {}),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Support ticket error:', error);
    return NextResponse.json({ error: 'Failed to send support request' }, { status: 500 });
  }
}
