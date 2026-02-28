import type { Metadata } from 'next';
import { createServiceRoleClient } from '@/lib/supabase/server';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ 'market-slug': string }>;
}): Promise<Metadata> {
  const { 'market-slug': slug } = await params;
  const serviceClient = createServiceRoleClient();

  // Fetch city with id for subsequent brand query
  const { data: city } = await serviceClient
    .from('expansion_cities')
    .select('id, city_name, state, county')
    .eq('slug', slug)
    .in('status', ['brand_ready', 'approved', 'setup_in_progress', 'live'])
    .single();

  if (!city) {
    return {
      title: 'Careers | TasteLanc',
      description: 'Career opportunities with TasteLanc.',
    };
  }

  // Fetch selected brand for this city
  const { data: brand } = await serviceClient
    .from('expansion_brand_drafts')
    .select('app_name')
    .eq('city_id', city.id)
    .eq('is_selected', true)
    .single();

  const appName = brand?.app_name || `Taste${city.city_name}`;
  const cityName = city.city_name;
  const state = city.state;

  return {
    title: `Careers at ${appName} | Jobs in ${cityName}, ${state}`,
    description: `Join ${appName} as a Restaurant Partnership Manager in ${cityName}, ${state}. Commission-based with uncapped earnings and flexible schedule. Apply now.`,
    keywords: `${appName} careers, ${cityName} jobs, restaurant partnership manager, food industry jobs ${cityName}, hospitality jobs ${state}`,
    openGraph: {
      title: `Careers at ${appName} | Jobs in ${cityName}, ${state}`,
      description: `We're hiring in ${cityName}, ${state}! Join ${appName} as a Restaurant Partnership Manager. Commission-based role with flexible schedule and uncapped earnings.`,
      url: `https://tastelanc.com/careers/${slug}`,
      siteName: 'TasteLanc',
      locale: 'en_US',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: `Careers at ${appName} | Jobs in ${cityName}, ${state}`,
      description: `We're hiring in ${cityName}, ${state}! Join ${appName} — commission-based with flexible schedule. Apply now.`,
    },
    robots: {
      index: true,
      follow: true,
    },
    alternates: {
      canonical: `https://tastelanc.com/careers/${slug}`,
    },
  };
}

export default function MarketCareersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
