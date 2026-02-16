import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { verifyAdminAccess } from '@/lib/auth/admin-access';
import { sendEmail } from '@/lib/resend';
import { generateSalesRepInviteEmail } from '@/lib/email-templates/sales-rep-invite-template';

export async function GET() {
  try {
    const supabase = await createClient();
    let admin;
    try { admin = await verifyAdminAccess(supabase); }
    catch (err: any) { return NextResponse.json({ error: err.message }, { status: err.status || 500 }); }

    const serviceClient = createServiceRoleClient();

    const { data: reps, error } = await serviceClient
      .from('sales_reps')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching sales reps:', error);
      return NextResponse.json({ error: 'Failed to fetch sales reps' }, { status: 500 });
    }

    // Get lead counts per rep
    const { data: leadCounts } = await serviceClient
      .from('business_leads')
      .select('assigned_to');

    const repLeadCounts: Record<string, number> = {};
    (leadCounts || []).forEach((lead) => {
      if (lead.assigned_to) {
        repLeadCounts[lead.assigned_to] = (repLeadCounts[lead.assigned_to] || 0) + 1;
      }
    });

    const repsWithCounts = (reps || []).map((rep) => ({
      ...rep,
      lead_count: repLeadCounts[rep.id] || 0,
    }));

    return NextResponse.json({ reps: repsWithCounts });
  } catch (error) {
    console.error('Error in sales reps API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    let admin;
    try { admin = await verifyAdminAccess(supabase); }
    catch (err: any) { return NextResponse.json({ error: err.message }, { status: err.status || 500 }); }

    const body = await request.json();
    const { email, name, phone, market_ids } = body;

    if (!email || !name) {
      return NextResponse.json(
        { error: 'Email and name are required' },
        { status: 400 }
      );
    }

    const serviceClient = createServiceRoleClient();

    let userId: string;
    let needsPasswordSetup = false;

    // Try to create new auth user
    const tempPassword = crypto.randomBytes(16).toString('hex');
    const { data: newUser, error: createError } = await serviceClient.auth.admin.createUser({
      email: email.toLowerCase(),
      password: tempPassword,
      email_confirm: true,
      user_metadata: { role: 'sales_rep', full_name: name },
    });

    if (createError) {
      if (createError.status === 422 || createError.message?.includes('already been registered')) {
        // User already exists — find them and update their role
        const { data: { users } } = await serviceClient.auth.admin.listUsers({ perPage: 1000 });
        const existingUser = users.find((u: { email?: string }) => u.email?.toLowerCase() === email.toLowerCase());

        if (!existingUser) {
          return NextResponse.json({ error: 'User exists but could not be located' }, { status: 500 });
        }

        userId = existingUser.id;
        await serviceClient.auth.admin.updateUserById(userId, {
          user_metadata: { role: 'sales_rep', full_name: name },
        });
      } else {
        console.error('Error creating user:', createError);
        return NextResponse.json({ error: 'Failed to create user account' }, { status: 500 });
      }
    } else {
      userId = newUser.user.id;
      needsPasswordSetup = true;
    }

    // Create sales_reps entry
    const { error: repError } = await serviceClient
      .from('sales_reps')
      .upsert({
        id: userId,
        name,
        email: email.toLowerCase(),
        phone: phone || null,
        market_ids: market_ids || [],
        is_active: true,
      });

    if (repError) {
      console.error('Error creating sales rep:', repError);
      return NextResponse.json({ error: 'Failed to create sales rep profile' }, { status: 500 });
    }

    // Send welcome email
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://tastelanc.com';

    try {
      if (needsPasswordSetup) {
        const token = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

        await serviceClient.from('password_setup_tokens').insert({
          user_id: userId,
          email: email.toLowerCase(),
          token,
          expires_at: expiresAt.toISOString(),
        });

        const setupLink = `${siteUrl}/setup-account?token=${token}`;
        const html = generateSalesRepInviteEmail(setupLink, name, true);

        await sendEmail({
          to: email.toLowerCase(),
          subject: 'Welcome to the TasteLanc Sales Team!',
          html,
        });
      } else {
        const html = generateSalesRepInviteEmail(`${siteUrl}/sales`, name, false);

        await sendEmail({
          to: email.toLowerCase(),
          subject: 'Welcome to the TasteLanc Sales Team!',
          html,
        });
      }
    } catch (emailError) {
      console.error('Error sending welcome email:', emailError);
    }

    return NextResponse.json({ success: true, userId });
  } catch (error) {
    console.error('Error in create sales rep API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
