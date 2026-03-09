import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceRoleClient } from '@/lib/supabase/admin';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { venue_name, market_id } = await request.json();

    if (!venue_name || !market_id) {
      return NextResponse.json(
        { error: 'venue_name and market_id are required' },
        { status: 400 }
      );
    }

    const serviceClient = createServiceRoleClient();

    // Search for venues matching the name using ILIKE
    // Split venue name into keywords for broader matching
    const keywords = venue_name
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .split(/\s+/)
      .filter((w: string) => w.length > 2);

    // Primary: exact-ish match
    const { data: exactMatches } = await serviceClient
      .from('restaurants')
      .select('id, name, slug, logo_url')
      .eq('market_id', market_id)
      .ilike('name', `%${venue_name}%`)
      .limit(5);

    // Secondary: keyword matches if exact didn't find enough
    let keywordMatches: typeof exactMatches = [];
    if ((!exactMatches || exactMatches.length < 3) && keywords.length > 0) {
      // Use the longest keyword for broader search
      const primaryKeyword = keywords.sort((a: string, b: string) => b.length - a.length)[0];
      const { data } = await serviceClient
        .from('restaurants')
        .select('id, name, slug, logo_url')
        .eq('market_id', market_id)
        .ilike('name', `%${primaryKeyword}%`)
        .limit(5);
      keywordMatches = data || [];
    }

    // Merge and deduplicate
    const seen = new Set<string>();
    const allMatches = [...(exactMatches || []), ...(keywordMatches || [])]
      .filter(r => {
        if (seen.has(r.id)) return false;
        seen.add(r.id);
        return true;
      })
      .slice(0, 5);

    // Score matches for auto-matching
    const scored = allMatches.map(r => {
      const nameLower = r.name.toLowerCase();
      const searchLower = venue_name.toLowerCase();
      const isExact = nameLower === searchLower;
      const isContained = nameLower.includes(searchLower) || searchLower.includes(nameLower);
      const confidence = isExact ? 1.0 : isContained ? 0.7 : 0.4;
      return { ...r, confidence };
    });

    // Sort by confidence descending
    scored.sort((a, b) => b.confidence - a.confidence);

    const autoMatched = scored.length > 0 && scored[0].confidence >= 0.85;

    return NextResponse.json({
      matches: scored,
      auto_matched: autoMatched,
      auto_matched_venue: autoMatched ? scored[0] : null,
    });
  } catch (error) {
    console.error('Error in venue matching:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
