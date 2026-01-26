import { NextResponse } from 'next/server';
import { resend, EMAIL_CONFIG } from '@/lib/resend';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, email, phone, linkedin, message, position, resume } = body;

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

    // Send application email to info@tastelanc.com
    const htmlContent = `
      <h2>New Job Application — ${position || 'General'}</h2>
      <hr />
      <p><strong>Name:</strong> ${name}</p>
      <p><strong>Email:</strong> <a href="mailto:${email}">${email}</a></p>
      <p><strong>Phone:</strong> ${phone || 'Not provided'}</p>
      <p><strong>LinkedIn:</strong> ${linkedin ? `<a href="${linkedin}">${linkedin}</a>` : 'Not provided'}</p>
      <p><strong>Resume:</strong> ${resume ? 'Attached' : 'Not provided'}</p>
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
      subject: `New Job Application: ${position || 'General'} — ${name}`,
      html: htmlContent,
      replyTo: email,
      attachments,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error processing career application:', error);
    return NextResponse.json(
      { error: 'Failed to submit application' },
      { status: 500 }
    );
  }
}
