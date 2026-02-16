import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { verifyAdminAccess } from '@/lib/auth/admin-access';

interface CSVLead {
  business_name: string;
  contact_name?: string;
  email: string;
  phone?: string;
  website?: string;
  address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  category?: string;
  notes?: string;
  tags?: string;
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    // Verify user is admin
    let admin;
    try { admin = await verifyAdminAccess(supabase); }
    catch (err: any) { return NextResponse.json({ error: err.message }, { status: err.status || 500 }); }

    const body = await request.json();
    const { leads } = body as { leads: CSVLead[] };

    if (!leads || !Array.isArray(leads) || leads.length === 0) {
      return NextResponse.json(
        { error: 'No leads provided. Expected array of leads.' },
        { status: 400 }
      );
    }

    // Limit batch size
    if (leads.length > 500) {
      return NextResponse.json(
        { error: 'Maximum 500 leads per import. Please split your file.' },
        { status: 400 }
      );
    }

    // Get existing emails to check for duplicates
    const { data: existingLeads } = await supabase
      .from('business_leads')
      .select('email');

    const existingEmails = new Set(
      existingLeads?.map((l) => l.email.toLowerCase()) || []
    );

    // Process and validate leads
    const validLeads: Array<{
      business_name: string;
      contact_name: string | null;
      email: string;
      phone: string | null;
      website: string | null;
      address: string | null;
      city: string | null;
      state: string | null;
      zip_code: string | null;
      category: string | null;
      notes: string | null;
      tags: string[];
      source: string;
      status: string;
    }> = [];
    const errors: Array<{ row: number; error: string; email?: string }> = [];
    const skipped: Array<{ row: number; email: string; reason: string }> = [];

    for (let i = 0; i < leads.length; i++) {
      const lead = leads[i];
      const rowNum = i + 1;

      // Validate required fields
      if (!lead.business_name || !lead.email) {
        errors.push({
          row: rowNum,
          error: 'Missing required fields: business_name and email are required',
        });
        continue;
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(lead.email)) {
        errors.push({
          row: rowNum,
          email: lead.email,
          error: 'Invalid email format',
        });
        continue;
      }

      // Check for duplicates
      if (existingEmails.has(lead.email.toLowerCase())) {
        skipped.push({
          row: rowNum,
          email: lead.email,
          reason: 'Email already exists',
        });
        continue;
      }

      // Check for duplicates within the import
      if (validLeads.some((l) => l.email.toLowerCase() === lead.email.toLowerCase())) {
        skipped.push({
          row: rowNum,
          email: lead.email,
          reason: 'Duplicate email in import file',
        });
        continue;
      }

      // Parse tags (comma-separated string to array)
      let tags: string[] = [];
      if (lead.tags) {
        tags = lead.tags
          .split(',')
          .map((t) => t.trim())
          .filter((t) => t.length > 0);
      }

      validLeads.push({
        business_name: lead.business_name.trim(),
        contact_name: lead.contact_name?.trim() || null,
        email: lead.email.toLowerCase().trim(),
        phone: lead.phone?.trim() || null,
        website: lead.website?.trim() || null,
        address: lead.address?.trim() || null,
        city: lead.city?.trim() || 'Lancaster',
        state: lead.state?.trim() || 'PA',
        zip_code: lead.zip_code?.trim() || null,
        category: lead.category?.trim() || 'restaurant',
        source: 'import',
        status: 'new',
        notes: lead.notes?.trim() || null,
        tags,
      });
    }

    if (validLeads.length === 0) {
      return NextResponse.json({
        message: 'No valid leads to import',
        imported: 0,
        errors,
        skipped,
      });
    }

    // Insert valid leads
    const { data: insertedLeads, error: insertError } = await supabase
      .from('business_leads')
      .insert(validLeads)
      .select();

    if (insertError) {
      console.error('Error inserting leads:', insertError);
      return NextResponse.json(
        { error: 'Failed to import leads' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: `Successfully imported ${insertedLeads?.length || 0} leads`,
      imported: insertedLeads?.length || 0,
      errors: errors.length > 0 ? errors : undefined,
      skipped: skipped.length > 0 ? skipped : undefined,
      totalProcessed: leads.length,
    });
  } catch (error) {
    console.error('Error in import leads API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
