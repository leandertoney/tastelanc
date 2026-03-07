// Instagram Carousel Overlay System
// Composites branded text overlays onto restaurant photos using sharp + SVG
// Design: Magazine cover aesthetic (inspired by Barfly Lancaster)

import sharp from 'sharp';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { SupabaseClient } from '@supabase/supabase-js';
import { SlideCandidate, MarketConfig, HeadlineParts } from './types';
import { getMarketDisplayName, getAppName } from './prompts';

const SIZE = 1080;
const JPEG_QUALITY = 92;

// Brand colors
const ACCENT = '#E8C547'; // warm gold accent
const ACCENT_DIM = 'rgba(232,197,71,0.8)';

// Load fonts once at module level (cached across invocations)
let fontBoldBase64: string | null = null;
let fontRegularBase64: string | null = null;

function getFontBoldBase64(): string {
  if (!fontBoldBase64) {
    const fontPath = join(process.cwd(), 'lib/instagram/fonts/Inter-Bold.woff2');
    fontBoldBase64 = readFileSync(fontPath).toString('base64');
  }
  return fontBoldBase64;
}

function getFontRegularBase64(): string {
  if (!fontRegularBase64) {
    const fontPath = join(process.cwd(), 'lib/instagram/fonts/Inter-Regular.woff2');
    fontRegularBase64 = readFileSync(fontPath).toString('base64');
  }
  return fontRegularBase64;
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
  return `
    <style>
      @font-face {
        font-family: 'Inter';
        font-weight: 700;
        src: url(data:font/woff2;base64,${getFontBoldBase64()});
      }
      @font-face {
        font-family: 'Inter';
        font-weight: 400;
        src: url(data:font/woff2;base64,${getFontRegularBase64()});
      }
    </style>`;
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

  // Fetch all source images in parallel — ONLY custom uploaded images, no stock
  const STOCK_PREFIXES = ['https://tastelanc.com/images/events/', 'https://tastelanc.com/images/entertainment/', 'https://tastecumberland.com/images/events/'];
  const imageBuffers = await Promise.all(
    candidates.map(async (c) => {
      if (!c.image_url || STOCK_PREFIXES.some(p => c.image_url!.startsWith(p))) return null;
      try {
        return await fetchImageBuffer(c.image_url);
      } catch {
        return null;
      }
    })
  );

  const validIndices = imageBuffers.map((b, i) => b !== null ? i : -1).filter(i => i !== -1);
  const validBuffers = validIndices.map(i => imageBuffers[i]!);
  const validCandidates = validIndices.map(i => candidates[i]);

  let allSlides: Buffer[];

  if (contentType === 'upcoming_events') {
    // EVENT POSTER style — completely different design
    allSlides = await composeEventPosterSlides(validBuffers, validCandidates, headline, totalCount, logoBuffer, appName, marketName);
  } else {
    // MAGAZINE style — original design for happy hours, specials, roundups
    const coverImage = validBuffers[0] || null;
    const [coverSlide, ...restaurantSlides] = await Promise.all([
      composeCoverSlide(coverImage, headline, logoBuffer, appName),
      ...validCandidates.map((c, i) =>
        composeRestaurantSlide(validBuffers[i], c.restaurant_name, c.detail_text, logoBuffer)
      ),
    ]);
    const ctaBackgroundImage = validBuffers[validBuffers.length - 1] || validBuffers[0] || null;
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
  // Restaurant slides MUST have a real image — no stock/fallback
  if (!imageBuffer) {
    throw new Error(`No image available for restaurant slide: ${name}`);
  }

  const base = sharp(imageBuffer).resize(SIZE, SIZE, { fit: 'cover', position: 'centre' });

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
