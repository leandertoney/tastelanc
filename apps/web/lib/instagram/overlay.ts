// Instagram Carousel Overlay System
// Composites branded text overlays onto restaurant photos using sharp + SVG
// Design: Magazine cover aesthetic (inspired by Barfly Lancaster)

import sharp from 'sharp';
import { readFileSync, existsSync, copyFileSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { SupabaseClient } from '@supabase/supabase-js';
import { SlideCandidate, MarketConfig, HeadlineParts, HolidaySpecialSlide, RestaurantSpotlightCandidate, SpotlightHappyHour, SpotlightDeal, SpotlightSpecial, SpotlightEvent } from './types';
import { getMarketDisplayName, getAppName } from './prompts';

const SIZE = 1080;
const JPEG_QUALITY = 92;

// Brand colors (default)
const ACCENT = '#E8C547'; // warm gold accent
const ACCENT_DIM = 'rgba(232,197,71,0.8)';

// Holiday color themes — keyed by holiday_tag base (without year suffix)
interface HolidayTheme {
  accent: string;
  accentDim: string;
  bgDark: string;
  bgGradient: [string, string]; // top, bottom
  decorEmoji: string;
  coverPrompt: string; // DALL-E prompt for the cover image
}

const HOLIDAY_THEMES: Record<string, HolidayTheme> = {
  'st-patricks': {
    accent: '#2ECC40',
    accentDim: 'rgba(46,204,64,0.8)',
    bgDark: '#0A2A0A',
    bgGradient: ['#0D3D0D', '#0A1F0A'],
    decorEmoji: '☘️',
    coverPrompt: 'A vibrant St. Patricks Day celebration scene at a cozy local bar, green beer on a wooden bar counter, shamrock decorations, warm ambient lighting, festive atmosphere, no text or words, photorealistic, 4k',
  },
  'cinco-de-mayo': {
    accent: '#E84142',
    accentDim: 'rgba(232,65,66,0.8)',
    bgDark: '#1A0A0A',
    bgGradient: ['#2A0F0F', '#1A0A0A'],
    decorEmoji: '🎉',
    coverPrompt: 'A vibrant Cinco de Mayo fiesta scene, colorful papel picado banners, margaritas and tacos on a festive table, warm Mexican restaurant ambiance, no text or words, photorealistic, 4k',
  },
  'fourth-of-july': {
    accent: '#3498DB',
    accentDim: 'rgba(52,152,219,0.8)',
    bgDark: '#0A1520',
    bgGradient: ['#0F2030', '#0A1520'],
    decorEmoji: '🇺🇸',
    coverPrompt: 'A patriotic American summer BBQ scene, red white and blue decorations, grilled food and cold drinks on a picnic table, fireworks in the sky, no text or words, photorealistic, 4k',
  },
  'halloween': {
    accent: '#E67E22',
    accentDim: 'rgba(230,126,34,0.8)',
    bgDark: '#1A120A',
    bgGradient: ['#2A1A0F', '#1A120A'],
    decorEmoji: '🎃',
    coverPrompt: 'A spooky Halloween themed bar with carved pumpkins, orange and purple lighting, festive cocktails, cozy autumn atmosphere, no text or words, photorealistic, 4k',
  },
};

function getHolidayTheme(holidayTag: string | null): HolidayTheme | null {
  if (!holidayTag) return null;
  const base = holidayTag.replace(/-\d{4}$/, '');
  return HOLIDAY_THEMES[base] || null;
}

// Install Inter + Playfair Display fonts via fontconfig so librsvg/Pango can find them.
// Playfair Display = serif display font for editorial headlines (Barfly Magazine aesthetic)
// Inter = clean sans-serif for labels, body text, UI elements
// Data URI @font-face in SVG is unreliable with librsvg on serverless.
let fontsInstalled = false;

const ALL_FONTS = [
  'Inter-Bold.ttf',
  'Inter-Regular.ttf',
  'PlayfairDisplay-Variable.ttf',
  'PlayfairDisplay-Italic-Variable.ttf',
];

function findFontFile(filename: string): string {
  const candidates = [
    join(process.cwd(), 'lib/instagram/fonts', filename),
    join(process.cwd(), '.next/server/lib/instagram/fonts', filename),
    join(process.cwd(), 'apps/web/lib/instagram/fonts', filename),
  ];
  for (const p of candidates) {
    if (existsSync(p)) return p;
  }
  console.error(`[Instagram] Font ${filename} NOT found! cwd=${process.cwd()}`);
  return candidates[0];
}

function ensureSystemFonts(): void {
  if (fontsInstalled) return;

  const fontDir = '/tmp/fonts';
  mkdirSync(fontDir, { recursive: true });

  // Copy all font files to /tmp/fonts
  for (const name of ALL_FONTS) {
    const dest = join(fontDir, name);
    if (!existsSync(dest)) {
      const src = findFontFile(name);
      if (existsSync(src)) {
        copyFileSync(src, dest);
        console.log(`[Instagram] Copied ${name} to ${dest}`);
      }
    }
  }

  // Write fontconfig config pointing to /tmp/fonts
  const fontsConf = join(fontDir, 'fonts.conf');
  if (!existsSync(fontsConf)) {
    writeFileSync(fontsConf, `<?xml version="1.0"?>
<!DOCTYPE fontconfig SYSTEM "urn:fontconfig:fonts.dtd">
<fontconfig>
  <dir>/tmp/fonts</dir>
  <cachedir>/tmp/fontconfig-cache</cachedir>
</fontconfig>`);
  }

  // Tell fontconfig where to find our config
  process.env.FONTCONFIG_FILE = fontsConf;
  console.log(`[Instagram] Fontconfig configured: FONTCONFIG_FILE=${fontsConf}`);
  fontsInstalled = true;
}

// Font family constants for SVG — Playfair for editorial, Inter for UI
const SERIF = 'Playfair Display';
const SANS = 'Inter';

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function svgFontStyles(): string {
  // Ensure fonts are installed via fontconfig before any SVG rendering
  ensureSystemFonts();
  // No @font-face needed — fontconfig makes Inter available system-wide
  return '';
}

/**
 * Load logo from local public/images/ directory (NOT Supabase storage).
 */
function loadLogoBuffer(marketSlug: string): Buffer {
  const filename = marketSlug === 'cumberland-pa'
    ? 'tastecumberland_icon.png'
    : 'tastelanc_icon.png';
  const logoPath = join(process.cwd(), 'public/images', filename);
  if (existsSync(logoPath)) {
    return readFileSync(logoPath);
  }
  throw new Error(`Logo not found at ${logoPath}`);
}

// ============================================================
// DALL-E AI Cover Image Generation
// ============================================================

async function generateAICoverImage(prompt: string): Promise<Buffer | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error('[Instagram] No OPENAI_API_KEY — skipping AI cover image');
    return null;
  }

  try {
    const response = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'dall-e-3',
        prompt,
        n: 1,
        size: '1024x1024',
        quality: 'standard',
      }),
    });

    const data = await response.json();
    if (data.error) {
      console.error('[Instagram] DALL-E error:', data.error.message);
      return null;
    }

    const imageUrl = data.data?.[0]?.url;
    if (!imageUrl) return null;

    return await fetchImageBuffer(imageUrl);
  } catch (err: any) {
    console.error('[Instagram] DALL-E generation failed:', err.message);
    return null;
  }
}

// ============================================================
// Weekly Roundup Slides — Magazine Issue Style
// Holiday-adaptive colors, AI cover, distinct from regular posts
// ============================================================

export async function composeWeeklyRoundupSlides(opts: {
  supabase: SupabaseClient;
  market: MarketConfig;
  candidates: SlideCandidate[];
  headline: HeadlineParts;
  totalCount: number;
  date: string;
  holidayTag?: string | null;
}): Promise<string[]> {
  const { supabase, market, candidates, headline, totalCount, date, holidayTag } = opts;
  const appName = getAppName(market.market_slug);
  const marketName = getMarketDisplayName(market.market_slug);
  const theme = getHolidayTheme(holidayTag || null);

  // Colors — holiday-adaptive or default
  const accent = theme?.accent || ACCENT;
  const accentDim = theme?.accentDim || ACCENT_DIM;

  // Load logo
  let logoBuffer: Buffer;
  try {
    logoBuffer = loadLogoBuffer(market.market_slug);
  } catch {
    logoBuffer = await sharp({ create: { width: 200, height: 200, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } }).png().toBuffer();
  }

  // Generate AI cover image if holiday, otherwise use best candidate photo
  let coverImage: Buffer | null = null;
  if (theme) {
    console.log(`[Instagram] Generating AI cover for holiday: ${holidayTag}`);
    coverImage = await generateAICoverImage(theme.coverPrompt);
  }

  // Fallback: use candidate images
  const STOCK_PREFIXES = ['https://tastelanc.com/images/events/', 'https://tastelanc.com/images/entertainment/', 'https://tastecumberland.com/images/events/'];
  const imageBuffers = await Promise.all(
    candidates.map(async (c) => {
      const urls = [c.image_url, c.cover_image_url].filter(Boolean) as string[];
      for (const url of urls) {
        if (STOCK_PREFIXES.some(p => url.startsWith(p))) continue;
        try { return await fetchImageBuffer(url); } catch { continue; }
      }
      return null;
    })
  );

  if (!coverImage) {
    coverImage = imageBuffers.find(b => b !== null) || null;
  }

  // Build slides
  const slides: Buffer[] = [];

  // Slide 1: Magazine Cover
  slides.push(await composeRoundupCover(coverImage, headline, logoBuffer, appName, marketName, accent, accentDim, theme, date));

  // Slides 2-4: Individual restaurant/special cards
  for (let i = 0; i < candidates.length; i++) {
    slides.push(await composeRoundupCard(
      imageBuffers[i], candidates[i], logoBuffer, accent, accentDim, i + 1, candidates.length, theme
    ));
  }

  // Final slide: CTA
  const ctaBg = imageBuffers.filter(b => b !== null).pop() || coverImage;
  slides.push(await composeRoundupCTA(appName, totalCount, logoBuffer, ctaBg, accent, accentDim, theme));

  // Upload
  const timestamp = Date.now();
  const storagePath = `instagram/${market.market_slug}/${date}/${timestamp}`;
  const urls = await Promise.all(
    slides.map((buf, i) => uploadSlide(supabase, buf, `${storagePath}/slide-${i}.jpg`))
  );

  return urls;
}

async function composeRoundupCover(
  imageBuffer: Buffer | null,
  headline: HeadlineParts,
  logoBuffer: Buffer,
  appName: string,
  marketName: string,
  accent: string,
  accentDim: string,
  theme: HolidayTheme | null,
  date: string
): Promise<Buffer> {
  // Barfly Magazine homage — outer accent border, split masthead, date block,
  // photo-forward hero, editorial headlines, color-blocked "Inside" section with thumbnails
  const BORDER = 12;
  const INSIDE_TOP = 755;

  let base: sharp.Sharp;
  if (imageBuffer) {
    base = sharp(imageBuffer)
      .resize(SIZE, SIZE, { fit: 'cover', position: 'centre' })
      .modulate({ brightness: 1.05, saturation: 1.1 });
  } else {
    const bg = theme ? hexToRgb(theme.bgDark) : { r: 30, g: 25, b: 35 };
    base = sharp({ create: { width: SIZE, height: SIZE, channels: 3, background: bg } });
  }

  // Gradient overlay — darken top for masthead, middle clear for photo, heavy bottom for "Inside" section
  const overlaySvg = Buffer.from(`
    <svg width="${SIZE}" height="${SIZE}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bflyCover" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="black" stop-opacity="0.62"/>
          <stop offset="14%" stop-color="black" stop-opacity="0.22"/>
          <stop offset="35%" stop-color="black" stop-opacity="0.08"/>
          <stop offset="52%" stop-color="black" stop-opacity="0.12"/>
          <stop offset="65%" stop-color="black" stop-opacity="0.50"/>
          <stop offset="72%" stop-color="black" stop-opacity="0.80"/>
          <stop offset="100%" stop-color="black" stop-opacity="0.95"/>
        </linearGradient>
      </defs>
      <rect width="${SIZE}" height="${SIZE}" fill="url(#bflyCover)"/>
      ${theme ? `<rect width="${SIZE}" height="${SIZE}" fill="${accent}" opacity="0.05"/>` : ''}
    </svg>`);

  const cx = SIZE / 2;
  const editorialHeadline = getEditorialHeadline(headline);
  const tagline = getCoverTagline(marketName);
  const masthead = getMastheadParts(appName);
  const coverDate = formatCoverDate(date);

  // Build "Inside" category block SVGs (backgrounds + labels)
  const THUMB_W = 184;
  const THUMB_H = 160;
  const GAP = 16;
  const START_X = BORDER + 20;
  const insideBlocksSvg = INSIDE_CATEGORIES.map((cat, i) => {
    const bx = START_X + i * (THUMB_W + GAP);
    const labelX = bx + THUMB_W / 2;
    return `
      <!-- ${cat.label} block -->
      <rect x="${bx}" y="800" width="${THUMB_W}" height="${THUMB_H + 60}" rx="8" fill="rgba(255,255,255,0.06)"/>
      <text x="${labelX}" y="988" font-family="${SANS}" font-weight="700" font-size="13"
            fill="${accent}" text-anchor="middle" letter-spacing="1">${cat.label}</text>
      <text x="${labelX}" y="1006" font-family="${SANS}" font-weight="400" font-size="11"
            fill="rgba(255,255,255,0.5)" text-anchor="middle">${cat.subtitle}</text>
    `;
  }).join('');

  const textSvg = Buffer.from(`
    <svg width="${SIZE}" height="${SIZE}" xmlns="http://www.w3.org/2000/svg">
      ${svgFontStyles()}

      <!-- ═══ OUTER ACCENT BORDER (Barfly signature) ═══ -->
      <rect x="0" y="0" width="${SIZE}" height="${BORDER}" fill="${accent}"/>
      <rect x="0" y="${SIZE - BORDER}" width="${SIZE}" height="${BORDER}" fill="${accent}"/>
      <rect x="0" y="0" width="${BORDER}" height="${SIZE}" fill="${accent}"/>
      <rect x="${SIZE - BORDER}" y="0" width="${BORDER}" height="${SIZE}" fill="${accent}"/>

      <!-- Tagline bar inside border -->
      <rect x="${BORDER}" y="${BORDER}" width="${SIZE - BORDER * 2}" height="34" fill="rgba(0,0,0,0.65)"/>
      <text x="${cx}" y="36" font-family="${SANS}" font-weight="600" font-size="11"
            fill="white" text-anchor="middle" letter-spacing="2.5">${tagline}</text>

      <!-- ═══ MASTHEAD — split "Taste" / "Lanc" (Barfly's "Fly" / "Magazine" homage) ═══ -->
      <!-- Left: big serif app name split -->
      <text x="32" y="118" font-family="${SERIF}" font-weight="900" font-size="85"
            fill="rgba(0,0,0,0.35)" text-anchor="start" letter-spacing="2">${escapeXml(masthead.big)}</text>
      <text x="30" y="116" font-family="${SERIF}" font-weight="900" font-size="85"
            fill="white" text-anchor="start" letter-spacing="2">${escapeXml(masthead.big)}</text>
      ${masthead.small ? `
      <text x="32" y="${118 + masthead.smallFontSize + 6}" font-family="${SERIF}" font-weight="400" font-size="${masthead.smallFontSize}"
            fill="${accent}" text-anchor="start" letter-spacing="3">${escapeXml(masthead.small)}</text>
      ` : ''}
      <text x="32" y="185" font-family="${SANS}" font-weight="600" font-size="13"
            fill="${accent}" text-anchor="start" letter-spacing="6">WEEKLY ROUNDUP</text>

      <!-- Right: date block (Barfly's month/year homage) -->
      <text x="${SIZE - 30}" y="78" font-family="${SANS}" font-weight="400" font-size="13"
            fill="rgba(255,255,255,0.55)" text-anchor="end" letter-spacing="3">${escapeXml(coverDate.label)}</text>
      <text x="${SIZE - 30}" y="125" font-family="${SERIF}" font-weight="700" font-size="44"
            fill="white" text-anchor="end">${escapeXml(coverDate.value)}</text>

      <!-- ═══ EDITORIAL HEADLINE — italic serif ON the photo ═══ -->
      <text x="50" y="492" font-family="${SERIF}" font-weight="700" font-size="68" font-style="italic"
            fill="rgba(0,0,0,0.35)" text-anchor="start">${escapeXml(editorialHeadline.line1)}</text>
      <text x="48" y="490" font-family="${SERIF}" font-weight="700" font-size="68" font-style="italic"
            fill="white" text-anchor="start">${escapeXml(editorialHeadline.line1)}</text>

      <text x="50" y="568" font-family="${SERIF}" font-weight="700" font-size="68" font-style="italic"
            fill="rgba(0,0,0,0.35)" text-anchor="start">${escapeXml(editorialHeadline.line2)}</text>
      <text x="48" y="566" font-family="${SERIF}" font-weight="700" font-size="68" font-style="italic"
            fill="white" text-anchor="start">${escapeXml(editorialHeadline.line2)}</text>

      <!-- Bullet teasers -->
      <text x="65" y="628" font-family="${SANS}" font-weight="600" font-size="22"
            fill="white" text-anchor="start">&#x2022; ${escapeXml(String(headline.count))}+ ${escapeXml(headline.label)} This Week</text>
      <text x="65" y="663" font-family="${SANS}" font-weight="600" font-size="22"
            fill="white" text-anchor="start">&#x2022; ${escapeXml(headline.dayLabel)}</text>

      ${theme ? `
      <text x="65" y="698" font-family="${SANS}" font-weight="600" font-size="22"
            fill="${accent}" text-anchor="start">&#x2022; ${escapeXml(headline.label.toUpperCase())} EDITION ${theme.decorEmoji}</text>
      ` : ''}

      <!-- ═══ "INSIDE YOUR TASTELANC" SECTION (Barfly's "Inside Your Fly" homage) ═══ -->
      <rect x="${BORDER}" y="${INSIDE_TOP}" width="${SIZE - BORDER * 2}" height="${SIZE - INSIDE_TOP - BORDER}" fill="rgba(0,0,0,0.88)"/>
      <rect x="${BORDER}" y="${INSIDE_TOP}" width="${SIZE - BORDER * 2}" height="3" fill="${accent}"/>

      <text x="30" y="${INSIDE_TOP + 30}" font-family="${SERIF}" font-weight="400" font-size="18" font-style="italic"
            fill="${accent}" text-anchor="start">inside your ${escapeXml(appName)}</text>

      ${insideBlocksSvg}

      <!-- Swipe CTA -->
      <text x="${cx}" y="${SIZE - 22}" font-family="${SANS}" font-weight="400" font-size="13"
            fill="rgba(255,255,255,0.45)" text-anchor="middle" letter-spacing="3">SWIPE FOR THIS WEEK&apos;S PICKS  &#x276F;</text>
    </svg>`);

  // Load logo and category thumbnails in parallel
  const [resizedLogo, thumbnails] = await Promise.all([
    sharp(logoBuffer).resize(50, 50, { fit: 'cover' }).png().toBuffer(),
    loadInsideThumbnails(),
  ]);

  return base
    .jpeg({ quality: JPEG_QUALITY })
    .toBuffer()
    .then(buf => sharp(buf)
      .composite([
        { input: overlaySvg, top: 0, left: 0 },
        { input: resizedLogo, top: 58, left: SIZE - 90 },
        ...thumbnails,
        { input: textSvg, top: 0, left: 0 },
      ])
      .jpeg({ quality: JPEG_QUALITY })
      .toBuffer()
    );
}

