/**
 * Voice Agent Notification System
 *
 * Sends email notifications to Leander and Jordan (founders only)
 * when the voice agent books a meeting or flags a hot lead.
 * Sales reps are NOT notified — founders handle all AI-generated leads.
 */

import { sendEmail } from '@/lib/resend';

// Founders only — no sales reps
const NOTIFICATION_RECIPIENTS = [
  'leandertoney@gmail.com',
];

interface MeetingBookedNotification {
  leadName: string;
  businessName: string;
  meetingDate: string;
  meetingTime: string;
  marketName: string;
  conversationSummary?: string;
  transcriptId?: string;
}

interface HotLeadNotification {
  leadName: string;
  businessName: string;
  reason: string;
  marketName: string;
  callerPhone?: string;
  conversationSummary?: string;
  transcriptId?: string;
}

interface ConversationCompletedNotification {
  marketName: string;
  outcome: string;
  summary: string;
  sentiment: string;
  durationSeconds: number;
  leadName?: string;
  businessName?: string;
  transcriptId?: string;
}

/**
 * Notify founders when the AI agent books a meeting.
 */
export async function notifyMeetingBooked(data: MeetingBookedNotification) {
  const { leadName, businessName, meetingDate, meetingTime, marketName, conversationSummary, transcriptId } = data;

  // Format time for display
  const [h, m] = meetingTime.split(':');
  const hour = parseInt(h);
  const suffix = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour > 12 ? hour - 12 : hour;
  const timeStr = `${displayHour}:${m} ${suffix}`;

  const subject = `Meeting Booked: ${businessName} — ${meetingDate} at ${timeStr}`;

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #1a1a2e; padding: 24px; border-radius: 12px 12px 0 0;">
        <h2 style="color: #e94560; margin: 0;">Meeting Booked by AI Agent</h2>
      </div>
      <div style="background: #16213e; padding: 24px; color: #eee;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr><td style="padding: 8px 0; color: #aaa;">Contact</td><td style="padding: 8px 0; color: #fff; font-weight: 600;">${leadName}</td></tr>
          <tr><td style="padding: 8px 0; color: #aaa;">Business</td><td style="padding: 8px 0; color: #fff; font-weight: 600;">${businessName}</td></tr>
          <tr><td style="padding: 8px 0; color: #aaa;">Date</td><td style="padding: 8px 0; color: #fff; font-weight: 600;">${meetingDate}</td></tr>
          <tr><td style="padding: 8px 0; color: #aaa;">Time</td><td style="padding: 8px 0; color: #fff; font-weight: 600;">${timeStr}</td></tr>
          <tr><td style="padding: 8px 0; color: #aaa;">Market</td><td style="padding: 8px 0; color: #fff;">${marketName}</td></tr>
        </table>
        ${conversationSummary ? `
          <div style="margin-top: 16px; padding: 16px; background: #0f3460; border-radius: 8px;">
            <p style="color: #aaa; margin: 0 0 8px; font-size: 13px;">Conversation Summary</p>
            <p style="color: #ddd; margin: 0; font-size: 14px;">${conversationSummary}</p>
          </div>
        ` : ''}
        ${transcriptId ? `
          <div style="margin-top: 16px; text-align: center;">
            <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://tastelanc.com'}/sales/transcripts/${transcriptId}"
               style="display: inline-block; padding: 10px 24px; background: #e94560; color: #fff; text-decoration: none; border-radius: 8px; font-weight: 600;">
              View Full Transcript
            </a>
          </div>
        ` : ''}
      </div>
      <div style="background: #0f3460; padding: 16px; border-radius: 0 0 12px 12px; text-align: center;">
        <p style="color: #666; margin: 0; font-size: 12px;">AI Voice Agent Notification</p>
      </div>
    </div>
  `;

  for (const recipient of NOTIFICATION_RECIPIENTS) {
    try {
      await sendEmail({ to: recipient, subject, html });
    } catch (e) {
      console.error(`Failed to notify ${recipient}:`, e);
    }
  }
}

/**
 * Notify founders when the AI agent flags a transfer-to-human request.
 */
export async function notifyHotLead(data: HotLeadNotification) {
  const { leadName, businessName, reason, marketName, callerPhone, conversationSummary, transcriptId } = data;

  const subject = `Hot Lead: ${businessName || leadName || 'Unknown'} wants to talk`;

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #1a1a2e; padding: 24px; border-radius: 12px 12px 0 0;">
        <h2 style="color: #f39c12; margin: 0;">Human Transfer Requested</h2>
      </div>
      <div style="background: #16213e; padding: 24px; color: #eee;">
        <table style="width: 100%; border-collapse: collapse;">
          ${leadName ? `<tr><td style="padding: 8px 0; color: #aaa;">Contact</td><td style="padding: 8px 0; color: #fff; font-weight: 600;">${leadName}</td></tr>` : ''}
          ${businessName ? `<tr><td style="padding: 8px 0; color: #aaa;">Business</td><td style="padding: 8px 0; color: #fff; font-weight: 600;">${businessName}</td></tr>` : ''}
          ${callerPhone ? `<tr><td style="padding: 8px 0; color: #aaa;">Phone</td><td style="padding: 8px 0; color: #fff; font-weight: 600;">${callerPhone}</td></tr>` : ''}
          <tr><td style="padding: 8px 0; color: #aaa;">Reason</td><td style="padding: 8px 0; color: #fff;">${reason}</td></tr>
          <tr><td style="padding: 8px 0; color: #aaa;">Market</td><td style="padding: 8px 0; color: #fff;">${marketName}</td></tr>
        </table>
        ${conversationSummary ? `
          <div style="margin-top: 16px; padding: 16px; background: #0f3460; border-radius: 8px;">
            <p style="color: #aaa; margin: 0 0 8px; font-size: 13px;">Conversation Summary</p>
            <p style="color: #ddd; margin: 0; font-size: 14px;">${conversationSummary}</p>
          </div>
        ` : ''}
        ${transcriptId ? `
          <div style="margin-top: 16px; text-align: center;">
            <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://tastelanc.com'}/sales/transcripts/${transcriptId}"
               style="display: inline-block; padding: 10px 24px; background: #f39c12; color: #fff; text-decoration: none; border-radius: 8px; font-weight: 600;">
              View Full Transcript
            </a>
          </div>
        ` : ''}
      </div>
    </div>
  `;

  for (const recipient of NOTIFICATION_RECIPIENTS) {
    try {
      await sendEmail({ to: recipient, subject, html });
    } catch (e) {
      console.error(`Failed to notify ${recipient}:`, e);
    }
  }
}

