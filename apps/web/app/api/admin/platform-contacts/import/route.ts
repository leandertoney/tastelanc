import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Parse a CSV string into rows, handling quoted fields
function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  for (const line of lines) {
    const cols: string[] = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') { cur += '"'; i++; }
        else inQuotes = !inQuotes;
      } else if (ch === ',' && !inQuotes) {
        cols.push(cur.trim()); cur = '';
      } else {
        cur += ch;
      }
    }
    cols.push(cur.trim());
    rows.push(cols);
  }
  return rows;
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const sourceLabel = (formData.get('source_label') as string)?.trim() || 'TasteLanc Direct';
    const marketId = (formData.get('market_id') as string) || null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const text = await file.text();
    const rows = parseCSV(text);

    if (rows.length < 2) {
      return NextResponse.json({ error: 'CSV must have a header row and at least one data row' }, { status: 400 });
    }

    // Detect columns from header row (case-insensitive)
    const header = rows[0].map((h) => h.toLowerCase().replace(/[^a-z0-9]/g, '_'));
    const emailIdx = header.findIndex((h) => h.includes('email'));
    const nameIdx = header.findIndex((h) => h.includes('name') || h.includes('first') || h.includes('contact'));

    if (emailIdx === -1) {
      return NextResponse.json(
        { error: 'CSV must have an "email" column. Found columns: ' + rows[0].join(', ') },
        { status: 400 }
      );
    }

    const dataRows = rows.slice(1);
    const records: Array<{ email: string; name: string | null; source_label: string; market_id: string | null }> = [];
    const skipped: string[] = [];

    for (const row of dataRows) {
      const email = row[emailIdx]?.toLowerCase().trim();
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        if (email) skipped.push(email);
        continue;
      }
      const name = nameIdx !== -1 ? row[nameIdx]?.trim() || null : null;
      records.push({ email, name, source_label: sourceLabel, market_id: marketId });
    }

    if (records.length === 0) {
      return NextResponse.json({ error: 'No valid email addresses found in CSV' }, { status: 400 });
    }

    // Deduplicate within the CSV itself (keep first occurrence)
    const seen = new Set<string>();
    const deduped = records.filter((r) => {
      if (seen.has(r.email)) return false;
      seen.add(r.email);
      return true;
    });

    // Batch upsert in chunks of 500
    let imported = 0;
    const chunkSize = 500;
    for (let i = 0; i < deduped.length; i += chunkSize) {
      const chunk = deduped.slice(i, i + chunkSize);
      const { error } = await supabaseAdmin
        .from('platform_contacts')
        .upsert(chunk, { onConflict: 'email' });

      if (error) {
        console.error('Error importing chunk:', error);
        return NextResponse.json({ error: `Import failed at row ${i}: ${error.message}` }, { status: 500 });
      }
      imported += chunk.length;

    }

    return NextResponse.json({
      imported,
      skipped: skipped.length,
      skippedEmails: skipped.slice(0, 10), // first 10 for debugging
      message: `Successfully imported ${imported} contacts${skipped.length > 0 ? `, skipped ${skipped.length} invalid rows` : ''}`,
    });
  } catch (error) {
    console.error('Error in platform-contacts import:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
