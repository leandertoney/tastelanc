import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// Cache market ID lookup in memory (lasts for the lifetime of the serverless function)
let cachedMarketId: string | null = null;
let cachedMarketSlug: string | null = null;

async function getMarketId(supabase: ReturnType<typeof getSupabaseAdmin>): Promise<string | null> {
  const slug = process.env.NEXT_PUBLIC_MARKET_SLUG || 'lancaster-pa';
  if (cachedMarketId && cachedMarketSlug === slug) return cachedMarketId;

  const { data } = await supabase
    .from('markets')
    .select('id')
    .eq('slug', slug)
    .eq('is_active', true)
    .single();

  if (data) {
    cachedMarketId = data.id;
    cachedMarketSlug = slug;
  }
  return data?.id || null;
}

// Parse referrer + UTM into a traffic source category
function parseTrafficSource(referrer: string, utmSource?: string): string {
  // UTM source takes priority
  if (utmSource) {
    const src = utmSource.toLowerCase();
    if (src.includes('google')) return 'google';
    if (src.includes('facebook') || src === 'fb') return 'facebook';
    if (src.includes('instagram') || src === 'ig') return 'instagram';
    if (src.includes('linktree') || src === 'linktr.ee') return 'linktree';
    if (src.includes('bing')) return 'bing';
    if (src.includes('email') || src.includes('newsletter') || src.includes('mailchimp')) return 'email';
    if (src.includes('twitter') || src === 'x' || src === 't.co') return 'twitter';
    return 'other';
  }

  // Parse referrer hostname
  if (!referrer) return 'direct';

  try {
    const hostname = new URL(referrer).hostname.toLowerCase();
    if (hostname.includes('google.')) return 'google';
    if (hostname.includes('facebook.com') || hostname.includes('l.facebook.com') || hostname === 'fb.com') return 'facebook';
    if (hostname.includes('instagram.com') || hostname.includes('l.instagram.com')) return 'instagram';
    if (hostname.includes('tiktok.com') || hostname === 'vm.tiktok.com') return 'tiktok';
    if (hostname === 'linktr.ee' || hostname.includes('linktree.')) return 'linktree';
    if (hostname.includes('bing.com')) return 'bing';
    if (hostname === 't.co' || hostname.includes('twitter.com') || hostname.includes('x.com')) return 'twitter';
    if (hostname.includes('mail.') || hostname.includes('outlook.') || hostname.includes('gmail.')) return 'email';

    // Self-referral (same site) = direct
    const siteHost = process.env.NEXT_PUBLIC_SITE_URL
      ? new URL(process.env.NEXT_PUBLIC_SITE_URL).hostname
      : '';
    if (siteHost && hostname.includes(siteHost)) return 'direct';

    return 'other';
  } catch {
    return 'direct';
  }
}

// Parse user agent into device type
function parseDeviceType(ua: string, screenWidth?: number): string {
  // Prefer screen width if available (more reliable than UA)
  if (screenWidth) {
    if (screenWidth < 768) return 'mobile';
    if (screenWidth < 1024) return 'tablet';
    return 'desktop';
  }

  const lower = ua.toLowerCase();
  if (/ipad|tablet|kindle|silk/i.test(lower)) return 'tablet';
  if (/mobile|iphone|ipod|android.*mobile|opera mini|opera mobi/i.test(lower)) return 'mobile';
  return 'desktop';
}

// Parse user agent into browser name
function parseBrowser(ua: string): string {
  if (/edg\//i.test(ua)) return 'Edge';
  if (/opr\//i.test(ua) || /opera/i.test(ua)) return 'Opera';
  if (/firefox|fxios/i.test(ua)) return 'Firefox';
  if (/crios/i.test(ua)) return 'Chrome';
  if (/chrome/i.test(ua) && !/edg\//i.test(ua)) return 'Chrome';
  if (/safari/i.test(ua) && !/chrome/i.test(ua)) return 'Safari';
  if (/msie|trident/i.test(ua)) return 'IE';
  return 'Other';
}

// Expanded bot detection
const BOT_PATTERN = /bot|crawl|spider|slurp|googlebot|bingbot|yandex|baidu|duckduckbot|twitterbot|facebookexternalhit|linkedinbot|whatsapp|bytespider|semrush|ahrefs|mj12bot|dotbot|petalbot|uptimerobot|pingdom|gtmetrix|pagespeed|lighthouse|headlesschrome|phantomjs/i;

export async function POST(request: Request) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const {
      pagePath, visitorId, pageType, restaurantId,
      sessionId, isLanding, utmSource, utmMedium, utmCampaign, screenWidth, referrer: clientReferrer
    } = await request.json();
    const headersList = await headers();

    const userAgent = headersList.get('user-agent') || '';
    // Use client-provided referrer (from document.referrer) if available, fall back to header
    const referrer = clientReferrer || headersList.get('referer') || '';

    // Don't track bots
    if (BOT_PATTERN.test(userAgent)) {
      return NextResponse.json({ success: true, tracked: false });
    }

    const marketId = await getMarketId(supabaseAdmin);
    const trafficSource = parseTrafficSource(referrer, utmSource);
    const deviceType = parseDeviceType(userAgent, screenWidth);
    const browser = parseBrowser(userAgent);

    await supabaseAdmin.from('analytics_page_views').insert({
      page_path: pagePath,
      page_type: pageType || 'other',
      restaurant_id: restaurantId || null,
      visitor_id: visitorId,
      referrer,
      user_agent: userAgent,
      session_id: sessionId || null,
      traffic_source: trafficSource,
      utm_source: utmSource || null,
      utm_medium: utmMedium || null,
      utm_campaign: utmCampaign || null,
      is_landing: isLanding || false,
      device_type: deviceType,
      browser,
      market_id: marketId,
    });

    return NextResponse.json({ success: true, tracked: true });
  } catch (error) {
    console.error('Error tracking page view:', error);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
