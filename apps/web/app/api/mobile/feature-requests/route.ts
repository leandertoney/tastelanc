import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { sendEmail } from '@/lib/resend';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { title, description, user_id } = body;

    // Validate required fields
    if (!title || !description) {
      return NextResponse.json(
        { error: 'Title and description are required' },
        { status: 400 }
      );
    }

    // Validate lengths
    if (title.length > 200) {
      return NextResponse.json(
        { error: 'Title must be 200 characters or less' },
        { status: 400 }
      );
    }

    if (description.length > 2000) {
      return NextResponse.json(
        { error: 'Description must be 2000 characters or less' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Store in Supabase
    const { data, error } = await supabase
      .from('feature_requests')
      .insert({
        title: title.trim(),
        description: description.trim(),
        user_id: user_id || null,
        status: 'new',
      })
      .select('id')
      .single();

    if (error) {
      console.error('Error storing feature request:', error);
      return NextResponse.json(
        { error: 'Failed to submit feature request' },
        { status: 500 }
      );
    }

    // Send email notification to admin
    try {
      const emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #E63946;">New Feature Request</h2>
          <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #333;">${title}</h3>
            <p style="color: #666; white-space: pre-wrap;">${description}</p>
          </div>
          <p style="color: #888; font-size: 14px;">
            Submitted: ${new Date().toLocaleString('en-US', { timeZone: 'America/New_York' })} EST
          </p>
          <p style="color: #888; font-size: 14px;">
            User ID: ${user_id || 'Anonymous'}
          </p>
          <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;" />
          <p>
            <a href="https://tastelanc.com/admin/feature-requests" style="color: #E63946;">
              View in Admin Dashboard →
            </a>
          </p>
        </div>
      `;

      await sendEmail({
        to: 'info@tastelanc.com',
        subject: `[Feature Request] ${title}`,
        html: emailHtml,
      });
    } catch (emailError) {
      // Log but don't fail the request if email fails
      console.error('Failed to send feature request notification email:', emailError);
    }

    return NextResponse.json({
      success: true,
      id: data.id,
      message: 'Feature request submitted successfully'
    });
  } catch (error) {
    console.error('Error processing feature request:', error);
    return NextResponse.json(
      { error: 'Failed to process feature request' },
      { status: 500 }
    );
  }
}
