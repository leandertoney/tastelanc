import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { verifyRestaurantAccess } from '@/lib/auth/restaurant-access';
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const AI_MODEL = 'gpt-4o-mini';

// Allow up to 60s for this route
export const maxDuration = 60;

const MENU_IMAGE_VISION_PROMPT = `You are a menu parser. Extract menu data from these menu image(s).

Return ONLY valid JSON in this exact format (no markdown, no explanation):
{
  "sections": [
    {
      "name": "Section Name (e.g., Appetizers, Entrees, Drinks)",
      "description": "Optional section description",
      "items": [
        {
          "name": "Item Name",
          "description": "Item description or ingredients",
          "price": 12.99,
          "dietary_flags": ["vegetarian", "gluten-free"]
        }
      ]
    }
  ]
}

Rules:
- Extract ONLY menu items (food/drinks with names and typically prices)
- Group items into logical sections if the menu has categories
- If no clear sections exist, use a single section like "Menu Items"
- Price should be a number (12.99) or null if unavailable
- Use null for price if you see "Market Price" or similar text, and put that text in price_description
- dietary_flags should only include: vegetarian, vegan, gluten-free, dairy-free, nut-free, spicy
- Skip any non-menu content like logos, addresses, or decorative elements
- If multiple images are provided, combine all menu items into a unified structure
- If you cannot find any menu items, return {"sections": [], "error": "No menu items found"}`;

const MENU_PARSE_PROMPT = `You are a menu parser. Extract menu data from the following webpage content.

Return ONLY valid JSON in this exact format (no markdown, no explanation):
{
  "sections": [
    {
      "name": "Section Name (e.g., Appetizers, Entrees, Drinks)",
      "description": "Optional section description",
      "items": [
        {
          "name": "Item Name",
          "description": "Item description or ingredients",
          "price": 12.99,
          "dietary_flags": ["vegetarian", "gluten-free"]
        }
      ]
    }
  ]
}

Rules:
- Extract ONLY menu items (food/drinks with names and typically prices)
- Group items into logical sections if the menu has categories
- If no clear sections exist, use a single section like "Menu Items"
- Price should be a number (12.99) or null if unavailable
- Use null for price if you see "Market Price" or similar text, and put that text in price_description
- dietary_flags should only include: vegetarian, vegan, gluten-free, dairy-free, nut-free, spicy
- Skip navigation, headers, footers, contact info, hours, etc.
- If you cannot find any menu items, return {"sections": [], "error": "No menu items found"}

Webpage content:`;

interface ParsedSection {
  name: string;
  description?: string;
  items: {
    name: string;
    description?: string;
    price?: number | null;
    price_description?: string;
    dietary_flags?: string[];
  }[];
}

interface ParsedMenu {
  sections: ParsedSection[];
  error?: string;
}

// Extract potential menu images from HTML — broadened detection
function extractMenuImageUrls(html: string, baseUrl: string): string[] {
  const images: string[] = [];
  const imgRegex = /<img[^>]*>/gi;
  let match;

  while ((match = imgRegex.exec(html)) !== null) {
    const tag = match[0];
    const srcMatch = tag.match(/src=["']([^"']+)["']/i);
    if (!srcMatch) continue;

    let src = srcMatch[1];
    if (src.startsWith('data:')) continue;

    src = resolveUrl(src, baseUrl);

    const altMatch = tag.match(/alt=["']([^"']+)["']/i);
    const alt = altMatch ? altMatch[1].toLowerCase() : '';
    const lowerSrc = src.toLowerCase();

    const menuKeywords = [
      'menu', 'food', 'drink', 'lunch', 'dinner', 'breakfast',
      'appetizer', 'entree', 'cocktail', 'brunch', 'specials',
      'dessert', 'wine', 'beer', 'beverage', 'dish', 'plate',
      'cuisine', 'chef', 'kitchen', 'dine', 'dining'
    ];

    const isMenuRelated = menuKeywords.some(kw =>
      lowerSrc.includes(kw) || alt.includes(kw)
    );

    if (isMenuRelated) {
      images.push(src);
    }
  }

  return images;
}

