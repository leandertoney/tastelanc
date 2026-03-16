// Instagram Carousel Overlay System
// Composites branded text overlays onto restaurant photos using sharp + SVG
// Design: Magazine cover aesthetic (inspired by Barfly Lancaster)

import sharp from 'sharp';
import { readFileSync, existsSync, copyFileSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { SupabaseClient } from '@supabase/supabase-js';
import { SlideCandidate, MarketConfig, HeadlineParts, HolidaySpecialSlide } from './types';
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

// Install Inter fonts via fontconfig so librsvg/Pango can find them.
// Data URI @font-face in SVG is unreliable with librsvg on serverless.
let fontsInstalled = false;

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

  // Copy Inter TTF files to /tmp/fonts
  for (const name of ['Inter-Bold.ttf', 'Inter-Regular.ttf']) {
    const dest = join(fontDir, name);
    if (!existsSync(dest)) {
      const src = findFontFile(name);
      copyFileSync(src, dest);
      console.log(`[Instagram] Copied ${name} to ${dest}`);
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
  slides.push(await composeRoundupCover(coverImage, headline, logoBuffer, appName, marketName, accent, accentDim, theme));

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
  theme: HolidayTheme | null
): Promise<Buffer> {
  let base: sharp.Sharp;
  if (imageBuffer) {
    base = sharp(imageBuffer).resize(SIZE, SIZE, { fit: 'cover', position: 'centre' });
  } else {
    const bg = theme ? hexToRgb(theme.bgDark) : { r: 20, g: 20, b: 25 };
    base = sharp({ create: { width: SIZE, height: SIZE, channels: 3, background: bg } });
  }

  // Dramatic overlay with accent-tinted gradient
  const overlaySvg = Buffer.from(`
    <svg width="${SIZE}" height="${SIZE}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="rndCover" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" style="stop-color:black;stop-opacity:0.75"/>
          <stop offset="30%" style="stop-color:black;stop-opacity:0.4"/>
          <stop offset="60%" style="stop-color:black;stop-opacity:0.4"/>
          <stop offset="100%" style="stop-color:black;stop-opacity:0.85"/>
        </linearGradient>
      </defs>
      <rect width="${SIZE}" height="${SIZE}" fill="url(#rndCover)"/>
      ${theme ? `<rect width="${SIZE}" height="${SIZE}" fill="${accent}" opacity="0.08"/>` : ''}
    </svg>`);

  const centerX = SIZE / 2;
  const holidayDecor = theme?.decorEmoji || '';

  // The magazine issue layout — bold, editorial
  const textSvg = Buffer.from(`
    <svg width="${SIZE}" height="${SIZE}" xmlns="http://www.w3.org/2000/svg">
      ${svgFontStyles()}

      <!-- Thin accent border frame -->
      <rect x="30" y="30" width="${SIZE - 60}" height="${SIZE - 60}"
            fill="none" stroke="${accent}" stroke-width="2" opacity="0.4"/>

      <!-- Masthead: app name -->
      <text x="${centerX}" y="110"
            font-family="Inter" font-weight="700" font-size="42"
            fill="white" text-anchor="middle" letter-spacing="14">
        ${escapeXml(appName.toUpperCase())}
      </text>

      <!-- Accent rule under masthead -->
      <rect x="${centerX - 180}" y="130" width="360" height="3" fill="${accent}"/>

      <!-- Issue tagline -->
      <text x="${centerX}" y="175"
            font-family="Inter" font-weight="400" font-size="20" font-style="italic"
            fill="${accentDim}" text-anchor="middle" letter-spacing="2">
        WEEKLY ROUNDUP
      </text>

      <!-- Big hero text — what's the vibe this week -->
      <text x="${centerX}" y="480"
            font-family="Inter" font-weight="700" font-size="72"
            fill="white" text-anchor="middle">
        ${escapeXml(headline.dayLabel.toUpperCase())}
      </text>

      <!-- Accent category label -->
      <text x="${centerX}" y="560"
            font-family="Inter" font-weight="700" font-size="48"
            fill="${accent}" text-anchor="middle" letter-spacing="4">
        ${escapeXml(headline.label.toUpperCase())}
      </text>

      ${theme ? `
      <!-- Holiday badge -->
      <rect x="${centerX - 200}" y="610" width="400" height="60" rx="30" ry="30"
            fill="${accent}" opacity="0.2"/>
      <rect x="${centerX - 200}" y="610" width="400" height="60" rx="30" ry="30"
            fill="none" stroke="${accent}" stroke-width="2" opacity="0.6"/>
      <text x="${centerX}" y="650"
            font-family="Inter" font-weight="700" font-size="26"
            fill="${accent}" text-anchor="middle" letter-spacing="3">
        ${escapeXml(headline.label.toUpperCase())} EDITION
      </text>
      ` : ''}

      <!-- Count badge -->
      <text x="${centerX}" y="${SIZE - 170}"
            font-family="Inter" font-weight="700" font-size="120"
            fill="white" text-anchor="middle" opacity="0.15">
        ${escapeXml(String(headline.count))}+
      </text>

      <!-- In [market] -->
      <text x="${centerX}" y="${SIZE - 110}"
            font-family="Inter" font-weight="400" font-size="24"
            fill="rgba(255,255,255,0.6)" text-anchor="middle" letter-spacing="3">
        IN ${escapeXml(marketName.toUpperCase())}
      </text>

      <!-- Swipe CTA -->
      <text x="${centerX}" y="${SIZE - 55}"
            font-family="Inter" font-weight="400" font-size="20"
            fill="rgba(255,255,255,0.5)" text-anchor="middle" letter-spacing="4">
        SWIPE FOR THIS WEEK&apos;S PICKS  &#x276F;
      </text>
    </svg>`);

  const resizedLogo = await sharp(logoBuffer)
    .resize(80, 80, { fit: 'cover' })
    .png()
    .toBuffer();

  return base
    .jpeg({ quality: JPEG_QUALITY })
    .toBuffer()
    .then(buf => sharp(buf)
      .composite([
        { input: overlaySvg, top: 0, left: 0 },
        { input: resizedLogo, top: 40, left: 50 },
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
  const base = imageBuffer
    ? sharp(imageBuffer).resize(SIZE, SIZE, { fit: 'cover', position: 'centre' })
    : (() => {
        const bg = theme ? hexToRgb(theme.bgDark) : { r: 25, g: 25, b: 30 };
        return sharp({ create: { width: SIZE, height: SIZE, channels: 3, background: bg } });
      })();

  const gradientSvg = Buffer.from(`
    <svg width="${SIZE}" height="${SIZE}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="rndCard" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" style="stop-color:black;stop-opacity:0.1"/>
          <stop offset="50%" style="stop-color:black;stop-opacity:0.15"/>
          <stop offset="75%" style="stop-color:black;stop-opacity:0.65"/>
          <stop offset="100%" style="stop-color:black;stop-opacity:0.93"/>
        </linearGradient>
      </defs>
      <rect width="${SIZE}" height="${SIZE}" fill="url(#rndCard)"/>
      ${theme ? `<rect width="${SIZE}" height="${SIZE}" fill="${accent}" opacity="0.05"/>` : ''}
    </svg>`);

  const nameLines = wrapText(candidate.restaurant_name, 22);
  const nameSvg = nameLines.map((line, i) =>
    `<text x="70" y="${SIZE - 145 - (nameLines.length - 1 - i) * 58}"
           font-family="Inter" font-weight="700" font-size="48"
           fill="white" text-anchor="start">
       ${escapeXml(line)}
     </text>`
  ).join('\n');

  const textSvg = Buffer.from(`
    <svg width="${SIZE}" height="${SIZE}" xmlns="http://www.w3.org/2000/svg">
      ${svgFontStyles()}

      <!-- Slide counter -->
      <rect x="40" y="40" width="70" height="36" rx="4" ry="4" fill="${accent}"/>
      <text x="75" y="66"
            font-family="Inter" font-weight="700" font-size="20"
            fill="#111111" text-anchor="middle">
        ${slideNum}/${totalSlides}
      </text>

      <!-- Accent side bar -->
      <rect x="50" y="${SIZE - 200}" width="4" height="130" fill="${accent}"/>

      <!-- Restaurant name -->
      ${nameSvg}

      <!-- Detail text -->
      <circle cx="82" cy="${SIZE - 75}" r="4" fill="${accent}"/>
      <text x="98" y="${SIZE - 65}"
            font-family="Inter" font-weight="400" font-size="26" font-style="italic"
            fill="${accentDim}" text-anchor="start">
        ${escapeXml(candidate.detail_text)}
      </text>
    </svg>`);

  const smallLogo = await sharp(logoBuffer)
    .resize(55, 55, { fit: 'cover' })
    .png()
    .toBuffer();

  return base
    .jpeg({ quality: JPEG_QUALITY })
    .toBuffer()
    .then(buf => sharp(buf)
      .composite([
        { input: gradientSvg, top: 0, left: 0 },
        { input: smallLogo, top: 40, left: SIZE - 100 },
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
  let base: sharp.Sharp;
  if (backgroundImage) {
    const blurred = await sharp(backgroundImage)
      .resize(SIZE, SIZE, { fit: 'cover', position: 'centre' })
      .blur(35)
      .modulate({ brightness: 0.2 })
      .toBuffer();
    base = sharp(blurred);
  } else {
    const bg = theme ? hexToRgb(theme.bgDark) : { r: 18, g: 18, b: 22 };
    base = sharp({ create: { width: SIZE, height: SIZE, channels: 3, background: bg } });
  }

  const resizedLogo = await sharp(logoBuffer)
    .resize(200, 200, { fit: 'cover' })
    .png()
    .toBuffer();

  const textSvg = Buffer.from(`
    <svg width="${SIZE}" height="${SIZE}" xmlns="http://www.w3.org/2000/svg">
      ${svgFontStyles()}

      <!-- Border frame -->
      <rect x="30" y="30" width="${SIZE - 60}" height="${SIZE - 60}"
            fill="none" stroke="${accent}" stroke-width="2" opacity="0.3"/>

      <!-- See all X -->
      <text x="${SIZE / 2}" y="560"
            font-family="Inter" font-weight="700" font-size="52"
            fill="white" text-anchor="middle">
        See all ${totalCount}+
      </text>

      <!-- Accent rule -->
      <rect x="${SIZE / 2 - 80}" y="585" width="160" height="3" fill="${accent}"/>

      <!-- Subtitle -->
      <text x="${SIZE / 2}" y="640"
            font-family="Inter" font-weight="400" font-size="28" font-style="italic"
            fill="${accentDim}" text-anchor="middle">
        this week on ${escapeXml(appName)}
      </text>

      <!-- Download -->
      <text x="${SIZE / 2}" y="700"
            font-family="Inter" font-weight="400" font-size="22"
            fill="rgba(255,255,255,0.5)" text-anchor="middle">
        Free on the App Store &amp; Google Play
      </text>

      <!-- CTA button -->
      <rect x="${SIZE / 2 - 140}" y="740" width="280" height="56" rx="28" ry="28"
            fill="${accent}"/>
      <text x="${SIZE / 2}" y="776"
            font-family="Inter" font-weight="700" font-size="24"
            fill="#111111" text-anchor="middle" letter-spacing="2">
        LINK IN BIO
      </text>

      ${theme ? `
      <!-- Holiday tab callout -->
      <text x="${SIZE / 2}" y="850"
            font-family="Inter" font-weight="400" font-size="20"
            fill="${accent}" text-anchor="middle" letter-spacing="1">
        Check the holiday tab for all the deals ${theme.decorEmoji}
      </text>
      ` : ''}
    </svg>`);

  const darkOverlay = Buffer.from(`
    <svg width="${SIZE}" height="${SIZE}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${SIZE}" height="${SIZE}" fill="rgba(0,0,0,0.55)"/>
      ${theme ? `<rect width="${SIZE}" height="${SIZE}" fill="${accent}" opacity="0.06"/>` : ''}
    </svg>`);

  const logoLeft = Math.round((SIZE - 200) / 2);

  return base
    .jpeg({ quality: JPEG_QUALITY })
    .toBuffer()
    .then(buf => sharp(buf)
      .composite([
        { input: darkOverlay, top: 0, left: 0 },
        { input: resizedLogo, top: 250, left: logoLeft },
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
  const base = sharp({ create: { width: SIZE, height: SIZE, channels: 3, background: hexToRgb(SPD.bg) } });
  const cx = SIZE / 2;

  const resizedLogo = await sharp(logoBuffer).resize(90, 90, { fit: 'cover' }).png().toBuffer();

  const svg = Buffer.from(`
    <svg width="${SIZE}" height="${SIZE}" xmlns="http://www.w3.org/2000/svg">
      ${svgFontStyles()}

      <!-- Gold border frame -->
      <rect x="40" y="40" width="${SIZE - 80}" height="${SIZE - 80}"
            fill="none" stroke="${SPD.gold}" stroke-width="2.5"/>

      <!-- Corner brackets (L-shaped) -->
      ${cornerBracketsSvg(SIZE, 55, 60, 3, SPD.cornerDecor, ['tl', 'tr', 'bl', 'br'])}

      <!-- Background shamrocks -->
      <text x="850" y="250" font-size="120" fill="${SPD.shamrock}" opacity="0.04"
            transform="rotate(15,850,250)">&#9752;</text>
      <text x="200" y="800" font-size="90" fill="${SPD.shamrock}" opacity="0.03"
            transform="rotate(-25,200,800)">&#9752;</text>

      <!-- Masthead -->
      <text x="${cx}" y="180"
            font-family="Inter" font-weight="700" font-size="38"
            fill="white" text-anchor="middle" letter-spacing="12">
        ${escapeXml(appName.toUpperCase())}
      </text>

      <!-- Gold rule -->
      <rect x="${cx - 160}" y="200" width="320" height="2" fill="${SPD.goldRule}"/>

      <!-- Holiday header with shamrock dividers -->
      <line x1="200" y1="330" x2="420" y2="330" stroke="${SPD.goldRule}" stroke-width="1"/>
      <text x="${cx}" y="336"
            font-family="Inter" font-weight="700" font-size="16"
            fill="${SPD.goldMuted}" text-anchor="middle" letter-spacing="4">
        &#9752; ${escapeXml(holidayLabel.toUpperCase())} &#9752;
      </text>
      <line x1="660" y1="330" x2="880" y2="330" stroke="${SPD.goldRule}" stroke-width="1"/>

      <!-- Hero text -->
      <text x="${cx}" y="500"
            font-family="Inter" font-weight="900" font-size="72"
            fill="${SPD.gold}" text-anchor="middle" letter-spacing="2">
        THIS WEEK
      </text>
      <text x="${cx}" y="580"
            font-family="Inter" font-weight="700" font-size="44"
            fill="${SPD.textPrimary}" text-anchor="middle" letter-spacing="3">
        IN ${escapeXml(marketName.toUpperCase())}
      </text>

      <!-- Shamrock divider -->
      <line x1="300" y1="640" x2="490" y2="640" stroke="${SPD.goldRule}" stroke-width="1"/>
      <text x="${cx}" y="646" font-family="Inter" font-size="14" fill="${SPD.goldMuted}" text-anchor="middle">&#9752;</text>
      <line x1="590" y1="640" x2="780" y2="640" stroke="${SPD.goldRule}" stroke-width="1"/>

      <!-- Subtitle -->
      <text x="${cx}" y="720"
            font-family="Inter" font-weight="400" font-size="26" font-style="italic"
            fill="${SPD.shamrock}" text-anchor="middle">
        Specials, Brunch &amp; Live Music
      </text>

      <!-- Date -->
      <text x="${cx}" y="780"
            font-family="Inter" font-weight="600" font-size="20"
            fill="${SPD.goldMuted}" text-anchor="middle" letter-spacing="3">
        ${escapeXml(dateLabel.toUpperCase())}
      </text>

      <!-- Swipe CTA -->
      <text x="${cx}" y="${SIZE - 80}"
            font-family="Inter" font-weight="400" font-size="18"
            fill="rgba(255,255,255,0.4)" text-anchor="middle" letter-spacing="4">
        SWIPE FOR DEALS  &#x276F;
      </text>
    </svg>`);

  return base
    .jpeg({ quality: JPEG_QUALITY })
    .toBuffer()
    .then(buf => sharp(buf)
      .composite([
        { input: resizedLogo, top: 70, left: Math.round((SIZE - 90) / 2) },
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
  const base = sharp({ create: { width: SIZE, height: SIZE, channels: 3, background: hexToRgb(SPD.bg) } });
  const cx = SIZE / 2;

  // Build specials SVG content
  let specialsSvg = '';
  let yPos = 520;
  const maxSpecials = Math.min(slide.specials.length, 4);

  for (let i = 0; i < maxSpecials; i++) {
    const s = slide.specials[i];
    // Extract price from name (e.g., "$3 Irish Jello Shots" → price="$3", deal="IRISH JELLO SHOTS")
    const priceMatch = s.name.match(/^\$(\d+(?:\.\d{2})?)\s+(.+)/) || s.name.match(/(.+)\s+\$(\d+(?:\.\d{2})?)$/);
    const hasExplicitPrice = s.price && parseFloat(s.price) > 0;

    if (hasExplicitPrice || priceMatch) {
      const price = hasExplicitPrice ? `$${Math.round(parseFloat(s.price!))}` : (priceMatch![1].startsWith('$') ? priceMatch![1] : `$${priceMatch![2]}`);
      const dealName = hasExplicitPrice
        ? s.name.replace(/\$\d+(?:\.\d{2})?\s*/g, '').trim()
        : (priceMatch![1].startsWith('$') ? priceMatch![2] : priceMatch![1]).trim();

      specialsSvg += `
        <text x="${cx - 10}" y="${yPos}"
              font-family="Inter" font-weight="900" font-size="56"
              fill="${SPD.gold}" text-anchor="end">${escapeXml(price)}</text>
        <text x="${cx + 10}" y="${yPos}"
              font-family="Inter" font-weight="700" font-size="28"
              fill="${SPD.textPrimary}" text-anchor="start"
              letter-spacing="1">${escapeXml(dealName.toUpperCase())}</text>
      `;
    } else {
      // No price — show name centered
      specialsSvg += `
        <text x="${cx}" y="${yPos}"
              font-family="Inter" font-weight="800" font-size="30"
              fill="${SPD.textPrimary}" text-anchor="middle"
              letter-spacing="2">${escapeXml(s.name.toUpperCase())}</text>
      `;
    }

    if (s.description) {
      yPos += 30;
      specialsSvg += `
        <text x="${cx}" y="${yPos}"
              font-family="Inter" font-weight="400" font-size="18" font-style="italic"
              fill="${SPD.textMuted}" text-anchor="middle">${escapeXml(s.description)}</text>
      `;
    }

    // Green divider between specials
    if (i < maxSpecials - 1) {
      yPos += 35;
      specialsSvg += `
        <line x1="350" y1="${yPos}" x2="730" y2="${yPos}"
              stroke="${SPD.shamrock}" stroke-width="1" opacity="0.15"/>
      `;
      yPos += 40;
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

      <!-- Background shamrocks -->
      <text x="880" y="200" font-size="80" fill="${SPD.shamrock}" opacity="0.04"
            transform="rotate(15,880,200)">&#9752;</text>
      <text x="150" y="900" font-size="60" fill="${SPD.shamrock}" opacity="0.03"
            transform="rotate(-20,150,900)">&#9752;</text>

      <!-- Holiday header -->
      <line x1="250" y1="140" x2="420" y2="140" stroke="${SPD.goldRule}" stroke-width="1"/>
      <text x="${cx}" y="146"
            font-family="Inter" font-weight="700" font-size="14"
            fill="${SPD.goldMuted}" text-anchor="middle" letter-spacing="4">
        ST. PATRICK&apos;S DAY 2026
      </text>
      <line x1="660" y1="140" x2="830" y2="140" stroke="${SPD.goldRule}" stroke-width="1"/>

      <!-- Restaurant name -->
      <text x="${cx}" y="280"
            font-family="Inter" font-weight="900" font-size="${slide.restaurant_name.length > 20 ? 38 : 48}"
            fill="${SPD.gold}" text-anchor="middle"
            letter-spacing="1">${escapeXml(slide.restaurant_name.toUpperCase())}</text>

      <!-- Shamrock divider -->
      <line x1="280" y1="330" x2="470" y2="330" stroke="${SPD.goldRule}" stroke-width="1"/>
      <text x="${cx}" y="336" font-family="Inter" font-size="12" fill="${SPD.goldMuted}" text-anchor="middle">&#9752;</text>
      <line x1="610" y1="330" x2="800" y2="330" stroke="${SPD.goldRule}" stroke-width="1"/>

      <!-- Specials -->
      ${specialsSvg}

      <!-- Bottom shamrock divider -->
      <line x1="280" y1="${SIZE - 180}" x2="470" y2="${SIZE - 180}" stroke="${SPD.goldRule}" stroke-width="1"/>
      <text x="${cx}" y="${SIZE - 174}" font-family="Inter" font-size="12" fill="${SPD.goldMuted}" text-anchor="middle">&#9752;</text>
      <line x1="610" y1="${SIZE - 180}" x2="800" y2="${SIZE - 180}" stroke="${SPD.goldRule}" stroke-width="1"/>

      <!-- Brand footer -->
      <text x="${cx}" y="${SIZE - 120}"
            font-family="Inter" font-weight="600" font-size="14"
            fill="${SPD.goldMuted}" text-anchor="middle" letter-spacing="3">
        ${escapeXml(appName.toUpperCase())}  &#183;  ${escapeXml(dateLabel.toUpperCase())}
      </text>
    </svg>`);

  return base
    .jpeg({ quality: JPEG_QUALITY })
    .toBuffer()
    .then(buf => sharp(buf)
      .composite([{ input: svg, top: 0, left: 0 }])
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

  const moreText = remainingCount > 0
    ? `+ ${remainingCount} more bars celebrating`
    : 'See all the deals';

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

  // Keep ALL candidates — use null buffer for those without images (slides will use solid bg)
  let allSlides: Buffer[];

  if (contentType === 'upcoming_events') {
    // EVENT POSTER style — only use candidates with images
    const validIndices = imageBuffers.map((b, i) => b !== null ? i : -1).filter(i => i !== -1);
    const validBuffers = validIndices.map(i => imageBuffers[i]!);
    const validCandidates = validIndices.map(i => candidates[i]);
    allSlides = await composeEventPosterSlides(validBuffers, validCandidates, headline, totalCount, logoBuffer, appName, marketName);
  } else {
    // MAGAZINE style — ALL candidates get slides, even without images
    const coverImage = imageBuffers.find(b => b !== null) || null;
    const [coverSlide, ...restaurantSlides] = await Promise.all([
      composeCoverSlide(coverImage, headline, logoBuffer, appName),
      ...candidates.map((c, i) =>
        composeRestaurantSlide(imageBuffers[i], c.restaurant_name, c.detail_text, logoBuffer)
      ),
    ]);
    const ctaBackgroundImage = imageBuffers.filter(b => b !== null).pop() || coverImage;
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
  appName: string
): Promise<Buffer> {
  // Magazine cover: big photo with heavy dark overlay, text scattered like a masthead
  let base: sharp.Sharp;
  if (imageBuffer) {
    base = sharp(imageBuffer).resize(SIZE, SIZE, { fit: 'cover', position: 'centre' });
  } else {
    base = sharp({ create: { width: SIZE, height: SIZE, channels: 3, background: { r: 25, g: 20, b: 30 } } });
  }

  // Heavy dark overlay — magazine covers darken the photo so text pops
  const overlaySvg = Buffer.from(`
    <svg width="${SIZE}" height="${SIZE}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="mag" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" style="stop-color:black;stop-opacity:0.7"/>
          <stop offset="35%" style="stop-color:black;stop-opacity:0.35"/>
          <stop offset="65%" style="stop-color:black;stop-opacity:0.35"/>
          <stop offset="100%" style="stop-color:black;stop-opacity:0.8"/>
        </linearGradient>
      </defs>
      <rect width="${SIZE}" height="${SIZE}" fill="url(#mag)"/>
    </svg>`);

  // Masthead: app name top-center (like magazine title)
  // Big count number center, category label, day label
  // "Swipe" CTA at bottom
  const centerX = SIZE / 2;

  const textSvg = Buffer.from(`
    <svg width="${SIZE}" height="${SIZE}" xmlns="http://www.w3.org/2000/svg">
      ${svgFontStyles()}

      <!-- Masthead: app name, uppercase, letterspaced -->
      <text x="${centerX}" y="100"
            font-family="Inter" font-weight="700" font-size="52"
            fill="white" text-anchor="middle"
            letter-spacing="12">
        ${escapeXml(appName.toUpperCase())}
      </text>

      <!-- Thin gold rule under masthead -->
      <rect x="${centerX - 160}" y="120" width="320" height="2" fill="${ACCENT}"/>

      <!-- Tagline under masthead -->
      <text x="${centerX}" y="160"
            font-family="Inter" font-weight="400" font-size="22" font-style="italic"
            fill="${ACCENT_DIM}" text-anchor="middle">
        Your guide to what&apos;s happening tonight
      </text>

      <!-- Big count number — the hero element -->
      <text x="${centerX}" y="620"
            font-family="Inter" font-weight="700" font-size="200"
            fill="white" text-anchor="middle"
            opacity="1">
        ${escapeXml(headline.count)}
      </text>

      <!-- Category label in gold -->
      <text x="${centerX}" y="700"
            font-family="Inter" font-weight="700" font-size="52"
            fill="${ACCENT}" text-anchor="middle">
        ${escapeXml(headline.label.toUpperCase())}
      </text>

      <!-- Day label, italic white -->
      <text x="${centerX}" y="770"
            font-family="Inter" font-weight="400" font-size="40" font-style="italic"
            fill="rgba(255,255,255,0.9)" text-anchor="middle">
        ${escapeXml(headline.dayLabel)}
      </text>

      <!-- Swipe CTA at bottom -->
      <text x="${centerX}" y="${SIZE - 60}"
            font-family="Inter" font-weight="400" font-size="26"
            fill="rgba(255,255,255,0.6)" text-anchor="middle"
            letter-spacing="3">
        SWIPE FOR TOP PICKS  &gt;
      </text>
    </svg>`);

  // Logo: app icon with built-in background, no extra badge needed
  const resizedLogo = await sharp(logoBuffer)
    .resize(100, 100, { fit: 'cover' })
    .png()
    .toBuffer();

  return base
    .jpeg({ quality: JPEG_QUALITY })
    .toBuffer()
    .then(buf => sharp(buf)
      .composite([
        { input: overlaySvg, top: 0, left: 0 },
        { input: resizedLogo, top: 30, left: 40 },
        { input: textSvg, top: 0, left: 0 },
      ])
      .jpeg({ quality: JPEG_QUALITY })
      .toBuffer()
    );
}

async function composeRestaurantSlide(
  imageBuffer: Buffer | null,
  name: string,
  detail: string,
  logoBuffer: Buffer
): Promise<Buffer> {
  // If no image, create a dark gradient background
  const base = imageBuffer
    ? sharp(imageBuffer).resize(SIZE, SIZE, { fit: 'cover', position: 'centre' })
    : sharp({ create: { width: SIZE, height: SIZE, channels: 3, background: { r: 25, g: 25, b: 30 } } });

  // Heavier bottom gradient for magazine feel
  const gradientSvg = Buffer.from(`
    <svg width="${SIZE}" height="${SIZE}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="grad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" style="stop-color:black;stop-opacity:0.15"/>
          <stop offset="45%" style="stop-color:black;stop-opacity:0.05"/>
          <stop offset="70%" style="stop-color:black;stop-opacity:0.5"/>
          <stop offset="100%" style="stop-color:black;stop-opacity:0.92"/>
        </linearGradient>
      </defs>
      <rect width="${SIZE}" height="${SIZE}" fill="url(#grad)"/>
    </svg>`);

  // Restaurant name (large bold) + detail (gold italic) + thin gold rule
  const textSvg = Buffer.from(`
    <svg width="${SIZE}" height="${SIZE}" xmlns="http://www.w3.org/2000/svg">
      ${svgFontStyles()}
      <text x="60" y="${SIZE - 110}"
            font-family="Inter" font-weight="700" font-size="52"
            fill="white" text-anchor="start">
        ${escapeXml(name)}
      </text>
      <!-- Gold dot + detail text -->
      <circle cx="72" cy="${SIZE - 68}" r="5" fill="${ACCENT}"/>
      <text x="88" y="${SIZE - 58}"
            font-family="Inter" font-weight="400" font-size="30" font-style="italic"
            fill="${ACCENT}" text-anchor="start">
        ${escapeXml(detail)}
      </text>
    </svg>`);

  // App icon top-right — has its own background, no badge needed
  const smallLogo = await sharp(logoBuffer)
    .resize(70, 70, { fit: 'cover' })
    .png()
    .toBuffer();

  return base
    .jpeg({ quality: JPEG_QUALITY })
    .toBuffer()
    .then(buf => sharp(buf)
      .composite([
        { input: gradientSvg, top: 0, left: 0 },
        { input: smallLogo, top: 30, left: SIZE - 100 },
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
  // Use a blurred/darkened photo as background instead of plain black
  let base: sharp.Sharp;
  if (backgroundImage) {
    // Resize, blur heavily, and darken for a rich textured background
    const blurred = await sharp(backgroundImage)
      .resize(SIZE, SIZE, { fit: 'cover', position: 'centre' })
      .blur(30)
      .modulate({ brightness: 0.25 })
      .toBuffer();
    base = sharp(blurred);
  } else {
    base = sharp({
      create: { width: SIZE, height: SIZE, channels: 3, background: { r: 18, g: 18, b: 22 } }
    });
  }

  // App icon centered — already has its own dark background
  const resizedLogo = await sharp(logoBuffer)
    .resize(240, 240, { fit: 'cover' })
    .png()
    .toBuffer();

  const logoLeft = Math.round((SIZE - 240) / 2);
  const logoTop = 230;

  const textSvg = Buffer.from(`
    <svg width="${SIZE}" height="${SIZE}" xmlns="http://www.w3.org/2000/svg">
      ${svgFontStyles()}

      <!-- Gold rule -->
      <rect x="${SIZE / 2 - 100}" y="580" width="200" height="2" fill="${ACCENT}"/>

      <text x="${SIZE / 2}" y="640"
            font-family="Inter" font-weight="700" font-size="52"
            fill="white" text-anchor="middle">
        See all ${totalCount}
      </text>
      <text x="${SIZE / 2}" y="700"
            font-family="Inter" font-weight="400" font-size="32" font-style="italic"
            fill="${ACCENT}" text-anchor="middle">
        on ${escapeXml(appName)}
      </text>
      <text x="${SIZE / 2}" y="760"
            font-family="Inter" font-weight="400" font-size="26"
            fill="rgba(255,255,255,0.6)" text-anchor="middle">
        Download free on the App Store or Google Play
      </text>

      <!-- CTA button -->
      <rect x="${SIZE / 2 - 130}" y="810" width="260" height="56" rx="28" ry="28"
            fill="${ACCENT}"/>
      <text x="${SIZE / 2}" y="846"
            font-family="Inter" font-weight="700" font-size="24"
            fill="#121216" text-anchor="middle">
        Link in Bio
      </text>
    </svg>`);

  // Dark overlay to ensure text readability over the blurred photo
  const darkOverlay = Buffer.from(`
    <svg width="${SIZE}" height="${SIZE}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${SIZE}" height="${SIZE}" fill="rgba(0,0,0,0.5)"/>
    </svg>`);

  return base
    .jpeg({ quality: JPEG_QUALITY })
    .toBuffer()
    .then(buf => sharp(buf)
      .composite([
        { input: darkOverlay, top: 0, left: 0 },
        { input: resizedLogo, top: logoTop, left: logoLeft },
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
  let base: sharp.Sharp;
  if (imageBuffer) {
    base = sharp(imageBuffer).resize(SIZE, SIZE, { fit: 'cover', position: 'centre' });
  } else {
    base = sharp({ create: { width: SIZE, height: SIZE, channels: 3, background: { r: 20, g: 20, b: 25 } } });
  }

  // Heavy dark overlay so shapes and text pop
  const overlaySvg = Buffer.from(`
    <svg width="${SIZE}" height="${SIZE}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${SIZE}" height="${SIZE}" fill="rgba(0,0,0,0.72)"/>
    </svg>`);

  // Build the geometric block layout
  // Large gold block at top with "THIS WEEK" + market name
  // Big count in a dark block in the center
  // Corner brackets framing the whole slide
  const blockW = 620;
  const blockH = 180;
  const blockX = 60;
  const blockY = 160;

  const countBlockW = 400;
  const countBlockH = 260;
  const countBlockX = SIZE - countBlockW - 60;
  const countBlockY = 500;

  const textSvg = Buffer.from(`
    <svg width="${SIZE}" height="${SIZE}" xmlns="http://www.w3.org/2000/svg">
      ${svgFontStyles()}

      <!-- Corner brackets — top-left and bottom-right -->
      ${cornerBracketsSvg(SIZE, 30, 100, 4, ACCENT, ['tl', 'br'])}

      <!-- Gold block — "THIS WEEK IN LANCASTER" -->
      <rect x="${blockX}" y="${blockY}" width="${blockW}" height="${blockH}" fill="${ACCENT}"/>
      <text x="${blockX + 32}" y="${blockY + 72}"
            font-family="Inter" font-weight="700" font-size="60"
            fill="#111111" text-anchor="start"
            letter-spacing="3">
        THIS WEEK
      </text>
      <text x="${blockX + 32}" y="${blockY + 135}"
            font-family="Inter" font-weight="700" font-size="44"
            fill="rgba(0,0,0,0.7)" text-anchor="start">
        IN ${escapeXml(marketName.toUpperCase())}
      </text>

      <!-- Dark block with label text -->
      <rect x="${countBlockX}" y="${countBlockY}" width="${countBlockW}" height="${countBlockH}" fill="rgba(0,0,0,0.85)"/>
      <rect x="${countBlockX}" y="${countBlockY}" width="${countBlockW}" height="5" fill="${ACCENT}"/>
      <text x="${countBlockX + countBlockW / 2}" y="${countBlockY + 110}"
            font-family="Inter" font-weight="700" font-size="52"
            fill="white" text-anchor="middle"
            letter-spacing="3">
        LIVE
      </text>
      <text x="${countBlockX + countBlockW / 2}" y="${countBlockY + 180}"
            font-family="Inter" font-weight="700" font-size="52"
            fill="${ACCENT}" text-anchor="middle"
            letter-spacing="3">
        ${escapeXml(headline.label.toUpperCase())}
      </text>

      <!-- App name bottom-left in a small dark pill -->
      <rect x="60" y="${SIZE - 110}" width="260" height="50" rx="4" ry="4" fill="rgba(0,0,0,0.7)"/>
      <text x="80" y="${SIZE - 78}"
            font-family="Inter" font-weight="700" font-size="24"
            fill="white" text-anchor="start"
            letter-spacing="2">
        ${escapeXml(appName.toUpperCase())}
      </text>

      <!-- Swipe CTA bottom right -->
      <text x="${SIZE - 50}" y="${SIZE - 50}"
            font-family="Inter" font-weight="400" font-size="20"
            fill="rgba(255,255,255,0.5)" text-anchor="end"
            letter-spacing="2">
        SWIPE &gt;
      </text>
    </svg>`);

  // App icon top-right — has its own dark background
  const resizedLogo = await sharp(logoBuffer)
    .resize(70, 70, { fit: 'cover' })
    .png()
    .toBuffer();

  return base
    .jpeg({ quality: JPEG_QUALITY })
    .toBuffer()
    .then(buf => sharp(buf)
      .composite([
        { input: overlaySvg, top: 0, left: 0 },
        { input: textSvg, top: 0, left: 0 },
        { input: resizedLogo, top: 50, left: SIZE - 120 },
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

  // Bottom gradient — text block sits at the bottom
  const gradientSvg = Buffer.from(`
    <svg width="${SIZE}" height="${SIZE}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="evtBlock" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" style="stop-color:black;stop-opacity:0"/>
          <stop offset="55%" style="stop-color:black;stop-opacity:0.1"/>
          <stop offset="75%" style="stop-color:black;stop-opacity:0.7"/>
          <stop offset="100%" style="stop-color:black;stop-opacity:0.95"/>
        </linearGradient>
      </defs>
      <rect width="${SIZE}" height="${SIZE}" fill="url(#evtBlock)"/>
    </svg>`);

  // Solid block at bottom with restaurant name
  const nameLines = wrapText(name, 20);
  const blockH = 180 + (nameLines.length - 1) * 60;
  const blockY = SIZE - blockH;

  const nameSvgParts = nameLines.map((line, i) =>
    `<text x="100" y="${blockY + 75 + i * 60}"
           font-family="Inter" font-weight="700" font-size="50"
           fill="white" text-anchor="start">
       ${escapeXml(line)}
     </text>`
  ).join('\n');

  const detailY = blockY + 75 + nameLines.length * 60 + 10;

  const textSvg = Buffer.from(`
    <svg width="${SIZE}" height="${SIZE}" xmlns="http://www.w3.org/2000/svg">
      ${svgFontStyles()}

      <!-- Corner brackets — top-right and bottom-left -->
      ${cornerBracketsSvg(SIZE, 24, 70, 3, ACCENT, ['tr', 'bl'])}

      <!-- Slide counter — top left, gold block -->
      <rect x="30" y="30" width="80" height="40" fill="${ACCENT}"/>
      <text x="70" y="58"
            font-family="Inter" font-weight="700" font-size="22"
            fill="#111111" text-anchor="middle">
        ${slideNumber}/${totalSlides}
      </text>

      <!-- Dark text block at bottom -->
      <rect x="60" y="${blockY}" width="${SIZE - 120}" height="${blockH}" rx="0" ry="0" fill="rgba(0,0,0,0.75)"/>

      <!-- Gold top border on the text block -->
      <rect x="60" y="${blockY}" width="${SIZE - 120}" height="4" fill="${ACCENT}"/>

      <!-- Restaurant name -->
      ${nameSvgParts}

      <!-- Detail text -->
      <text x="100" y="${detailY}"
            font-family="Inter" font-weight="400" font-size="26"
            fill="${ACCENT}" text-anchor="start">
        ${escapeXml(detail)}
      </text>
    </svg>`);

  // App icon top-right — has its own dark background
  const smallLogo = await sharp(logoBuffer)
    .resize(50, 50, { fit: 'cover' })
    .png()
    .toBuffer();

  return base
    .jpeg({ quality: JPEG_QUALITY })
    .toBuffer()
    .then(buf => sharp(buf)
      .composite([
        { input: gradientSvg, top: 0, left: 0 },
        { input: textSvg, top: 0, left: 0 },
        { input: smallLogo, top: 34, left: SIZE - 84 },
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
  // Blurred photo background with dark overlay
  let base: sharp.Sharp;
  if (backgroundImage) {
    const blurred = await sharp(backgroundImage)
      .resize(SIZE, SIZE, { fit: 'cover', position: 'centre' })
      .blur(30)
      .modulate({ brightness: 0.2 })
      .toBuffer();
    base = sharp(blurred);
  } else {
    base = sharp({
      create: { width: SIZE, height: SIZE, channels: 3, background: { r: 18, g: 18, b: 22 } }
    });
  }

  // App icon centered — has its own dark background
  const logoSize = 200;
  const resizedLogo = await sharp(logoBuffer)
    .resize(logoSize, logoSize, { fit: 'cover' })
    .png()
    .toBuffer();

  const logoLeft = Math.round((SIZE - logoSize) / 2);
  const logoTop = 200;

  // Big centered block with count + CTA
  const ctaBlockW = SIZE - 120;
  const ctaBlockH = 320;
  const ctaBlockX = 60;
  const ctaBlockY = 480;

  const textSvg = Buffer.from(`
    <svg width="${SIZE}" height="${SIZE}" xmlns="http://www.w3.org/2000/svg">
      ${svgFontStyles()}

      <!-- Corner brackets — all four corners -->
      ${cornerBracketsSvg(SIZE, 30, 100, 4, ACCENT, ['tl', 'tr', 'bl', 'br'])}

      <!-- Dark CTA block -->
      <rect x="${ctaBlockX}" y="${ctaBlockY}" width="${ctaBlockW}" height="${ctaBlockH}" rx="0" ry="0" fill="rgba(0,0,0,0.8)"/>
      <rect x="${ctaBlockX}" y="${ctaBlockY}" width="${ctaBlockW}" height="5" fill="${ACCENT}"/>

      <!-- Headline -->
      <text x="${SIZE / 2}" y="${ctaBlockY + 70}"
            font-family="Inter" font-weight="700" font-size="48"
            fill="white" text-anchor="middle">
        Don&apos;t Miss Out
      </text>

      <!-- Subtitle -->
      <text x="${SIZE / 2}" y="${ctaBlockY + 125}"
            font-family="Inter" font-weight="400" font-size="28"
            fill="rgba(255,255,255,0.6)" text-anchor="middle">
        See the full lineup on ${escapeXml(appName)}
      </text>

      <!-- Gold divider inside block -->
      <rect x="${SIZE / 2 - 60}" y="${ctaBlockY + 155}" width="120" height="3" fill="${ACCENT}"/>

      <!-- Download text -->
      <text x="${SIZE / 2}" y="${ctaBlockY + 205}"
            font-family="Inter" font-weight="400" font-size="22"
            fill="rgba(255,255,255,0.5)" text-anchor="middle">
        Free on the App Store &amp; Google Play
      </text>

      <!-- CTA button — gold rectangle, not rounded -->
      <rect x="${SIZE / 2 - 130}" y="${ctaBlockY + 235}" width="260" height="54" rx="4" ry="4"
            fill="${ACCENT}"/>
      <text x="${SIZE / 2}" y="${ctaBlockY + 270}"
            font-family="Inter" font-weight="700" font-size="24"
            fill="#111111" text-anchor="middle">
        LINK IN BIO
      </text>
    </svg>`);

  const darkOverlay = Buffer.from(`
    <svg width="${SIZE}" height="${SIZE}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${SIZE}" height="${SIZE}" fill="rgba(0,0,0,0.5)"/>
    </svg>`);

  return base
    .jpeg({ quality: JPEG_QUALITY })
    .toBuffer()
    .then(buf => sharp(buf)
      .composite([
        { input: darkOverlay, top: 0, left: 0 },
        { input: resizedLogo, top: logoTop, left: logoLeft },
        { input: textSvg, top: 0, left: 0 },
      ])
      .jpeg({ quality: JPEG_QUALITY })
      .toBuffer()
    );
}

// ============================================================
// Helpers
// ============================================================

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