async function composeRoundupCard(
  imageBuffer: Buffer | null,
  candidate: SlideCandidate,
  logoBuffer: Buffer,
  accent: string,
  accentDim: string,
  slideNum: number,
  totalSlides: number,
  theme: HolidayTheme | null
): Promise<Buffer> {
  // Editorial restaurant card — serif typography, accent blocks, corner brackets
  const base = imageBuffer
    ? sharp(imageBuffer).resize(SIZE, SIZE, { fit: 'cover', position: 'centre' })
    : (() => {
        const bg = theme ? hexToRgb(theme.bgDark) : { r: 15, g: 12, b: 20 };
        return sharp({ create: { width: SIZE, height: SIZE, channels: 3, background: bg } });
      })();

  const gradientSvg = Buffer.from(`
    <svg width="${SIZE}" height="${SIZE}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="rndCard" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" style="stop-color:black;stop-opacity:0.06"/>
          <stop offset="40%" style="stop-color:black;stop-opacity:0.05"/>
          <stop offset="60%" style="stop-color:black;stop-opacity:0.35"/>
          <stop offset="80%" style="stop-color:black;stop-opacity:0.8"/>
          <stop offset="100%" style="stop-color:black;stop-opacity:0.95"/>
        </linearGradient>
      </defs>
      <rect width="${SIZE}" height="${SIZE}" fill="url(#rndCard)"/>
      ${theme ? `<rect width="${SIZE}" height="${SIZE}" fill="${accent}" opacity="0.04"/>` : ''}
    </svg>`);

  const nameLines = wrapText(candidate.restaurant_name, 18);
  const nameStartY = SIZE - 185 - (nameLines.length - 1) * 55;
  const nameSvg = nameLines.map((line, i) =>
    `<text x="70" y="${nameStartY + i * 55}"
           font-family="${SERIF}" font-weight="700" font-size="48"
           fill="white" text-anchor="start">
       ${escapeXml(line)}
     </text>`
  ).join('\n');

  const detailY = nameStartY + nameLines.length * 55 + 5;

  // Parse price from detail text for callout
  const priceMatch = candidate.detail_text.match(/\$\d+(?:\.\d{2})?/);

  const textSvg = Buffer.from(`
    <svg width="${SIZE}" height="${SIZE}" xmlns="http://www.w3.org/2000/svg">
      ${svgFontStyles()}

      <!-- Corner brackets — editorial framing -->
      ${cornerBracketsSvg(SIZE, 24, 55, 2, accent, ['tl', 'br'])}

      <!-- Slide counter — gold accent block -->
      <rect x="24" y="24" width="68" height="30" fill="${accent}"/>
      <text x="58" y="44"
            font-family="${SANS}" font-weight="700" font-size="14"
            fill="#111111" text-anchor="middle">
        ${slideNum}/${totalSlides}
      </text>

      <!-- Vertical accent bar beside name -->
      <rect x="52" y="${nameStartY - 10}" width="3" height="${nameLines.length * 55 + 25}" fill="${accent}" opacity="0.7"/>

      <!-- Restaurant name — serif -->
      ${nameSvg}

      <!-- Detail text with separator -->
      <rect x="70" y="${detailY - 2}" width="${SIZE - 160}" height="1" fill="${accent}" opacity="0.3"/>
      <text x="70" y="${detailY + 26}"
            font-family="${SERIF}" font-weight="400" font-size="24" font-style="italic"
            fill="${accentDim}" text-anchor="start">
        ${escapeXml(candidate.detail_text)}
      </text>

      ${priceMatch ? `
      <!-- Price callout block -->
      <rect x="${SIZE - 190}" y="${nameStartY - 50}" width="150" height="46" fill="${accent}"/>
      <text x="${SIZE - 115}" y="${nameStartY - 20}"
            font-family="${SANS}" font-weight="700" font-size="26"
            fill="#111111" text-anchor="middle">
        ${escapeXml(priceMatch[0])}
      </text>
      ` : ''}

      <!-- Bottom rule -->
      <rect x="50" y="${SIZE - 50}" width="${SIZE - 100}" height="1" fill="${accent}" opacity="0.2"/>
    </svg>`);

  const smallLogo = await sharp(logoBuffer)
    .resize(40, 40, { fit: 'cover' })
    .png()
    .toBuffer();

  return base
    .jpeg({ quality: JPEG_QUALITY })
    .toBuffer()
    .then(buf => sharp(buf)
      .composite([
        { input: gradientSvg, top: 0, left: 0 },
        { input: smallLogo, top: 28, left: SIZE - 72 },
        { input: textSvg, top: 0, left: 0 },
      ])
      .jpeg({ quality: JPEG_QUALITY })
      .toBuffer()
    );
}

async function composeRoundupCTA(
  appName: string,
  totalCount: number,
  logoBuffer: Buffer,
  backgroundImage: Buffer | null,
  accent: string,
  accentDim: string,
  theme: HolidayTheme | null
): Promise<Buffer> {
  // Editorial CTA — magazine back-page with urgency, feature teasers, corner brackets
  let base: sharp.Sharp;
  if (backgroundImage) {
    const blurred = await sharp(backgroundImage)
      .resize(SIZE, SIZE, { fit: 'cover', position: 'centre' })
      .blur(25)
      .modulate({ brightness: 0.15 })
      .toBuffer();
    base = sharp(blurred);
  } else {
    const bg = theme ? hexToRgb(theme.bgDark) : { r: 12, g: 10, b: 16 };
    base = sharp({ create: { width: SIZE, height: SIZE, channels: 3, background: bg } });
  }

  const resizedLogo = await sharp(logoBuffer)
    .resize(130, 130, { fit: 'cover' })
    .png()
    .toBuffer();

  const cx = SIZE / 2;

  const textSvg = Buffer.from(`
    <svg width="${SIZE}" height="${SIZE}" xmlns="http://www.w3.org/2000/svg">
      ${svgFontStyles()}

      <!-- Editorial border frame -->
      <rect x="40" y="40" width="${SIZE - 80}" height="${SIZE - 80}"
            fill="none" stroke="${accent}" stroke-width="1.5" opacity="0.3"/>

      <!-- Corner brackets -->
      ${cornerBracketsSvg(SIZE, 35, 70, 3, accent, ['tl', 'tr', 'bl', 'br'])}

      <!-- App name echo — small at top -->
      <text x="${cx}" y="90"
            font-family="${SANS}" font-weight="700" font-size="14"
            fill="${accent}" text-anchor="middle" letter-spacing="6">
        ${escapeXml(appName.toUpperCase())}
      </text>
      <rect x="${cx - 60}" y="102" width="120" height="1" fill="${accent}" opacity="0.4"/>

      <!-- Big serif headline -->
      <text x="${cx}" y="430"
            font-family="${SERIF}" font-weight="700" font-size="58"
            fill="white" text-anchor="middle">
        Don&apos;t Miss
      </text>
      <text x="${cx}" y="505"
            font-family="${SERIF}" font-weight="700" font-size="58"
            fill="white" text-anchor="middle">
        What&apos;s Next
      </text>

      <rect x="${cx - 40}" y="530" width="80" height="3" fill="${accent}"/>

      <text x="${cx}" y="585"
            font-family="${SERIF}" font-weight="400" font-size="24" font-style="italic"
            fill="rgba(255,255,255,0.7)" text-anchor="middle">
        ${totalCount}+ places this week on ${escapeXml(appName)}
      </text>

      <!-- Feature teasers -->
      <rect x="120" y="630" width="${SIZE - 240}" height="1" fill="${accent}" opacity="0.2"/>
      <text x="${cx}" y="668"
            font-family="${SANS}" font-weight="400" font-size="15"
            fill="rgba(255,255,255,0.5)" text-anchor="middle" letter-spacing="1">
        PLUS: Happy Hours &#183; Live Music &#183; Exclusive Deals &#183; Events
      </text>
      <rect x="120" y="688" width="${SIZE - 240}" height="1" fill="${accent}" opacity="0.2"/>

      <!-- Download text -->
      <text x="${cx}" y="740"
            font-family="${SANS}" font-weight="400" font-size="18"
            fill="rgba(255,255,255,0.45)" text-anchor="middle">
        Free on the App Store &amp; Google Play
      </text>

      <!-- CTA button -->
      <rect x="${cx - 150}" y="780" width="300" height="56" rx="4" ry="4"
            fill="${accent}"/>
      <text x="${cx}" y="816"
            font-family="${SANS}" font-weight="700" font-size="20"
            fill="#111111" text-anchor="middle" letter-spacing="3">
        LINK IN BIO
      </text>

      ${theme ? `
      <!-- Holiday callout -->
      <text x="${cx}" y="880"
            font-family="${SERIF}" font-weight="400" font-size="18" font-style="italic"
            fill="${accent}" text-anchor="middle">
        Check the ${theme.decorEmoji} holiday tab for all the deals
      </text>
      ` : `
      <!-- Tagline -->
      <text x="${cx}" y="${SIZE - 60}"
            font-family="${SERIF}" font-weight="400" font-size="16" font-style="italic"
            fill="rgba(255,255,255,0.3)" text-anchor="middle">
        Your city. Your guide. Your next favorite spot.
      </text>
      `}
    </svg>`);

  const darkOverlay = Buffer.from(`
    <svg width="${SIZE}" height="${SIZE}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${SIZE}" height="${SIZE}" fill="rgba(0,0,0,0.6)"/>
      ${theme ? `<rect width="${SIZE}" height="${SIZE}" fill="${accent}" opacity="0.04"/>` : ''}
    </svg>`);

  const logoLeft = Math.round((SIZE - 130) / 2);

  return base
    .jpeg({ quality: JPEG_QUALITY })
    .toBuffer()
    .then(buf => sharp(buf)
      .composite([
        { input: darkOverlay, top: 0, left: 0 },
        { input: resizedLogo, top: 190, left: logoLeft },
        { input: textSvg, top: 0, left: 0 },
      ])
      .jpeg({ quality: JPEG_QUALITY })
      .toBuffer()
    );
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace('#', '');
  return { r: parseInt(h.slice(0, 2), 16), g: parseInt(h.slice(2, 4), 16), b: parseInt(h.slice(4, 6), 16) };
}

// ============================================================
// Holiday Poster Slides — mirrors the mobile app's poster card design
// Pure typographic — NO restaurant photos, only text + decorations
// ============================================================

// St. Patrick's Day palette (matches StPatricksDayScreen.tsx)
const SPD = {
  bg: '#0F2B0F',
  bgDark: '#0D1F0D',
  gold: '#D4AF37',
  goldLight: '#E8D48B',
  goldMuted: 'rgba(212,175,55,0.4)',
  goldRule: 'rgba(212,175,55,0.3)',
  cornerDecor: 'rgba(212,175,55,0.5)',
  shamrock: '#2ECC40',
  textPrimary: '#E8F5E8',
  textMuted: '#5A8A5A',
};

/**
 * Generate holiday poster-style carousel slides.
 * Each slide is a typographic poster card showing a restaurant's specials.
 * Design mirrors the in-app StPatricksDayScreen poster cards.
 */
export async function composeHolidayPosterSlides(opts: {
  supabase: SupabaseClient;
  market: MarketConfig;
  holidaySlides: HolidaySpecialSlide[];
  totalRestaurants: number;
  date: string;
  appName: string;
  marketName: string;
  holidayLabel: string;
  dateLabel: string;
}): Promise<string[]> {
  const { supabase, market, holidaySlides, totalRestaurants, date, appName, marketName, holidayLabel, dateLabel } = opts;

  let logoBuffer: Buffer;
  try {
    logoBuffer = loadLogoBuffer(market.market_slug);
  } catch {
    logoBuffer = await sharp({ create: { width: 200, height: 200, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } }).png().toBuffer();
  }

  const slides: Buffer[] = [];

  // Slide 1: Cover
  slides.push(await composePosterCover(appName, marketName, holidayLabel, dateLabel, logoBuffer));

  // Slides 2-4: Restaurant special cards (up to 3)
  for (const rs of holidaySlides.slice(0, 3)) {
    slides.push(await composePosterSpecialCard(rs, appName, dateLabel));
  }

  // Final slide: CTA
  const remaining = totalRestaurants - Math.min(holidaySlides.length, 3);
  slides.push(await composePosterCTA(appName, remaining, holidayLabel, logoBuffer));

  // Upload
  const timestamp = Date.now();
  const storagePath = `instagram/${market.market_slug}/${date}/${timestamp}`;
  const urls = await Promise.all(
    slides.map((buf, i) => uploadSlide(supabase, buf, `${storagePath}/slide-${i}.jpg`))
  );

  return urls;
}