// Extract ALL images as fallback (skip tiny icons/logos)
function extractAllImageUrls(html: string, baseUrl: string): string[] {
  const images: string[] = [];
  const imgRegex = /<img[^>]*src=["']([^"']+)["'][^>]*>/gi;
  let match;

  while ((match = imgRegex.exec(html)) !== null) {
    let src = match[1];
    if (src.startsWith('data:')) continue;

    src = resolveUrl(src, baseUrl);
    const lowerSrc = src.toLowerCase();

    const skipPatterns = [
      'logo', 'icon', 'favicon', 'avatar', 'profile', 'social',
      'facebook', 'twitter', 'instagram', 'pinterest', 'yelp',
      'google', 'tripadvisor', 'sprite', 'pixel', 'tracking',
      'badge', 'banner-ad', 'advertisement', '.svg', '1x1',
      'spacer', 'arrow', 'button', 'check', 'close', 'search'
    ];

    if (skipPatterns.some(p => lowerSrc.includes(p))) continue;

    if (/\.(jpg|jpeg|png|webp|gif)/i.test(lowerSrc) || lowerSrc.includes('image')) {
      images.push(src);
    }
  }

  return images;
}

// Extract PDF links that might be menus
function extractMenuPdfUrls(html: string, baseUrl: string): string[] {
  const pdfs: string[] = [];
  const linkRegex = /<a[^>]*href=["']([^"']*\.pdf[^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let match;

  while ((match = linkRegex.exec(html)) !== null) {
    let href = match[1];
    const linkText = match[2].replace(/<[^>]+>/g, '').toLowerCase();
    const lowerHref = href.toLowerCase();

    const menuKeywords = [
      'menu', 'food', 'drink', 'lunch', 'dinner', 'breakfast',
      'brunch', 'cocktail', 'wine', 'beer', 'beverage', 'dine'
    ];

    if (menuKeywords.some(kw => lowerHref.includes(kw) || linkText.includes(kw))) {
      href = resolveUrl(href, baseUrl);
      pdfs.push(href);
    }
  }

  // Also look for direct PDF links not in <a> tags
  const hrefRegex = /href=["']([^"']*menu[^"']*\.pdf[^"']*)["']/gi;
  while ((match = hrefRegex.exec(html)) !== null) {
    let href = match[1];
    href = resolveUrl(href, baseUrl);
    if (!pdfs.includes(href)) {
      pdfs.push(href);
    }
  }

  return pdfs;
}

// Extract iframe/embed sources that might contain menus
function extractEmbedUrls(html: string, baseUrl: string): string[] {
  const embeds: string[] = [];
  const iframeRegex = /<iframe[^>]*src=["']([^"']+)["'][^>]*>/gi;
  let match;

  while ((match = iframeRegex.exec(html)) !== null) {
    let src = match[1];
    const lowerSrc = src.toLowerCase();

    if (
      lowerSrc.includes('menu') ||
      lowerSrc.includes('popmenu') ||
      lowerSrc.includes('bentobox') ||
      lowerSrc.includes('chownow') ||
      lowerSrc.includes('toast') ||
      lowerSrc.includes('grubhub') ||
      lowerSrc.includes('doordash') ||
      lowerSrc.includes('square') ||
      lowerSrc.includes('gloria') ||
      lowerSrc.includes('zmenu')
    ) {
      src = resolveUrl(src, baseUrl);
      embeds.push(src);
    }
  }

  return embeds;
}

function resolveUrl(src: string, baseUrl: string): string {
  if (src.startsWith('//')) {
    return 'https:' + src;
  } else if (src.startsWith('/')) {
    const url = new URL(baseUrl);
    return url.origin + src;
  } else if (!src.startsWith('http')) {
    const url = new URL(baseUrl);
    return url.origin + '/' + src;
  }
  return src;
}

async function fetchWithTimeout(url: string, timeoutMs: number): Promise<Response | null> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    });
    clearTimeout(timeoutId);
    return response;
  } catch {
    return null;
  }
}

async function fetchImageAsBase64(imageUrl: string): Promise<{ data: string; mimeType: string } | null> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);
    const response = await fetch(imageUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
      },
    });
    clearTimeout(timeoutId);

    if (!response.ok) return null;

    const contentType = response.headers.get('content-type') || 'image/jpeg';
    if (!contentType.startsWith('image/')) return null;

    const buffer = await response.arrayBuffer();
    // Skip tiny images (< 5KB — likely icons)
    if (buffer.byteLength < 5000) return null;
    // Skip enormous images (> 5MB — too slow)
    if (buffer.byteLength > 5_000_000) return null;

    const base64 = Buffer.from(buffer).toString('base64');

    let mimeType = 'image/jpeg';
    if (contentType.includes('png')) mimeType = 'image/png';
    else if (contentType.includes('gif')) mimeType = 'image/gif';
    else if (contentType.includes('webp')) mimeType = 'image/webp';

    return { data: base64, mimeType };
  } catch {
    return null;
  }
}