/**
 * Send a daily digest of voice agent activity.
 * Called by a cron job.
 */
export async function notifyDailyDigest(stats: {
  totalConversations: number;
  meetingsBooked: number;
  leadsCreated: number;
  transfers: number;
  totalCostCents: number;
  topOutcomes: Array<{ outcome: string; count: number }>;
}) {
  if (stats.totalConversations === 0) return;

  const subject = `Voice Agent Daily: ${stats.meetingsBooked} meetings, ${stats.leadsCreated} leads`;

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #1a1a2e; padding: 24px; border-radius: 12px 12px 0 0;">
        <h2 style="color: #e94560; margin: 0;">Voice Agent Daily Report</h2>
      </div>
      <div style="background: #16213e; padding: 24px; color: #eee;">
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px;">
          <div style="background: #0f3460; padding: 16px; border-radius: 8px; text-align: center;">
            <p style="color: #aaa; margin: 0; font-size: 12px;">Conversations</p>
            <p style="color: #fff; margin: 4px 0 0; font-size: 28px; font-weight: 700;">${stats.totalConversations}</p>
          </div>
          <div style="background: #0f3460; padding: 16px; border-radius: 8px; text-align: center;">
            <p style="color: #aaa; margin: 0; font-size: 12px;">Meetings Booked</p>
            <p style="color: #e94560; margin: 4px 0 0; font-size: 28px; font-weight: 700;">${stats.meetingsBooked}</p>
          </div>
          <div style="background: #0f3460; padding: 16px; border-radius: 8px; text-align: center;">
            <p style="color: #aaa; margin: 0; font-size: 12px;">Leads Created</p>
            <p style="color: #fff; margin: 4px 0 0; font-size: 28px; font-weight: 700;">${stats.leadsCreated}</p>
          </div>
          <div style="background: #0f3460; padding: 16px; border-radius: 8px; text-align: center;">
            <p style="color: #aaa; margin: 0; font-size: 12px;">API Cost</p>
            <p style="color: #fff; margin: 4px 0 0; font-size: 28px; font-weight: 700;">$${(stats.totalCostCents / 100).toFixed(2)}</p>
          </div>
        </div>
        ${stats.transfers > 0 ? `<p style="color: #f39c12; margin: 0;">⚠️ ${stats.transfers} caller(s) requested human transfer</p>` : ''}
      </div>
    </div>
  `;

  for (const recipient of NOTIFICATION_RECIPIENTS) {
    try {
      await sendEmail({ to: recipient, subject, html });
    } catch (e) {
      console.error(`Failed to send digest to ${recipient}:`, e);
    }
  }
}