async function composePosterCover(
  appName: string,
  marketName: string,
  holidayLabel: string,
  dateLabel: string,
  logoBuffer: Buffer
): Promise<Buffer> {
  const cx = SIZE / 2;

  // Try to generate an AI background image for visual richness
  let bgImage = await generateAICoverImage(
    HOLIDAY_THEMES['st-patricks']?.coverPrompt ||
    'A festive St Patricks Day bar scene with green beer, shamrock decorations, warm ambient lighting, no text, photorealistic'
  );

  let base: sharp.Sharp;
  if (bgImage) {
    base = sharp(bgImage).resize(SIZE, SIZE, { fit: 'cover', position: 'centre' });
  } else {
    base = sharp({ create: { width: SIZE, height: SIZE, channels: 3, background: hexToRgb(SPD.bg) } });
  }

  // Heavy dark + green-tinted overlay so text pops over the photo
  const overlaySvg = Buffer.from(`
    <svg width="${SIZE}" height="${SIZE}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="coverGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" style="stop-color:#0A1A0A;stop-opacity:0.85"/>
          <stop offset="40%" style="stop-color:#0A1A0A;stop-opacity:0.6"/>
          <stop offset="70%" style="stop-color:#0A1A0A;stop-opacity:0.65"/>
          <stop offset="100%" style="stop-color:#0A1A0A;stop-opacity:0.9"/>
        </linearGradient>
      </defs>
      <rect width="${SIZE}" height="${SIZE}" fill="url(#coverGrad)"/>
    </svg>`);

  const resizedLogo = await sharp(logoBuffer).resize(80, 80, { fit: 'cover' }).png().toBuffer();

  const svg = Buffer.from(`
    <svg width="${SIZE}" height="${SIZE}" xmlns="http://www.w3.org/2000/svg">
      ${svgFontStyles()}

      <!-- Gold border frame -->
      <rect x="40" y="40" width="${SIZE - 80}" height="${SIZE - 80}"
            fill="none" stroke="${SPD.gold}" stroke-width="2.5"/>

      <!-- Corner brackets -->
      ${cornerBracketsSvg(SIZE, 55, 60, 3, SPD.cornerDecor, ['tl', 'tr', 'bl', 'br'])}

      <!-- Masthead -->
      <text x="${cx}" y="170"
            font-family="Inter" font-weight="700" font-size="36"
            fill="white" text-anchor="middle" letter-spacing="12">
        ${escapeXml(appName.toUpperCase())}
      </text>
      <rect x="${cx - 140}" y="188" width="280" height="2" fill="${SPD.goldRule}"/>

      <!-- Holiday label -->
      <text x="${cx}" y="290"
            font-family="Inter" font-weight="700" font-size="20"
            fill="${SPD.goldMuted}" text-anchor="middle" letter-spacing="5">
        &#9752;  ${escapeXml(holidayLabel.toUpperCase())}  &#9752;
      </text>

      <!-- Hero: ST. PATRICK'S DAY big and bold -->
      <text x="${cx}" y="460"
            font-family="Inter" font-weight="900" font-size="68"
            fill="${SPD.gold}" text-anchor="middle" letter-spacing="2">
        ST. PATRICK&apos;S
      </text>
      <text x="${cx}" y="540"
            font-family="Inter" font-weight="900" font-size="68"
            fill="${SPD.gold}" text-anchor="middle" letter-spacing="2">
        DAY
      </text>

      <!-- Shamrock divider -->
      <line x1="280" y1="590" x2="460" y2="590" stroke="${SPD.goldRule}" stroke-width="1"/>
      <text x="${cx}" y="596" font-family="Inter" font-size="16" fill="${SPD.shamrock}" text-anchor="middle">&#9752;</text>
      <line x1="620" y1="590" x2="800" y2="590" stroke="${SPD.goldRule}" stroke-width="1"/>

      <!-- Subtitle -->
      <text x="${cx}" y="660"
            font-family="Inter" font-weight="400" font-size="28" font-style="italic"
            fill="${SPD.shamrock}" text-anchor="middle">
        Specials, Brunch &amp; Live Music
      </text>
      <text x="${cx}" y="710"
            font-family="Inter" font-weight="400" font-size="24"
            fill="rgba(255,255,255,0.6)" text-anchor="middle">
        in ${escapeXml(marketName)}
      </text>

      <!-- Date -->
      <text x="${cx}" y="790"
            font-family="Inter" font-weight="600" font-size="18"
            fill="${SPD.goldMuted}" text-anchor="middle" letter-spacing="3">
        ${escapeXml(dateLabel.toUpperCase())}
      </text>

      <!-- Swipe CTA -->
      <text x="${cx}" y="${SIZE - 70}"
            font-family="Inter" font-weight="400" font-size="18"
            fill="rgba(255,255,255,0.45)" text-anchor="middle" letter-spacing="4">
        SWIPE FOR DEALS  &#x276F;
      </text>
    </svg>`);

  return base
    .jpeg({ quality: JPEG_QUALITY })
    .toBuffer()
    .then(buf => sharp(buf)
      .composite([
        { input: overlaySvg, top: 0, left: 0 },
        { input: resizedLogo, top: 68, left: Math.round((SIZE - 80) / 2) },
        { input: svg, top: 0, left: 0 },
      ])
      .jpeg({ quality: JPEG_QUALITY })
      .toBuffer()
    );
}

async function composePosterSpecialCard(
  slide: HolidaySpecialSlide,
  appName: string,
  dateLabel: string
): Promise<Buffer> {
  const cx = SIZE / 2;

  // Use restaurant cover image as background if available
  let base: sharp.Sharp;
  if (slide.cover_image_url) {
    try {
      const imgBuf = await fetchImageBuffer(slide.cover_image_url);
      base = sharp(imgBuf).resize(SIZE, SIZE, { fit: 'cover', position: 'centre' });
    } catch {
      base = sharp({ create: { width: SIZE, height: SIZE, channels: 3, background: hexToRgb(SPD.bg) } });
    }
  } else {
    base = sharp({ create: { width: SIZE, height: SIZE, channels: 3, background: hexToRgb(SPD.bg) } });
  }
  const maxSpecials = Math.min(slide.specials.length, 4);

  // Calculate vertical center for content block
  // Header takes ~140-280, footer takes ~920-980. Content zone: 320-880 (~560px)
  const contentZoneTop = 350;
  const contentZoneBottom = 880;
  const contentZoneHeight = contentZoneBottom - contentZoneTop;

  // Measure content height first
  let contentHeight = 0;
  for (let i = 0; i < maxSpecials; i++) {
    const s = slide.specials[i];
    const hasPrice = (s.price && parseFloat(s.price) > 0) || s.name.match(/\$\d+/);
    contentHeight += hasPrice ? 70 : 50; // price row vs plain row
    if (s.description) contentHeight += 30;
    if (i < maxSpecials - 1) contentHeight += 50; // divider spacing
  }

  // For sparse cards (1 item), use bigger fonts
  const isSparse = maxSpecials === 1;
  const priceFontSize = isSparse ? 80 : 56;
  const dealFontSize = isSparse ? 38 : 28;
  const plainFontSize = isSparse ? 42 : 30;

  // Start content vertically centered in the content zone
  let yPos = contentZoneTop + Math.max(0, (contentZoneHeight - contentHeight) / 2) + 40;

  // Build specials SVG content — all centered
  let specialsSvg = '';
  for (let i = 0; i < maxSpecials; i++) {
    const s = slide.specials[i];
    const priceMatch = s.name.match(/^\$(\d+(?:\.\d{2})?)\s+(.+)/) || s.name.match(/(.+)\s+\$(\d+(?:\.\d{2})?)$/);
    const hasExplicitPrice = s.price && parseFloat(s.price) > 0;

    if (hasExplicitPrice || priceMatch) {
      const price = hasExplicitPrice ? `$${Math.round(parseFloat(s.price!))}` : (priceMatch![1].startsWith('$') ? priceMatch![1] : `$${priceMatch![2]}`);
      const dealName = hasExplicitPrice
        ? s.name.replace(/\$\d+(?:\.\d{2})?\s*/g, '').trim()
        : (priceMatch![1].startsWith('$') ? priceMatch![2] : priceMatch![1]).trim();

      // Price on its own line, centered and big
      specialsSvg += `
        <text x="${cx}" y="${yPos}"
              font-family="Inter" font-weight="900" font-size="${priceFontSize}"
              fill="${SPD.gold}" text-anchor="middle">${escapeXml(price)}</text>
      `;
      yPos += priceFontSize * 0.75;
      // Deal name centered below
      specialsSvg += `
        <text x="${cx}" y="${yPos}"
              font-family="Inter" font-weight="700" font-size="${dealFontSize}"
              fill="${SPD.textPrimary}" text-anchor="middle"
              letter-spacing="1">${escapeXml(dealName.toUpperCase())}</text>
      `;
      yPos += dealFontSize + 5;
    } else {
      specialsSvg += `
        <text x="${cx}" y="${yPos}"
              font-family="Inter" font-weight="800" font-size="${plainFontSize}"
              fill="${SPD.textPrimary}" text-anchor="middle"
              letter-spacing="2">${escapeXml(s.name.toUpperCase())}</text>
      `;
      yPos += plainFontSize + 5;
    }

    if (s.description) {
      specialsSvg += `
        <text x="${cx}" y="${yPos}"
              font-family="Inter" font-weight="400" font-size="18" font-style="italic"
              fill="${SPD.textMuted}" text-anchor="middle">${escapeXml(s.description)}</text>
      `;
      yPos += 28;
    }

    // Green divider between specials
    if (i < maxSpecials - 1) {
      yPos += 20;
      specialsSvg += `
        <line x1="380" y1="${yPos}" x2="700" y2="${yPos}"
              stroke="${SPD.shamrock}" stroke-width="1" opacity="0.2"/>
      `;
      yPos += 30;
    }
  }

  const svg = Buffer.from(`
    <svg width="${SIZE}" height="${SIZE}" xmlns="http://www.w3.org/2000/svg">
      ${svgFontStyles()}

      <!-- Gold border frame -->
      <rect x="60" y="60" width="${SIZE - 120}" height="${SIZE - 120}"
            fill="none" stroke="${SPD.gold}" stroke-width="2"/>

      <!-- Corner brackets -->
      ${cornerBracketsSvg(SIZE, 75, 50, 2.5, SPD.cornerDecor, ['tl', 'tr', 'bl', 'br'])}

      <!-- Background shamrocks — larger, more visible -->
      <text x="860" y="220" font-size="100" fill="${SPD.shamrock}" opacity="0.06"
            transform="rotate(15,860,220)">&#9752;</text>
      <text x="170" y="870" font-size="80" fill="${SPD.shamrock}" opacity="0.05"
            transform="rotate(-20,170,870)">&#9752;</text>
      <text x="850" y="850" font-size="60" fill="${SPD.shamrock}" opacity="0.03"
            transform="rotate(30,850,850)">&#9752;</text>

      <!-- Holiday header -->
      <line x1="250" y1="140" x2="420" y2="140" stroke="${SPD.goldRule}" stroke-width="1"/>
      <text x="${cx}" y="146"
            font-family="Inter" font-weight="700" font-size="14"
            fill="${SPD.goldMuted}" text-anchor="middle" letter-spacing="4">
        ST. PATRICK&apos;S DAY 2026
      </text>
      <line x1="660" y1="140" x2="830" y2="140" stroke="${SPD.goldRule}" stroke-width="1"/>

      <!-- Restaurant name -->
      <text x="${cx}" y="260"
            font-family="Inter" font-weight="900" font-size="${slide.restaurant_name.length > 20 ? 38 : 50}"
            fill="${SPD.gold}" text-anchor="middle"
            letter-spacing="1">${escapeXml(slide.restaurant_name.toUpperCase())}</text>

      <!-- Shamrock divider under name -->
      <line x1="280" y1="310" x2="460" y2="310" stroke="${SPD.goldRule}" stroke-width="1"/>
      <text x="${cx}" y="316" font-family="Inter" font-size="14" fill="${SPD.shamrock}" text-anchor="middle">&#9752;</text>
      <line x1="620" y1="310" x2="800" y2="310" stroke="${SPD.goldRule}" stroke-width="1"/>

      <!-- Specials (vertically centered) -->
      ${specialsSvg}

      <!-- Bottom shamrock divider -->
      <line x1="280" y1="920" x2="460" y2="920" stroke="${SPD.goldRule}" stroke-width="1"/>
      <text x="${cx}" y="926" font-family="Inter" font-size="14" fill="${SPD.shamrock}" text-anchor="middle">&#9752;</text>
      <line x1="620" y1="920" x2="800" y2="920" stroke="${SPD.goldRule}" stroke-width="1"/>

      <!-- Brand footer -->
      <text x="${cx}" y="975"
            font-family="Inter" font-weight="600" font-size="14"
            fill="${SPD.goldMuted}" text-anchor="middle" letter-spacing="3">
        ${escapeXml(appName.toUpperCase())}  &#183;  ${escapeXml(dateLabel.toUpperCase())}
      </text>
    </svg>`);

  // Dark green-tinted overlay so text stays readable over the restaurant photo
  const greenOverlay = Buffer.from(`
    <svg width="${SIZE}" height="${SIZE}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="cardOverlay" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" style="stop-color:#0A1A0A;stop-opacity:0.82"/>
          <stop offset="40%" style="stop-color:#0A1A0A;stop-opacity:0.72"/>
          <stop offset="70%" style="stop-color:#0A1A0A;stop-opacity:0.72"/>
          <stop offset="100%" style="stop-color:#0A1A0A;stop-opacity:0.85"/>
        </linearGradient>
      </defs>
      <rect width="${SIZE}" height="${SIZE}" fill="url(#cardOverlay)"/>
    </svg>`);

  return base
    .jpeg({ quality: JPEG_QUALITY })
    .toBuffer()
    .then(buf => sharp(buf)
      .composite([
        { input: greenOverlay, top: 0, left: 0 },
        { input: svg, top: 0, left: 0 },
      ])
      .jpeg({ quality: JPEG_QUALITY })
      .toBuffer()
    );
}

