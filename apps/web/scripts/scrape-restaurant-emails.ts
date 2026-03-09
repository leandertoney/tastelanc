import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://kufcxxynjvyharhtfptd.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Common email patterns to ignore (generic/spam/tracking)
const IGNORE_PATTERNS = [
  /noreply@/i, /no-reply@/i, /donotreply@/i,
  /support@squarespace/i, /support@wix/i, /support@godaddy/i,
  /abuse@/i, /postmaster@/i, /webmaster@/i,
  /@sentry\.io/i, /@google\.com/i, /@facebook\.com/i,
  /@cloudflare/i, /@w3\.org/i, /@example\.com/i,
  /wixpress\.com/i, /squarespace\.com/i,
];

// Email regex — broad but reasonable
const EMAIL_REGEX = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g;

function isValidBusinessEmail(email: string): boolean {
  const lower = email.toLowerCase();
  if (IGNORE_PATTERNS.some(p => p.test(lower))) return false;
  // Skip image/file extensions that look like emails
  if (/\.(png|jpg|jpeg|gif|svg|css|js|woff|ttf)$/i.test(lower)) return false;
  // Must have a real TLD
  if (!/\.[a-z]{2,}$/.test(lower)) return false;
  return true;
}

async function fetchPage(url: string): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml',
      },
      redirect: 'follow',
    });
    clearTimeout(timeout);
    if (!res.ok) return null;
    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('text/html')) return null;
    return await res.text();
  } catch {
    return null;
  }
}

function extractEmails(html: string): string[] {
  const emails = new Set<string>();

  // Decode HTML entities for mailto: links
  const decoded = html.replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCharCode(parseInt(h, 16)));

  const matches = decoded.match(EMAIL_REGEX) || [];
  for (const m of matches) {
    const clean = m.toLowerCase().replace(/\.$/, '');
    if (isValidBusinessEmail(clean)) {
      emails.add(clean);
    }
  }
  return Array.from(emails);
}

function normalizeUrl(website: string): string {
  let url = website.trim();
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = 'https://' + url;
  }
  // Remove trailing slash for consistency
  return url.replace(/\/+$/, '');
}

async function scrapeRestaurant(restaurant: { id: string; name: string; website: string }): Promise<string | null> {
  const baseUrl = normalizeUrl(restaurant.website);

  // Try homepage first
  let html = await fetchPage(baseUrl);
  let allEmails: string[] = [];

  if (html) {
    allEmails.push(...extractEmails(html));

    // If no emails on homepage, try common contact pages
    if (allEmails.length === 0) {
      const contactPaths = ['/contact', '/contact-us', '/about', '/about-us'];
      for (const path of contactPaths) {
        const contactHtml = await fetchPage(baseUrl + path);
        if (contactHtml) {
          allEmails.push(...extractEmails(contactHtml));
          if (allEmails.length > 0) break;
        }
      }
    }
  }

  if (allEmails.length === 0) return null;

  // Prefer emails that look like info@, contact@, hello@, orders@, etc.
  const preferred = ['info@', 'contact@', 'hello@', 'orders@', 'reservations@', 'eat@', 'dine@', 'catering@'];
  const sorted = allEmails.sort((a, b) => {
    const aScore = preferred.findIndex(p => a.startsWith(p));
    const bScore = preferred.findIndex(p => b.startsWith(p));
    if (aScore >= 0 && bScore < 0) return -1;
    if (bScore >= 0 && aScore < 0) return 1;
    if (aScore >= 0 && bScore >= 0) return aScore - bScore;
    return 0;
  });

  return sorted[0];
}

async function main() {
  console.log('Fetching restaurants with websites...');

  // Get all active restaurants that have a website (scrape all, even if they have contact_email)
  const { data: restaurants, error } = await supabase
    .from('restaurants')
    .select('id, name, website, contact_email, business_email')
    .eq('is_active', true)
    .not('website', 'is', null);

  if (error) {
    console.error('Error fetching restaurants:', error);
    process.exit(1);
  }

  console.log(`Found ${restaurants.length} restaurants with websites and no business_email yet.\n`);

  let found = 0;
  let skipped = 0;
  let failed = 0;

  for (let i = 0; i < restaurants.length; i++) {
    const r = restaurants[i];
    const progress = `[${i + 1}/${restaurants.length}]`;

    // Skip if we already have a business_email for this one
    if (r.business_email) {
      console.log(`${progress} ${r.name}: already has business_email (${r.business_email}), skipping`);
      skipped++;
      continue;
    }

    try {
      const email = await scrapeRestaurant(r);

      if (email) {

        // Save to DB
        const { error: updateError } = await supabase
          .from('restaurants')
          .update({ business_email: email })
          .eq('id', r.id);

        if (updateError) {
          console.error(`${progress} ${r.name}: DB error:`, updateError.message);
          failed++;
        } else {
          console.log(`${progress} ${r.name}: ${email}`);
          found++;
        }
      } else {
        console.log(`${progress} ${r.name}: no email found`);
        skipped++;
      }
    } catch (err) {
      console.error(`${progress} ${r.name}: error`, err);
      failed++;
    }

    // Small delay to be polite
    await new Promise(resolve => setTimeout(resolve, 300));
  }

  console.log(`\n--- Results ---`);
  console.log(`Total processed: ${restaurants.length}`);
  console.log(`Emails found: ${found}`);
  console.log(`No email / duplicate: ${skipped}`);
  console.log(`Errors: ${failed}`);
}

main();
