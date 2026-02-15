import { NextResponse } from 'next/server';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { verifySalesAccess } from '@/lib/auth/sales-access';

interface SearchResult {
  source: 'directory' | 'google_places';
  restaurant_id?: string;
  google_place_id?: string;
  business_name: string;
  address: string;
  city: string;
  state: string;
  zip_code: string;
  phone: string;
  website: string;
  category: string;
  is_active?: boolean;
  tier_name?: string;
}

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const access = await verifySalesAccess(supabase);

    if (!access.canAccess) {
      return NextResponse.json(
        { error: access.error },
        { status: access.userId ? 403 : 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q')?.trim();

    if (!query || query.length < 2) {
      return NextResponse.json({ results: [] });
    }

    const serviceClient = createServiceRoleClient();
    const results: SearchResult[] = [];

    // 1. Search existing restaurant directory first
    const { data: directoryResults } = await serviceClient
      .from('restaurants')
      .select('id, name, address, city, state, zip_code, phone, website, google_place_id, categories, is_active, tiers(name)')
      .ilike('name', `%${query}%`)
      .order('name', { ascending: true })
      .limit(5);

    const directoryPlaceIds = new Set<string>();

    if (directoryResults) {
      for (const r of directoryResults) {
        if (r.google_place_id) {
          directoryPlaceIds.add(r.google_place_id);
        }
        results.push({
          source: 'directory',
          restaurant_id: r.id,
          google_place_id: r.google_place_id || undefined,
          business_name: r.name,
          address: r.address || '',
          city: r.city || '',
          state: r.state || '',
          zip_code: r.zip_code || '',
          phone: r.phone || '',
          website: r.website || '',
          category: r.categories?.[0] || 'restaurant',
          is_active: r.is_active,
          tier_name: (r.tiers as { name: string } | null)?.name || undefined,
        });
      }
    }

    // 2. Search Google Places if we have fewer than 5 directory results
    if (results.length < 5) {
      const googleApiKey = process.env.GOOGLE_API_KEY;
      if (googleApiKey) {
        try {
          const remaining = 5 - results.length;
          const response = await fetch('https://places.googleapis.com/v1/places:searchText', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Goog-Api-Key': googleApiKey,
              'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.nationalPhoneNumber,places.websiteUri,places.addressComponents,places.types',
            },
            body: JSON.stringify({
              textQuery: `${query} Lancaster PA`,
              pageSize: remaining + 3, // fetch extra to account for deduplication
            }),
          });

          if (response.ok) {
            const data = await response.json();
            const places = data.places || [];

            for (const place of places) {
              if (results.length >= 5 + (directoryResults?.length || 0)) break;

              // Deduplicate: skip if already in directory
              if (place.id && directoryPlaceIds.has(place.id)) continue;

              // Parse address components
              let city = '';
              let state = '';
              let zipCode = '';
              let streetAddress = '';
              let streetNumber = '';
              let route = '';

              if (place.addressComponents) {
                for (const component of place.addressComponents) {
                  const types = component.types || [];
                  if (types.includes('locality')) {
                    city = component.longText || '';
                  } else if (types.includes('administrative_area_level_1')) {
                    state = component.shortText || '';
                  } else if (types.includes('postal_code')) {
                    zipCode = component.longText || '';
                  } else if (types.includes('street_number')) {
                    streetNumber = component.longText || '';
                  } else if (types.includes('route')) {
                    route = component.longText || '';
                  }
                }
                streetAddress = [streetNumber, route].filter(Boolean).join(' ');
              }

              results.push({
                source: 'google_places',
                google_place_id: place.id,
                business_name: place.displayName?.text || '',
                address: streetAddress || place.formattedAddress || '',
                city,
                state,
                zip_code: zipCode,
                phone: place.nationalPhoneNumber || '',
                website: place.websiteUri || '',
                category: mapGoogleType(place.types),
              });
            }
          }
        } catch (googleError) {
          console.error('Google Places search error:', googleError);
          // Continue with directory results only
        }
      }
    }

    return NextResponse.json({ results });
  } catch (error) {
    console.error('Error in places search API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

function mapGoogleType(types?: string[]): string {
  if (!types) return 'restaurant';
  if (types.includes('bar') || types.includes('pub') || types.includes('wine_bar')) return 'bar';
  if (types.includes('cafe') || types.includes('coffee_shop')) return 'cafe';
  if (types.includes('brewery')) return 'brewery';
  if (types.includes('bakery')) return 'bakery';
  return 'restaurant';
}