async function composePosterCTA(
  appName: string,
  remainingCount: number,
  holidayLabel: string,
  logoBuffer: Buffer
): Promise<Buffer> {
  const base = sharp({ create: { width: SIZE, height: SIZE, channels: 3, background: hexToRgb(SPD.bgDark) } });
  const cx = SIZE / 2;

  const resizedLogo = await sharp(logoBuffer).resize(180, 180, { fit: 'cover' }).png().toBuffer();

  const moreText = 'More deals on the app';

  const svg = Buffer.from(`
    <svg width="${SIZE}" height="${SIZE}" xmlns="http://www.w3.org/2000/svg">
      ${svgFontStyles()}

      <!-- Gold border frame -->
      <rect x="40" y="40" width="${SIZE - 80}" height="${SIZE - 80}"
            fill="none" stroke="${SPD.gold}" stroke-width="2"/>

      <!-- Corner brackets -->
      ${cornerBracketsSvg(SIZE, 55, 60, 3, SPD.cornerDecor, ['tl', 'tr', 'bl', 'br'])}

      <!-- Background shamrocks -->
      <text x="200" y="300" font-size="140" fill="${SPD.shamrock}" opacity="0.04"
            transform="rotate(-10,200,300)">&#9752;</text>
      <text x="800" y="700" font-size="100" fill="${SPD.shamrock}" opacity="0.03"
            transform="rotate(20,800,700)">&#9752;</text>

      <!-- More bars text -->
      <text x="${cx}" y="550"
            font-family="Inter" font-weight="700" font-size="36"
            fill="${SPD.textPrimary}" text-anchor="middle">
        ${escapeXml(moreText)}
      </text>

      <!-- Shamrock divider -->
      <line x1="300" y1="590" x2="470" y2="590" stroke="${SPD.goldRule}" stroke-width="1"/>
      <text x="${cx}" y="596" font-family="Inter" font-size="14" fill="${SPD.goldMuted}" text-anchor="middle">&#9752;</text>
      <line x1="610" y1="590" x2="780" y2="590" stroke="${SPD.goldRule}" stroke-width="1"/>

      <!-- CTA text -->
      <text x="${cx}" y="660"
            font-family="Inter" font-weight="400" font-size="24" font-style="italic"
            fill="${SPD.shamrock}" text-anchor="middle">
        Open ${escapeXml(appName)} &#x2192; ${escapeXml(holidayLabel)} tab
      </text>

      <!-- Download text -->
      <text x="${cx}" y="720"
            font-family="Inter" font-weight="400" font-size="18"
            fill="rgba(255,255,255,0.4)" text-anchor="middle">
        Free on the App Store &amp; Google Play
      </text>

      <!-- Gold CTA button -->
      <rect x="${cx - 130}" y="770" width="260" height="54" rx="27" ry="27"
            fill="${SPD.gold}"/>
      <text x="${cx}" y="804"
            font-family="Inter" font-weight="700" font-size="22"
            fill="#0D1F0D" text-anchor="middle" letter-spacing="2">
        LINK IN BIO
      </text>

      <!-- Holiday label at bottom -->
      <text x="${cx}" y="${SIZE - 80}"
            font-family="Inter" font-weight="600" font-size="14"
            fill="${SPD.goldMuted}" text-anchor="middle" letter-spacing="4">
        &#9752; ${escapeXml(holidayLabel.toUpperCase())} 2026 &#9752;
      </text>
    </svg>`);

  const logoLeft = Math.round((SIZE - 180) / 2);

  return base
    .jpeg({ quality: JPEG_QUALITY })
    .toBuffer()
    .then(buf => sharp(buf)
      .composite([
        { input: resizedLogo, top: 230, left: logoLeft },
        { input: svg, top: 0, left: 0 },
      ])
      .jpeg({ quality: JPEG_QUALITY })
      .toBuffer()
    );
}

// ============================================================
// Main entry point
// ============================================================

export async function generateCarouselSlides(opts: {
  supabase: SupabaseClient;
  market: MarketConfig;
  candidates: SlideCandidate[];
  headline: HeadlineParts;
  totalCount: number;
  date: string;
  contentType?: string;
}): Promise<string[]> {
  const { supabase, market, candidates, headline, totalCount, date, contentType } = opts;
  const appName = getAppName(market.market_slug);
  const marketName = getMarketDisplayName(market.market_slug);

  // Load logo from local filesystem
  let logoBuffer: Buffer;
  try {
    logoBuffer = loadLogoBuffer(market.market_slug);
  } catch {
    logoBuffer = await sharp({ create: { width: 200, height: 200, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } }).png().toBuffer();
  }

  // Fetch all source images in parallel — skip stock images but keep all candidates
  const STOCK_PREFIXES = ['https://tastelanc.com/images/events/', 'https://tastelanc.com/images/entertainment/', 'https://tastecumberland.com/images/events/'];
  const imageBuffers = await Promise.all(
    candidates.map(async (c) => {
      // Try primary image first, then cover_image_url as fallback
      const urls = [c.image_url, c.cover_image_url].filter(Boolean) as string[];
      for (const url of urls) {
        if (STOCK_PREFIXES.some(p => url.startsWith(p))) continue;
        try {
          return await fetchImageBuffer(url);
        } catch {
          continue;
        }
      }
      return null;
    })
  );

  // ONLY use candidates that have images — never post black background slides
  const validIndices = imageBuffers.map((b, i) => b !== null ? i : -1).filter(i => i !== -1);
  const validBuffers = validIndices.map(i => imageBuffers[i]!);
  const validCandidates = validIndices.map(i => candidates[i]);

  if (validBuffers.length === 0) {
    throw new Error('No candidates with photos — cannot generate carousel. Every slide needs an image.');
  }

  let allSlides: Buffer[];

  if (contentType === 'upcoming_events') {
    allSlides = await composeEventPosterSlides(validBuffers, validCandidates, headline, totalCount, logoBuffer, appName, marketName);
  } else {
    // MAGAZINE style — only candidates with photos get slides
    const coverImage = validBuffers[0];
    // Pass featured candidates for the bottom section of the cover
    const featuredForCover = validCandidates.slice(0, 2).map((c, i) => ({
      name: c.restaurant_name,
      detail: c.detail_text,
      imageBuffer: validBuffers[i],
    }));
    const [coverSlide, ...restaurantSlides] = await Promise.all([
      composeCoverSlide(coverImage, headline, logoBuffer, appName, featuredForCover),
      ...validCandidates.map((c, i) =>
        composeRestaurantSlide(validBuffers[i], c.restaurant_name, c.detail_text, logoBuffer)
      ),
    ]);
    const ctaBackgroundImage = validBuffers[validBuffers.length - 1] || coverImage;
    const ctaSlide = await composeCTASlide(appName, totalCount, logoBuffer, ctaBackgroundImage);
    allSlides = [coverSlide, ...restaurantSlides, ctaSlide];
  }

  // Upload with timestamp path to bust CDN cache
  const timestamp = Date.now();
  const storagePath = `instagram/${market.market_slug}/${date}/${timestamp}`;
  const urls = await Promise.all(
    allSlides.map((buf, i) =>
      uploadSlide(supabase, buf, `${storagePath}/slide-${i}.jpg`)
    )
  );

  return urls;
}

// ============================================================
// Slide composers — Magazine cover aesthetic
// ============================================================

async function composeCoverSlide(
  imageBuffer: Buffer | null,
  headline: HeadlineParts,
  logoBuffer: Buffer,
  appName: string,
  featuredItems: { name: string; detail: string; imageBuffer: Buffer }[] = []
): Promise<Buffer> {
  // FRAMED MAGAZINE COVER — purple border frames the entire image
  // Text in top border, huge masthead over photo, solid bottom container with featured content
  const BORDER = 18; // border width on sides
  const TOP_BAR = 32; // height of text in top border
  const BOTTOM_H = 220; // height of bottom featured section
  const BRAND_COLOR = '#6B21A8'; // purple
  const BRAND_LIGHT = '#A855F7'; // lighter purple for accents

  // Photo area dimensions (inside the frame)
  const photoW = SIZE - BORDER * 2;
  const photoH = SIZE - TOP_BAR - BOTTOM_H;

  // Resize the photo to fit inside the frame
  let photoBuffer: Buffer;
  if (imageBuffer) {
    photoBuffer = await sharp(imageBuffer)
      .resize(photoW, photoH, { fit: 'cover', position: 'centre' })
      .modulate({ brightness: 1.05, saturation: 1.1 })
      .jpeg({ quality: JPEG_QUALITY })
      .toBuffer();
  } else {
    photoBuffer = await sharp({ create: { width: photoW, height: photoH, channels: 3, background: { r: 30, g: 25, b: 35 } } })
      .jpeg({ quality: JPEG_QUALITY })
      .toBuffer();
  }

  // Build featured images for bottom section (resize to thumbnails)
  const featuredThumbs: Buffer[] = [];
  for (const item of featuredItems.slice(0, 2)) {
    const thumb = await sharp(item.imageBuffer)
      .resize(160, 120, { fit: 'cover', position: 'centre' })
      .jpeg({ quality: 85 })
      .toBuffer();
    featuredThumbs.push(thumb);
  }

  // Start with the purple background (the border color)
  let base = sharp({ create: { width: SIZE, height: SIZE, channels: 3, background: hexToRgb(BRAND_COLOR) } });

  // Photo overlay — light gradient for text legibility
  const photoOverlay = Buffer.from(`
    <svg width="${photoW}" height="${photoH}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="pho" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" style="stop-color:black;stop-opacity:0.5"/>
          <stop offset="15%" style="stop-color:black;stop-opacity:0.15"/>
          <stop offset="40%" style="stop-color:black;stop-opacity:0.05"/>
          <stop offset="65%" style="stop-color:black;stop-opacity:0.2"/>
          <stop offset="85%" style="stop-color:black;stop-opacity:0.55"/>
          <stop offset="100%" style="stop-color:black;stop-opacity:0.7"/>
        </linearGradient>
      </defs>
      <rect width="${photoW}" height="${photoH}" fill="url(#pho)"/>
    </svg>`);

  const cx = SIZE / 2;
  const pcx = photoW / 2;
  const editorialHeadline = getEditorialHeadline(headline);

  // Issue date
  const now = new Date();
  const issueDate = now.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

  // Text overlay on the PHOTO area
  const photoTextSvg = Buffer.from(`
    <svg width="${photoW}" height="${photoH}" xmlns="http://www.w3.org/2000/svg">
      ${svgFontStyles()}

      <!-- "Taste" — TOP LEFT, huge -->
      <text x="22" y="88"
            font-family="${SERIF}" font-weight="900" font-size="120"
            fill="rgba(0,0,0,0.45)" text-anchor="start">Taste</text>
      <text x="20" y="86"
            font-family="${SERIF}" font-weight="900" font-size="120"
            fill="white" text-anchor="start">Taste</text>

      <!-- "Lanc" — underneath Taste, left-aligned, smaller -->
      <text x="27" y="128"
            font-family="${SERIF}" font-weight="700" font-size="38"
            fill="rgba(0,0,0,0.4)" text-anchor="start" letter-spacing="10">Lanc</text>
      <text x="25" y="126"
            font-family="${SERIF}" font-weight="700" font-size="38"
            fill="white" text-anchor="start" letter-spacing="10">Lanc</text>

      <!-- Date — TOP RIGHT only -->
      <text x="${photoW - 15}" y="30"
            font-family="${SERIF}" font-weight="600" font-size="16"
            fill="rgba(255,255,255,0.85)" text-anchor="end">${escapeXml(issueDate)}</text>

      <!-- ═══ EDITORIAL COVER LINES ═══ -->
      <text x="32" y="${photoH - 190}"
            font-family="${SERIF}" font-weight="700" font-size="64" font-style="italic"
            fill="rgba(0,0,0,0.5)" text-anchor="start">${escapeXml(editorialHeadline.line1)}</text>
      <text x="30" y="${photoH - 192}"
            font-family="${SERIF}" font-weight="700" font-size="64" font-style="italic"
            fill="white" text-anchor="start">${escapeXml(editorialHeadline.line1)}</text>

      <text x="32" y="${photoH - 124}"
            font-family="${SERIF}" font-weight="700" font-size="64" font-style="italic"
            fill="rgba(0,0,0,0.5)" text-anchor="start">${escapeXml(editorialHeadline.line2)}</text>
      <text x="30" y="${photoH - 126}"
            font-family="${SERIF}" font-weight="700" font-size="64" font-style="italic"
            fill="white" text-anchor="start">${escapeXml(editorialHeadline.line2)}</text>

      <!-- Bullet teasers — what's in this issue -->
      <text x="42" y="${photoH - 68}"
            font-family="${SERIF}" font-weight="600" font-size="19"
            fill="rgba(0,0,0,0.5)" text-anchor="start">&#x2022; ${escapeXml(headline.count)}+ ${escapeXml(headline.label)} This Week</text>
      <text x="40" y="${photoH - 70}"
            font-family="${SERIF}" font-weight="600" font-size="19"
            fill="white" text-anchor="start">&#x2022; ${escapeXml(headline.count)}+ ${escapeXml(headline.label)} This Week</text>

      <text x="42" y="${photoH - 43}"
            font-family="${SERIF}" font-weight="600" font-size="19"
            fill="rgba(0,0,0,0.5)" text-anchor="start">&#x2022; Live Music, Trivia &amp; Events</text>
      <text x="40" y="${photoH - 45}"
            font-family="${SERIF}" font-weight="600" font-size="19"
            fill="white" text-anchor="start">&#x2022; Live Music, Trivia &amp; Events</text>

      <text x="42" y="${photoH - 18}"
            font-family="${SERIF}" font-weight="600" font-size="19"
            fill="rgba(0,0,0,0.5)" text-anchor="start">&#x2022; Exclusive Deals &amp; Specials</text>
      <text x="40" y="${photoH - 20}"
            font-family="${SERIF}" font-weight="600" font-size="19"
            fill="white" text-anchor="start">&#x2022; Exclusive Deals &amp; Specials</text>
    </svg>`);

  // Compose the photo with overlay and text
  const composedPhoto = await sharp(photoBuffer)
    .composite([
      { input: photoOverlay, top: 0, left: 0 },
      { input: photoTextSvg, top: 0, left: 0 },
    ])
    .jpeg({ quality: JPEG_QUALITY })
    .toBuffer();

  // Top border text — tagline fits inside the border strip
  const tagline = 'LANCASTER&apos;S MOST COMPLETE GUIDE TO DINING, DRINKS &amp; NIGHTLIFE';
  const topBarSvg = Buffer.from(`
    <svg width="${SIZE}" height="${TOP_BAR}" xmlns="http://www.w3.org/2000/svg">
      ${svgFontStyles()}
      <text x="${cx}" y="${TOP_BAR - 8}"
            font-family="${SANS}" font-weight="600" font-size="11"
            fill="white" text-anchor="middle" letter-spacing="2">${tagline}</text>
    </svg>`);

  // Bottom section — bigger thumbnails, vertical separator only, taller list
  const feat1 = featuredItems[0];
  const feat2 = featuredItems[1];

  // Thumbnail layout — maximize space, no horizontal lines
  const THUMB_W = 210;
  const THUMB_H = 140;
  const THUMB_PAD = 15;
  const THUMB_Y = 30; // start right after "inside your" header
  const THUMB1_X = BORDER + THUMB_PAD;
  const THUMB2_X = THUMB1_X + THUMB_W + THUMB_PAD;
  const LIST_X = THUMB2_X + THUMB_W + THUMB_PAD + 15;

  const bottomSvg = Buffer.from(`
    <svg width="${SIZE}" height="${BOTTOM_H}" xmlns="http://www.w3.org/2000/svg">
      ${svgFontStyles()}

      <!-- "inside your TasteLanc" header — Playfair Display -->
      <text x="${cx}" y="20"
            font-family="${SERIF}" font-weight="700" font-size="16" font-style="italic"
            fill="white" text-anchor="middle" letter-spacing="3">inside your ${escapeXml(appName)}</text>

      <!-- NO horizontal line — thumbnails start immediately -->

      <!-- Featured 1 label — below its thumbnail -->
      ${feat1 ? `
      <text x="${THUMB1_X}" y="${THUMB_Y + THUMB_H + 18}"
            font-family="${SERIF}" font-weight="700" font-size="14"
            fill="white" text-anchor="start">${escapeXml(feat1.name)}</text>
      <text x="${THUMB1_X}" y="${THUMB_Y + THUMB_H + 35}"
            font-family="${SERIF}" font-weight="400" font-size="12" font-style="italic"
            fill="rgba(255,255,255,0.6)" text-anchor="start">${escapeXml(feat1.detail)}</text>
      ` : ''}

      <!-- Featured 2 label -->
      ${feat2 ? `
      <text x="${THUMB2_X}" y="${THUMB_Y + THUMB_H + 18}"
            font-family="${SERIF}" font-weight="700" font-size="14"
            fill="white" text-anchor="start">${escapeXml(feat2.name)}</text>
      <text x="${THUMB2_X}" y="${THUMB_Y + THUMB_H + 35}"
            font-family="${SERIF}" font-weight="400" font-size="12" font-style="italic"
            fill="rgba(255,255,255,0.6)" text-anchor="start">${escapeXml(feat2.detail)}</text>
      ` : ''}

      <!-- VERTICAL separator only — between images and list -->
      <rect x="${LIST_X - 12}" y="${THUMB_Y}" width="1" height="${BOTTOM_H - THUMB_Y - 15}" fill="rgba(255,255,255,0.2)"/>

      <!-- Right side list — TALL, fills the space, Playfair Display -->
      <text x="${LIST_X}" y="${THUMB_Y + 14}"
            font-family="${SERIF}" font-weight="700" font-size="15"
            fill="${BRAND_LIGHT}" text-anchor="start">Also This Week</text>

      <text x="${LIST_X + 5}" y="${THUMB_Y + 40}"
            font-family="${SERIF}" font-weight="400" font-size="14"
            fill="rgba(255,255,255,0.75)" text-anchor="start">&#x2022; Happy Hours &amp; Deals</text>
      <text x="${LIST_X + 5}" y="${THUMB_Y + 62}"
            font-family="${SERIF}" font-weight="400" font-size="14"
            fill="rgba(255,255,255,0.75)" text-anchor="start">&#x2022; Live Music Lineups</text>
      <text x="${LIST_X + 5}" y="${THUMB_Y + 84}"
            font-family="${SERIF}" font-weight="400" font-size="14"
            fill="rgba(255,255,255,0.75)" text-anchor="start">&#x2022; Trivia &amp; Game Nights</text>
      <text x="${LIST_X + 5}" y="${THUMB_Y + 106}"
            font-family="${SERIF}" font-weight="400" font-size="14"
            fill="rgba(255,255,255,0.75)" text-anchor="start">&#x2022; Weekend Events</text>
      <text x="${LIST_X + 5}" y="${THUMB_Y + 128}"
            font-family="${SERIF}" font-weight="400" font-size="14"
            fill="rgba(255,255,255,0.75)" text-anchor="start">&#x2022; Exclusive Deals</text>
      <text x="${LIST_X + 5}" y="${THUMB_Y + 150}"
            font-family="${SERIF}" font-weight="400" font-size="14"
            fill="rgba(255,255,255,0.75)" text-anchor="start">&#x2022; Restaurant Spotlights</text>
      <text x="${LIST_X + 5}" y="${THUMB_Y + 172}"
            font-family="${SERIF}" font-weight="400" font-size="14"
            fill="rgba(255,255,255,0.75)" text-anchor="start">&#x2022; New on ${escapeXml(appName)}</text>
    </svg>`);

  // Resize featured thumbnails — bigger and wider
  const thumbs: Buffer[] = [];
  for (const tb of featuredThumbs.slice(0, 2)) {
    thumbs.push(await sharp(tb).resize(THUMB_W, THUMB_H, { fit: 'cover', position: 'centre' }).jpeg({ quality: 88 }).toBuffer());
  }

  // Build composites
  const composites: sharp.OverlayOptions[] = [
    { input: topBarSvg, top: 0, left: 0 },
    { input: composedPhoto, top: TOP_BAR, left: BORDER },
    { input: bottomSvg, top: SIZE - BOTTOM_H, left: 0 },
  ];

  if (thumbs[0]) {
    composites.push({ input: thumbs[0], top: SIZE - BOTTOM_H + THUMB_Y, left: THUMB1_X });
  }
  if (thumbs[1]) {
    composites.push({ input: thumbs[1], top: SIZE - BOTTOM_H + THUMB_Y, left: THUMB2_X });
  }

  return base
    .jpeg({ quality: JPEG_QUALITY })
    .toBuffer()
    .then(buf => sharp(buf)
      .composite(composites)
      .jpeg({ quality: JPEG_QUALITY })
      .toBuffer()
    );
}

