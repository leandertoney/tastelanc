import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { resend, EMAIL_CONFIG } from '@/lib/resend';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      name,
      email,
      phone,
      linkedin,
      message,
      position,
      resume,
      jobListingId,
      cityId,
      marketSlug,
    } = body;

    // Validate required fields
    if (!name || !email || !message) {
      return NextResponse.json(
        { error: 'Name, email, and message are required' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    const serviceClient = createServiceRoleClient();
    let resumeUrl: string | null = null;

    // Upload resume to Supabase Storage if provided
    if (resume?.content) {
      const timestamp = Date.now();
      const sanitizedName = name.replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase();
      const filePath = `${sanitizedName}-${timestamp}.pdf`;

      const fileBuffer = Buffer.from(resume.content, 'base64');

      const { data: uploadData, error: uploadError } = await serviceClient.storage
        .from('career-applications')
        .upload(filePath, fileBuffer, {
          contentType: 'application/pdf',
          upsert: false,
        });

      if (uploadError) {
        console.error('Resume upload error:', uploadError);
        // Continue without resume rather than failing the whole application
      } else {
        const { data: urlData } = serviceClient.storage
          .from('career-applications')
          .getPublicUrl(uploadData.path);
        resumeUrl = urlData.publicUrl;
      }
    }

    // Insert application into job_applications table
    const { error: insertError } = await serviceClient
      .from('job_applications')
      .insert({
        job_listing_id: jobListingId || null,
        city_id: cityId || null,
        name,
        email,
        phone: phone || null,
        linkedin: linkedin || null,
        message,
        resume_url: resumeUrl,
        status: 'new',
      });

    if (insertError) {
      console.error('Error inserting job application:', insertError);
      return NextResponse.json(
        { error: 'Failed to save application' },
        { status: 500 }
      );
    }

    // Send notification email via Resend
    const marketTag = marketSlug ? ` [${marketSlug}]` : '';
    const subject = `New Job Application: ${position || 'General'} — ${name}${marketTag}`;

    const htmlContent = `
      <h2>New Job Application — ${position || 'General'}${marketTag}</h2>
      <hr />
      <p><strong>Name:</strong> ${name}</p>
      <p><strong>Email:</strong> <a href="mailto:${email}">${email}</a></p>
      <p><strong>Phone:</strong> ${phone || 'Not provided'}</p>
      <p><strong>LinkedIn:</strong> ${linkedin ? `<a href="${linkedin}">${linkedin}</a>` : 'Not provided'}</p>
      <p><strong>Resume:</strong> ${resumeUrl ? `<a href="${resumeUrl}">Download</a>` : 'Not provided'}</p>
      ${cityId ? `<p><strong>City ID:</strong> ${cityId}</p>` : ''}
      ${jobListingId ? `<p><strong>Job Listing ID:</strong> ${jobListingId}</p>` : ''}
      <hr />
      <h3>Why they&rsquo;re interested</h3>
      <p>${message.replace(/\n/g, '<br />')}</p>
    `;

    const attachments = resume
      ? [{ filename: resume.name, content: Buffer.from(resume.content, 'base64') }]
      : undefined;

    await resend.emails.send({
      from: EMAIL_CONFIG.from,
      to: 'info@tastelanc.com',
      subject,
      html: htmlContent,
      replyTo: email,
      attachments,
    });

    // Log to expansion_activity_log if this is for an expansion city
    if (cityId) {
      try {
        await serviceClient.from('expansion_activity_log').insert({
          city_id: cityId,
          action: 'application_received',
          description: `New application from ${name} for ${position || 'General'}`,
          metadata: {
            applicant_email: email,
            position: position || 'General',
            job_listing_id: jobListingId || null,
          },
        });
      } catch (logError) {
        // Activity log is non-critical — don't fail the application if logging fails
        // Note: the expansion_activity_log CHECK constraint may need to be updated
        // to include 'application_received' if this insert fails
        console.error('Error logging to expansion_activity_log:', logError);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error processing career application:', error);
    return NextResponse.json(
      { error: 'Failed to submit application' },
      { status: 500 }
    );
  }
}
