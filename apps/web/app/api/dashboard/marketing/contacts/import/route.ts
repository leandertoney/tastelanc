import { NextResponse } from 'next/server';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { verifyRestaurantAccess } from '@/lib/auth/restaurant-access';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Contact list size caps per tier (protects shared Resend quota)
const TIER_CONTACT_LIMITS: Record<string, number> = {
  premium: 500,
  elite: 2000,
};

function parseCSV(text: string): { headers: string[]; rows: string[][] } {
  const lines = text.split(/\r?\n/).filter((line) => line.trim());
  if (lines.length === 0) return { headers: [], rows: [] };

  const headers = lines[0].split(',').map((h) => h.trim().toLowerCase().replace(/^["']|["']$/g, ''));
  const rows = lines.slice(1).map((line) => {
    // Simple CSV parsing (handles quoted fields with commas)
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    for (const char of line) {
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  });

  return { headers, rows };
}

export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const restaurantId = searchParams.get('restaurant_id');

    if (!restaurantId) {
      return NextResponse.json({ error: 'restaurant_id is required' }, { status: 400 });
    }

    const supabase = await createClient();
    const accessResult = await verifyRestaurantAccess(supabase, restaurantId);
    if (!accessResult.canAccess) {
      return NextResponse.json(
        { error: accessResult.error || 'Access denied' },
        { status: accessResult.userId ? 403 : 401 }
      );
    }

    const serviceClient = createServiceRoleClient();

    // Check contact list cap before processing CSV
    const { data: restaurant } = await serviceClient
      .from('restaurants')
      .select('tier_id, tiers(name)')
      .eq('id', restaurantId)
      .single();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tiersData = (restaurant as any)?.tiers;
    const tierName: string = Array.isArray(tiersData) ? tiersData[0]?.name || 'basic' : tiersData?.name || 'basic';
    const contactLimit = TIER_CONTACT_LIMITS[tierName] || 0;

    let currentCount = 0;
    if (contactLimit > 0) {
      const { count } = await serviceClient
        .from('restaurant_contacts')
        .select('id', { count: 'exact', head: true })
        .eq('restaurant_id', restaurantId);
      currentCount = count || 0;

      if (currentCount >= contactLimit) {
        return NextResponse.json(
          { error: `Contact list limit reached (${contactLimit} for ${tierName} tier). You have ${currentCount} contacts.`, limit: contactLimit },
          { status: 429 }
        );
      }
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'CSV file is required' }, { status: 400 });
    }

    const text = await file.text();
    const { headers, rows } = parseCSV(text);

    if (rows.length === 0) {
      return NextResponse.json({ error: 'CSV file is empty or has no data rows' }, { status: 400 });
    }

    // --- Smart column detection ---
    // 1. Exact match against known column names (Mailchimp, Constant Contact, Square, Toast, HubSpot, Google Contacts)
    const EMAIL_EXACT = ['email', 'email_address', 'e-mail', 'emailaddress', 'subscriber_email', 'mail', 'e_mail', 'customer_email', 'contact_email', 'user_email'];
    const NAME_EXACT = ['name', 'full_name', 'fullname', 'contact_name', 'customer_name', 'subscriber_name', 'display_name'];
    const FIRST_NAME_EXACT = ['first_name', 'firstname', 'first', 'fname', 'given_name', 'first name'];
    const LAST_NAME_EXACT = ['last_name', 'lastname', 'last', 'lname', 'surname', 'family_name', 'last name'];

    let emailIdx = headers.findIndex((h) => EMAIL_EXACT.includes(h));
    let nameIdx = headers.findIndex((h) => NAME_EXACT.includes(h));
    const firstNameIdx = headers.findIndex((h) => FIRST_NAME_EXACT.includes(h));
    const lastNameIdx = headers.findIndex((h) => LAST_NAME_EXACT.includes(h));

    // 2. Fuzzy match — header contains "email" or "mail"
    if (emailIdx === -1) {
      emailIdx = headers.findIndex((h) => h.includes('email') || h.includes('mail'));
    }

    // 3. Auto-detect — scan first data row for a value that looks like an email
    if (emailIdx === -1 && rows.length > 0) {
      emailIdx = rows[0].findIndex((val) => EMAIL_REGEX.test(val.trim().replace(/^["']|["']$/g, '')));
    }

    // Use first_name as name fallback if no full name column found
    if (nameIdx === -1 && firstNameIdx >= 0) {
      nameIdx = firstNameIdx;
    }

    if (emailIdx === -1) {
      return NextResponse.json(
        { error: 'Could not find an email column. Found columns: ' + headers.join(', ') + '. Please include a column with "email" in the header.' },
        { status: 400 }
      );
    }

    // Calculate remaining capacity
    const remainingCapacity = contactLimit > 0 ? contactLimit - currentCount : Infinity;

    // Process rows
    const contacts: { restaurant_id: string; email: string; name: string | null; source: string }[] = [];
    const errors: string[] = [];
    let skipped = 0;
    let cappedCount = 0;

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const email = (row[emailIdx] || '').toLowerCase().trim().replace(/^["']|["']$/g, '');

      // Build name: prefer full name column, otherwise concatenate first + last
      let name: string | null = null;
      if (nameIdx >= 0 && nameIdx !== firstNameIdx) {
        name = (row[nameIdx] || '').trim().replace(/^["']|["']$/g, '') || null;
      }
      if (!name && firstNameIdx >= 0) {
        const first = (row[firstNameIdx] || '').trim().replace(/^["']|["']$/g, '');
        const last = lastNameIdx >= 0 ? (row[lastNameIdx] || '').trim().replace(/^["']|["']$/g, '') : '';
        name = [first, last].filter(Boolean).join(' ') || null;
      }

      if (!email) {
        skipped++;
        continue;
      }

      if (!EMAIL_REGEX.test(email)) {
        errors.push(`Row ${i + 2}: Invalid email "${email}"`);
        continue;
      }

      // Enforce cap
      if (contacts.length >= remainingCapacity) {
        cappedCount++;
        continue;
      }

      contacts.push({
        restaurant_id: restaurantId,
        email,
        name: name || null,
        source: 'csv_import',
      });
    }

    if (contacts.length === 0) {
      return NextResponse.json(
        { error: 'No valid contacts found in CSV', errors, skipped },
        { status: 400 }
      );
    }

    // Batch upsert (chunks of 500)
    let imported = 0;
    let duplicates = 0;

    for (let i = 0; i < contacts.length; i += 500) {
      const chunk = contacts.slice(i, i + 500);
      const { data, error } = await serviceClient
        .from('restaurant_contacts')
        .upsert(chunk, { onConflict: 'restaurant_id,email', ignoreDuplicates: false })
        .select('id');

      if (error) {
        console.error('Batch import error:', error);
        errors.push(`Batch ${Math.floor(i / 500) + 1}: ${error.message}`);
      } else {
        imported += (data || []).length;
      }
    }

    // Count duplicates (upserted rows that already existed)
    duplicates = contacts.length - imported + duplicates;
    if (duplicates < 0) duplicates = 0;

    return NextResponse.json({
      imported,
      total: contacts.length,
      skipped,
      duplicates,
      capped: cappedCount,
      ...(cappedCount > 0 && {
        capMessage: `${cappedCount} contacts skipped — ${tierName} tier limit is ${contactLimit} contacts`,
      }),
      errors: errors.slice(0, 20), // Limit error messages
    });
  } catch (error) {
    console.error('Error in CSV import API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
