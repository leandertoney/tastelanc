// Instagram Magazine Issue Generator
// Creates a full weekly magazine carousel: cover + inside page spreads
// Design: Barfly Magazine-inspired editorial layouts with real data

import sharp from 'sharp';
import { SupabaseClient } from '@supabase/supabase-js';
import { MarketConfig } from './types';
import { getAppName, getMarketDisplayName } from './prompts';
import { generateCarouselSlides } from './overlay';

const W = 1080;
const H = 1350; // 4:5 portrait
const JPEG_Q = 92;

// Shared helpers from overlay.ts
function escapeXml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

function formatTime12h(t: string | null): string {
  if (!t) return '';
  const [h, m] = t.split(':');
  const hr = parseInt(h, 10);
  const ampm = hr >= 12 ? 'pm' : 'am';
  const h12 = hr % 12 || 12;
  return m === '00' ? `${h12}${ampm}` : `${h12}:${m}${ampm}`;
}

async function fetchImageBuffer(url: string): Promise<Buffer> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to fetch image: ${response.status} ${url}`);
  return Buffer.from(await response.arrayBuffer());
}

async function uploadSlide(supabase: SupabaseClient, buffer: Buffer, path: string): Promise<string> {
  const { error } = await supabase.storage.from('images').upload(path, buffer, { contentType: 'image/jpeg', upsert: true });
  if (error) throw new Error(`Upload failed: ${error.message}`);
  const { data } = supabase.storage.from('images').getPublicUrl(path);
  return data.publicUrl;
}

// ============================================================
// Magazine Issue Data Types
// ============================================================

interface MagazineIssueData {
  theme: string;          // e.g. "Game Night Edition"
  coverHeadline1: string; // e.g. "It's Game"
  coverHeadline2: string; // e.g. "Night"
  happiestHours: Array<{ venue: string; time: string; deals: string[]; imageUrl: string | null; venueImageUrl: string | null }>;
  events: Array<{ venue: string; type: string; performer: string | null; day: string; time: string; imageUrl: string | null; venueImageUrl: string | null }>;
  specials: Array<{ venue: string; name: string; price: string | null; day: string; imageUrl: string | null }>;
  spotlightVenue: { name: string; description: string; imageUrl: string | null; highlights: string[] } | null;
}

// ============================================================
// Analyze week's content and generate editorial theme
// ============================================================

async function analyzeWeekContent(supabase: SupabaseClient, marketId: string): Promise<MagazineIssueData> {
  // Get paid tier IDs (premium + elite only — no basic, no free)
  const PREMIUM_ID = '00000000-0000-0000-0000-000000000002';
  const ELITE_ID = '00000000-0000-0000-0000-000000000003';

  // Fetch ONLY paid-tier content for this market
  const [eventsRes, hhRes, specialsRes] = await Promise.all([
    supabase.from('events')
      .select('event_type, name, start_time, days_of_week, performer_name, image_url, restaurants!inner(name, cover_image_url, market_id, tier_id)')
      .eq('restaurants.market_id', marketId).eq('is_active', true)
      .in('restaurants.tier_id', [PREMIUM_ID, ELITE_ID])
      .limit(50),
    supabase.from('happy_hours')
      .select('name, start_time, end_time, days_of_week, image_url, restaurants!inner(name, cover_image_url, market_id, tier_id), happy_hour_items(name, discounted_price)')
      .eq('restaurants.market_id', marketId).eq('is_active', true)
      .in('restaurants.tier_id', [PREMIUM_ID, ELITE_ID])
      .limit(50),
    supabase.from('specials')
      .select('name, special_price, days_of_week, image_url, restaurants!inner(name, market_id, tier_id)')
      .eq('restaurants.market_id', marketId).eq('is_active', true)
      .in('restaurants.tier_id', [PREMIUM_ID, ELITE_ID])
      .limit(50),
  ]);

  const events = eventsRes.data || [];
  const happyHours = hhRes.data || [];
  const specials = specialsRes.data || [];

  // Count event types to determine theme
  const typeCounts: Record<string, number> = {};
  events.forEach((e: any) => {
    typeCounts[e.event_type] = (typeCounts[e.event_type] || 0) + 1;
  });

  // Pick editorial theme based on what's dominant
  const topType = Object.entries(typeCounts).sort((a, b) => b[1] - a[1])[0];
  let theme = 'Your Weekly Guide';
  let coverHeadline1 = 'This Week';
  let coverHeadline2 = 'in Lancaster';

  if (topType) {
    const [type, count] = topType;
    switch (type) {
      case 'trivia':
        theme = 'Game Night Edition';
        coverHeadline1 = "It's Game";
        coverHeadline2 = 'Night';
        break;
      case 'karaoke':
        theme = 'Sing It Out';
        coverHeadline1 = 'Grab the';
        coverHeadline2 = 'Mic';
        break;
      case 'live_music':
        theme = 'Live & Loud';
        coverHeadline1 = 'The Sound';
        coverHeadline2 = 'of Lancaster';
        break;
      case 'dj':
        theme = 'After Dark';
        coverHeadline1 = 'Turn It';
        coverHeadline2 = 'Up';
        break;
      case 'bingo':
      case 'music_bingo':
        theme = 'Bingo Night';
        coverHeadline1 = 'Lucky';
        coverHeadline2 = 'Numbers';
        break;
      default:
        theme = 'Out & About';
        coverHeadline1 = "What's";
        coverHeadline2 = 'Happening';
    }
  }

  // Build structured data for each section
  const happiestHours = happyHours.map((h: any) => ({
    venue: h.restaurants.name,
    time: `${formatTime12h(h.start_time)}–${formatTime12h(h.end_time)}`,
    deals: (h.happy_hour_items || []).slice(0, 3).map((i: any) =>
      i.discounted_price ? `${i.name} $${i.discounted_price}` : i.name
    ),
    // Prioritize HH-specific image over venue cover photo
    imageUrl: h.image_url || null,
    venueImageUrl: h.restaurants.cover_image_url,
  }));

  // Deduplicate by venue
  const seenVenues = new Set<string>();
  const uniqueHH = happiestHours.filter((h: any) => {
    if (seenVenues.has(h.venue)) return false;
    seenVenues.add(h.venue);
    return true;
  });

  const eventList = events.map((e: any) => ({
    venue: e.restaurants.name,
    type: e.event_type,
    performer: e.performer_name,
    day: (e.days_of_week || [])[0] || '',
    time: formatTime12h(e.start_time),
    // Prioritize event-specific image (flyer, promo) over venue photo
    imageUrl: e.image_url || null,
    venueImageUrl: e.restaurants.cover_image_url,
  }));

  const specialList = specials.map((s: any) => ({
    venue: s.restaurants.name,
    name: s.name,
    price: s.special_price ? `$${s.special_price}` : null,
    day: (s.days_of_week || [])[0] || '',
    imageUrl: s.image_url || null,
  }));

  return {
    theme,
    coverHeadline1,
    coverHeadline2,
    happiestHours: uniqueHH,
    events: eventList,
    specials: specialList,
    spotlightVenue: null, // TODO: pick a spotlight venue
  };
}

// ============================================================
// Magazine Page Spread Composers
// ============================================================

/**
 * Happy Hour Guide — BIG image top (60%), text listings below
 */
async function composeHappyHourSpread(
  data: MagazineIssueData,
  accentColor: string,
): Promise<Buffer> {
  const bg = sharp({ create: { width: W, height: H, channels: 3, background: { r: 245, g: 242, b: 238 } } });
  const composites: sharp.OverlayOptions[] = [];
  const PAD = 50;

  // BIG image — 60% of the page height, full width minus padding
  const IMG_H = Math.floor(H * 0.55);
  const IMG_W = W - PAD * 2;
  const IMG_Y = 130; // below header

  const hhWithImage = data.happiestHours.find(h => h.imageUrl && !h.imageUrl.includes('cover.'));
  const hhFallback = data.happiestHours.find(h => h.imageUrl?.includes('supabase'));
  const hhImageSource = hhWithImage || hhFallback;

  if (hhImageSource) {
    try {
      const raw = await fetchImageBuffer(hhImageSource.imageUrl!);
      const photo = await sharp(raw)
        .resize(IMG_W, IMG_H, { fit: 'contain', background: { r: 245, g: 242, b: 238, alpha: 1 } })
        .jpeg({ quality: JPEG_Q })
        .toBuffer();
      composites.push({ input: photo, top: IMG_Y, left: PAD });
    } catch { /* skip */ }
  }

  // Text listings BELOW the image — evenly spaced in remaining space
  const textY = IMG_Y + IMG_H + 20;
  const textH = H - textY - 50; // remaining space
  const venues = data.happiestHours.slice(0, 6);
  const venueSpacing = Math.floor(textH / Math.max(venues.length, 1));

  // Two columns for the listings
  const col1X = PAD;
  const col2X = W / 2 + 10;

  let svgContent = `
    <text x="${PAD}" y="50" font-family="Inter" font-weight="900" font-size="15"
          fill="${accentColor}" letter-spacing="4">HAPPY HOUR GUIDE</text>
    <rect x="${PAD}" y="65" width="50" height="3" fill="${accentColor}"/>
    <text x="${PAD}" y="110" font-family="Playfair Display" font-weight="700" font-size="42"
          fill="#1a1a1a">Where to Drink</text>
  `;

  venues.forEach((v, i) => {
    const col = i < 3 ? col1X : col2X;
    const row = i < 3 ? i : i - 3;
    const rowY = textY + row * venueSpacing + 20;

    svgContent += `
      <text x="${col}" y="${rowY}"
            font-family="Playfair Display" font-weight="900" font-size="24"
            fill="#1a1a1a">${escapeXml(v.venue)}</text>
      <text x="${col}" y="${rowY + 28}"
            font-family="Inter" font-weight="600" font-size="17"
            fill="${accentColor}">${escapeXml(v.time)}</text>
      ${v.deals.length > 0 ? `
      <text x="${col}" y="${rowY + 52}"
            font-family="Playfair Display" font-weight="400" font-size="14" font-style="italic"
            fill="#888">${escapeXml(v.deals.slice(0, 2).join(' · '))}</text>
      ` : ''}
    `;
  });

  svgContent += `
    <text x="${W - PAD}" y="${H - 25}" font-family="Playfair Display" font-weight="400" font-size="14"
          fill="#bbb" text-anchor="end">02</text>
    <rect x="0" y="0" width="5" height="${H}" fill="${accentColor}"/>
  `;

  composites.push({ input: Buffer.from(`<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">${svgContent}</svg>`), top: 0, left: 0 });
  return bg.jpeg({ quality: JPEG_Q }).toBuffer()
    .then(buf => sharp(buf).composite(composites).jpeg({ quality: JPEG_Q }).toBuffer());
}

