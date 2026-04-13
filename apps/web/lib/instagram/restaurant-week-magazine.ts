/**
 * Restaurant Week 2026 Magazine Generator
 *
 * Generates a 9-page Instagram carousel for Restaurant Week Lancaster
 * Featuring TasteLanc x Thirsty for Knowledge partnership
 *
 * Color Palette:
 * - Terracotta: #C8532A
 * - Yellow: #F0D060
 * - Deep Brown: #2C0F06
 */

import sharp from 'sharp';
import { SupabaseClient } from '@supabase/supabase-js';
import { MarketConfig } from './types';

const W = 1080;
const H = 1350; // 4:5 portrait
const JPEG_Q = 92;

// Restaurant Week Brand Colors
const RW = {
  terracotta: '#C8532A',
  yellow: '#F0D060',
  bgDark: '#2C0F06',
  textLight: '#F5F2EE',
};

// ============================================================
// Helper Functions
// ============================================================

function escapeXml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace('#', '');
  return { r: parseInt(h.slice(0, 2), 16), g: parseInt(h.slice(2, 4), 16), b: parseInt(h.slice(4, 6), 16) };
}

async function uploadSlide(supabase: SupabaseClient, buffer: Buffer, path: string): Promise<string> {
  const { error } = await supabase.storage.from('images').upload(path, buffer, { contentType: 'image/jpeg', upsert: true });
  if (error) throw new Error(`Upload failed: ${error.message}`);
  const { data } = supabase.storage.from('images').getPublicUrl(path);
  return data.publicUrl;
}