// Generate editorial-style headlines instead of plain "15 HAPPY HOURS"
function getEditorialHeadline(headline: HeadlineParts): { line1: string; line2: string } {
  const label = headline.label.toLowerCase();
  const count = headline.count;

  if (label.includes('happy hour')) {
    return { line1: 'Where', line2: `${count} Bars Pour` };
  }
  if (label.includes('deal')) {
    return { line1: `${count} Deals`, line2: 'Worth the Trip' };
  }
  if (label.includes('special')) {
    return { line1: "Tonight's", line2: 'Best Bites' };
  }
  if (label.includes('event') || label.includes('concert') || label.includes('music')) {
    return { line1: `${count} Stages`, line2: 'Lit Tonight' };
  }
  if (label.includes('brunch')) {
    return { line1: 'Weekend', line2: 'Brunch Guide' };
  }
  if (label.includes('roundup') || label.includes('week')) {
    return { line1: 'Your Week', line2: 'Starts Here' };
  }
  // Fallback — still editorial
  return { line1: `${count} Spots`, line2: 'You Need' };
}

async function composeRestaurantSlide(
  imageBuffer: Buffer | null,
  name: string,
  detail: string,
  logoBuffer: Buffer
): Promise<Buffer> {
  // Editorial restaurant card — full-bleed photo with bold typographic treatment
  // Inspired by Barfly's dense, information-rich layout
  const base = imageBuffer
    ? sharp(imageBuffer).resize(SIZE, SIZE, { fit: 'cover', position: 'centre' })
    : sharp({ create: { width: SIZE, height: SIZE, channels: 3, background: { r: 15, g: 12, b: 20 } } });

  // Cinematic bottom gradient — heavier for text legibility
  const gradientSvg = Buffer.from(`
    <svg width="${SIZE}" height="${SIZE}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="grad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" style="stop-color:black;stop-opacity:0.08"/>
          <stop offset="35%" style="stop-color:black;stop-opacity:0.05"/>
          <stop offset="55%" style="stop-color:black;stop-opacity:0.25"/>
          <stop offset="75%" style="stop-color:black;stop-opacity:0.78"/>
          <stop offset="100%" style="stop-color:black;stop-opacity:0.95"/>
        </linearGradient>
      </defs>
      <rect width="${SIZE}" height="${SIZE}" fill="url(#grad)"/>
    </svg>`);

  // Convert any 24h times in detail text to 12h format (e.g. "15:00" → "3pm")
  detail = detail.replace(/\b(\d{1,2}):(\d{2})\b/g, (_, h, m) => {
    const hour = parseInt(h, 10);
    const ampm = hour >= 12 ? 'pm' : 'am';
    const h12 = hour % 12 || 12;
    return m === '00' ? `${h12}${ampm}` : `${h12}:${m}${ampm}`;
  });

  // Parse the detail text to extract price/deal info for visual callouts
  const priceMatch = detail.match(/\$\d+(?:\.\d{2})?/);
  const hasPrice = !!priceMatch;

  // Wrap restaurant name for long names
  const nameLines = wrapText(name, 18);
  const nameStartY = SIZE - 190 - (nameLines.length - 1) * 58;
  const nameSvgParts = nameLines.map((line, i) =>
    `<text x="70" y="${nameStartY + i * 58}"
           font-family="${SERIF}" font-weight="700" font-size="52"
           fill="white" text-anchor="start">
       ${escapeXml(line)}
     </text>`
  ).join('\n');

  const detailY = nameStartY + nameLines.length * 58 + 8;

  const textSvg = Buffer.from(`
    <svg width="${SIZE}" height="${SIZE}" xmlns="http://www.w3.org/2000/svg">
      ${svgFontStyles()}

      <!-- Corner brackets — editorial framing -->
      ${cornerBracketsSvg(SIZE, 24, 60, 2, `${ACCENT}`, ['tl', 'br'])}

      <!-- Section badge — top left, what kind of content this is -->
      <rect x="24" y="24" width="120" height="30" fill="${ACCENT}"/>
      <text x="84" y="44"
            font-family="${SANS}" font-weight="700" font-size="12"
            fill="#111111" text-anchor="middle"
            letter-spacing="3">FEATURED</text>

      <!-- Vertical accent bar beside restaurant name -->
      <rect x="52" y="${nameStartY - 10}" width="3" height="${nameLines.length * 58 + 30}" fill="${ACCENT}" opacity="0.7"/>

      <!-- Restaurant name — serif, editorial -->
      ${nameSvgParts}

      <!-- Detail text with gold accent -->
      <rect x="70" y="${detailY - 2}" width="${SIZE - 140}" height="1" fill="${ACCENT}" opacity="0.3"/>
      <text x="70" y="${detailY + 28}"
            font-family="${SERIF}" font-weight="400" font-size="26" font-style="italic"
            fill="${ACCENT}" text-anchor="start">
        ${escapeXml(detail)}
      </text>

      ${hasPrice ? `
      <!-- Price callout — bold accent block -->
      <rect x="${SIZE - 200}" y="${nameStartY - 50}" width="160" height="50" fill="${ACCENT}"/>
      <text x="${SIZE - 120}" y="${nameStartY - 18}"
            font-family="${SANS}" font-weight="700" font-size="28"
            fill="#111111" text-anchor="middle">
        ${escapeXml(priceMatch![0])}
      </text>
      ` : ''}

      <!-- Bottom rule -->
      <rect x="50" y="${SIZE - 50}" width="${SIZE - 100}" height="1" fill="${ACCENT}" opacity="0.25"/>
    </svg>`);

  // App icon top-right
  const smallLogo = await sharp(logoBuffer)
    .resize(44, 44, { fit: 'cover' })
    .png()
    .toBuffer();

  return base
    .jpeg({ quality: JPEG_QUALITY })
    .toBuffer()
    .then(buf => sharp(buf)
      .composite([
        { input: gradientSvg, top: 0, left: 0 },
        { input: smallLogo, top: 30, left: SIZE - 80 },
        { input: textSvg, top: 0, left: 0 },
      ])
      .jpeg({ quality: JPEG_QUALITY })
      .toBuffer()
    );
}

async function composeCTASlide(
  appName: string,
  totalCount: number,
  logoBuffer: Buffer,
  backgroundImage: Buffer | null = null
): Promise<Buffer> {
  // Editorial CTA slide — magazine back-page feel with urgency and feature teasers
  let base: sharp.Sharp;
  if (backgroundImage) {
    const blurred = await sharp(backgroundImage)
      .resize(SIZE, SIZE, { fit: 'cover', position: 'centre' })
      .blur(25)
      .modulate({ brightness: 0.18 })
      .toBuffer();
    base = sharp(blurred);
  } else {
    base = sharp({
      create: { width: SIZE, height: SIZE, channels: 3, background: { r: 12, g: 10, b: 16 } }
    });
  }

  const resizedLogo = await sharp(logoBuffer)
    .resize(140, 140, { fit: 'cover' })
    .png()
    .toBuffer();

  const logoLeft = Math.round((SIZE - 140) / 2);
  const cx = SIZE / 2;

  const textSvg = Buffer.from(`
    <svg width="${SIZE}" height="${SIZE}" xmlns="http://www.w3.org/2000/svg">
      ${svgFontStyles()}

      <!-- Full editorial border frame -->
      <rect x="40" y="40" width="${SIZE - 80}" height="${SIZE - 80}"
            fill="none" stroke="${ACCENT}" stroke-width="1.5" opacity="0.35"/>

      <!-- Corner brackets -->
      ${cornerBracketsSvg(SIZE, 35, 70, 3, ACCENT, ['tl', 'tr', 'bl', 'br'])}

      <!-- Masthead echo — small app name at top -->
      <text x="${cx}" y="90"
            font-family="${SANS}" font-weight="700" font-size="14"
            fill="${ACCENT}" text-anchor="middle"
            letter-spacing="6">
        ${escapeXml(appName.toUpperCase())}
      </text>
      <rect x="${cx - 60}" y="102" width="120" height="1" fill="${ACCENT}" opacity="0.4"/>

      <!-- Big serif headline — editorial urgency -->
      <text x="${cx}" y="430"
            font-family="${SERIF}" font-weight="700" font-size="62"
            fill="white" text-anchor="middle">
        Don&apos;t Miss
      </text>
      <text x="${cx}" y="510"
            font-family="${SERIF}" font-weight="700" font-size="62"
            fill="white" text-anchor="middle">
        What&apos;s Next
      </text>

      <!-- Gold rule -->
      <rect x="${cx - 40}" y="540" width="80" height="3" fill="${ACCENT}"/>

      <!-- Count + description -->
      <text x="${cx}" y="595"
            font-family="${SERIF}" font-weight="400" font-size="26" font-style="italic"
            fill="rgba(255,255,255,0.75)" text-anchor="middle">
        ${totalCount}+ places waiting for you on ${escapeXml(appName)}
      </text>

      <!-- Feature teasers — what else is in the app -->
      <rect x="120" y="650" width="${SIZE - 240}" height="1" fill="${ACCENT}" opacity="0.2"/>

      <text x="${cx}" y="690"
            font-family="${SANS}" font-weight="400" font-size="16"
            fill="rgba(255,255,255,0.5)" text-anchor="middle"
            letter-spacing="1">
        PLUS: Happy Hours &#183; Live Music &#183; Exclusive Deals &#183; Events
      </text>

      <rect x="120" y="710" width="${SIZE - 240}" height="1" fill="${ACCENT}" opacity="0.2"/>

      <!-- Download text -->
      <text x="${cx}" y="760"
            font-family="${SANS}" font-weight="400" font-size="18"
            fill="rgba(255,255,255,0.45)" text-anchor="middle">
        Free on the App Store &amp; Google Play
      </text>

      <!-- CTA button — gold, editorial -->
      <rect x="${cx - 150}" y="800" width="300" height="56" rx="4" ry="4"
            fill="${ACCENT}"/>
      <text x="${cx}" y="836"
            font-family="${SANS}" font-weight="700" font-size="20"
            fill="#111111" text-anchor="middle"
            letter-spacing="3">
        LINK IN BIO
      </text>

      <!-- Bottom tagline -->
      <text x="${cx}" y="${SIZE - 60}"
            font-family="${SERIF}" font-weight="400" font-size="16" font-style="italic"
            fill="rgba(255,255,255,0.3)" text-anchor="middle">
        Your city. Your guide. Your next favorite spot.
      </text>
    </svg>`);

  const darkOverlay = Buffer.from(`
    <svg width="${SIZE}" height="${SIZE}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${SIZE}" height="${SIZE}" fill="rgba(0,0,0,0.6)"/>
      <rect width="${SIZE}" height="${SIZE}" fill="${ACCENT}" opacity="0.03"/>
    </svg>`);

  return base
    .jpeg({ quality: JPEG_QUALITY })
    .toBuffer()
    .then(buf => sharp(buf)
      .composite([
        { input: darkOverlay, top: 0, left: 0 },
        { input: resizedLogo, top: 180, left: logoLeft },
        { input: textSvg, top: 0, left: 0 },
      ])
      .jpeg({ quality: JPEG_QUALITY })
      .toBuffer()
    );
}

// ============================================================
// EVENT POSTER STYLE — Bold Blocks
// Geometric shapes, corner brackets, text over colored blocks
// Completely different from the magazine cover aesthetic
// ============================================================

