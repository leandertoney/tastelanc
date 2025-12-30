import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Convert contact_submissions to business_leads
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
    const { contactIds } = body; // Optional: specific IDs to convert. If not provided, convert all.

    // Fetch contacts to convert
    let query = supabase
      .from('contact_submissions')
      .select('*');

    if (contactIds && contactIds.length > 0) {
      query = query.in('id', contactIds);
    }

    const { data: contacts, error: fetchError } = await query;

    if (fetchError) {
      console.error('Error fetching contacts:', fetchError);
      return NextResponse.json(
        { error: 'Failed to fetch contacts' },
        { status: 500 }
      );
    }

    if (!contacts || contacts.length === 0) {
      return NextResponse.json(
        { error: 'No contacts found to convert' },
        { status: 404 }
      );
    }

    // Get existing business lead emails to avoid duplicates
    const { data: existingLeads } = await supabase
      .from('business_leads')
      .select('email');

    const existingEmails = new Set(
      existingLeads?.map((l) => l.email.toLowerCase()) || []
    );

    // Convert contacts to leads
    const leadsToInsert = [];
    const skipped = [];

    for (const contact of contacts) {
      // Skip if email already exists in business_leads
      if (existingEmails.has(contact.email.toLowerCase())) {
        skipped.push({
          email: contact.email,
          reason: 'Already exists in business leads',
        });
        continue;
      }

      leadsToInsert.push({
        business_name: contact.business_name || contact.name || 'Unknown Business',
        contact_name: contact.name,
        email: contact.email,
        phone: contact.phone || null,
        city: 'Lancaster',
        state: 'PA',
        category: 'restaurant', // Default category
        source: 'contact_form',
        status: 'new',
        notes: contact.message
          ? `Original inquiry: ${contact.message}${contact.interested_plan ? `\nInterested in: ${contact.interested_plan}` : ''}`
          : null,
        tags: contact.interested_plan ? [contact.interested_plan] : [],
      });
    }

    if (leadsToInsert.length === 0) {
      return NextResponse.json({
        message: 'No new leads to create - all contacts already exist in business leads',
        converted: 0,
        skipped: skipped.length,
        skippedDetails: skipped,
      });
    }

    // Insert new leads
    const { data: insertedLeads, error: insertError } = await supabase
      .from('business_leads')
      .insert(leadsToInsert)
      .select();

    if (insertError) {
      console.error('Error inserting leads:', insertError);
      return NextResponse.json(
        { error: 'Failed to create leads' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: `Successfully converted ${insertedLeads?.length || 0} contacts to business leads`,
      converted: insertedLeads?.length || 0,
      skipped: skipped.length,
      skippedDetails: skipped,
      leads: insertedLeads,
    });
  } catch (error) {
    console.error('Error in convert contacts API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Get preview of contacts that can be converted
export async function GET() {
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

    // Fetch all contacts
    const { data: contacts, error: contactsError } = await supabase
      .from('contact_submissions')
      .select('*')
      .order('created_at', { ascending: false });

    if (contactsError) {
      console.error('Error fetching contacts:', contactsError);
      return NextResponse.json(
        { error: 'Failed to fetch contacts' },
        { status: 500 }
      );
    }

    // Get existing business lead emails
    const { data: existingLeads } = await supabase
      .from('business_leads')
      .select('email');

    const existingEmails = new Set(
      existingLeads?.map((l) => l.email.toLowerCase()) || []
    );

    // Mark which contacts can be converted
    const contactsWithStatus = (contacts || []).map((contact) => ({
      ...contact,
      canConvert: !existingEmails.has(contact.email.toLowerCase()),
      existsInLeads: existingEmails.has(contact.email.toLowerCase()),
    }));

    const convertableCount = contactsWithStatus.filter((c) => c.canConvert).length;

    return NextResponse.json({
      contacts: contactsWithStatus,
      totalContacts: contacts?.length || 0,
      convertableCount,
      alreadyConverted: (contacts?.length || 0) - convertableCount,
    });
  } catch (error) {
    console.error('Error in get contacts preview API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
