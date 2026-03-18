/**
 * Post-Conversation Follow-Up Emails
 *
 * After a voice agent conversation ends, the agent sends a follow-up
 * email to the prospect (if we have their email) with relevant info
 * based on what they discussed.
 */

import { sendEmail } from '@/lib/resend';
import { BRAND } from '@/config/market';

interface FollowUpData {
  recipientEmail: string;
  recipientName: string;
  businessName?: string;
  outcome: string;
  summary: string;
  meetingDate?: string;
  meetingTime?: string;
  intent?: string[];
  marketName: string;
}

/**
 * Send a follow-up email after a voice conversation.
 * Content adapts based on the conversation outcome.
 */
export async function sendFollowUpEmail(data: FollowUpData) {
  const { recipientEmail, recipientName, businessName, outcome, summary, meetingDate, meetingTime, intent, marketName } = data;

  if (!recipientEmail) return;

  const firstName = recipientName.split(' ')[0] || recipientName;

  let subject: string;
  let bodyContent: string;

  switch (outcome) {
    case 'meeting_booked': {
      const timeDisplay = meetingTime ? formatTime(meetingTime) : '';
      subject = `Your ${marketName} Demo is Confirmed — ${meetingDate}${timeDisplay ? ` at ${timeDisplay}` : ''}`;
      bodyContent = `
        <p>Hey ${firstName},</p>
        <p>Great chatting with you! Your demo is confirmed:</p>
        <div style="background: #0f3460; padding: 20px; border-radius: 8px; margin: 16px 0;">
          <p style="margin: 0; color: #aaa; font-size: 13px;">MEETING DETAILS</p>
          <p style="margin: 8px 0 0; color: #fff; font-size: 18px; font-weight: 600;">${meetingDate}${timeDisplay ? ` at ${timeDisplay}` : ''}</p>
          ${businessName ? `<p style="margin: 4px 0 0; color: #ccc;">${businessName}</p>` : ''}
        </div>
        <p>One of our founders will walk you through how ${marketName} can help ${businessName || 'your restaurant'} reach more local diners. It's a quick 15-minute call — no pressure.</p>
        <p>If you need to reschedule, just reply to this email.</p>
      `;
      break;
    }

    case 'follow_up': {
      subject = `Thanks for Chatting with ${marketName}`;
      bodyContent = `
        <p>Hey ${firstName},</p>
        <p>Thanks for reaching out to ${marketName}! I wanted to follow up on our conversation.</p>
        ${(intent || []).includes('pricing_inquiry') ? `
          <p>You asked about pricing — our team would love to walk you through the plans and find the best fit for ${businessName || 'your restaurant'}. Just reply to this email and we'll set up a quick call.</p>
        ` : `
          <p>If you have any more questions about how ${marketName} can help ${businessName || 'your restaurant'} reach more local diners, just reply to this email. We'd love to help.</p>
        `}
      `;
      break;
    }

    case 'browsing': {
      subject = `Discover What ${marketName} Can Do for Your Restaurant`;
      bodyContent = `
        <p>Hey ${firstName},</p>
        <p>Thanks for checking out ${marketName}! We help local restaurants get discovered by diners who are actively looking for where to eat, drink, and go out.</p>
        <p>If you're curious about how it works for ${businessName || 'your restaurant'}, just reply to this email — we'd love to chat.</p>
      `;
      break;
    }

    default:
      return; // Don't send for 'not_interested', 'transferred', 'abandoned'
  }

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; background: #16213e; border-radius: 12px; overflow: hidden;">
      <div style="padding: 32px; color: #eee; line-height: 1.6;">
        ${bodyContent}
        <p style="margin-top: 24px;">
          Cheers,<br/>
          <strong>The ${marketName} Team</strong>
        </p>
      </div>
      <div style="background: #0f3460; padding: 16px; text-align: center; border-top: 1px solid #1a3a6e;">
        <p style="color: #666; margin: 0; font-size: 11px;">
          You received this email because you spoke with our AI assistant on ${BRAND.domain}.
          Reply to this email to reach our team directly.
        </p>
      </div>
    </div>
  `;

  try {
    await sendEmail({
      to: recipientEmail,
      subject,
      html,
      replyTo: `lt@${BRAND.domain}`,
    });
  } catch (e) {
    console.error('Follow-up email error:', e);
  }
}

function formatTime(time: string): string {
  const [h, m] = time.split(':');
  const hour = parseInt(h);
  const suffix = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour > 12 ? hour - 12 : hour;
  return `${displayHour}:${m} ${suffix}`;
}
