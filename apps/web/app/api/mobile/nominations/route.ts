import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { sendEmail } from '@/lib/resend';
import { BRAND } from '@/config/market';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Nomination types
// 'restaurant' — user wants a restaurant added
// 'event'      — user wants an event listed
// 'entertainment' — user wants a live music / entertainment act listed
// 'owner'      — the submitter IS the owner/organizer (routes to sales team)
type NominationType = 'restaurant' | 'event' | 'entertainment' | 'owner';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      type,
      spot_name,       // restaurant / event / act name
      details,         // when & where, notes, etc.
      submitter_name,  // optional
      submitter_email, // optional
      market_id,
    } = body;

    if (!type || !spot_name?.trim()) {
      return NextResponse.json(
        { error: 'type and spot_name are required' },
        { status: 400 }
      );
    }

    const serviceClient = createServiceRoleClient();

    // Save to contact_submissions so it shows up in admin contacts view
    const typeLabel: Record<NominationType, string> = {
      restaurant: '[Nomination — Restaurant]',
      event:      '[Nomination — Event]',
      entertainment: '[Nomination — Entertainment]',
      owner:      '[Owner Inquiry]',
    };

    const messageBody = details?.trim()
      ? `${typeLabel[type as NominationType] ?? '[Nomination]'}\n\n${spot_name.trim()}\n\n${details.trim()}`
      : `${typeLabel[type as NominationType] ?? '[Nomination]'}\n\n${spot_name.trim()}`;

    await serviceClient.from('contact_submissions').insert({
      name: submitter_name?.trim() || 'Anonymous',
      email: submitter_email?.trim() || null,
      business_name: spot_name.trim(),
      message: messageBody,
      interested_plan: null,
      market_id: market_id || null,
    });

    // Send notification email to the team
    const isOwner = type === 'owner';
    const subject = isOwner
      ? `[Owner Inquiry] ${spot_name.trim()} — ${BRAND.name}`
      : `[Nomination] ${spot_name.trim()} — ${BRAND.name}`;

    const emailHtml = isOwner ? `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #E63946;">New Owner / Organizer Inquiry</h2>
        <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 0 0 8px;"><strong>Name:</strong> ${spot_name.trim()}</p>
          ${submitter_name ? `<p style="margin: 0 0 8px;"><strong>Contact:</strong> ${submitter_name.trim()}</p>` : ''}
          ${submitter_email ? `<p style="margin: 0 0 8px;"><strong>Email:</strong> ${submitter_email.trim()}</p>` : ''}
          ${details ? `<p style="margin: 0; white-space: pre-wrap;"><strong>Message:</strong><br>${details.trim()}</p>` : ''}
        </div>
        <p style="color: #888; font-size: 14px;">
          Submitted via ${BRAND.name} app · ${new Date().toLocaleString('en-US', { timeZone: 'America/New_York' })} ET
        </p>
        <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;" />
        <p><a href="https://${BRAND.domain}/admin/contacts" style="color: #E63946;">View in Admin →</a></p>
      </div>
    ` : `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #E63946;">📍 New ${type === 'restaurant' ? 'Restaurant' : type === 'event' ? 'Event' : 'Entertainment'} Nomination</h2>
        <p style="color: #555;">A ${BRAND.name} user thinks this should be in the app:</p>
        <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 0 0 8px; font-size: 18px;"><strong>${spot_name.trim()}</strong></p>
          ${details ? `<p style="margin: 0; color: #666; white-space: pre-wrap;">${details.trim()}</p>` : ''}
        </div>
        ${submitter_name || submitter_email ? `
        <p style="color: #555; font-size: 14px;">
          <strong>Submitted by:</strong> ${submitter_name?.trim() || 'Anonymous'}
          ${submitter_email ? ` · <a href="mailto:${submitter_email.trim()}">${submitter_email.trim()}</a>` : ''}
        </p>` : ''}
        <p style="color: #888; font-size: 14px;">
          Submitted via ${BRAND.name} app · ${new Date().toLocaleString('en-US', { timeZone: 'America/New_York' })} ET
        </p>
        <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;" />
        <p><a href="https://${BRAND.domain}/admin/contacts" style="color: #E63946;">View in Admin →</a></p>
      </div>
    `;

    try {
      await sendEmail({
        to: 'info@tastelanc.com',
        subject,
        html: emailHtml,
      });
    } catch (emailErr) {
      // Don't fail the request if email fails — DB record is the source of truth
      console.error('Nomination email failed:', emailErr);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Error processing nomination:', err);
    return NextResponse.json({ error: 'Failed to submit' }, { status: 500 });
  }
}
