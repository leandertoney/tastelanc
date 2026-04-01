import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const search = searchParams.get('search') || '';
    const market = searchParams.get('market') || '';
    const source = searchParams.get('source') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '100');
    const format = searchParams.get('format');

    let query = supabaseAdmin
      .from('platform_contacts')
      .select('*, market:markets(name)', { count: 'exact' })
      .order('created_at', { ascending: false });

    if (search) {
      query = query.or(`email.ilike.%${search}%,name.ilike.%${search}%`);
    }
    if (market) {
      query = query.eq('market_id', market);
    }
    if (source) {
      query = query.eq('source_label', source);
    }

    const offset = (page - 1) * limit;
    query = query.range(offset, offset + limit - 1);

    const { data: contacts, error, count } = await query;

    if (error) {
      console.error('Error fetching platform contacts:', error);
      return NextResponse.json({ error: 'Failed to fetch contacts' }, { status: 500 });
    }

    // Cross-reference with app users for has_app flag
    const allAuthUsers: Array<{ id: string; email?: string; is_anonymous?: boolean }> = [];
    let authPage = 1;
    while (true) {
      const { data: { users }, error: authError } = await supabaseAdmin.auth.admin.listUsers({
        page: authPage,
        perPage: 1000,
      });
      if (authError) break;
      allAuthUsers.push(...users);
      if (users.length < 1000) break;
      authPage++;
    }

    const appEmailSet = new Set(allAuthUsers.filter((u) => !u.is_anonymous && u.email).map((u) => u.email!.toLowerCase()));
    const anyAppEmailSet = new Set(allAuthUsers.filter((u) => u.email).map((u) => u.email!.toLowerCase()));

    const enriched = (contacts || []).map((c) => ({
      ...c,
      has_app: anyAppEmailSet.has(c.email.toLowerCase()),
      is_signed_in: appEmailSet.has(c.email.toLowerCase()),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      market_name: (c as any).market?.name || null,
    }));

    // CSV export — paginate all records
    if (format === 'csv') {
      const allForCsv: typeof enriched = [];
      for (let off = 0; ; off += 1000) {
        let csvQuery = supabaseAdmin
          .from('platform_contacts')
          .select('*, market:markets(name)')
          .order('created_at', { ascending: false })
          .range(off, off + 999);
        if (search) csvQuery = csvQuery.or(`email.ilike.%${search}%,name.ilike.%${search}%`);
        if (market) csvQuery = csvQuery.eq('market_id', market);
        if (source) csvQuery = csvQuery.eq('source_label', source);
        const { data: page } = await csvQuery;
        if (!page || page.length === 0) break;
        allForCsv.push(...page.map((c) => ({
          ...c,
          has_app: anyAppEmailSet.has(c.email.toLowerCase()),
          is_signed_in: appEmailSet.has(c.email.toLowerCase()),
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          market_name: (c as any).market?.name || null,
        })));
        if (page.length < 1000) break;
      }
      const header = 'Email,Name,Source,Market,Has App,Subscribed,Added';
      const rows = allForCsv.map((c) => {
        const email = (c.email || '').replace(/,/g, ' ');
        const name = (c.name || '').replace(/,/g, ' ');
        const src = (c.source_label || '').replace(/,/g, ' ');
        const mkt = (c.market_name || '').replace(/,/g, ' ');
        const added = new Date(c.created_at).toISOString().split('T')[0];
        return `${email},${name},${src},${mkt},${c.has_app ? 'Yes' : 'No'},${c.is_unsubscribed ? 'No' : 'Yes'},${added}`;
      });
      const csv = [header, ...rows].join('\n');
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="tastelanc-contacts-${new Date().toISOString().split('T')[0]}.csv"`,
        },
      });
    }

    // Stats — compute from full dataset using the app email set, not just current page (paginated)
    const allContacts: Array<{ email: string; is_unsubscribed: boolean }> = [];
    for (let off = 0; ; off += 1000) {
      const { data: page } = await supabaseAdmin
        .from('platform_contacts')
        .select('email, is_unsubscribed')
        .range(off, off + 999);
      if (!page || page.length === 0) break;
      allContacts.push(...page);
      if (page.length < 1000) break;
    }

    let withApp = 0;
    let signedIn = 0;
    let subscribed = 0;
    for (const c of allContacts || []) {
      const emailLower = c.email?.toLowerCase();
      if (emailLower && anyAppEmailSet.has(emailLower)) withApp++;
      if (emailLower && appEmailSet.has(emailLower)) signedIn++;
      if (!c.is_unsubscribed) subscribed++;
    }

    // Unique source labels for filter dropdown
    const { data: sources } = await supabaseAdmin
      .from('platform_contacts')
      .select('source_label')
      .order('source_label');
    const uniqueSources = [...new Set((sources || []).map((s) => s.source_label))];

    const trueTotal = allContacts?.length ?? count ?? 0;

    return NextResponse.json({
      contacts: enriched,
      total: trueTotal,
      page,
      limit,
      totalPages: Math.ceil(trueTotal / limit),
      stats: {
        total: trueTotal,
        withApp,
        signedIn,
        subscribed,
      },
      sources: uniqueSources,
    });
  } catch (error) {
    console.error('Error in platform-contacts GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, name, source_label, market_id } = body;

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Valid email is required' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('platform_contacts')
      .upsert(
        {
          email: email.toLowerCase().trim(),
          name: name?.trim() || null,
          source_label: source_label?.trim() || 'TasteLanc Direct',
          market_id: market_id || null,
        },
        { onConflict: 'email' }
      )
      .select()
      .single();

    if (error) {
      console.error('Error upserting platform contact:', error);
      return NextResponse.json({ error: 'Failed to add contact' }, { status: 500 });
    }

    return NextResponse.json({ contact: data }, { status: 201 });
  } catch (error) {
    console.error('Error in platform-contacts POST:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