// Parse menu from multiple images in a single OpenAI Vision call
async function parseMenuFromImages(
  images: { data: string; mimeType: string }[]
): Promise<ParsedMenu> {
  const content: OpenAI.Chat.Completions.ChatCompletionContentPart[] = [];

  for (const img of images) {
    content.push({
      type: 'image_url',
      image_url: { url: `data:${img.mimeType};base64,${img.data}` },
    });
  }

  content.push({ type: 'text', text: MENU_IMAGE_VISION_PROMPT });

  const completion = await openai.chat.completions.create({
    model: AI_MODEL,
    max_tokens: 4096,
    messages: [{ role: 'user', content }],
  });

  const responseText = completion.choices[0]?.message?.content || '';
  let jsonStr = responseText.trim();
  const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) {
    jsonStr = jsonMatch[1].trim();
  }
  return JSON.parse(jsonStr);
}

function extractTextFromHtml(html: string): string {
  return html
    // Remove non-content blocks (scripts, styles, nav, footer, etc.)
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '')
    .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, '')
    .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '')
    .replace(/<aside[^>]*>[\s\S]*?<\/aside>/gi, '')
    .replace(/<noscript[^>]*>[\s\S]*?<\/noscript>/gi, '')
    .replace(/<svg[^>]*>[\s\S]*?<\/svg>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<link[^>]*>/gi, '')
    .replace(/<meta[^>]*>/gi, '')
    // Strip remaining tags and clean up whitespace
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 50000);
}

function countItems(menu: ParsedMenu): number {
  if (!menu.sections || !Array.isArray(menu.sections)) return 0;
  return menu.sections.reduce((sum, s) => sum + (s.items?.length || 0), 0);
}

function isValidMenu(menu: ParsedMenu): boolean {
  return !!(
    menu.sections &&
    Array.isArray(menu.sections) &&
    menu.sections.length > 0 &&
    !menu.error &&
    countItems(menu) > 0
  );
}

// Merge multiple parsed menus, deduplicating sections
function mergeMenus(...menus: ParsedMenu[]): ParsedMenu {
  const allSections: ParsedSection[] = [];
  const seenSectionNames = new Set<string>();

  for (const menu of menus) {
    if (!menu.sections || !Array.isArray(menu.sections)) continue;
    for (const section of menu.sections) {
      const key = section.name.toLowerCase().trim();
      if (seenSectionNames.has(key)) {
        // Merge items into existing section
        const existing = allSections.find(s => s.name.toLowerCase().trim() === key);
        if (existing && section.items) {
          const existingNames = new Set(existing.items.map(i => i.name.toLowerCase().trim()));
          for (const item of section.items) {
            if (!existingNames.has(item.name.toLowerCase().trim())) {
              existing.items.push(item);
            }
          }
        }
      } else {
        seenSectionNames.add(key);
        allSections.push({ ...section });
      }
    }
  }

  return { sections: allSections };
}