/**
 * Events This Week — text at top, BIG image filling bottom half
 * Completely different layout from Happy Hour page
 */
async function composeEventsSpread(
  data: MagazineIssueData,
  accentColor: string,
): Promise<Buffer> {
  const bg = sharp({ create: { width: W, height: H, channels: 3, background: { r: 22, g: 20, b: 28 } } });
  const composites: sharp.OverlayOptions[] = [];
  const PAD = 50;

  const EVENT_LABELS: Record<string, string> = {
    live_music: 'LIVE MUSIC', trivia: 'TRIVIA', karaoke: 'KARAOKE',
    dj: 'DJ NIGHT', comedy: 'COMEDY', bingo: 'BINGO', music_bingo: 'MUSIC BINGO',
    poker: 'POKER', other: 'EVENT', promotion: 'PROMO',
  };

  // Group and sort
  const byType: Record<string, typeof data.events> = {};
  data.events.forEach(e => { const t = e.type || 'other'; if (!byType[t]) byType[t] = []; byType[t].push(e); });
  const sortedTypes = Object.entries(byType).sort((a, b) => b[1].length - a[1].length).slice(0, 4);

  // ONE venue photo — right side, portrait orientation, fills space
  const IMG_W = Math.floor(W * 0.38);
  const IMG_H = Math.floor(H * 0.45);

  // Find a venue cover photo (uploaded, no text) from an event venue
  const venueWithPhoto = data.events.find(e => e.venueImageUrl?.includes('supabase'));
  if (venueWithPhoto) {
    try {
      const raw = await fetchImageBuffer(venueWithPhoto.venueImageUrl!);
      const photo = await sharp(raw)
        .resize(IMG_W, IMG_H, { fit: 'cover', position: 'centre' })
        .jpeg({ quality: JPEG_Q })
        .toBuffer();
      composites.push({ input: photo, top: H - IMG_H - PAD, left: W - IMG_W - PAD });
    } catch { /* skip */ }
  }

  // Text fills the page — left column full height, right column above the image
  const CONTENT_H = H - 170 - 50;
  const totalItems = sortedTypes.reduce((sum, [, evts]) => sum + Math.min(evts.length, 3), 0) + sortedTypes.length;
  const itemH = Math.floor(CONTENT_H / Math.max(totalItems, 1));

  const leftTypes = sortedTypes.slice(0, Math.ceil(sortedTypes.length / 2));
  const rightTypes = sortedTypes.slice(Math.ceil(sortedTypes.length / 2));

  let svgContent = `
    <text x="${PAD}" y="55" font-family="Inter" font-weight="900" font-size="15"
          fill="${accentColor}" letter-spacing="4">EVENTS THIS WEEK</text>
    <rect x="${PAD}" y="70" width="50" height="3" fill="${accentColor}"/>
    <text x="${PAD}" y="115" font-family="Playfair Display" font-weight="700" font-size="40"
          fill="white">${escapeXml(data.theme)}</text>
  `;

  // Left column
  let y = 170;
  for (const [type, events] of leftTypes) {
    if (y > H - 80) break;
    svgContent += `
      <text x="${PAD}" y="${y + 16}" font-family="Inter" font-weight="900" font-size="18"
            fill="${accentColor}" letter-spacing="3">${escapeXml(EVENT_LABELS[type] || type.toUpperCase())}</text>
    `;
    y += itemH;
    for (const event of events.slice(0, 3)) {
      if (y > H - 60) break;
      const dayLabel = event.day ? event.day.charAt(0).toUpperCase() + event.day.slice(1) : '';
      const timeLabel = event.time ? ` at ${event.time}` : '';
      svgContent += `
        <text x="${PAD + 10}" y="${y + 14}" font-family="Playfair Display" font-weight="700" font-size="20"
              fill="white">${escapeXml(event.venue)}</text>
        <text x="${PAD + 10}" y="${y + 36}" font-family="Playfair Display" font-weight="400" font-size="15" font-style="italic"
              fill="rgba(255,255,255,0.55)">${escapeXml((event.performer || dayLabel) + timeLabel)}</text>
      `;
      y += itemH;
    }
  }

  // Right column
  const colR = W / 2 + 20;
  y = 170;
  for (const [type, events] of rightTypes) {
    if (y > H - 80) break;
    svgContent += `
      <text x="${colR}" y="${y + 16}" font-family="Inter" font-weight="900" font-size="18"
            fill="${accentColor}" letter-spacing="3">${escapeXml(EVENT_LABELS[type] || type.toUpperCase())}</text>
    `;
    y += itemH;
    for (const event of events.slice(0, 3)) {
      if (y > H - 60) break;
      const dayLabel = event.day ? event.day.charAt(0).toUpperCase() + event.day.slice(1) : '';
      const timeLabel = event.time ? ` at ${event.time}` : '';
      svgContent += `
        <text x="${colR + 10}" y="${y + 14}" font-family="Playfair Display" font-weight="700" font-size="20"
              fill="white">${escapeXml(event.venue)}</text>
        <text x="${colR + 10}" y="${y + 36}" font-family="Playfair Display" font-weight="400" font-size="15" font-style="italic"
              fill="rgba(255,255,255,0.55)">${escapeXml((event.performer || dayLabel) + timeLabel)}</text>
      `;
      y += itemH;
    }
  }

  svgContent += `
    <text x="${W - PAD}" y="${H - 25}" font-family="Playfair Display" font-weight="400" font-size="14"
          fill="rgba(255,255,255,0.3)" text-anchor="end">03</text>
    <rect x="${W - 5}" y="0" width="5" height="${H}" fill="${accentColor}"/>
  `;

  composites.push({ input: Buffer.from(`<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">${svgContent}</svg>`), top: 0, left: 0 });
  return bg.jpeg({ quality: JPEG_Q }).toBuffer()
    .then(buf => sharp(buf).composite(composites).jpeg({ quality: JPEG_Q }).toBuffer());
}