// Corner bracket helper — draws L-shaped frame corners
function cornerBracketsSvg(
  size: number,
  inset: number,
  length: number,
  thickness: number,
  color: string,
  corners: ('tl' | 'tr' | 'bl' | 'br')[] = ['tl', 'br']
): string {
  const parts: string[] = [];
  for (const c of corners) {
    switch (c) {
      case 'tl':
        parts.push(`<rect x="${inset}" y="${inset}" width="${length}" height="${thickness}" fill="${color}"/>`);
        parts.push(`<rect x="${inset}" y="${inset}" width="${thickness}" height="${length}" fill="${color}"/>`);
        break;
      case 'tr':
        parts.push(`<rect x="${size - inset - length}" y="${inset}" width="${length}" height="${thickness}" fill="${color}"/>`);
        parts.push(`<rect x="${size - inset - thickness}" y="${inset}" width="${thickness}" height="${length}" fill="${color}"/>`);
        break;
      case 'bl':
        parts.push(`<rect x="${inset}" y="${size - inset - thickness}" width="${length}" height="${thickness}" fill="${color}"/>`);
        parts.push(`<rect x="${inset}" y="${size - inset - length}" width="${thickness}" height="${length}" fill="${color}"/>`);
        break;
      case 'br':
        parts.push(`<rect x="${size - inset - length}" y="${size - inset - thickness}" width="${length}" height="${thickness}" fill="${color}"/>`);
        parts.push(`<rect x="${size - inset - thickness}" y="${size - inset - length}" width="${thickness}" height="${length}" fill="${color}"/>`);
        break;
    }
  }
  return parts.join('\n');
}

async function composeEventPosterSlides(
  imageBuffers: Buffer[],
  candidates: SlideCandidate[],
  headline: HeadlineParts,
  totalCount: number,
  logoBuffer: Buffer,
  appName: string,
  marketName: string
): Promise<Buffer[]> {
  const coverImage = imageBuffers[0] || null;

  const [coverSlide, ...eventSlides] = await Promise.all([
    composeEventCover(coverImage, headline, logoBuffer, appName, marketName),
    ...candidates.map((c, i) =>
      composeEventSlide(imageBuffers[i], c.restaurant_name, c.detail_text, logoBuffer, i + 1, candidates.length)
    ),
  ]);

  const ctaBg = imageBuffers[imageBuffers.length - 1] || imageBuffers[0] || null;
  const ctaSlide = await composeEventCTA(appName, totalCount, logoBuffer, ctaBg);

  return [coverSlide, ...eventSlides, ctaSlide];
}

async function composeEventCover(
  imageBuffer: Buffer | null,
  headline: HeadlineParts,
  logoBuffer: Buffer,
  appName: string,
  marketName: string
): Promise<Buffer> {
  // Editorial event cover — Barfly-inspired with serif headlines and bold blocks
  let base: sharp.Sharp;
  if (imageBuffer) {
    base = sharp(imageBuffer).resize(SIZE, SIZE, { fit: 'cover', position: 'centre' });
  } else {
    base = sharp({ create: { width: SIZE, height: SIZE, channels: 3, background: { r: 15, g: 12, b: 20 } } });
  }

  const overlaySvg = Buffer.from(`
    <svg width="${SIZE}" height="${SIZE}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="evtCov" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" style="stop-color:black;stop-opacity:0.82"/>
          <stop offset="25%" style="stop-color:black;stop-opacity:0.5"/>
          <stop offset="55%" style="stop-color:black;stop-opacity:0.35"/>
          <stop offset="80%" style="stop-color:black;stop-opacity:0.7"/>
          <stop offset="100%" style="stop-color:black;stop-opacity:0.92"/>
        </linearGradient>
      </defs>
      <rect width="${SIZE}" height="${SIZE}" fill="url(#evtCov)"/>
      <rect width="${SIZE}" height="${SIZE}" fill="${ACCENT}" opacity="0.03"/>
    </svg>`);

  const cx = SIZE / 2;

  const textSvg = Buffer.from(`
    <svg width="${SIZE}" height="${SIZE}" xmlns="http://www.w3.org/2000/svg">
      ${svgFontStyles()}

      <!-- Corner brackets — all four -->
      ${cornerBracketsSvg(SIZE, 28, 80, 3, ACCENT, ['tl', 'tr', 'bl', 'br'])}

      <!-- Top rule -->
      <rect x="50" y="45" width="${SIZE - 100}" height="1" fill="${ACCENT}" opacity="0.5"/>

      <!-- Gold block — "THIS WEEK" label -->
      <rect x="60" y="140" width="230" height="42" fill="${ACCENT}"/>
      <text x="175" y="168"
            font-family="${SANS}" font-weight="700" font-size="18"
            fill="#111111" text-anchor="middle"
            letter-spacing="5">
        THIS WEEK
      </text>

      <!-- Big serif headline — "Live Events" -->
      <rect x="52" y="220" width="3" height="160" fill="${ACCENT}" opacity="0.6"/>

      <text x="70" y="285"
            font-family="${SERIF}" font-weight="700" font-size="80"
            fill="white" text-anchor="start">
        Live
      </text>
      <text x="70" y="380"
            font-family="${SERIF}" font-weight="700" font-size="80"
            fill="white" text-anchor="start">
        ${escapeXml(headline.label)}
      </text>

      <!-- Market name — italic serif -->
      <text x="70" y="430"
            font-family="${SERIF}" font-weight="400" font-size="26" font-style="italic"
            fill="${ACCENT_DIM}" text-anchor="start">
        in ${escapeXml(marketName)}
      </text>

      <!-- Count block — right-aligned -->
      <rect x="${SIZE - 220}" y="480" width="170" height="110" fill="rgba(0,0,0,0.8)"/>
      <rect x="${SIZE - 220}" y="480" width="170" height="4" fill="${ACCENT}"/>
      <text x="${SIZE - 135}" y="535"
            font-family="${SANS}" font-weight="700" font-size="48"
            fill="white" text-anchor="middle">
        ${escapeXml(String(headline.count))}
      </text>
      <text x="${SIZE - 135}" y="575"
            font-family="${SANS}" font-weight="700" font-size="14"
            fill="${ACCENT}" text-anchor="middle"
            letter-spacing="3">
        THIS WEEK
      </text>

      <!-- ═══ Bottom ═══ -->
      <rect x="50" y="${SIZE - 145}" width="${SIZE - 100}" height="1" fill="${ACCENT}" opacity="0.35"/>

      <!-- App name — left -->
      <rect x="60" y="${SIZE - 110}" width="200" height="36" rx="4" fill="rgba(0,0,0,0.6)"/>
      <rect x="60" y="${SIZE - 110}" width="200" height="36" rx="4" fill="none" stroke="${ACCENT}" stroke-width="1" opacity="0.3"/>
      <text x="160" y="${SIZE - 86}"
            font-family="${SANS}" font-weight="700" font-size="14"
            fill="${ACCENT}" text-anchor="middle"
            letter-spacing="3">
        ${escapeXml(appName.toUpperCase())}
      </text>

      <!-- Swipe CTA — right -->
      <text x="${SIZE - 55}" y="${SIZE - 55}"
            font-family="${SANS}" font-weight="400" font-size="16"
            fill="rgba(255,255,255,0.45)" text-anchor="end"
            letter-spacing="4">
        SWIPE  &#x276F;
      </text>
    </svg>`);

  const resizedLogo = await sharp(logoBuffer)
    .resize(50, 50, { fit: 'cover' })
    .png()
    .toBuffer();

  return base
    .jpeg({ quality: JPEG_QUALITY })
    .toBuffer()
    .then(buf => sharp(buf)
      .composite([
        { input: overlaySvg, top: 0, left: 0 },
        { input: textSvg, top: 0, left: 0 },
        { input: resizedLogo, top: 55, left: SIZE - 110 },
      ])
      .jpeg({ quality: JPEG_QUALITY })
      .toBuffer()
    );
}

async function composeEventSlide(
  imageBuffer: Buffer | null,
  name: string,
  detail: string,
  logoBuffer: Buffer,
  slideNumber: number,
  totalSlides: number
): Promise<Buffer> {
  if (!imageBuffer) {
    throw new Error(`No image available for event slide: ${name}`);
  }

  const base = sharp(imageBuffer).resize(SIZE, SIZE, { fit: 'cover', position: 'centre' });

  // Cinematic gradient
  const gradientSvg = Buffer.from(`
    <svg width="${SIZE}" height="${SIZE}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="evtBlock" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" style="stop-color:black;stop-opacity:0.05"/>
          <stop offset="45%" style="stop-color:black;stop-opacity:0.08"/>
          <stop offset="65%" style="stop-color:black;stop-opacity:0.5"/>
          <stop offset="80%" style="stop-color:black;stop-opacity:0.82"/>
          <stop offset="100%" style="stop-color:black;stop-opacity:0.95"/>
        </linearGradient>
      </defs>
      <rect width="${SIZE}" height="${SIZE}" fill="url(#evtBlock)"/>
    </svg>`);

  // Restaurant name — serif, editorial
  const nameLines = wrapText(name, 17);
  const blockH = 170 + (nameLines.length - 1) * 58;
  const blockY = SIZE - blockH;

  const nameSvgParts = nameLines.map((line, i) =>
    `<text x="95" y="${blockY + 70 + i * 58}"
           font-family="${SERIF}" font-weight="700" font-size="48"
           fill="white" text-anchor="start">
       ${escapeXml(line)}
     </text>`
  ).join('\n');

  const detailY = blockY + 70 + nameLines.length * 58 + 8;

  const textSvg = Buffer.from(`
    <svg width="${SIZE}" height="${SIZE}" xmlns="http://www.w3.org/2000/svg">
      ${svgFontStyles()}

      <!-- Corner brackets — editorial framing -->
      ${cornerBracketsSvg(SIZE, 24, 60, 2, ACCENT, ['tl', 'br'])}

      <!-- Slide counter — gold tag -->
      <rect x="24" y="24" width="68" height="30" fill="${ACCENT}"/>
      <text x="58" y="44"
            font-family="${SANS}" font-weight="700" font-size="14"
            fill="#111111" text-anchor="middle">
        ${slideNumber}/${totalSlides}
      </text>

      <!-- Dark editorial block at bottom -->
      <rect x="55" y="${blockY}" width="${SIZE - 110}" height="${blockH}" fill="rgba(0,0,0,0.78)"/>

      <!-- Gold accent bar at top of block -->
      <rect x="55" y="${blockY}" width="${SIZE - 110}" height="3" fill="${ACCENT}"/>

      <!-- Vertical accent beside name -->
      <rect x="72" y="${blockY + 45}" width="3" height="${nameLines.length * 58 + 10}" fill="${ACCENT}" opacity="0.6"/>

      <!-- Restaurant name — serif -->
      ${nameSvgParts}

      <!-- Detail text — serif italic -->
      <rect x="95" y="${detailY - 3}" width="${SIZE - 200}" height="1" fill="${ACCENT}" opacity="0.3"/>
      <text x="95" y="${detailY + 24}"
            font-family="${SERIF}" font-weight="400" font-size="24" font-style="italic"
            fill="${ACCENT}" text-anchor="start">
        ${escapeXml(detail)}
      </text>
    </svg>`);

  const smallLogo = await sharp(logoBuffer)
    .resize(44, 44, { fit: 'cover' })
    .png()
    .toBuffer();

  return base
    .jpeg({ quality: JPEG_QUALITY })
    .toBuffer()
    .then(buf => sharp(buf)
      .composite([
        { input: gradientSvg, top: 0, left: 0 },
        { input: textSvg, top: 0, left: 0 },
        { input: smallLogo, top: 28, left: SIZE - 76 },
      ])
      .jpeg({ quality: JPEG_QUALITY })
      .toBuffer()
    );
}

async function composeEventCTA(
  appName: string,
  totalCount: number,
  logoBuffer: Buffer,
  backgroundImage: Buffer | null
): Promise<Buffer> {
  // Editorial event CTA — Barfly-inspired close with urgency
  let base: sharp.Sharp;
  if (backgroundImage) {
    const blurred = await sharp(backgroundImage)
      .resize(SIZE, SIZE, { fit: 'cover', position: 'centre' })
      .blur(25)
      .modulate({ brightness: 0.18 })
      .toBuffer();
    base = sharp(blurred);
  } else {
    base = sharp({
      create: { width: SIZE, height: SIZE, channels: 3, background: { r: 12, g: 10, b: 16 } }
    });
  }

  const logoSize = 130;
  const resizedLogo = await sharp(logoBuffer)
    .resize(logoSize, logoSize, { fit: 'cover' })
    .png()
    .toBuffer();

  const logoLeft = Math.round((SIZE - logoSize) / 2);
  const cx = SIZE / 2;

  const textSvg = Buffer.from(`
    <svg width="${SIZE}" height="${SIZE}" xmlns="http://www.w3.org/2000/svg">
      ${svgFontStyles()}

      <!-- Editorial border -->
      <rect x="40" y="40" width="${SIZE - 80}" height="${SIZE - 80}"
            fill="none" stroke="${ACCENT}" stroke-width="1.5" opacity="0.3"/>

      <!-- Corner brackets -->
      ${cornerBracketsSvg(SIZE, 35, 70, 3, ACCENT, ['tl', 'tr', 'bl', 'br'])}

      <!-- App name at top -->
      <text x="${cx}" y="90"
            font-family="${SANS}" font-weight="700" font-size="14"
            fill="${ACCENT}" text-anchor="middle" letter-spacing="6">
        ${escapeXml(appName.toUpperCase())}
      </text>
      <rect x="${cx - 60}" y="102" width="120" height="1" fill="${ACCENT}" opacity="0.4"/>

      <!-- Big serif headline -->
      <text x="${cx}" y="430"
            font-family="${SERIF}" font-weight="700" font-size="58"
            fill="white" text-anchor="middle">
        Don&apos;t Miss
      </text>
      <text x="${cx}" y="505"
            font-family="${SERIF}" font-weight="700" font-size="58"
            fill="white" text-anchor="middle">
        the Lineup
      </text>

      <rect x="${cx - 40}" y="530" width="80" height="3" fill="${ACCENT}"/>

      <!-- Count + CTA -->
      <text x="${cx}" y="585"
            font-family="${SERIF}" font-weight="400" font-size="24" font-style="italic"
            fill="rgba(255,255,255,0.7)" text-anchor="middle">
        ${totalCount}+ events this week on ${escapeXml(appName)}
      </text>

      <!-- Feature teasers -->
      <rect x="120" y="630" width="${SIZE - 240}" height="1" fill="${ACCENT}" opacity="0.2"/>
      <text x="${cx}" y="665"
            font-family="${SANS}" font-weight="400" font-size="15"
            fill="rgba(255,255,255,0.45)" text-anchor="middle" letter-spacing="1">
        Live Music &#183; Trivia &#183; Karaoke &#183; Comedy &#183; DJ Nights
      </text>
      <rect x="120" y="685" width="${SIZE - 240}" height="1" fill="${ACCENT}" opacity="0.2"/>

      <!-- Download text -->
      <text x="${cx}" y="735"
            font-family="${SANS}" font-weight="400" font-size="18"
            fill="rgba(255,255,255,0.45)" text-anchor="middle">
        Free on the App Store &amp; Google Play
      </text>

      <!-- CTA button -->
      <rect x="${cx - 150}" y="775" width="300" height="56" rx="4" ry="4"
            fill="${ACCENT}"/>
      <text x="${cx}" y="811"
            font-family="${SANS}" font-weight="700" font-size="20"
            fill="#111111" text-anchor="middle" letter-spacing="3">
        LINK IN BIO
      </text>

      <!-- Tagline -->
      <text x="${cx}" y="${SIZE - 60}"
            font-family="${SERIF}" font-weight="400" font-size="16" font-style="italic"
            fill="rgba(255,255,255,0.3)" text-anchor="middle">
        Your city. Your guide. Your next favorite spot.
      </text>
    </svg>`);

  const darkOverlay = Buffer.from(`
    <svg width="${SIZE}" height="${SIZE}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${SIZE}" height="${SIZE}" fill="rgba(0,0,0,0.6)"/>
      <rect width="${SIZE}" height="${SIZE}" fill="${ACCENT}" opacity="0.03"/>
    </svg>`);

  return base
    .jpeg({ quality: JPEG_QUALITY })
    .toBuffer()
    .then(buf => sharp(buf)
      .composite([
        { input: darkOverlay, top: 0, left: 0 },
        { input: resizedLogo, top: 180, left: logoLeft },
        { input: textSvg, top: 0, left: 0 },
      ])
      .jpeg({ quality: JPEG_QUALITY })
      .toBuffer()
    );
}

