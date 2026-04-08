import { NextResponse } from 'next/server';
import { BRAND } from '@/config/market';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || `https://${BRAND.domain}`;

export async function GET() {
  const body = `User-agent: *
Allow: /
Disallow: /admin
Disallow: /dashboard
Disallow: /account
Disallow: /login
Disallow: /register
Disallow: /delete-account
Disallow: /unsubscribe
Disallow: /api/
Disallow: /sales
Disallow: /promoter

Sitemap: ${siteUrl}/sitemap.xml
`;

  return new NextResponse(body, {
    status: 200,
    headers: { 'Content-Type': 'text/plain' },
  });
}