async function fetchImageBuffer(url: string): Promise<Buffer> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to fetch image: ${response.status} ${url}`);
  return Buffer.from(await response.arrayBuffer());
}

/**
 * Generate RW Badge SVG (matches mobile app badge exactly)
 */
function generateRWBadge(size: number): string {
  const outerSq = Math.round(size / Math.SQRT2);
  const innerSq = Math.round(outerSq * 0.92);
  const fontSize = Math.round(size * 0.35);
  const yearSize = Math.round(fontSize * 0.38);

  const angles = [0, 60, 120];

  return `
    <g>
      ${angles.map(angle => `
        <rect x="${(W / 2) - outerSq / 2}" y="${200 - outerSq / 2}"
              width="${outerSq}" height="${outerSq}"
              fill="${RW.yellow}"
              transform="rotate(${angle} ${W / 2} 200)" />
      `).join('')}
      ${angles.map(angle => `
        <rect x="${(W / 2) - innerSq / 2}" y="${200 - innerSq / 2}"
              width="${innerSq}" height="${innerSq}"
              fill="${RW.terracotta}"
              transform="rotate(${angle} ${W / 2} 200)" />
      `).join('')}
      <text x="${W / 2}" y="${200 + fontSize / 3}"
            font-family="Inter" font-weight="900" font-size="${fontSize}"
            fill="${RW.yellow}" text-anchor="middle" letter-spacing="2">RW</text>
      <text x="${W / 2}" y="${200 + fontSize / 2 + 10}"
            font-family="Inter" font-weight="700" font-size="${yearSize}"
            fill="${RW.yellow}" text-anchor="middle" letter-spacing="1">2026</text>
    </g>
  `;
}

// ============================================================
// Page 1: Cover (using TasteLanc Magazine layout)
// ============================================================

async function composeCover(supabase: SupabaseClient, marketId: string): Promise<Buffer> {
  // FRAMED MAGAZINE COVER — matching the existing TasteLanc Magazine design
  const BORDER = 18;
  const TOP_BAR = 36;
  const BOTTOM_H = 290;
  const BRAND_COLOR = RW.terracotta; // Use RW colors instead of purple

  // Try to fetch 3 different restaurant photos (1 for main cover, 2 for bottom features)
  const { data: allRestaurants } = await supabase
    .from('restaurants')
    .select('id, name, cover_image_url')
    .eq('market_id', marketId)
    .eq('is_active', true)
    .not('cover_image_url', 'is', null)
    .not('rw_description', 'is', null)
    .limit(10);

  // Ensure we get 3 DIFFERENT restaurants
  const restaurants = allRestaurants?.slice(0, 3).filter((r, i, arr) =>
    i === 0 || (i === 1 && r.id !== arr[0].id) || (i === 2 && r.id !== arr[0].id && r.id !== arr[1].id)
  );

  const photoW = W - BORDER * 2;
  const photoH = H - TOP_BAR - BOTTOM_H;

  // Get THIRD restaurant's photo for main cover image (to avoid duplicates with feature sections)
  let mainPhotoBuffer: Buffer;
  try {
    if (restaurants && restaurants[2]?.cover_image_url) {
      const raw = await fetchImageBuffer(restaurants[2].cover_image_url);
      mainPhotoBuffer = await sharp(raw)
        .resize(photoW, photoH, { fit: 'cover', position: 'centre' })
        .modulate({ brightness: 1.05, saturation: 1.1 })
        .jpeg({ quality: JPEG_Q })
        .toBuffer();
    } else {
      mainPhotoBuffer = await sharp({ create: { width: photoW, height: photoH, channels: 3, background: hexToRgb(RW.bgDark) } })
        .jpeg({ quality: JPEG_Q })
        .toBuffer();
    }
  } catch {
    mainPhotoBuffer = await sharp({ create: { width: photoW, height: photoH, channels: 3, background: hexToRgb(RW.bgDark) } })
      .jpeg({ quality: JPEG_Q })
      .toBuffer();
  }

  // Feature thumbnails for bottom section - thematic images, NOT specific restaurants
  const THUMB_W = 280;
  const THUMB_H = 210;
  const featuredThumbs: Buffer[] = [];

  // Feature 1: DINING theme - get a FOOD PHOTO (not restaurant exterior)
  try {
    const { data: foodPhotos } = await supabase
      .from('restaurant_photos')
      .select('url')
      .eq('is_cover', false) // Must be food/interior photo, NOT cover image
      .limit(5);

    if (foodPhotos && foodPhotos.length > 0) {
      // Try the first photo, fallback to second if first fails
      for (const photo of foodPhotos) {
        try {
          const raw = await fetchImageBuffer(photo.url);
          const foodImg = await sharp(raw).resize(THUMB_W, THUMB_H, { fit: 'cover', position: 'centre' }).jpeg({ quality: 88 }).toBuffer();
          featuredThumbs.push(foodImg);
          break; // Success, stop trying
        } catch (err) {
          console.error('Failed to load food photo, trying next...');
        }
      }
    }
  } catch (err) {
    console.error('Failed to load DINING feature photo:', err);
  }

  // Feature 2: EVENTS theme - get an EVENT PROMOTIONAL IMAGE (artwork/graphics)
  // Only show CURRENT/UPCOMING events (not past events)
  try {
    const { data: eventImages } = await supabase
      .from('events')
      .select('name, image_url, event_date')
      .eq('market_id', marketId)
      .not('image_url', 'is', null)
      .gte('event_date', '2026-04-13') // Must be during or after Restaurant Week
      .limit(10);

    if (eventImages && eventImages.length > 0) {
      // Try the first event image, fallback to next if first fails
      for (const event of eventImages) {
        try {
          const raw = await fetchImageBuffer(event.image_url);
          const eventImg = await sharp(raw).resize(THUMB_W, THUMB_H, { fit: 'cover', position: 'centre' }).jpeg({ quality: 88 }).toBuffer();
          featuredThumbs.push(eventImg);
          break; // Success, stop trying
        } catch (err) {
          console.error(`Failed to load event image for ${event.name}, trying next...`);
        }
      }
    }
  } catch (err) {
    console.error('Failed to load EVENTS feature photo:', err);
  }

  // Start with terracotta background
  const base = sharp({ create: { width: W, height: H, channels: 3, background: hexToRgb(BRAND_COLOR) } });

  // Photo gradient overlay
  const photoOverlay = Buffer.from(`
    <svg width="${photoW}" height="${photoH}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="pho" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" style="stop-color:black;stop-opacity:0.45"/>
          <stop offset="15%" style="stop-color:black;stop-opacity:0.12"/>
          <stop offset="50%" style="stop-color:black;stop-opacity:0.03"/>
          <stop offset="80%" style="stop-color:black;stop-opacity:0.25"/>
          <stop offset="100%" style="stop-color:black;stop-opacity:0.6"/>
        </linearGradient>
      </defs>
      <rect width="${photoW}" height="${photoH}" fill="url(#pho)"/>
    </svg>`);

  const PAD = 20;
  const TASTE_SIZE = 105;
  const TASTE_X = PAD;
  const TASTE_Y = 115;
  const TASTE_CX = TASTE_X + 150;
  const issueDate = 'April 13-19, 2026';

  // Text overlay on photo
  const photoTextSvg = Buffer.from(`
    <svg width="${photoW}" height="${photoH}" xmlns="http://www.w3.org/2000/svg">
      <!-- "Taste" - LEFT, gold/yellow -->
      <text x="${TASTE_X + 4}" y="${TASTE_Y + 4}"
            font-family="Playfair Display" font-weight="900" font-size="${TASTE_SIZE}"
            fill="rgba(255,255,255,0.3)" text-anchor="start">Taste</text>
      <text x="${TASTE_X + 2}" y="${TASTE_Y + 2}"
            font-family="Playfair Display" font-weight="900" font-size="${TASTE_SIZE}"
            fill="rgba(0,0,0,0.5)" text-anchor="start">Taste</text>
      <text x="${TASTE_X}" y="${TASTE_Y}"
            font-family="Playfair Display" font-weight="900" font-size="${TASTE_SIZE}"
            fill="${RW.yellow}" text-anchor="start">Taste</text>

      <!-- "Lanc" - white, centered -->
      <text x="${TASTE_CX + 2}" y="${TASTE_Y + 39}"
            font-family="Inter" font-weight="300" font-size="28"
            fill="rgba(0,0,0,0.6)" text-anchor="middle"
            textLength="290" lengthAdjust="spacing">L  A  N  C</text>
      <text x="${TASTE_CX}" y="${TASTE_Y + 37}"
            font-family="Inter" font-weight="300" font-size="28"
            fill="white" text-anchor="middle"
            textLength="290" lengthAdjust="spacing">L  A  N  C</text>

      <!-- Restaurant Week Badge - styled like "Taste" with outline -->
      <text x="${photoW / 2 + 4}" y="${photoH - 80 + 4}"
            font-family="Inter" font-weight="900" font-size="42"
            fill="rgba(255,255,255,0.3)" text-anchor="middle" letter-spacing="4">RESTAURANT WEEK</text>
      <text x="${photoW / 2 + 2}" y="${photoH - 80 + 2}"
            font-family="Inter" font-weight="900" font-size="42"
            fill="rgba(0,0,0,0.5)" text-anchor="middle" letter-spacing="4">RESTAURANT WEEK</text>
      <text x="${photoW / 2}" y="${photoH - 80}"
            font-family="Inter" font-weight="900" font-size="42"
            fill="${RW.yellow}" text-anchor="middle" letter-spacing="4">RESTAURANT WEEK</text>

      <!-- Date - top right -->
      <text x="${photoW - PAD}" y="30"
            font-family="Playfair Display" font-weight="600" font-size="16"
            fill="rgba(255,255,255,0.85)" text-anchor="end">${escapeXml(issueDate)}</text>
    </svg>`);

  // Compose photo
  const composedPhoto = await sharp(mainPhotoBuffer)
    .composite([
      { input: photoOverlay, top: 0, left: 0 },
      { input: photoTextSvg, top: 0, left: 0 },
    ])
    .jpeg({ quality: JPEG_Q })
    .toBuffer();

  // Top bar
  const cx = W / 2;
  const tagline = 'LANCASTER COUNTY&apos;S GUIDE TO DINING, DRINKS &amp; NIGHTLIFE';
  const topBarSvg = Buffer.from(`
    <svg width="${W}" height="${TOP_BAR}" xmlns="http://www.w3.org/2000/svg">
      <text x="${cx}" y="${TOP_BAR - 10}"
            font-family="Inter" font-weight="700" font-size="13"
            fill="white" text-anchor="middle" letter-spacing="3">${tagline}</text>
    </svg>`);

  // Bottom section - 2 thematic images + PLUS section
  const B_PAD = 18;

  const usableW = W - B_PAD * 2;
  const THUMB_W_ACTUAL = Math.floor(usableW * 0.24);
  const CAT_W = Math.floor(usableW * 0.26);
  const COL_GAP = 40; // bigger gap between the two featured images
  const THUMB1_X = B_PAD;
  const THUMB2_X = THUMB1_X + THUMB_W_ACTUAL + COL_GAP;
  const CAT_X = THUMB2_X + THUMB_W_ACTUAL + COL_GAP;
  const SEP_X = CAT_X + CAT_W + 8;
  const LIST_X = SEP_X + 14;
  const THUMB_H_IMG = BOTTOM_H - B_PAD * 2 - 42;

  const CONTENT_H = THUMB_H_IMG + 42; // total content height
  const blockH = Math.floor(CONTENT_H / 3); // height for each category block

  const bottomSvg = Buffer.from(`
    <svg width="${W}" height="${BOTTOM_H}" xmlns="http://www.w3.org/2000/svg">
      <!-- Feature 1: DINING -->
      <text x="${THUMB1_X}" y="${B_PAD + THUMB_H_IMG + 18}"
            font-family="Inter" font-weight="900" font-size="18"
            fill="${RW.yellow}" text-anchor="start" letter-spacing="2">DINING</text>
      <text x="${THUMB1_X}" y="${B_PAD + THUMB_H_IMG + 38}"
            font-family="Playfair Display" font-weight="600" font-size="13"
            fill="white" text-anchor="start">Menus &amp; Flavors</text>

      <!-- Feature 2: EVENTS -->
      <text x="${THUMB2_X}" y="${B_PAD + THUMB_H_IMG + 18}"
            font-family="Inter" font-weight="900" font-size="18"
            fill="${RW.yellow}" text-anchor="start" letter-spacing="2">EVENTS</text>
      <text x="${THUMB2_X}" y="${B_PAD + THUMB_H_IMG + 38}"
            font-family="Playfair Display" font-weight="600" font-size="13"
            fill="white" text-anchor="start">Trivia &amp; Entertainment</text>

      <!-- THREE CATEGORY SECTIONS -->
      <!-- 1. DINING -->
      <text x="${CAT_X}" y="${B_PAD + 24}"
            font-family="Inter" font-weight="900" font-size="24"
            fill="${RW.yellow}" text-anchor="start" letter-spacing="2">DINING</text>
      <text x="${CAT_X}" y="${B_PAD + 50}"
            font-family="Playfair Display" font-weight="700" font-size="17"
            fill="rgba(255,255,255,0.9)" text-anchor="start">Special prix fixe menus</text>

      <!-- 2. EVENTS -->
      <text x="${CAT_X}" y="${B_PAD + blockH + 24}"
            font-family="Inter" font-weight="900" font-size="24"
            fill="${RW.yellow}" text-anchor="start" letter-spacing="2">EVENTS</text>
      <text x="${CAT_X}" y="${B_PAD + blockH + 50}"
            font-family="Playfair Display" font-weight="700" font-size="17"
            fill="rgba(255,255,255,0.9)" text-anchor="start">Live music &amp; trivia</text>

      <!-- 3. PARTNERS -->
      <text x="${CAT_X}" y="${B_PAD + blockH * 2 + 24}"
            font-family="Inter" font-weight="900" font-size="24"
            fill="${RW.yellow}" text-anchor="start" letter-spacing="2">PARTNERS</text>
      <text x="${CAT_X}" y="${B_PAD + blockH * 2 + 50}"
            font-family="Playfair Display" font-weight="700" font-size="17"
            fill="rgba(255,255,255,0.9)" text-anchor="start">TasteLanc × TFK</text>

      <!-- PLUS header -->
      <text x="${LIST_X}" y="${B_PAD + 22}"
            font-family="Inter" font-weight="900" font-size="22"
            fill="${RW.yellow}" text-anchor="start" letter-spacing="3">PLUS</text>

      <!-- PLUS list items -->
      <text x="${LIST_X}" y="${B_PAD + 62}"
            font-family="Playfair Display" font-weight="600" font-size="14"
            fill="rgba(255,255,255,0.9)" text-anchor="start">Win Prizes</text>
      <text x="${LIST_X}" y="${B_PAD + 92}"
            font-family="Playfair Display" font-weight="600" font-size="14"
            fill="rgba(255,255,255,0.9)" text-anchor="start">Leaderboard</text>
      <text x="${LIST_X}" y="${B_PAD + 122}"
            font-family="Playfair Display" font-weight="600" font-size="14"
            fill="rgba(255,255,255,0.9)" text-anchor="start">Restaurant Guide</text>
      <text x="${LIST_X}" y="${B_PAD + 152}"
            font-family="Playfair Display" font-weight="600" font-size="14"
            fill="rgba(255,255,255,0.9)" text-anchor="start">Event Calendar</text>
      <text x="${LIST_X}" y="${B_PAD + 182}"
            font-family="Playfair Display" font-weight="600" font-size="14"
            fill="rgba(255,255,255,0.9)" text-anchor="start">Menu Previews</text>
      <text x="${LIST_X}" y="${B_PAD + 212}"
            font-family="Playfair Display" font-weight="600" font-size="14"
            fill="rgba(255,255,255,0.9)" text-anchor="start">Check-in Rewards</text>

      <!-- Gold separator - only spans the list area -->
      <rect x="${SEP_X}" y="${B_PAD + 48}" width="3" height="${CONTENT_H - 48}" fill="${RW.yellow}" opacity="0.7"/>
    </svg>`);

  // Compose everything
  const composites: sharp.OverlayOptions[] = [
    { input: composedPhoto, top: TOP_BAR, left: BORDER },
    { input: topBarSvg, top: 0, left: 0 },
    { input: bottomSvg, top: H - BOTTOM_H, left: 0 },
  ];

  // Add feature thumbnails if available
  if (featuredThumbs.length >= 1) {
    composites.push({ input: featuredThumbs[0], top: H - BOTTOM_H + B_PAD, left: THUMB1_X });
  }
  if (featuredThumbs.length >= 2) {
    composites.push({ input: featuredThumbs[1], top: H - BOTTOM_H + B_PAD, left: THUMB2_X });
  }

  return base.composite(composites).jpeg({ quality: JPEG_Q }).toBuffer();
}

// ============================================================
// Page 2: Contents / What's Inside
// ============================================================

async function composeContents(): Promise<Buffer> {
  const bg = sharp({ create: { width: W, height: H, channels: 3, background: hexToRgb(RW.textLight) } });

  const contents = [
    { page: '03', title: 'Participating Restaurants', desc: 'Featured venues + full list' },
    { page: '04', title: 'Featured Menus', desc: 'Signature dishes & specialties' },
    { page: '05', title: 'Thirsty for Knowledge', desc: 'Trivia schedule & nightly prizes' },
    { page: '06', title: 'Events This Week', desc: 'Live entertainment & more' },
    { page: '07', title: 'Download the App', desc: 'Track favorites & compete' },
  ];

  let y = 260;
  const itemSpacing = 140;

  const contentItems = contents.map((item, i) => {
    const itemY = y + (i * itemSpacing);
    return `
      <g>
        <!-- Page Number Circle -->
        <circle cx="100" cy="${itemY}" r="32" fill="${RW.terracotta}" />
        <text x="100" y="${itemY + 8}"
              font-family="Inter" font-weight="900" font-size="22"
              fill="${RW.yellow}" text-anchor="middle">${item.page}</text>

        <!-- Title & Description -->
        <text x="160" y="${itemY - 8}"
              font-family="Playfair Display" font-weight="700" font-size="26"
              fill="#1a1a1a">${escapeXml(item.title)}</text>
        <text x="160" y="${itemY + 22}"
              font-family="Inter" font-weight="400" font-size="16"
              fill="#666">${escapeXml(item.desc)}</text>

        <!-- Divider -->
        <line x1="160" y1="${itemY + 50}" x2="${W - 80}" y2="${itemY + 50}"
              stroke="rgba(200,83,42,0.2)" stroke-width="1" />
      </g>
    `;
  }).join('');

  const svg = `
    <svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
      <!-- Header -->
      <text x="80" y="100"
            font-family="Inter" font-weight="900" font-size="14"
            fill="${RW.terracotta}" letter-spacing="4">INSIDE THIS ISSUE</text>
      <rect x="80" y="115" width="60" height="3" fill="${RW.terracotta}" />
      <text x="80" y="180"
            font-family="Playfair Display" font-weight="700" font-size="52"
            fill="#1a1a1a">What's Inside</text>

      ${contentItems}

      <!-- Page Number -->
      <text x="${W - 50}" y="${H - 30}"
            font-family="Playfair Display" font-weight="400" font-size="14"
            fill="#bbb" text-anchor="end">02</text>

      <!-- Accent Border -->
      <rect x="0" y="0" width="5" height="${H}" fill="${RW.terracotta}" />
    </svg>
  `;

  return bg.composite([{ input: Buffer.from(svg), top: 0, left: 0 }]).jpeg({ quality: JPEG_Q }).toBuffer();
}

// ============================================================
// Page 3: Participating Restaurants (3x3 GRID of paying subscribers + text list of rest)
// ============================================================

async function composeParticipatingRestaurants(
  supabase: SupabaseClient,
  marketId: string
): Promise<Buffer> {
  // Fetch ALL RW participants with photos, sorted by tier
  const { data: allWithPhotos } = await supabase
    .from('restaurants')
    .select(`
      id,
      name,
      cover_image_url,
      tier_id,
      tiers (
        name
      )
    `)
    .eq('market_id', marketId)
    .eq('is_active', true)
    .not('rw_description', 'is', null)
    .not('cover_image_url', 'is', null)
    .order('created_at', { ascending: false });

  // Fetch ALL Restaurant Week participants for count
  const { data: allRestaurants } = await supabase
    .from('restaurants')
    .select('id, name, tier_id')
    .eq('market_id', marketId)
    .eq('is_active', true)
    .not('rw_description', 'is', null)
    .order('name', { ascending: true });

  // Sort by tier: elite → premium → basic/free, then take top 9 for grid
  const sortedForGrid = allWithPhotos?.sort((a, b) => {
    const tierOrder = { elite: 1, premium: 2, basic: 3 };
    const aTier = a.tiers?.[0]?.name as keyof typeof tierOrder | undefined;
    const bTier = b.tiers?.[0]?.name as keyof typeof tierOrder | undefined;
    const aOrder = aTier ? tierOrder[aTier] || 99 : 99; // 99 for free/no tier
    const bOrder = bTier ? tierOrder[bTier] || 99 : 99;
    return aOrder - bOrder;
  }).slice(0, 9); // Show top 9 (premium/elite first, then fill with others)

  // Get remaining restaurants (not in the top 9 images)
  const shownIds = new Set(sortedForGrid?.map(r => r.id) || []);
  const remainingRestaurants = allRestaurants?.filter(r => !shownIds.has(r.id)) || [];

  const totalCount = allRestaurants?.length || 0;

  // Create base
  const bg = sharp({ create: { width: W, height: H, channels: 3, background: hexToRgb(RW.bgDark) } });

  // Header section (compact - 140px tall)
  const headerSvg = Buffer.from(`
    <svg width="${W}" height="140" xmlns="http://www.w3.org/2000/svg">
      <text x="50" y="40"
            font-family="Inter" font-weight="900" font-size="14"
            fill="${RW.yellow}" letter-spacing="4">RESTAURANT WEEK 2026</text>
      <rect x="50" y="55" width="60" height="3" fill="${RW.yellow}" />
      <text x="50" y="105"
            font-family="Playfair Display" font-weight="700" font-size="38"
            fill="${RW.textLight}">Participating Restaurants</text>
    </svg>
  `);

  // Photo grid: 3 columns x 3 rows (9 paying subscribers)
  const HEADER_H = 140;
  const PAD = 20;
  const GAP = 15;
  const COLS = 3;
  const ROWS = 3;
  const GRID_H = 600; // Reserve MORE space for text list below
  const IMG_W = Math.floor((W - PAD * 2 - GAP * (COLS - 1)) / COLS);
  const IMG_H = Math.floor((GRID_H - PAD * 2 - GAP * (ROWS - 1)) / ROWS);

  console.log(`[Page 3] Showing ${Math.min(9, sortedForGrid?.length || 0)} images, ${remainingRestaurants.length} in text list`);

  const composites: sharp.OverlayOptions[] = [{ input: headerSvg, top: 0, left: 0 }];

  // Fetch and composite restaurant images (9 total, prioritized by tier)
  for (let i = 0; i < Math.min(9, sortedForGrid?.length || 0); i++) {
    const r = sortedForGrid![i];
    const col = i % COLS;
    const row = Math.floor(i / COLS);
    const x = PAD + col * (IMG_W + GAP);
    const y = HEADER_H + PAD + row * (IMG_H + GAP);

    try {
      if (r.cover_image_url) {
        const raw = await fetchImageBuffer(r.cover_image_url);
        const resized = await sharp(raw)
          .resize(IMG_W, IMG_H, { fit: 'cover', position: 'centre' })
          .modulate({ brightness: 0.85, saturation: 1.1 })
          .jpeg({ quality: 88 })
          .toBuffer();

        // Overlay with restaurant name
        const nameOverlay = Buffer.from(`
          <svg width="${IMG_W}" height="${IMG_H}" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="grad${i}" x1="0%" y1="70%" x2="0%" y2="100%">
                <stop offset="0%" style="stop-color:black;stop-opacity:0.2"/>
                <stop offset="100%" style="stop-color:black;stop-opacity:0.85"/>
              </linearGradient>
            </defs>
            <rect width="${IMG_W}" height="${IMG_H}" fill="url(#grad${i})"/>
            <text x="12" y="${IMG_H - 12}"
                  font-family="Playfair Display" font-weight="700" font-size="16"
                  fill="${RW.yellow}">${escapeXml(r.name.substring(0, 25))}</text>
          </svg>
        `);

        const labeled = await sharp(resized)
          .composite([{ input: nameOverlay, top: 0, left: 0 }])
          .jpeg({ quality: 88 })
          .toBuffer();

        composites.push({ input: labeled, top: y, left: x });
      }
    } catch (err) {
      console.error(`Failed to load image for ${r.name}`);
    }
  }

  // Text list of remaining restaurants below the grid
  if (remainingRestaurants.length > 0) {
    const TEXT_START_Y = HEADER_H + GRID_H + 20; // Start right after grid
    const TEXT_PAD = 50;
    const TEXT_COLS = 2; // Use 2 columns for better readability
    const COL_W = Math.floor((W - TEXT_PAD * 2) / TEXT_COLS);
    const LINE_H = 24;

    let textListSvg = `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">`;

    // Title for text section
    textListSvg += `
      <text x="${TEXT_PAD}" y="${TEXT_START_Y + 30}"
            font-family="Playfair Display" font-weight="700" font-size="16"
            fill="${RW.yellow}">Also Participating (${remainingRestaurants.length} more):</text>
    `;

    // List remaining restaurants in 2 columns
    remainingRestaurants.forEach((r, idx) => {
      const col = idx % TEXT_COLS;
      const row = Math.floor(idx / TEXT_COLS);
      const x = TEXT_PAD + col * COL_W;
      const y = TEXT_START_Y + 65 + row * LINE_H;

      // Only show as many as fit on the page
      if (y < H - 80) {
        textListSvg += `
          <text x="${x}" y="${y}"
                font-family="Inter" font-weight="400" font-size="14"
                fill="${RW.textLight}">${escapeXml(r.name.substring(0, 35))}</text>
        `;
      }
    });

    textListSvg += '</svg>';
    composites.push({ input: Buffer.from(textListSvg), top: 0, left: 0 });
  }

  // Page number
  const pageNumSvg = Buffer.from(`
    <svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
      <text x="${W - 50}" y="${H - 30}"
            font-family="Playfair Display" font-weight="400" font-size="14"
            fill="rgba(240,208,96,0.4)" text-anchor="end">03</text>
      <rect x="${W - 5}" y="0" width="5" height="${H}" fill="${RW.yellow}" />
    </svg>
  `);
  composites.push({ input: pageNumSvg, top: 0, left: 0 });

  return bg.composite(composites).jpeg({ quality: JPEG_Q }).toBuffer();
}