/**
 * Specials & Deals — TWO images stacked, text to the right of each
 * Image 1 top-left + text right. Image 2 bottom-left + text right.
 * Each image and its text block are the same height.
 */
async function composeSpecialsSpread(
  data: MagazineIssueData,
  accentColor: string,
): Promise<Buffer> {
  const bg = sharp({ create: { width: W, height: H, channels: 3, background: { r: 250, g: 248, b: 244 } } });
  const composites: sharp.OverlayOptions[] = [];
  const PAD = 50;
  const HEADER_H = 130;
  const FOOTER_H = 50;

  // Two image blocks — PORTRAIT orientation (taller than wide), fills space completely
  const BLOCK_H = Math.floor((H - HEADER_H - FOOTER_H - 30) / 2);
  const IMG_W = Math.floor(W * 0.35); // narrower but taller = portrait

  // Find TWO specials with images — skip ones with text baked in (promo graphics)
  // Use venue cover photos as these are more likely to be food/atmosphere shots
  const specialsWithImages = data.specials.filter(s => s.imageUrl?.includes('supabase')).slice(0, 2);

  for (let i = 0; i < specialsWithImages.length; i++) {
    const blockY = HEADER_H + i * (BLOCK_H + 30);
    try {
      const raw = await fetchImageBuffer(specialsWithImages[i].imageUrl!);
      const photo = await sharp(raw)
        .resize(IMG_W, BLOCK_H, { fit: 'cover', position: 'centre' })
        .jpeg({ quality: JPEG_Q })
        .toBuffer();
      composites.push({ input: photo, top: blockY, left: PAD });
    } catch { /* skip */ }
  }

  // Group specials by day for the text sections
  const DAY_ORDER = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  const DAY_SHORT: Record<string, string> = {
    monday: 'Mon', tuesday: 'Tue', wednesday: 'Wed', thursday: 'Thu',
    friday: 'Fri', saturday: 'Sat', sunday: 'Sun',
  };
  const byDay: Record<string, typeof data.specials> = {};
  data.specials.forEach(s => { const d = s.day.toLowerCase(); if (!byDay[d]) byDay[d] = []; byDay[d].push(s); });
  const activeDays = DAY_ORDER.filter(d => byDay[d]?.length > 0);

  // Split days into two halves for the two text blocks
  const half = Math.ceil(activeDays.length / 2);
  const topDays = activeDays.slice(0, half);
  const bottomDays = activeDays.slice(half);

  const textX = PAD + IMG_W + 30;

  let svgContent = `
    <text x="${PAD}" y="50" font-family="Inter" font-weight="900" font-size="15"
          fill="${accentColor}" letter-spacing="4">SPECIALS &amp; DEALS</text>
    <rect x="${PAD}" y="65" width="50" height="3" fill="${accentColor}"/>
    <text x="${PAD}" y="110" font-family="Playfair Display" font-weight="700" font-size="40"
          fill="#1a1a1a">This Week&apos;s Best</text>
  `;

  // Top text block — right of image 1, same height as BLOCK_H
  const topBlockY = HEADER_H;
  const topItemH = Math.floor(BLOCK_H / Math.max(topDays.reduce((s, d) => s + 1 + Math.min((byDay[d] || []).length, 2), 0), 1));
  let ty = topBlockY + 20;
  for (const day of topDays) {
    if (ty > topBlockY + BLOCK_H - 20) break;
    svgContent += `
      <text x="${textX}" y="${ty}" font-family="Inter" font-weight="900" font-size="16"
            fill="${accentColor}" letter-spacing="2">${escapeXml((DAY_SHORT[day] || day).toUpperCase())}</text>
    `;
    ty += topItemH;
    for (const s of (byDay[day] || []).slice(0, 2)) {
      if (ty > topBlockY + BLOCK_H - 10) break;
      svgContent += `
        <text x="${textX}" y="${ty}" font-family="Playfair Display" font-weight="700" font-size="19"
              fill="#1a1a1a">${escapeXml(s.venue)}</text>
        <text x="${textX}" y="${ty + 22}" font-family="Playfair Display" font-weight="400" font-size="15" font-style="italic"
              fill="#666">${escapeXml(s.name)}${s.price ? ` — ${escapeXml(s.price)}` : ''}</text>
      `;
      ty += topItemH;
    }
  }

  // Bottom text block — right of image 2, same height as BLOCK_H
  const bottomBlockY = HEADER_H + BLOCK_H + 30;
  let by = bottomBlockY + 20;
  const bottomItemH = Math.floor(BLOCK_H / Math.max(bottomDays.reduce((s, d) => s + 1 + Math.min((byDay[d] || []).length, 2), 0), 1));
  for (const day of bottomDays) {
    if (by > bottomBlockY + BLOCK_H - 20) break;
    svgContent += `
      <text x="${textX}" y="${by}" font-family="Inter" font-weight="900" font-size="16"
            fill="${accentColor}" letter-spacing="2">${escapeXml((DAY_SHORT[day] || day).toUpperCase())}</text>
    `;
    by += bottomItemH;
    for (const s of (byDay[day] || []).slice(0, 2)) {
      if (by > bottomBlockY + BLOCK_H - 10) break;
      svgContent += `
        <text x="${textX}" y="${by}" font-family="Playfair Display" font-weight="700" font-size="19"
              fill="#1a1a1a">${escapeXml(s.venue)}</text>
        <text x="${textX}" y="${by + 22}" font-family="Playfair Display" font-weight="400" font-size="15" font-style="italic"
              fill="#666">${escapeXml(s.name)}${s.price ? ` — ${escapeXml(s.price)}` : ''}</text>
      `;
      by += bottomItemH;
    }
  }

  svgContent += `
    <text x="${W - PAD}" y="${H - 25}" font-family="Playfair Display" font-weight="400" font-size="14"
          fill="#bbb" text-anchor="end">04</text>
    <rect x="0" y="0" width="5" height="${H}" fill="${accentColor}"/>
  `;

  composites.push({ input: Buffer.from(`<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">${svgContent}</svg>`), top: 0, left: 0 });
  return bg.jpeg({ quality: JPEG_Q }).toBuffer()
    .then(buf => sharp(buf).composite(composites).jpeg({ quality: JPEG_Q }).toBuffer());
}

