import type { Restaurant, Event, Special, HappyHour, BlogPost } from './types';
import { BRAND } from '@/config/market';

export const breadcrumbJsonLd = (items: Array<{ name: string; url: string }>) => ({
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: items.map((item, i) => ({
    '@type': 'ListItem',
    position: i + 1,
    name: item.name,
    item: item.url,
  })),
});

export const itemListJsonLd = (urls: string[]) => ({
  '@context': 'https://schema.org',
  '@type': 'ItemList',
  itemListElement: urls.map((u, i) => ({ '@type': 'ListItem', position: i + 1, url: u })),
});

export const restaurantJsonLd = (r: Restaurant) => ({
  '@context': 'https://schema.org',
  '@type': 'Restaurant',
  name: r.name,
  description: r.description || undefined,
  url: `https://${BRAND.domain}/restaurants/${r.slug}`,
  image: r.cover_image_url || r.logo_url || undefined,
  telephone: r.phone || undefined,
  address: {
    '@type': 'PostalAddress',
    streetAddress: r.address,
    addressLocality: r.city,
    addressRegion: r.state,
    postalCode: r.zip_code || undefined,
  },
  geo:
    r.latitude && r.longitude
      ? { '@type': 'GeoCoordinates', latitude: r.latitude, longitude: r.longitude }
      : undefined,
  servesCuisine: r.categories || undefined,
});

export const eventJsonLd = (e: Event, r?: Restaurant) => ({
  '@context': 'https://schema.org',
  '@type': 'Event',
  name: e.name,
  description: e.description || undefined,
  eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
  eventStatus: 'https://schema.org/EventScheduled',
  startDate: e.event_date || undefined,
  endDate: e.event_date || undefined,
  image: e.image_url || r?.cover_image_url || r?.logo_url || undefined,
  location: r
    ? {
        '@type': 'Place',
        name: r.name,
        address: {
          '@type': 'PostalAddress',
          streetAddress: r.address,
          addressLocality: r.city,
          addressRegion: r.state,
          postalCode: r.zip_code || undefined,
        },
      }
    : undefined,
  organizer: r
    ? {
        '@type': 'Organization',
        name: r.name,
        url: `https://${BRAND.domain}/restaurants/${r.slug}`,
      }
    : undefined,
});

export const offerJsonLd = (name: string, price: number | null, r: Restaurant) => ({
  '@context': 'https://schema.org',
  '@type': 'Offer',
  price: price ?? undefined,
  priceCurrency: 'USD',
  itemOffered: name,
  url: `https://${BRAND.domain}/restaurants/${r.slug}`,
  seller: { '@type': 'Organization', name: r.name },
});

export const articleJsonLd = (post: BlogPost) => ({
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: post.title,
  description: post.summary,
  image: post.cover_image_url || undefined,
  datePublished: post.created_at,
  url: `https://${BRAND.domain}/blog/${post.slug}`,
  author: { '@type': 'Organization', name: BRAND.name },
});