// ============================================================
// Page 4: Featured Menus (2 Restaurants with Multiple Photos Each)
// ============================================================

async function composeFeaturedMenus(supabase: SupabaseClient, marketId: string): Promise<Buffer> {
  const bg = sharp({ create: { width: W, height: H, channels: 3, background: hexToRgb(RW.textLight) } });
  const composites: sharp.OverlayOptions[] = [];

  // Fetch ONE food photo from each restaurant (skip Google Photos URLs - they return 403)
  const { data: allCabbagePhotos } = await supabase
    .from('restaurant_photos')
    .select('url')
    .eq('restaurant_id', (await supabase.from('restaurants').select('id').eq('name', 'Cabbage Hill Schnitzel Haus').single()).data?.id)
    .eq('is_cover', false)
    .order('display_order')
    .limit(10);

  const cabbagePhotos = allCabbagePhotos?.filter(p => !p.url.includes('googleusercontent.com')).slice(0, 1);

  const { data: roosterPhotos } = await supabase
    .from('restaurant_photos')
    .select('url')
    .eq('restaurant_id', (await supabase.from('restaurants').select('id').eq('name', 'The Gloomy Rooster').single()).data?.id)
    .eq('is_cover', false)
    .order('display_order')
    .limit(1);

  // Layout: Top half = Cabbage Hill, Bottom half = Gloomy Rooster
  // Each restaurant gets 1 image that fills the entire half height (no white space)
  const HALF_H = Math.floor(H / 2);
  const PAD = 30;
  const TEXT_W = 420;
  const IMG_W = W - TEXT_W - PAD * 3;
  const IMG_H = HALF_H - PAD * 2; // Full half height minus padding - NO WHITE SPACE

  // TOP HALF: CABBAGE HILL (image on LEFT, text on RIGHT)
  if (cabbagePhotos && cabbagePhotos.length > 0) {
    try {
      const raw = await fetchImageBuffer(cabbagePhotos[0].url);
      const foodImg = await sharp(raw)
        .resize(IMG_W, IMG_H, { fit: 'cover', position: 'centre' })
        .modulate({ brightness: 1.05, saturation: 1.1 })
        .jpeg({ quality: 90 })
        .toBuffer();
      composites.push({ input: foodImg, top: PAD, left: PAD });
    } catch (err) {
      console.error('Failed to load Cabbage Hill photo:', err);
    }
  }

  // BOTTOM HALF: GLOOMY ROOSTER (text on LEFT, image on RIGHT for symmetry)
  const roosterImgX = PAD + TEXT_W + PAD; // Image on the RIGHT side
  if (roosterPhotos && roosterPhotos.length > 0) {
    try {
      const raw = await fetchImageBuffer(roosterPhotos[0].url);
      const foodImg = await sharp(raw)
        .resize(IMG_W, IMG_H, { fit: 'cover', position: 'centre' })
        .modulate({ brightness: 1.05, saturation: 1.1 })
        .jpeg({ quality: 90 })
        .toBuffer();
      composites.push({ input: foodImg, top: HALF_H + PAD, left: roosterImgX });
    } catch (err) {
      console.error('Failed to load Gloomy Rooster photo:', err);
    }
  }

  // Text content on right side
  const textX = PAD + IMG_W + PAD;
  const textSvg = Buffer.from(`
    <svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
      <!-- Page title at very top -->
      <text x="${PAD}" y="40"
            font-family="Inter" font-weight="900" font-size="11"
            fill="${RW.terracotta}" letter-spacing="3">FEATURED MENUS</text>
      <rect x="${PAD}" y="48" width="50" height="2" fill="${RW.terracotta}" />

      <!-- TOP: Cabbage Hill -->
      <text x="${textX}" y="90"
            font-family="Playfair Display" font-weight="700" font-size="28"
            fill="${RW.terracotta}">Cabbage Hill</text>
      <text x="${textX}" y="120"
            font-family="Playfair Display" font-weight="700" font-size="28"
            fill="${RW.terracotta}">Schnitzel Haus</text>

      <text x="${textX}" y="165"
            font-family="Inter" font-weight="600" font-size="15"
            fill="#1a1a1a">Traditional German Cuisine</text>

      <text x="${textX}" y="205"
            font-family="Inter" font-weight="400" font-size="13"
            fill="#555">From their trademark</text>
      <text x="${textX}" y="225"
            font-family="Inter" font-weight="400" font-size="13"
            fill="#555">schnitzel to other delectable</text>
      <text x="${textX}" y="245"
            font-family="Inter" font-weight="400" font-size="13"
            fill="#555">dishes, Cabbage Hill brings</text>
      <text x="${textX}" y="265"
            font-family="Inter" font-weight="400" font-size="13"
            fill="#555">authentic German flavors</text>
      <text x="${textX}" y="285"
            font-family="Inter" font-weight="400" font-size="13"
            fill="#555">to Lancaster.</text>

      <rect x="${textX}" y="320" width="200" height="40" fill="${RW.terracotta}" rx="6" />
      <text x="${textX + 100}" y="348"
            font-family="Inter" font-weight="700" font-size="14"
            fill="${RW.yellow}" text-anchor="middle">View RW Menu in App</text>

      <!-- Divider -->
      <line x1="30" y1="${HALF_H - 15}" x2="${W - 30}" y2="${HALF_H - 15}"
            stroke="${RW.terracotta}" stroke-width="2" />

      <!-- BOTTOM: Gloomy Rooster (TEXT ON LEFT for symmetry) -->
      <text x="${PAD}" y="${HALF_H + 60}"
            font-family="Playfair Display" font-weight="700" font-size="28"
            fill="${RW.terracotta}">The Gloomy</text>
      <text x="${PAD}" y="${HALF_H + 90}"
            font-family="Playfair Display" font-weight="700" font-size="28"
            fill="${RW.terracotta}">Rooster</text>

      <text x="${PAD}" y="${HALF_H + 135}"
            font-family="Inter" font-weight="600" font-size="15"
            fill="#1a1a1a">Fried Chicken &amp; Comfort Food</text>

      <text x="${PAD}" y="${HALF_H + 175}"
            font-family="Inter" font-weight="400" font-size="13"
            fill="#555">The Gloomy Rooster's menu</text>
      <text x="${PAD}" y="${HALF_H + 195}"
            font-family="Inter" font-weight="400" font-size="13"
            fill="#555">centers around crave-worthy</text>
      <text x="${PAD}" y="${HALF_H + 215}"
            font-family="Inter" font-weight="400" font-size="13"
            fill="#555">fried chicken. Experience</text>
      <text x="${PAD}" y="${HALF_H + 235}"
            font-family="Inter" font-weight="400" font-size="13"
            fill="#555">Southern-style comfort done</text>
      <text x="${PAD}" y="${HALF_H + 255}"
            font-family="Inter" font-weight="400" font-size="13"
            fill="#555">right.</text>

      <rect x="${PAD}" y="${HALF_H + 290}" width="200" height="40" fill="${RW.terracotta}" rx="6" />
      <text x="${PAD + 100}" y="${HALF_H + 318}"
            font-family="Inter" font-weight="700" font-size="14"
            fill="${RW.yellow}" text-anchor="middle">View RW Menu in App</text>

      <!-- Page number -->
      <text x="${W - 50}" y="${H - 30}"
            font-family="Playfair Display" font-weight="400" font-size="14"
            fill="#bbb" text-anchor="end">04</text>
      <rect x="0" y="0" width="5" height="${H}" fill="${RW.terracotta}" />
    </svg>
  `);
  composites.push({ input: textSvg, top: 0, left: 0 });

  return bg.composite(composites).jpeg({ quality: JPEG_Q }).toBuffer();
}