// ============================================================
// Helpers
// ============================================================

/** Format a date string for the Barfly-style cover masthead */
function formatCoverDate(dateStr: string): { label: string; value: string } {
  const d = new Date(dateStr + 'T12:00:00'); // noon to avoid TZ issues
  const month = d.toLocaleString('en-US', { month: 'short' }).toUpperCase();
  const day = d.getDate();
  return { label: 'WEEK OF', value: `${month} ${day}` };
}

/** Split app name for Barfly-style masthead ("Taste" big / "Lanc" small) */
function getMastheadParts(appName: string): { big: string; small: string; smallFontSize: number } {
  if (appName === 'TasteLanc') return { big: 'Taste', small: 'Lanc', smallFontSize: 32 };
  if (appName === 'TasteCumberland') return { big: 'Taste', small: 'Cumberland', smallFontSize: 28 };
  if (appName === 'TasteFayetteville') return { big: 'Taste', small: 'Fayetteville', smallFontSize: 26 };
  return { big: appName, small: '', smallFontSize: 30 };
}

/** Market-specific tagline for the cover banner */
function getCoverTagline(marketName: string): string {
  return `${escapeXml(marketName.toUpperCase())}&apos;S GUIDE TO DINING, DRINKS &amp; NIGHTLIFE`;
}

/** Category thumbnails for the "Inside Your TasteLanc" section */
const INSIDE_CATEGORIES = [
  { label: 'HAPPY HOURS', subtitle: 'daily specials', image: 'events/live_music.png' },
  { label: 'EVENTS', subtitle: 'live music &amp; more', image: 'events/trivia.png' },
  { label: 'DINING', subtitle: 'tonight&apos;s picks', image: 'events/other.png' },
  { label: 'DEALS', subtitle: 'exclusive savings', image: 'events/comedy.png' },
  { label: 'PLUS', subtitle: 'on the app', image: 'events/sports.png' },
];

/** Load and resize category thumbnail images for the "Inside" section */
async function loadInsideThumbnails(): Promise<{ input: Buffer; left: number; top: number }[]> {
  const BORDER = 12;
  const SECTION_IMG_TOP = 808;
  const THUMB_W = 184;
  const THUMB_H = 160;
  const GAP = 16;
  const START_X = BORDER + 20;

  const composites: { input: Buffer; left: number; top: number }[] = [];

  for (let i = 0; i < INSIDE_CATEGORIES.length; i++) {
    const cat = INSIDE_CATEGORIES[i];
    const imgPath = join(process.cwd(), 'public', 'images', cat.image);
    const x = START_X + i * (THUMB_W + GAP);

    try {
      const thumbBuf = await sharp(readFileSync(imgPath))
        .resize(THUMB_W, THUMB_H, { fit: 'cover', position: 'centre' })
        .composite([{
          input: Buffer.from(`<svg width="${THUMB_W}" height="${THUMB_H}"><rect width="${THUMB_W}" height="${THUMB_H}" rx="8" ry="8" fill="black"/></svg>`),
          blend: 'dest-in',
        }])
        .png()
        .toBuffer();

      composites.push({ input: thumbBuf, left: x, top: SECTION_IMG_TOP });
    } catch {
      // Skip if image can't be loaded — the category label still renders via SVG
    }
  }

  return composites;
}

function wrapText(text: string, maxCharsPerLine: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let current = '';

  for (const word of words) {
    if (current.length + word.length + 1 > maxCharsPerLine && current) {
      lines.push(current);
      current = word;
    } else {
      current = current ? `${current} ${word}` : word;
    }
  }
  if (current) lines.push(current);
  return lines;
}