/**
 * Back Cover — big Taste/Lanc branding, App Store + Google Play badges, filled layout
 */
async function composeBackCover(
  appName: string,
  accentColor: string,
  borderColor: string,
  logoBuffer: Buffer,
): Promise<Buffer> {
  const bg = sharp({ create: { width: W, height: H, channels: 3, background: hexToRgb(borderColor) } });
  const cx = W / 2;

  const logo = await sharp(logoBuffer).resize(160, 160, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();

  const BW = 200; // badge width
  const BH = 60; // badge height
  const BG = 20; // gap between badges

  const svg = Buffer.from(`
    <svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">

      <!-- Big "Taste" -->
      <text x="${cx}" y="440" font-family="Playfair Display" font-weight="900" font-size="140"
            fill="${accentColor}" text-anchor="middle">Taste</text>
      <!-- "Lanc" proportionate -->
      <text x="${cx}" y="500" font-family="Inter" font-weight="300" font-size="50"
            fill="white" text-anchor="middle" letter-spacing="20">Lanc</text>

      <rect x="${cx - 50}" y="530" width="100" height="3" fill="${accentColor}"/>

      <!-- Subtitle -->
      <text x="${cx}" y="585" font-family="Playfair Display" font-weight="400" font-size="24" font-style="italic"
            fill="rgba(255,255,255,0.75)" text-anchor="middle">Your Weekly Guide to</text>
      <text x="${cx}" y="620" font-family="Playfair Display" font-weight="700" font-size="26"
            fill="white" text-anchor="middle">Lancaster&apos;s Best Dining,</text>
      <text x="${cx}" y="655" font-family="Playfair Display" font-weight="700" font-size="26"
            fill="white" text-anchor="middle">Drinks &amp; Nightlife</text>

      <rect x="${cx - 30}" y="685" width="60" height="2" fill="rgba(255,255,255,0.2)"/>

      <text x="${cx}" y="725" font-family="Playfair Display" font-weight="400" font-size="20" font-style="italic"
            fill="rgba(255,255,255,0.6)" text-anchor="middle">New issue every Friday</text>

      <!-- App Store Badge -->
      <g transform="translate(${cx - BW - BG / 2}, 770)">
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
      <g transform="translate(${cx + BG / 2}, 770)">
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
      <text x="${cx}" y="880" font-family="Inter" font-weight="400" font-size="18"
            fill="rgba(255,255,255,0.5)" text-anchor="middle">Follow @tastelanc for more</text>

      <!-- Bottom -->
      <rect x="${cx - 200}" y="${H - 120}" width="400" height="1" fill="rgba(255,255,255,0.15)"/>
      <text x="${cx}" y="${H - 80}" font-family="Playfair Display" font-weight="400" font-size="20" font-style="italic"
            fill="rgba(255,255,255,0.5)" text-anchor="middle">Your city. Your guide.</text>
      <text x="${cx}" y="${H - 50}" font-family="Playfair Display" font-weight="400" font-size="20" font-style="italic"
            fill="rgba(255,255,255,0.5)" text-anchor="middle">Your next favorite spot.</text>
    </svg>`);

  return bg.jpeg({ quality: JPEG_Q }).toBuffer()
    .then(buf => sharp(buf).composite([
      { input: logo, top: 200, left: Math.round(cx - 80) },
      { input: svg, top: 0, left: 0 },
    ]).jpeg({ quality: JPEG_Q }).toBuffer());
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace('#', '');
  return { r: parseInt(h.slice(0, 2), 16), g: parseInt(h.slice(2, 4), 16), b: parseInt(h.slice(4, 6), 16) };
}

// ============================================================
// Main: Generate Full Magazine Issue
// ============================================================

export async function generateMagazineIssue(opts: {
  supabase: SupabaseClient;
  market: MarketConfig;
  date: string;
  borderColor?: string;
  accentColor?: string;
}): Promise<string[]> {
  const { supabase, market, date, borderColor = '#6B21A8', accentColor = '#E8C547' } = opts;
  const appName = getAppName(market.market_slug);

  // 1. Analyze the week's content
  console.log('[Magazine] Analyzing content for', market.market_slug);
  const issueData = await analyzeWeekContent(supabase, market.market_id);
  console.log('[Magazine] Theme:', issueData.theme);
  console.log('[Magazine] Events:', issueData.events.length, '| HH:', issueData.happiestHours.length, '| Specials:', issueData.specials.length);

  // 2. Generate the cover using the existing pipeline
  const coverCandidates = issueData.happiestHours
    .filter(h => h.imageUrl?.includes('supabase'))
    .slice(0, 4)
    .map(h => ({
      restaurant_name: h.venue,
      detail_text: `Happy Hour ${h.time}`,
      image_url: h.imageUrl,
      cover_image_url: h.imageUrl,
    }));

  if (coverCandidates.length === 0) {
    throw new Error('No restaurants with uploaded photos for magazine cover');
  }

  // Override the headline with the editorial theme
  const coverUrls = await generateCarouselSlides({
    supabase,
    market,
    candidates: coverCandidates,
    headline: {
      count: String(issueData.happiestHours.length + issueData.events.length),
      label: issueData.theme,
      dayLabel: issueData.coverHeadline1 + ' ' + issueData.coverHeadline2,
    },
    totalCount: issueData.happiestHours.length + issueData.events.length + issueData.specials.length,
    date,
  });

  // We only want the cover (slide 0)
  const coverUrl = coverUrls[0];

  // 3. Generate inside page spreads
  console.log('[Magazine] Generating inside pages...');
  const [hhSpread, eventsSpread, specialsSpread] = await Promise.all([
    composeHappyHourSpread(issueData, accentColor),
    composeEventsSpread(issueData, accentColor),
    composeSpecialsSpread(issueData, accentColor),
  ]);

  // 4. Load logo for back cover
  const { readFileSync, existsSync } = require('fs');
  const { join } = require('path');
  let logoBuffer: Buffer;
  // Use transparent logo (RGBA), not the one with black background
  const logoPath = join(process.cwd(), 'public/images/tastelanc_new_dark.png');
  if (existsSync(logoPath)) {
    logoBuffer = readFileSync(logoPath);
  } else {
    logoBuffer = await sharp({ create: { width: 200, height: 200, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } }).png().toBuffer();
  }

  const backCover = await composeBackCover(appName, accentColor, borderColor, logoBuffer);

  // 5. Upload all pages
  const timestamp = Date.now();
  const storagePath = `instagram/${market.market_slug}/${date}/magazine-${timestamp}`;
  const slideBuffers = [hhSpread, eventsSpread, specialsSpread, backCover];
  const slideUrls = await Promise.all(
    slideBuffers.map((buf, i) => uploadSlide(supabase, buf, `${storagePath}/page-${i + 2}.jpg`))
  );

  // 6. Full carousel: cover + inside pages
  const allUrls = [coverUrl, ...slideUrls];
  console.log('[Magazine] Issue complete:', allUrls.length, 'pages');

  return allUrls;
}