// ============================================================
// Page 5: Thirsty for Knowledge Partnership — Restaurant Week Edition
// ============================================================

async function composeThirstyKnowledgePartnership(supabase: SupabaseClient): Promise<Buffer> {
  // Hardcoded TFK TRIVIA schedule - exact locations provided by user
  // NOTE: Friday/Saturday are karaoke only, not trivia
  const schedule = {
    Monday: ['BierHall Brewing'],
    Tuesday: ['Our Town Brewery', "Stubby's (Downtown)", 'Appalachian Lititz', 'Lucky Dog Cafe', 'Union Station Grill', "Jack's Family Tavern"],
    Wednesday: ['Collusion Tap Works', 'Reflections', "Stubby's (Oregon Pike)", 'Stoner Grille', 'Southern Market', "P.J. Whelihan's", 'Rumplebrewskin\'s', 'Marion Court Room', 'New Town Food & Spirits'],
    Thursday: ['Raney Cellars', 'Warehouse District', 'Columbia Kettle Works', 'Inspiration Brewing'],
    Sunday: ['Lititz Springs VFW'],
  };

  // Pastel tie-dye gradient background (matching TFK app design)
  const bgGradient = Buffer.from(`
    <svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="tfkGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" style="stop-color:#F9A8D4;stop-opacity:1"/>
          <stop offset="50%" style="stop-color:#C084FC;stop-opacity:1"/>
          <stop offset="100%" style="stop-color:#93C5FD;stop-opacity:1"/>
        </linearGradient>
      </defs>
      <rect width="${W}" height="${H}" fill="url(#tfkGrad)"/>
      <!-- Page border -->
      <rect x="20" y="20" width="${W - 40}" height="${H - 40}"
            fill="none" stroke="#6D28D9" stroke-width="3" rx="8" />
    </svg>
  `);
  const bg = sharp(bgGradient);
  const composites: sharp.OverlayOptions[] = [];

  // Centered TFK logo at top - smaller
  const LOGO_W = 180;
  const LOGO_H = 180;
  const LOGO_X = (W - LOGO_W) / 2;
  const LOGO_Y = 40;
  const tfkLogoUrl = 'https://kufcxxynjvyharhtfptd.supabase.co/storage/v1/object/public/images/ads/tfk_logo.png';

  try {
    const tfkLogoRaw = await fetchImageBuffer(tfkLogoUrl);
    const tfkLogo = await sharp(tfkLogoRaw)
      .resize(LOGO_W, LOGO_H, { fit: 'inside', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toBuffer();

    composites.push({ input: tfkLogo, top: LOGO_Y, left: LOGO_X });
  } catch (err) {
    console.error('Failed to load TFK logo:', err);
  }

  const cx = W / 2;
  const PAD = 40; // Content stays inside this padding

  // Build schedule centered - each day with locations beneath
  const scheduleLines: string[] = [];
  let y = 560; // Start schedule here

  Object.entries(schedule).forEach(([day, venues]) => {
    // Day name - bold and centered
    scheduleLines.push(`
      <text x="${cx}" y="${y}"
            font-family="Inter" font-weight="900" font-size="22"
            fill="#1A2A4A" text-anchor="middle">${day}</text>
    `);
    y += 28;

    // Venues - smaller, centered, max 3 per line
    const venueText = venues.slice(0, 6).join(' • ');
    scheduleLines.push(`
      <text x="${cx}" y="${y}"
            font-family="Inter" font-weight="600" font-size="15"
            fill="#1A2A4A" text-anchor="middle">${escapeXml(venueText)}</text>
    `);
    y += 34;
  });

  const BW = 150;
  const BH = 45;
  const BG = 12;
  const BADGE_Y = H - 120;

  const contentSvg = Buffer.from(`
    <svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
      <!-- Centered headline -->
      <text x="${cx}" y="250"
            font-family="Inter" font-weight="900" font-size="12"
            fill="#1A2A4A" letter-spacing="3" text-anchor="middle">PARTNERSHIP SPOTLIGHT</text>

      <text x="${cx}" y="290"
            font-family="Playfair Display" font-weight="800" font-size="44"
            fill="#1A2A4A" text-anchor="middle">We're Sponsoring</text>
      <text x="${cx}" y="335"
            font-family="Playfair Display" font-weight="800" font-size="44"
            fill="#1A2A4A" text-anchor="middle">the Picture Round!</text>

      <!-- Centered $25 Prize Box -->
      <rect x="${cx - 170}" y="355" width="340" height="70" rx="12" fill="#FFA500" />
      <text x="${cx - 105}" y="407"
            font-family="Playfair Display" font-weight="900" font-size="64"
            fill="#1A2A4A">$25</text>
      <text x="${cx + 15}" y="387"
            font-family="Inter" font-weight="800" font-size="20"
            fill="#1A2A4A">Bonus Prize</text>
      <text x="${cx + 15}" y="412"
            font-family="Inter" font-weight="800" font-size="20"
            fill="#1A2A4A">Each Night!</text>

      <!-- Prize details -->
      <text x="${cx}" y="460"
            font-family="Inter" font-weight="600" font-size="16"
            fill="#1A2A4A" text-anchor="middle">On top of TFK's regular prize! Claimed in the app.</text>

      <!-- Section: Schedule (centered) -->
      <text x="${cx}" y="510"
            font-family="Inter" font-weight="900" font-size="16"
            fill="#1A2A4A" letter-spacing="2" text-anchor="middle">THIS WEEK'S SCHEDULE</text>

      <!-- All schedule days centered -->
      ${scheduleLines.join('\n')}

      <!-- Centered Download CTA -->
      <text x="${cx}" y="${BADGE_Y - 15}"
            font-family="Inter" font-weight="900" font-size="18"
            fill="#1A2A4A" text-anchor="middle">Download TasteLanc</text>

      <!-- App Store Badge - centered -->
      <g transform="translate(${cx - BW - BG / 2}, ${BADGE_Y})">
        <rect width="${BW}" height="${BH}" rx="6" fill="#000"/>
        <rect x="0.5" y="0.5" width="${BW - 1}" height="${BH - 1}" rx="5.5" stroke="#A6A6A6" stroke-width="1" fill="none"/>
        <g fill="#fff" transform="translate(10, 7)">
          <path d="M18.6 15.2a3.7 3.7 0 011.77-3.11 3.8 3.8 0 00-2.99-1.62c-1.26-.13-2.48.76-3.13.76-.65 0-1.64-.74-2.71-.72a3.99 3.99 0 00-3.36 2.05c-1.45 2.5-.37 6.2 1.02 8.23.7 1 1.51 2.11 2.58 2.07 1.04-.04 1.44-.67 2.7-.67 1.26 0 1.62.67 2.72.64 1.12-.02 1.83-1 2.5-2a8.22 8.22 0 001.14-2.32 3.59 3.59 0 01-2.24-3.31z" transform="scale(0.6)"/>
          <path d="M16.5 9.16a3.65 3.65 0 00.84-2.62 3.72 3.72 0 00-2.41 1.25 3.48 3.48 0 00-.86 2.52 3.08 3.08 0 002.43-1.15z" transform="scale(0.6)"/>
        </g>
        <text x="32" y="17" font-family="Inter" font-size="7" fill="#fff">Download on the</text>
        <text x="32" y="32" font-family="Inter" font-size="14" font-weight="600" fill="#fff">App Store</text>
      </g>

      <!-- Google Play Badge - centered -->
      <g transform="translate(${cx + BG / 2}, ${BADGE_Y})">
        <rect width="${BW}" height="${BH}" rx="6" fill="#000"/>
        <rect x="0.5" y="0.5" width="${BW - 1}" height="${BH - 1}" rx="5.5" stroke="#A6A6A6" stroke-width="1" fill="none"/>
        <g transform="translate(10, 9)">
          <path d="M1.1.9C.9 1.1.8 1.5.8 2v15.6c0 .5.1.8.3 1.1l8.2-9L1.1.9z" fill="#00C3FF" transform="scale(0.6)"/>
          <path d="M12.1 12.5l-2.7 2.7 2.7 2.7c.3-.2 2.5-1.4 2.5-1.4.7-.4.7-1 0-1.4l-2.5-2.6z" fill="#FFCE00" transform="scale(0.6)"/>
          <path d="M1.1 18.6c.2.2.6.3 1 .1l10-5.7-2.7-2.7-8.3 8.3z" fill="#FF3A44" transform="scale(0.6)"/>
          <path d="M1.1.9l8.3 8.3 2.7-2.7L2.1.8C1.7.6 1.3.7 1.1.9z" fill="#4CAF50" transform="scale(0.6)"/>
        </g>
        <text x="32" y="16" font-family="Inter" font-size="6" fill="#fff" letter-spacing="1">GET IT ON</text>
        <text x="32" y="32" font-family="Inter" font-size="13" font-weight="500" fill="#fff">Google Play</text>
      </g>

      <!-- Page Number -->
      <text x="${W - 50}" y="${H - 30}"
            font-family="Playfair Display" font-weight="400" font-size="14"
            fill="rgba(109,40,217,0.5)" text-anchor="end">05</text>
    </svg>
  `);
  composites.push({ input: contentSvg, top: 0, left: 0 });

  return bg.composite(composites).jpeg({ quality: JPEG_Q }).toBuffer();
}

// ============================================================
// Page 6: Win Prizes
// ============================================================

async function composeWinPrizes(): Promise<Buffer> {
  const bg = sharp({ create: { width: W, height: H, channels: 3, background: hexToRgb(RW.terracotta) } });

  const svg = `
    <svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
      <!-- Trophy Icon Header -->
      <circle cx="${W / 2}" cy="120" r="50" fill="${RW.yellow}" />
      <circle cx="${W / 2}" cy="120" r="35" fill="${RW.terracotta}" />

      <text x="${W / 2}" y="240"
            font-family="Playfair Display" font-weight="900" font-size="52"
            fill="${RW.yellow}" text-anchor="middle">Win Prizes</text>

      <text x="${W / 2}" y="290"
            font-family="Inter" font-weight="600" font-size="20"
            fill="rgba(245,242,238,0.85)" text-anchor="middle">Track your favorites &amp; compete</text>

      <!-- How It Works -->
      <rect x="60" y="340" width="${W - 120}" height="600"
            fill="rgba(44,15,6,0.5)" stroke="${RW.yellow}" stroke-width="2" rx="12" />

      <text x="${W / 2}" y="395"
            font-family="Inter" font-weight="900" font-size="18"
            fill="${RW.yellow}" text-anchor="middle" letter-spacing="2">HOW IT WORKS</text>

      <!-- Step 1 -->
      <circle cx="110" cy="470" r="34" fill="${RW.yellow}" />
      <text x="110" y="485"
            font-family="Inter" font-weight="900" font-size="32"
            fill="${RW.terracotta}" text-anchor="middle">1</text>
      <text x="170" y="475"
            font-family="Playfair Display" font-weight="700" font-size="24"
            fill="${RW.textLight}">Check in at restaurants</text>
      <text x="170" y="505"
            font-family="Inter" font-weight="400" font-size="16"
            fill="rgba(245,242,238,0.7)">Use the TasteLanc app to check in</text>

      <!-- Step 2 -->
      <circle cx="110" cy="600" r="34" fill="${RW.yellow}" />
      <text x="110" y="615"
            font-family="Inter" font-weight="900" font-size="32"
            fill="${RW.terracotta}" text-anchor="middle">2</text>
      <text x="170" y="605"
            font-family="Playfair Display" font-weight="700" font-size="24"
            fill="${RW.textLight}">Earn points</text>
      <text x="170" y="635"
            font-family="Inter" font-weight="400" font-size="16"
            fill="rgba(245,242,238,0.7)">Each check-in earns rewards points</text>

      <!-- Step 3 -->
      <circle cx="110" cy="730" r="34" fill="${RW.yellow}" />
      <text x="110" y="745"
            font-family="Inter" font-weight="900" font-size="32"
            fill="${RW.terracotta}" text-anchor="middle">3</text>
      <text x="170" y="735"
            font-family="Playfair Display" font-weight="700" font-size="24"
            fill="${RW.textLight}">Win weekly prizes</text>
      <text x="170" y="765"
            font-family="Inter" font-weight="400" font-size="16"
            fill="rgba(245,242,238,0.7)">Top scorers each week win prizes</text>

      <!-- Prizes Box -->
      <rect x="90" y="810" width="${W - 180}" height="100"
            fill="rgba(240,208,96,0.15)" stroke="${RW.yellow}" stroke-width="1.5" rx="8" />
      <text x="${W / 2}" y="845"
            font-family="Inter" font-weight="700" font-size="18"
            fill="${RW.yellow}" text-anchor="middle">This Week's Prizes</text>
      <text x="${W / 2}" y="875"
            font-family="Inter" font-weight="400" font-size="15"
            fill="${RW.textLight}" text-anchor="middle">Gift cards • Free meals • TasteLanc merch</text>

      <!-- Download CTA -->
      <text x="${W / 2}" y="1240"
            font-family="Playfair Display" font-weight="700" font-size="22"
            fill="${RW.yellow}" text-anchor="middle">Download the app to start tracking →</text>

      <!-- Page Number -->
      <text x="${W - 50}" y="${H - 30}"
            font-family="Playfair Display" font-weight="400" font-size="14"
            fill="rgba(240,208,96,0.4)" text-anchor="end">06</text>

      <!-- Border -->
      <rect x="${W - 5}" y="0" width="5" height="${H}" fill="${RW.yellow}" />
    </svg>
  `;

  return bg.composite([{ input: Buffer.from(svg), top: 0, left: 0 }]).jpeg({ quality: JPEG_Q }).toBuffer();
}

// ============================================================
// Page 7: Events This Week
// ============================================================

async function composeEventsThisWeek(supabase: SupabaseClient): Promise<Buffer> {
  const bg = sharp({ create: { width: W, height: H, channels: 3, background: hexToRgb(RW.bgDark) } });
  const composites: sharp.OverlayOptions[] = [];

  const PADDING = 40; // Border padding

  // Page border
  const borderSvg = Buffer.from(`
    <svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
      <rect x="20" y="20" width="${W - 40}" height="${H - 40}"
            fill="none" stroke="${RW.yellow}" stroke-width="3" rx="8" />
    </svg>
  `);
  composites.push({ input: borderSvg, top: 0, left: 0 });

  // Text header at top (35% of page)
  const TEXT_H = Math.floor(H * 0.35);
  const headerSvg = Buffer.from(`
    <svg width="${W}" height="${TEXT_H}" xmlns="http://www.w3.org/2000/svg">
      <text x="${PADDING + 10}" y="60"
            font-family="Inter" font-weight="900" font-size="14"
            fill="${RW.yellow}" letter-spacing="4">APRIL 13–19</text>
      <rect x="${PADDING + 10}" y="75" width="60" height="3" fill="${RW.yellow}" />
      <text x="${PADDING + 10}" y="140"
            font-family="Playfair Display" font-weight="700" font-size="48"
            fill="${RW.textLight}">Events This Week</text>

      <text x="${PADDING + 30}" y="220"
            font-family="Inter" font-weight="600" font-size="18"
            fill="${RW.yellow}">Live music - Trivia - Happy hours - Special events</text>
      <text x="${PADDING + 30}" y="260"
            font-family="Playfair Display" font-weight="400" font-size="16" font-style="italic"
            fill="rgba(245,242,238,0.7)">Something happening every night during Restaurant Week</text>

      <text x="${PADDING + 30}" y="360"
            font-family="Inter" font-weight="700" font-size="16"
            fill="${RW.yellow}">Browse the full calendar in the TasteLanc app</text>
    </svg>
  `);
  composites.push({ input: headerSvg, top: 0, left: 0 });

  // Event image - confined within borders (not edge-to-edge)
  const IMG_TOP = TEXT_H + 20;
  const IMG_H = H - IMG_TOP - (PADDING + 60); // Leave room for page number
  const IMG_PADDING = PADDING + 10;

  // Fetch upcoming events with images (Restaurant Week dates: April 13-19, 2026)
  const { data: loungeEvents } = await supabase
    .from('events')
    .select('name, image_url, event_date')
    .eq('restaurant_id', (await supabase.from('restaurants').select('id').eq('name', 'The Lounge at Hempfield Apothetique').single()).data?.id)
    .not('image_url', 'is', null)
    .gte('event_date', '2026-04-13') // Only upcoming/current events
    .lte('event_date', '2026-04-19') // During Restaurant Week
    .order('event_date', { ascending: true })
    .limit(1);

  if (loungeEvents && loungeEvents[0]?.image_url) {
    try {
      const raw = await fetchImageBuffer(loungeEvents[0].image_url);
      const eventImg = await sharp(raw)
        .resize(W - (IMG_PADDING * 2), IMG_H, { fit: 'cover', position: 'centre' })
        .modulate({ brightness: 0.95, saturation: 1.1 })
        .jpeg({ quality: JPEG_Q })
        .toBuffer();

      // Border around image
      const imgBorder = Buffer.from(`
        <svg width="${W - (IMG_PADDING * 2)}" height="${IMG_H}" xmlns="http://www.w3.org/2000/svg">
          <rect x="0" y="0" width="${W - (IMG_PADDING * 2)}" height="${IMG_H}"
                fill="none" stroke="${RW.yellow}" stroke-width="2" rx="8" />
        </svg>
      `);

      const bordered = await sharp(eventImg)
        .composite([{ input: imgBorder, top: 0, left: 0 }])
        .jpeg({ quality: JPEG_Q })
        .toBuffer();

      composites.push({ input: bordered, top: IMG_TOP, left: IMG_PADDING });
    } catch (err) {
      console.error('Failed to load venue image for events page:', err);
    }
  }

  // Page number
  const pageNumSvg = Buffer.from(`
    <svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
      <text x="${W - 50}" y="${H - 30}"
            font-family="Playfair Display" font-weight="400" font-size="14"
            fill="rgba(240,208,96,0.6)" text-anchor="end">06</text>
    </svg>
  `);
  composites.push({ input: pageNumSvg, top: 0, left: 0 });

  return bg.composite(composites).jpeg({ quality: JPEG_Q }).toBuffer();
}

// ============================================================
// Page 8: Leaderboard Preview
// ============================================================

async function composeLeaderboardPreview(): Promise<Buffer> {
  const bg = sharp({ create: { width: W, height: H, channels: 3, background: hexToRgb(RW.textLight) } });

  const svg = `
    <svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
      <!-- Header -->
      <text x="50" y="60"
            font-family="Inter" font-weight="900" font-size="14"
            fill="${RW.terracotta}" letter-spacing="4">TRACK &amp; COMPETE</text>
      <rect x="50" y="75" width="60" height="3" fill="${RW.terracotta}" />
      <text x="50" y="140"
            font-family="Playfair Display" font-weight="700" font-size="48"
            fill="#1a1a1a">Leaderboard</text>

      <!-- App Screenshot Placeholder -->
      <rect x="100" y="200" width="${W - 200}" height="500"
            fill="rgba(200,83,42,0.1)" stroke="${RW.terracotta}" stroke-width="2" rx="20" />

      <circle cx="${W / 2}" cy="380" r="60" fill="${RW.terracotta}" />
      <circle cx="${W / 2}" cy="380" r="45" fill="${RW.yellow}" />
      <text x="${W / 2}" y="460"
            font-family="Playfair Display" font-weight="700" font-size="28"
            fill="#1a1a1a" text-anchor="middle">Live Leaderboard</text>
      <text x="${W / 2}" y="500"
            font-family="Inter" font-weight="400" font-size="17"
            fill="#666" text-anchor="middle">Updates in real-time</text>
      <text x="${W / 2}" y="530"
            font-family="Inter" font-weight="400" font-size="17"
            fill="#666" text-anchor="middle">as you check in</text>

      <!-- Features List -->
      <g>
        <circle cx="130" cy="770" r="6" fill="${RW.terracotta}" />
        <text x="155" y="778"
              font-family="Inter" font-weight="600" font-size="18"
              fill="#1a1a1a">See top restaurants</text>
      </g>
      <g>
        <circle cx="130" cy="820" r="6" fill="${RW.terracotta}" />
        <text x="155" y="828"
              font-family="Inter" font-weight="600" font-size="18"
              fill="#1a1a1a">Track your check-ins</text>
      </g>
      <g>
        <circle cx="130" cy="870" r="6" fill="${RW.terracotta}" />
        <text x="155" y="878"
              font-family="Inter" font-weight="600" font-size="18"
              fill="#1a1a1a">Compete for prizes</text>
      </g>

      <!-- CTA -->
      <rect x="50" y="950" width="${W - 100}" height="70"
            fill="${RW.terracotta}" rx="8" />
      <text x="${W / 2}" y="995"
            font-family="Inter" font-weight="700" font-size="20"
            fill="${RW.yellow}" text-anchor="middle">Open the app to view the leaderboard</text>

      <!-- Page Number -->
      <text x="${W - 50}" y="${H - 30}"
            font-family="Playfair Display" font-weight="400" font-size="14"
            fill="#bbb" text-anchor="end">08</text>

      <!-- Border -->
      <rect x="${W - 5}" y="0" width="5" height="${H}" fill="${RW.terracotta}" />
    </svg>
  `;

  return bg.composite([{ input: Buffer.from(svg), top: 0, left: 0 }]).jpeg({ quality: JPEG_Q }).toBuffer();
}

// ============================================================
// Page 9: Back Cover
// ============================================================

async function composeRWBackCover(): Promise<Buffer> {
  const bg = sharp({ create: { width: W, height: H, channels: 3, background: hexToRgb(RW.bgDark) } });

  const BW = 200; // badge width
  const BH = 60; // badge height
  const BG = 20; // gap between badges
  const cx = W / 2;

  const svg = `
    <svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
      <!-- RW Badge -->
      ${generateRWBadge(160)}

      <!-- Big "Restaurant Week" -->
      <text x="${cx}" y="400"
            font-family="Playfair Display" font-weight="900" font-size="50"
            fill="${RW.yellow}" text-anchor="middle">Restaurant Week</text>
      <text x="${cx}" y="450"
            font-family="Inter" font-weight="300" font-size="28"
            fill="${RW.textLight}" text-anchor="middle" letter-spacing="10">2026</text>

      <rect x="${cx - 80}" y="470" width="160" height="3" fill="${RW.terracotta}"/>

      <!-- Subtitle -->
      <text x="${cx}" y="530"
            font-family="Playfair Display" font-weight="400" font-size="22" font-style="italic"
            fill="rgba(245,242,238,0.75)" text-anchor="middle">Track your favorites in</text>
      <text x="${cx}" y="570"
            font-family="Playfair Display" font-weight="700" font-size="32"
            fill="${RW.yellow}" text-anchor="middle">TasteLanc</text>

      <rect x="${cx - 30}" y="595" width="60" height="2" fill="rgba(240,208,96,0.3)"/>

      <text x="${cx}" y="640"
            font-family="Inter" font-weight="400" font-size="18"
            fill="rgba(245,242,238,0.7)" text-anchor="middle">April 13–19, 2026</text>

      <!-- App Store Badge -->
      <g transform="translate(${cx - BW - BG / 2}, 700)">
        <rect width="${BW}" height="${BH}" rx="8" fill="#000"/>
        <rect x="0.5" y="0.5" width="${BW - 1}" height="${BH - 1}" rx="7.5" stroke="#A6A6A6" stroke-width="1" fill="none"/>
        <g fill="#fff" transform="translate(15, 10)">
          <path d="M18.6 15.2a3.7 3.7 0 011.77-3.11 3.8 3.8 0 00-2.99-1.62c-1.26-.13-2.48.76-3.13.76-.65 0-1.64-.74-2.71-.72a3.99 3.99 0 00-3.36 2.05c-1.45 2.5-.37 6.2 1.02 8.23.7 1 1.51 2.11 2.58 2.07 1.04-.04 1.44-.67 2.7-.67 1.26 0 1.62.67 2.72.64 1.12-.02 1.83-1 2.5-2a8.22 8.22 0 001.14-2.32 3.59 3.59 0 01-2.24-3.31z" transform="scale(0.8)"/>
          <path d="M16.5 9.16a3.65 3.65 0 00.84-2.62 3.72 3.72 0 00-2.41 1.25 3.48 3.48 0 00-.86 2.52 3.08 3.08 0 002.43-1.15z" transform="scale(0.8)"/>
        </g>
        <text x="42" y="23" font-family="Inter, sans-serif" font-size="10" fill="#fff">Download on the</text>
        <text x="42" y="42" font-family="Inter, sans-serif" font-size="20" font-weight="600" fill="#fff">App Store</text>
      </g>

      <!-- Google Play Badge -->
      <g transform="translate(${cx + BG / 2}, 700)">
        <rect width="${BW}" height="${BH}" rx="8" fill="#000"/>
        <rect x="0.5" y="0.5" width="${BW - 1}" height="${BH - 1}" rx="7.5" stroke="#A6A6A6" stroke-width="1" fill="none"/>
        <g transform="translate(15, 12)">
          <path d="M1.1.9C.9 1.1.8 1.5.8 2v15.6c0 .5.1.8.3 1.1l8.2-9L1.1.9z" fill="#00C3FF"/>
          <path d="M12.1 12.5l-2.7 2.7 2.7 2.7c.3-.2 2.5-1.4 2.5-1.4.7-.4.7-1 0-1.4l-2.5-2.6z" fill="#FFCE00"/>
          <path d="M1.1 18.6c.2.2.6.3 1 .1l10-5.7-2.7-2.7-8.3 8.3z" fill="#FF3A44"/>
          <path d="M1.1.9l8.3 8.3 2.7-2.7L2.1.8C1.7.6 1.3.7 1.1.9z" fill="#4CAF50"/>
        </g>
        <text x="42" y="22" font-family="Inter, sans-serif" font-size="9" fill="#fff" letter-spacing="1">GET IT ON</text>
        <text x="42" y="42" font-family="Inter, sans-serif" font-size="19" font-weight="500" fill="#fff">Google Play</text>
      </g>

      <!-- Follow -->
      <text x="${cx}" y="830"
            font-family="Inter" font-weight="400" font-size="18"
            fill="rgba(240,208,96,0.6)" text-anchor="middle">Follow @tastelanc for daily updates</text>

      <!-- Bottom -->
      <rect x="${cx - 200}" y="${H - 180}" width="400" height="1" fill="rgba(240,208,96,0.2)"/>
      <text x="${cx}" y="${H - 130}"
            font-family="Playfair Display" font-weight="700" font-size="24"
            fill="${RW.yellow}" text-anchor="middle">TasteLanc</text>
      <text x="${cx}" y="${H - 90}"
            font-family="Playfair Display" font-weight="400" font-size="18" font-style="italic"
            fill="rgba(245,242,238,0.6)" text-anchor="middle">Official Restaurant Week Partner</text>
      <text x="${cx}" y="${H - 60}"
            font-family="Inter" font-weight="400" font-size="16"
            fill="rgba(245,242,238,0.5)" text-anchor="middle">Lancaster, PA</text>
    </svg>
  `;

  return bg.composite([{ input: Buffer.from(svg), top: 0, left: 0 }]).jpeg({ quality: JPEG_Q }).toBuffer();
}

// ============================================================
// Main Export: Generate Full Restaurant Week Magazine
// ============================================================

export async function generateRestaurantWeekMagazine(opts: {
  supabase: SupabaseClient;
  market: MarketConfig;
  date: string;
}): Promise<string[]> {
  const { supabase, market, date } = opts;

  console.log('[RW Magazine] Generating Restaurant Week 2026 issue...');
  console.log(`[RW Magazine] Market: ${market.market_name}`);
  console.log(`[RW Magazine] Date: ${date}`);

  // Generate all 7 pages (removed Win Prizes page per user request)
  const [cover, contents, participating, menus, tfk, events, backCover] = await Promise.all([
    composeCover(supabase, market.market_id),
    composeContents(),
    composeParticipatingRestaurants(supabase, market.market_id),
    composeFeaturedMenus(supabase, market.market_id),
    composeThirstyKnowledgePartnership(supabase),
    composeEventsThisWeek(supabase),
    composeRWBackCover(),
  ]);

  // Upload to storage
  const timestamp = Date.now();
  const storagePath = `instagram/${market.market_slug}/${date}/rw-magazine-${timestamp}`;

  const pages = [cover, contents, participating, menus, tfk, events, backCover];
  const urls = await Promise.all(
    pages.map((buf, i) => uploadSlide(supabase, buf, `${storagePath}/page-${i + 1}.jpg`))
  );

  console.log(`[RW Magazine] ✅ Generated ${urls.length} pages`);

  return urls;
}