async function fetchImageBuffer(url: string): Promise<Buffer> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to fetch image: ${response.status} ${url}`);
  return Buffer.from(await response.arrayBuffer());
}

async function uploadSlide(
  supabase: SupabaseClient,
  buffer: Buffer,
  path: string
): Promise<string> {
  const { error } = await supabase.storage
    .from('images')
    .upload(path, buffer, {
      contentType: 'image/jpeg',
      upsert: true,
    });

  if (error) throw new Error(`Upload failed: ${error.message}`);

  const { data } = supabase.storage.from('images').getPublicUrl(path);
  return data.publicUrl;
}

// ============================================================================
// Restaurant Spotlight Slides
// ============================================================================
// "Inside [Restaurant Name]" — editorial magazine-style carousel.
// Slide order: Cover → Content slides (HH → Deals → Specials → Events, max 3)
//              → Photo gallery (if 3+ photos) → CTA

// Format helpers (module-private)

function formatTimeShortSpotlight(t: string | null): string {
  if (!t) return '';
  const [hStr, mStr] = t.split(':');
  const h = parseInt(hStr, 10);
  const m = parseInt(mStr, 10);
  const ampm = h >= 12 ? 'pm' : 'am';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return m === 0 ? `${h12}${ampm}` : `${h12}:${mStr}${ampm}`;
}

function formatDays(days: string[]): string {
  if (!days || days.length === 0) return 'Daily';
  const DAY_MAP: Record<string, string> = {
    monday: 'Mon', tuesday: 'Tue', wednesday: 'Wed', thursday: 'Thu',
    friday: 'Fri', saturday: 'Sat', sunday: 'Sun',
  };
  if (days.length === 7) return 'Daily';
  if (days.length >= 5) {
    const set = new Set(days.map(d => d.toLowerCase()));
    if (['saturday', 'sunday'].every(d => !set.has(d))) return 'Mon–Fri';
  }
  return days.map(d => DAY_MAP[d.toLowerCase()] ?? d).join('/');
}

function formatHHTimeRange(hh: SpotlightHappyHour): string {
  const days = formatDays(hh.days_of_week);
  const start = formatTimeShortSpotlight(hh.start_time);
  const end = formatTimeShortSpotlight(hh.end_time);
  if (start && end) return `${days}, ${start}–${end}`;
  if (start) return `${days} from ${start}`;
  return days;
}

function formatDealDiscount(deal: SpotlightDeal): string {
  switch (deal.discount_type) {
    case 'percent_off':
      return deal.discount_value ? `${deal.discount_value}% off` : 'Special discount';
    case 'dollar_off':
      return deal.discount_value ? `$${deal.discount_value} off` : 'Special discount';
    case 'bogo':
      return 'Buy 1 Get 1';
    case 'free_item':
      return 'Free item included';
    case 'custom':
    default:
      return '';
  }
}

function formatEventLine(event: SpotlightEvent): string {
  const EVENT_LABELS: Record<string, string> = {
    live_music: 'Live Music', trivia: 'Trivia Night', karaoke: 'Karaoke',
    dj: 'DJ Night', comedy: 'Comedy Show', sports: 'Sports Night',
    bingo: 'Bingo', music_bingo: 'Music Bingo', poker: 'Poker Night', other: 'Event',
  };
  const label = EVENT_LABELS[event.event_type] ?? 'Event';
  const days = event.is_recurring && event.days_of_week.length > 0
    ? formatDays(event.days_of_week)
    : '';
  const time = formatTimeShortSpotlight(event.start_time);
  if (days && time) return `${label} — ${days} at ${time}`;
  if (days) return `${label} — ${days}`;
  if (time) return `${label} at ${time}`;
  return label;
}

// Cover slide: editorial magazine feature — "INSIDE" + restaurant name, Barfly-inspired
async function composeSpotlightCover(
  imageBuffer: Buffer | null,
  restaurantName: string,
  logoBuffer: Buffer,
  appName: string,
  marketName: string,
): Promise<Buffer> {
  let base: sharp.Sharp;
  if (imageBuffer) {
    base = sharp(imageBuffer).resize(SIZE, SIZE, { fit: 'cover', position: 'attention' });
  } else {
    base = sharp({ create: { width: SIZE, height: SIZE, channels: 3, background: { r: 14, g: 14, b: 18 } } });
  }

  const nameLines = wrapText(restaurantName, 15);
  const nameY = 200;
  const lineH = 70;
  const nameSvg = nameLines.map((line, i) =>
    `<text x="70" y="${nameY + i * lineH}" font-family="${SERIF}" font-size="62" font-weight="700"
      fill="white" dominant-baseline="hanging">${escapeXml(line)}</text>`
  ).join('\n');

  const bottomY = SIZE - 55;
  const cx = SIZE / 2;
  const nameBlockEnd = nameY + nameLines.length * lineH + 20;

  const svg = `<svg width="${SIZE}" height="${SIZE}" xmlns="http://www.w3.org/2000/svg">
    ${svgFontStyles()}
    <!-- Cinematic gradient overlay -->
    <defs>
      <linearGradient id="cg" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="rgba(0,0,0,0.8)"/>
        <stop offset="25%" stop-color="rgba(0,0,0,0.4)"/>
        <stop offset="55%" stop-color="rgba(0,0,0,0.25)"/>
        <stop offset="80%" stop-color="rgba(0,0,0,0.65)"/>
        <stop offset="100%" stop-color="rgba(0,0,0,0.92)"/>
      </linearGradient>
    </defs>
    <rect width="${SIZE}" height="${SIZE}" fill="url(#cg)"/>
    <rect width="${SIZE}" height="${SIZE}" fill="${ACCENT}" opacity="0.03"/>

    <!-- Corner brackets -->
    ${cornerBracketsSvg(SIZE, 28, 65, 2, ACCENT, ['tl', 'tr', 'bl', 'br'])}

    <!-- Thin rule at top -->
    <rect x="50" y="50" width="${SIZE - 100}" height="1" fill="${ACCENT}" opacity="0.4"/>

    <!-- "INSIDE" label — editorial tag -->
    <rect x="70" y="105" width="110" height="30" fill="${ACCENT}"/>
    <text x="125" y="126" font-family="${SANS}" font-size="14" font-weight="700"
      fill="#111111" text-anchor="middle" letter-spacing="4">INSIDE</text>

    <!-- Gold accent bar beside name -->
    <rect x="52" y="${nameY - 5}" width="3" height="${nameLines.length * lineH + 10}" fill="${ACCENT}" opacity="0.7"/>

    <!-- Restaurant name — serif, large, editorial -->
    ${nameSvg}

    <!-- Subtitle: what's inside -->
    <text x="70" y="${nameBlockEnd + 10}" font-family="${SERIF}" font-size="22" font-style="italic"
      fill="${ACCENT_DIM}" dominant-baseline="hanging">Happy Hours, Deals, Events &amp; More</text>

    <!-- ═══ Bottom zone ═══ -->
    <rect x="50" y="${SIZE - 145}" width="${SIZE - 100}" height="1" fill="${ACCENT}" opacity="0.35"/>

    <!-- Swipe hint — left -->
    <rect x="60" y="${bottomY - 8}" width="2" height="24" fill="${ACCENT}" rx="1" opacity="0.6"/>
    <text x="72" y="${bottomY}" font-family="${SANS}" font-size="14" fill="rgba(255,255,255,0.5)"
      dominant-baseline="hanging" letter-spacing="3">SWIPE TO EXPLORE  &#x276F;</text>

    <!-- Brand badge — right -->
    <rect x="${SIZE - 200}" y="${bottomY - 4}" width="160" height="26" rx="4"
      fill="rgba(232,197,71,0.12)" stroke="${ACCENT}" stroke-width="1"/>
    <text x="${SIZE - 120}" y="${bottomY + 9}" font-family="${SANS}" font-size="12" font-weight="700"
      fill="${ACCENT}" text-anchor="middle" dominant-baseline="middle"
      letter-spacing="2">${escapeXml(appName.toUpperCase())}</text>

    <rect x="50" y="${SIZE - 40}" width="${SIZE - 100}" height="1" fill="${ACCENT}" opacity="0.2"/>
  </svg>`;

  const logo = await sharp(logoBuffer)
    .resize(44, 44, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();

  return base
    .jpeg({ quality: JPEG_QUALITY })
    .composite([
      { input: Buffer.from(svg), top: 0, left: 0 },
      { input: logo, top: 56, left: SIZE - 80 },
    ])
    .toBuffer();
}

// Content slide: photo top + editorial dark panel with section label and items
async function composeSpotlightContentSlide(
  imageBuffer: Buffer | null,
  sectionLabel: string,
  items: string[],
  logoBuffer: Buffer,
  slideNum: number,
  totalSlides: number,
): Promise<Buffer> {
  const PANEL_TOP = Math.round(SIZE * 0.50); // slightly more photo visible
  const PHOTO_H = PANEL_TOP;

  let photoComposite: Buffer;
  if (imageBuffer) {
    photoComposite = await sharp(imageBuffer)
      .resize(SIZE, PHOTO_H, { fit: 'cover', position: 'attention' })
      .jpeg({ quality: JPEG_QUALITY })
      .toBuffer();
  } else {
    photoComposite = await sharp({
      create: { width: SIZE, height: PHOTO_H, channels: 3, background: { r: 14, g: 12, b: 18 } },
    }).jpeg({ quality: JPEG_QUALITY }).toBuffer();
  }

  const capped = items.slice(0, 3);
  const itemsY = PANEL_TOP + 115;
  const itemH = 44;

  // Items with gold bullets and serif font
  const itemSvg = capped.map((item, i) => {
    // Parse price from item for callout
    const priceMatch = item.match(/\$\d+(?:\.\d{2})?/);
    const itemText = priceMatch ? item.replace(priceMatch[0], '').replace(/—\s*$/, '').trim() : item;
    return `
      <rect x="64" y="${itemsY + i * itemH + 4}" width="6" height="6" fill="${ACCENT}" rx="1"/>
      <text x="82" y="${itemsY + i * itemH}" font-family="${SERIF}" font-size="24" fill="rgba(255,255,255,0.9)"
        dominant-baseline="hanging">${escapeXml(itemText)}</text>
      ${priceMatch ? `<text x="${SIZE - 60}" y="${itemsY + i * itemH}" font-family="${SANS}" font-size="22" font-weight="700"
        fill="${ACCENT}" text-anchor="end" dominant-baseline="hanging">${escapeXml(priceMatch[0])}</text>` : ''}
    `;
  }).join('\n');

  const logo = await sharp(logoBuffer)
    .resize(36, 36, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();

  const svg = `<svg width="${SIZE}" height="${SIZE}" xmlns="http://www.w3.org/2000/svg">
    ${svgFontStyles()}
    <!-- Photo zone vignette -->
    <defs>
      <linearGradient id="pv" x1="0" y1="0" x2="0" y2="1">
        <stop offset="60%" stop-color="rgba(0,0,0,0)"/>
        <stop offset="100%" stop-color="rgba(0,0,0,0.6)"/>
      </linearGradient>
    </defs>
    <rect y="0" width="${SIZE}" height="${PHOTO_H}" fill="url(#pv)"/>

    <!-- Dark panel with subtle texture -->
    <rect y="${PANEL_TOP}" width="${SIZE}" height="${SIZE - PANEL_TOP}" fill="rgba(10,10,14,0.97)"/>

    <!-- Gold accent rule at panel top -->
    <rect y="${PANEL_TOP}" width="${SIZE}" height="3" fill="${ACCENT}"/>

    <!-- Corner brackets on the panel zone -->
    <rect x="50" y="${PANEL_TOP + 12}" width="45" height="2" fill="${ACCENT}" opacity="0.4"/>
    <rect x="50" y="${PANEL_TOP + 12}" width="2" height="35" fill="${ACCENT}" opacity="0.4"/>
    <rect x="${SIZE - 95}" y="${SIZE - 55}" width="45" height="2" fill="${ACCENT}" opacity="0.4"/>
    <rect x="${SIZE - 52}" y="${SIZE - 90}" width="2" height="35" fill="${ACCENT}" opacity="0.4"/>

    <!-- Section label — editorial tag -->
    <rect x="60" y="${PANEL_TOP + 20}" width="${sectionLabel.length * 12 + 30}" height="30" fill="${ACCENT}"/>
    <text x="${60 + (sectionLabel.length * 12 + 30) / 2}" y="${PANEL_TOP + 41}"
      font-family="${SANS}" font-size="13" font-weight="700"
      fill="#111111" text-anchor="middle" letter-spacing="4">${escapeXml(sectionLabel)}</text>

    <!-- Accent hairline under label -->
    <rect x="60" y="${PANEL_TOP + 68}" width="40" height="2" fill="${ACCENT}" rx="1" opacity="0.4"/>

    <!-- Items — serif font, gold prices right-aligned -->
    ${itemSvg}

    <!-- Bottom rule -->
    <rect x="50" y="${SIZE - 45}" width="${SIZE - 100}" height="1" fill="${ACCENT}" opacity="0.2"/>

    <!-- Slide counter badge -->
    <rect x="${SIZE - 88}" y="22" width="64" height="26" rx="4" fill="${ACCENT}"/>
    <text x="${SIZE - 56}" y="35" font-family="${SANS}" font-size="13" font-weight="700"
      fill="#111111" text-anchor="middle" dominant-baseline="middle">${slideNum}/${totalSlides}</text>
  </svg>`;

  return sharp({
    create: { width: SIZE, height: SIZE, channels: 3, background: { r: 10, g: 10, b: 14 } },
  })
    .composite([
      { input: photoComposite, top: 0, left: 0 },
      { input: Buffer.from(svg), top: 0, left: 0 },
      { input: logo, top: 22, left: 22 },
    ])
    .jpeg({ quality: JPEG_QUALITY })
    .toBuffer();
}

// Photo gallery slide: 2x2 grid with editorial framing and gold accents
async function composeSpotlightPhotoGrid(
  photoBuffers: Buffer[],
  logoBuffer: Buffer,
  slideNum: number,
  totalSlides: number,
): Promise<Buffer> {
  const GAP = 6;
  const CELL = Math.floor((SIZE - GAP) / 2);

  const cells = await Promise.all(
    photoBuffers.slice(0, 4).map(buf =>
      sharp(buf).resize(CELL, CELL, { fit: 'cover', position: 'attention' }).jpeg({ quality: 90 }).toBuffer()
    )
  );

  const composites: sharp.OverlayOptions[] = [];
  const positions = [
    { top: 0, left: 0 },
    { top: 0, left: CELL + GAP },
    { top: CELL + GAP, left: 0 },
    { top: CELL + GAP, left: CELL + GAP },
  ];
  cells.forEach((cell, i) => {
    composites.push({ input: cell, top: positions[i].top, left: positions[i].left });
  });

  const logo = await sharp(logoBuffer)
    .resize(36, 36, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();

  const svg = `<svg width="${SIZE}" height="${SIZE}" xmlns="http://www.w3.org/2000/svg">
    ${svgFontStyles()}
    <!-- Gap fill — dark -->
    <rect x="${CELL}" y="0" width="${GAP}" height="${SIZE}" fill="rgba(10,10,14,1)"/>
    <rect x="0" y="${CELL}" width="${SIZE}" height="${GAP}" fill="rgba(10,10,14,1)"/>

    <!-- Gold accent lines along the gap -->
    <rect x="${CELL + 1}" y="0" width="1" height="${SIZE}" fill="${ACCENT}" opacity="0.25"/>
    <rect x="${CELL + GAP - 2}" y="0" width="1" height="${SIZE}" fill="${ACCENT}" opacity="0.25"/>
    <rect x="0" y="${CELL + 1}" width="${SIZE}" height="1" fill="${ACCENT}" opacity="0.25"/>
    <rect x="0" y="${CELL + GAP - 2}" width="${SIZE}" height="1" fill="${ACCENT}" opacity="0.25"/>

    <!-- Corner brackets on outer edges -->
    ${cornerBracketsSvg(SIZE, 10, 50, 2, ACCENT, ['tl', 'tr', 'bl', 'br'])}

    <!-- Photos label — gold tag -->
    <rect x="60" y="16" width="94" height="26" rx="4" fill="${ACCENT}"/>
    <text x="107" y="29" font-family="${SANS}" font-size="12" font-weight="700"
      fill="#111111" text-anchor="middle" dominant-baseline="middle" letter-spacing="3">PHOTOS</text>

    <!-- Slide counter badge -->
    <rect x="${SIZE - 88}" y="16" width="64" height="26" rx="4" fill="${ACCENT}"/>
    <text x="${SIZE - 56}" y="29" font-family="${SANS}" font-size="12" font-weight="700"
      fill="#111111" text-anchor="middle" dominant-baseline="middle">${slideNum}/${totalSlides}</text>
  </svg>`;

  return sharp({ create: { width: SIZE, height: SIZE, channels: 3, background: { r: 10, g: 10, b: 14 } } })
    .composite([
      ...composites,
      { input: Buffer.from(svg), top: 0, left: 0 },
      { input: logo, top: 16, left: 16 },
    ])
    .jpeg({ quality: JPEG_QUALITY })
    .toBuffer();
}

// CTA slide: editorial close — "Discover [Restaurant] on [App]", Barfly-inspired
async function composeSpotlightCTA(
  restaurantName: string,
  appName: string,
  logoBuffer: Buffer,
  backgroundBuffer: Buffer | null,
): Promise<Buffer> {
  let base: sharp.Sharp;
  if (backgroundBuffer) {
    const blurred = await sharp(backgroundBuffer)
      .resize(SIZE, SIZE, { fit: 'cover', position: 'attention' })
      .blur(20)
      .modulate({ brightness: 0.18 })
      .jpeg({ quality: 80 })
      .toBuffer();
    base = sharp(blurred);
  } else {
    base = sharp({ create: { width: SIZE, height: SIZE, channels: 3, background: { r: 12, g: 10, b: 16 } } });
  }

  const logo = await sharp(logoBuffer)
    .resize(120, 120, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();

  const cx = SIZE / 2;

  const svg = `<svg width="${SIZE}" height="${SIZE}" xmlns="http://www.w3.org/2000/svg">
    ${svgFontStyles()}
    <!-- Dark scrim with warm tint -->
    <rect width="${SIZE}" height="${SIZE}" fill="rgba(0,0,0,0.72)"/>
    <rect width="${SIZE}" height="${SIZE}" fill="${ACCENT}" opacity="0.03"/>

    <!-- Editorial border frame -->
    <rect x="40" y="40" width="${SIZE - 80}" height="${SIZE - 80}"
          fill="none" stroke="${ACCENT}" stroke-width="1.5" opacity="0.3"/>

    <!-- Corner brackets -->
    ${cornerBracketsSvg(SIZE, 35, 70, 3, ACCENT, ['tl', 'tr', 'bl', 'br'])}

    <!-- App name at top -->
    <text x="${cx}" y="90" font-family="${SANS}" font-size="14" font-weight="700"
      fill="${ACCENT}" text-anchor="middle" letter-spacing="6">${escapeXml(appName.toUpperCase())}</text>
    <rect x="${cx - 60}" y="102" width="120" height="1" fill="${ACCENT}" opacity="0.4"/>

    <!-- "Discover" label -->
    <text x="${cx}" y="${cx - 55}" font-family="${SERIF}" font-size="26" font-style="italic"
      fill="rgba(255,255,255,0.65)" text-anchor="middle">Discover</text>

    <!-- Restaurant name — bold serif -->
    <text x="${cx}" y="${cx + 5}" font-family="${SERIF}" font-size="46" font-weight="700"
      fill="white" text-anchor="middle">${escapeXml(restaurantName)}</text>

    <!-- "on [App]" -->
    <text x="${cx}" y="${cx + 50}" font-family="${SERIF}" font-size="24" font-style="italic"
      fill="${ACCENT_DIM}" text-anchor="middle">on ${escapeXml(appName)}</text>

    <!-- Accent rule -->
    <rect x="${cx - 40}" y="${cx + 75}" width="80" height="3" fill="${ACCENT}" rx="1"/>

    <!-- Feature teasers -->
    <text x="${cx}" y="${cx + 120}" font-family="${SANS}" font-size="15"
      fill="rgba(255,255,255,0.45)" text-anchor="middle" letter-spacing="1">
      Happy Hours &#183; Deals &#183; Events &#183; Specials
    </text>

    <!-- Download text -->
    <text x="${cx}" y="${SIZE - 210}" font-family="${SANS}" font-size="17"
      fill="rgba(255,255,255,0.4)" text-anchor="middle">Free on App Store &amp; Google Play</text>

    <!-- Gold CTA button -->
    <rect x="${cx - 150}" y="${SIZE - 180}" width="300" height="52" rx="4" fill="${ACCENT}"/>
    <text x="${cx}" y="${SIZE - 154}" font-family="${SANS}" font-size="16" font-weight="700"
      fill="#111111" text-anchor="middle" dominant-baseline="middle"
      letter-spacing="3">FIND ON ${escapeXml(appName.toUpperCase())}</text>

    <!-- Bottom tagline -->
    <text x="${cx}" y="${SIZE - 60}" font-family="${SERIF}" font-size="15" font-style="italic"
      fill="rgba(255,255,255,0.25)" text-anchor="middle">Your city. Your guide. Your next favorite spot.</text>
  </svg>`;

  const logoTop = 160;

  return base
    .jpeg({ quality: JPEG_QUALITY })
    .composite([
      { input: Buffer.from(svg), top: 0, left: 0 },
      { input: logo, top: logoTop, left: Math.round(cx - 60) },
    ])
    .toBuffer();
}

export async function composeRestaurantSpotlightSlides(opts: {
  supabase: SupabaseClient;
  market: MarketConfig;
  restaurant: RestaurantSpotlightCandidate;
  date: string;
}): Promise<string[]> {
  const { supabase, market, restaurant, date } = opts;
  const appName = getAppName(market.market_slug);
  const marketName = getMarketDisplayName(market.market_slug);

  // 1. Load logo
  let logoBuffer: Buffer;
  try {
    logoBuffer = loadLogoBuffer(market.market_slug);
  } catch {
    logoBuffer = Buffer.alloc(0);
  }

  // 2. Best cover photo — REQUIRED. Never generate a spotlight without imagery.
  const coverPhoto = restaurant.photos.find(p => p.is_cover) ?? restaurant.photos[0] ?? null;
  const coverUrl = coverPhoto?.url ?? restaurant.cover_image_url ?? null;
  let coverBuffer: Buffer | null = null;
  if (coverUrl) {
    try { coverBuffer = await fetchImageBuffer(coverUrl); } catch { /* no image */ }
  }

  if (!coverBuffer) {
    throw new Error(`Cannot generate spotlight for "${restaurant.name}" — no photos available. Every slide needs an image.`);
  }

  // 3. Build content sections in priority order: HH → Deals → Specials → Events
  type ContentSection = { label: string; items: string[]; imageUrl: string | null };
  const contentSections: ContentSection[] = [];

  if (restaurant.happy_hours.length > 0) {
    const hh = restaurant.happy_hours[0];
    const timeRange = formatHHTimeRange(hh);
    const hhItems = hh.items.slice(0, 2).map(item => {
      const price = item.discounted_price != null ? `$${item.discounted_price}` : '';
      return price ? `${item.name} — ${price}` : item.name;
    });
    contentSections.push({
      label: 'HAPPY HOUR',
      items: [timeRange, ...hhItems].filter(Boolean).slice(0, 3),
      imageUrl: hh.image_url,
    });
  }

  if (restaurant.deals.length > 0) {
    const dealItems = restaurant.deals.slice(0, 3).map(d => {
      const discount = formatDealDiscount(d);
      return discount ? `${d.title} — ${discount}` : d.title;
    });
    const dealImageUrl = restaurant.deals.find(d => d.image_url)?.image_url ?? null;
    contentSections.push({
      label: 'EXCLUSIVE DEALS',
      items: dealItems,
      imageUrl: dealImageUrl,
    });
  }

  if (restaurant.specials.length > 0) {
    const specialItems = restaurant.specials.slice(0, 3).map(s => {
      const price = s.special_price != null ? ` — $${s.special_price}` : '';
      return `${s.name}${price}`;
    });
    const specialImageUrl = restaurant.specials.find(s => s.image_url)?.image_url ?? null;
    contentSections.push({
      label: "TODAY'S SPECIALS",
      items: specialItems,
      imageUrl: specialImageUrl,
    });
  }

  if (restaurant.events.length > 0) {
    const eventItems = restaurant.events.slice(0, 3).map(formatEventLine);
    const eventImageUrl = restaurant.events.find(e => e.image_url)?.image_url ?? null;
    contentSections.push({
      label: 'COMING UP',
      items: eventItems,
      imageUrl: eventImageUrl,
    });
  }

  const capped = contentSections.slice(0, 3);
  const hasPhotoGallery = restaurant.photos.length >= 3;
  const totalSlides = 1 + capped.length + (hasPhotoGallery ? 1 : 0) + 1;

  // 4. Generate slides sequentially to avoid memory spikes
  const slideBuffers: Buffer[] = [];

  // Cover
  slideBuffers.push(await composeSpotlightCover(coverBuffer, restaurant.name, logoBuffer, appName, marketName));

  // Content slides
  for (let i = 0; i < capped.length; i++) {
    const section = capped[i];
    let imgBuffer: Buffer | null = null;
    if (section.imageUrl) {
      try { imgBuffer = await fetchImageBuffer(section.imageUrl); } catch { /* use fallback */ }
    }
    const slideImage = imgBuffer ?? coverBuffer;
    slideBuffers.push(await composeSpotlightContentSlide(
      slideImage,
      section.label,
      section.items,
      logoBuffer,
      slideBuffers.length + 1,
      totalSlides,
    ));
  }

  // Photo gallery
  if (hasPhotoGallery) {
    const photoBuffers = (await Promise.all(
      restaurant.photos.slice(0, 4).map(async p => {
        try { return await fetchImageBuffer(p.url); } catch { return null; }
      })
    )).filter((b): b is Buffer => b !== null);

    if (photoBuffers.length >= 2) {
      slideBuffers.push(await composeSpotlightPhotoGrid(
        photoBuffers,
        logoBuffer,
        slideBuffers.length + 1,
        totalSlides,
      ));
    }
  }

  // CTA
  slideBuffers.push(await composeSpotlightCTA(restaurant.name, appName, logoBuffer, coverBuffer));

  // 5. Upload all slides
  const timestamp = Date.now();
  const storagePath = `instagram/${market.market_slug}/${date}/spotlight-${timestamp}`;
  return Promise.all(
    slideBuffers.map((buf, i) => uploadSlide(supabase, buf, `${storagePath}/slide-${i}.jpg`))
  );
}

export async function cleanupOldSlides(
  supabase: SupabaseClient,
  marketSlug: string,
  olderThanDays: number = 7
): Promise<void> {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - olderThanDays);
  const cutoffStr = cutoff.toISOString().split('T')[0];

  const { data: folders } = await supabase.storage
    .from('images')
    .list(`instagram/${marketSlug}`);

  if (!folders) return;

  for (const folder of folders) {
    if (folder.name < cutoffStr) {
      const { data: files } = await supabase.storage
        .from('images')
        .list(`instagram/${marketSlug}/${folder.name}`);

      if (files && files.length > 0) {
        const paths = files.map(f => `instagram/${marketSlug}/${folder.name}/${f.name}`);
        await supabase.storage.from('images').remove(paths);
      }
    }
  }
}