export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const restaurantId = searchParams.get('restaurant_id');

    if (!restaurantId) {
      return NextResponse.json(
        { error: 'restaurant_id is required' },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const accessResult = await verifyRestaurantAccess(supabase, restaurantId);

    if (!accessResult.canAccess) {
      return NextResponse.json(
        { error: accessResult.error || 'Access denied' },
        { status: accessResult.userId ? 403 : 401 }
      );
    }

    const body = await request.json();
    const { url } = body;

    if (!url) {
      return NextResponse.json(
        { error: 'URL is required' },
        { status: 400 }
      );
    }

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
      if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
        throw new Error('Invalid protocol');
      }
    } catch {
      return NextResponse.json(
        { error: 'Invalid URL format' },
        { status: 400 }
      );
    }

    // ---- STEP 1: Fetch the page ----
    const response = await fetchWithTimeout(parsedUrl.toString(), 15000);
    let pageContent = '';
    if (response?.ok) {
      pageContent = await response.text();
    }

    const textContent = extractTextFromHtml(pageContent);
    const menuImageUrls = extractMenuImageUrls(pageContent, parsedUrl.toString());
    const allImageUrls = extractAllImageUrls(pageContent, parsedUrl.toString());
    const pdfUrls = extractMenuPdfUrls(pageContent, parsedUrl.toString());
    const embedUrls = extractEmbedUrls(pageContent, parsedUrl.toString());

    console.log(
      `URL import: ${textContent.length} chars text, ${menuImageUrls.length} menu images, ` +
      `${allImageUrls.length} total images, ${pdfUrls.length} PDFs, ${embedUrls.length} embeds`
    );

    // If we got almost nothing from the page, bail early
    if (textContent.length < 50 && menuImageUrls.length === 0 && allImageUrls.length === 0 && pdfUrls.length === 0 && embedUrls.length === 0) {
      return NextResponse.json(
        { error: 'Could not extract any content from the page. The site may be blocking access or requires JavaScript. Try using image or PDF import instead.' },
        { status: 400 }
      );
    }

    // ---- STEP 2: Run ALL strategies in parallel ----

    // Strategy A: Parse text content with Claude
    const textStrategy = (async (): Promise<ParsedMenu> => {
      if (textContent.length < 100) return { sections: [] };
      try {
        const completion = await openai.chat.completions.create({
          model: AI_MODEL,
          max_tokens: 4096,
          messages: [{
            role: 'user',
            content: `${MENU_PARSE_PROMPT}\n\n${textContent}`,
          }],
        });
        const responseText = completion.choices[0]?.message?.content || '';
        let jsonStr = responseText.trim();
        const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (jsonMatch) jsonStr = jsonMatch[1].trim();
        return JSON.parse(jsonStr);
      } catch (err: unknown) {
        const errMsg = err instanceof Error ? err.message : String(err);
        console.error('Text strategy failed:', errMsg);
        return { sections: [], error: `Text strategy error: ${errMsg}` };
      }
    })();

    // Strategy B: Download menu-related images and parse via single Vision call
    const imageStrategy = (async (): Promise<ParsedMenu> => {
      // Prefer keyword-matched images, fall back to all images
      const imagesToTry = menuImageUrls.length > 0
        ? menuImageUrls.slice(0, 4)
        : allImageUrls.slice(0, 6);

      if (imagesToTry.length === 0) return { sections: [] };

      try {
        // Download images in parallel
        const imageResults = await Promise.all(
          imagesToTry.map(imgUrl => fetchImageAsBase64(imgUrl))
        );
        const validImages = imageResults.filter((img): img is { data: string; mimeType: string } => img !== null);

        if (validImages.length === 0) return { sections: [] };

        // Send up to 3 images in a SINGLE Claude Vision call
        const imagesToParse = validImages.slice(0, 3);
        console.log(`Image strategy: sending ${imagesToParse.length} images in single Vision call`);
        return await parseMenuFromImages(imagesToParse);
      } catch (err) {
        console.error('Image strategy failed:', err);
        return { sections: [] };
      }
    })();

    // Strategy C: Fetch embedded menu pages (iframes from menu providers)
    const embedStrategy = (async (): Promise<ParsedMenu> => {
      if (embedUrls.length === 0) return { sections: [] };

      try {
        const embedUrl = embedUrls[0];
        const embedResponse = await fetchWithTimeout(embedUrl, 10000);
        if (!embedResponse?.ok) return { sections: [] };

        const embedHtml = await embedResponse.text();
        const embedText = extractTextFromHtml(embedHtml);

        if (embedText.length < 100) return { sections: [] };

        const completion = await openai.chat.completions.create({
          model: AI_MODEL,
          max_tokens: 4096,
          messages: [{
            role: 'user',
            content: `${MENU_PARSE_PROMPT}\n\n${embedText}`,
          }],
        });
        const responseText = completion.choices[0]?.message?.content || '';
        let jsonStr = responseText.trim();
        const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (jsonMatch) jsonStr = jsonMatch[1].trim();
        return JSON.parse(jsonStr);
      } catch (err) {
        console.error('Embed strategy failed:', err);
        return { sections: [] };
      }
    })();

    // Strategy D: Fetch linked PDF menus
    const pdfStrategy = (async (): Promise<ParsedMenu> => {
      if (pdfUrls.length === 0) return { sections: [] };

      try {
        const pdfUrl = pdfUrls[0];
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);
        const pdfResponse = await fetch(pdfUrl, {
          signal: controller.signal,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
          },
        });
        clearTimeout(timeoutId);

        if (!pdfResponse.ok) return { sections: [] };

        const contentType = pdfResponse.headers.get('content-type') || '';

        // If it's actually an image (some "PDF" links are images)
        if (contentType.startsWith('image/')) {
          const buffer = await pdfResponse.arrayBuffer();
          if (buffer.byteLength > 5_000_000) return { sections: [] };
          const base64 = Buffer.from(buffer).toString('base64');
          let mimeType = 'image/jpeg';
          if (contentType.includes('png')) mimeType = 'image/png';
          else if (contentType.includes('webp')) mimeType = 'image/webp';
          return await parseMenuFromImages([{ data: base64, mimeType }]);
        }

        // Actual PDF — extract text and parse
        if (contentType.includes('pdf') || pdfUrl.toLowerCase().endsWith('.pdf')) {
          const buffer = await pdfResponse.arrayBuffer();
          if (buffer.byteLength > 10_000_000) return { sections: [] };

          try {
            const { PDFParse } = await import('pdf-parse');
            const parser = new PDFParse({ data: new Uint8Array(buffer) });
            const textResult = await parser.getText();
            const pdfText = textResult.text;
            await parser.destroy();

            if (!pdfText || pdfText.trim().length < 50) return { sections: [] };

            const completion = await openai.chat.completions.create({
              model: AI_MODEL,
              max_tokens: 4096,
              messages: [{
                role: 'user',
                content: `${MENU_PARSE_PROMPT}\n\n${pdfText.slice(0, 50000)}`,
              }],
            });
            const responseText = completion.choices[0]?.message?.content || '';
            let jsonStr = responseText.trim();
            const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
            if (jsonMatch) jsonStr = jsonMatch[1].trim();
            return JSON.parse(jsonStr);
          } catch {
            console.error('PDF parsing failed for linked PDF');
            return { sections: [] };
          }
        }

        return { sections: [] };
      } catch (err) {
        console.error('PDF strategy failed:', err);
        return { sections: [] };
      }
    })();

    // ---- STEP 3: Wait for all strategies and pick the best result ----
    const [textResult, imageResult, embedResult, pdfResult] = await Promise.all([
      textStrategy,
      imageStrategy,
      embedStrategy,
      pdfStrategy,
    ]);

    console.log(
      `Results — text: ${countItems(textResult)} items (error: ${textResult.error || 'none'}), ` +
      `images: ${countItems(imageResult)} items (error: ${imageResult.error || 'none'}), ` +
      `embed: ${countItems(embedResult)} items (error: ${embedResult.error || 'none'}), ` +
      `pdf: ${countItems(pdfResult)} items (error: ${pdfResult.error || 'none'})`
    );

    // Collect all valid results
    const validResults = [
      { menu: textResult, source: 'text' },
      { menu: imageResult, source: 'images' },
      { menu: embedResult, source: 'embed' },
      { menu: pdfResult, source: 'pdf' },
    ].filter(r => isValidMenu(r.menu));

    let finalMenu: ParsedMenu;

    if (validResults.length === 0) {
      const errors = [textResult, imageResult, embedResult, pdfResult]
        .map(r => r.error)
        .filter(Boolean);
      console.error('All strategies failed. Errors:', errors);
      return NextResponse.json(
        {
          error: 'No menu items found on this page. This can happen if the menu is loaded dynamically, is behind a login, or the URL points to a non-menu page. Try navigating directly to the menu page, or use the image or PDF import instead.',
          debug_errors: errors,
        },
        { status: 422 }
      );
    } else if (validResults.length === 1) {
      finalMenu = validResults[0].menu;
    } else {
      // Multiple strategies found items — use the best one or merge
      validResults.sort((a, b) => countItems(b.menu) - countItems(a.menu));
      const best = validResults[0];
      const second = validResults[1];

      // If the best result has significantly more items, just use it
      if (countItems(best.menu) >= countItems(second.menu) * 2) {
        finalMenu = best.menu;
      } else {
        // Merge the top 2 results for the most complete menu
        finalMenu = mergeMenus(best.menu, second.menu);
      }
    }

    const totalItems = countItems(finalMenu);

    return NextResponse.json({
      success: true,
      source_url: url,
      sections: finalMenu.sections,
      stats: {
        sections_count: finalMenu.sections.length,
        items_count: totalItems,
      },
    });
  } catch (error) {
    console.error('Error in menu URL import API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
