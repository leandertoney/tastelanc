import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { verifyRestaurantAccess } from '@/lib/auth/restaurant-access';
import { anthropic, CLAUDE_CONFIG } from '@/lib/anthropic';
import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium';

const MENU_IMAGE_VISION_PROMPT = `You are a menu parser. Extract menu data from this menu image.

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

interface PageFetchResult {
  html: string;
  imageUrls: string[];
}

async function fetchWithHeadlessBrowser(url: string): Promise<PageFetchResult> {
  const browser = await puppeteer.launch({
    args: chromium.args,
    defaultViewport: { width: 1280, height: 800 },
    executablePath: await chromium.executablePath(),
    headless: true,
  });

  try {
    const page = await browser.newPage();
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    );

    await page.goto(url, {
      waitUntil: 'networkidle2',
      timeout: 30000,
    });

    // Wait a bit for any lazy-loaded content
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Get the full page content after JS execution
    const html = await page.content();

    // Extract image URLs that might be menus
    const imageUrls = await page.evaluate(() => {
      const images = Array.from(document.querySelectorAll('img'));
      return images
        .map((img) => img.src)
        .filter((src) => {
          if (!src || src.startsWith('data:')) return false;
          const lowerSrc = src.toLowerCase();
          // Look for menu-related image names or larger images
          return (
            lowerSrc.includes('menu') ||
            lowerSrc.includes('food') ||
            lowerSrc.includes('drink') ||
            lowerSrc.includes('lunch') ||
            lowerSrc.includes('dinner') ||
            lowerSrc.includes('breakfast') ||
            lowerSrc.includes('appetizer') ||
            lowerSrc.includes('entree')
          );
        });
    });

    return { html, imageUrls };
  } finally {
    await browser.close();
  }
}

// Extract potential menu images from HTML without headless browser
function extractMenuImageUrls(html: string, baseUrl: string): string[] {
  const imgRegex = /<img[^>]+src=["']([^"']+)["'][^>]*>/gi;
  const images: string[] = [];
  let match;

  while ((match = imgRegex.exec(html)) !== null) {
    let src = match[1];
    if (src.startsWith('data:')) continue;

    // Convert relative URLs to absolute
    if (src.startsWith('//')) {
      src = 'https:' + src;
    } else if (src.startsWith('/')) {
      const url = new URL(baseUrl);
      src = url.origin + src;
    } else if (!src.startsWith('http')) {
      const url = new URL(baseUrl);
      src = url.origin + '/' + src;
    }

    const lowerSrc = src.toLowerCase();
    if (
      lowerSrc.includes('menu') ||
      lowerSrc.includes('food') ||
      lowerSrc.includes('drink') ||
      lowerSrc.includes('lunch') ||
      lowerSrc.includes('dinner') ||
      lowerSrc.includes('breakfast') ||
      lowerSrc.includes('appetizer') ||
      lowerSrc.includes('entree')
    ) {
      images.push(src);
    }
  }

  return images;
}

async function fetchImageAsBase64(imageUrl: string): Promise<{ data: string; mimeType: string } | null> {
  try {
    const response = await fetch(imageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
      },
    });

    if (!response.ok) return null;

    const contentType = response.headers.get('content-type') || 'image/jpeg';
    if (!contentType.startsWith('image/')) return null;

    const buffer = await response.arrayBuffer();
    const base64 = Buffer.from(buffer).toString('base64');

    // Map content type to allowed types
    let mimeType = 'image/jpeg';
    if (contentType.includes('png')) mimeType = 'image/png';
    else if (contentType.includes('gif')) mimeType = 'image/gif';
    else if (contentType.includes('webp')) mimeType = 'image/webp';

    return { data: base64, mimeType };
  } catch {
    return null;
  }
}

async function parseMenuFromImage(imageData: string, mimeType: string): Promise<ParsedMenu> {
  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4096,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: mimeType as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
              data: imageData,
            },
          },
          {
            type: 'text',
            text: MENU_IMAGE_VISION_PROMPT,
          },
        ],
      },
    ],
  });

  const responseText = message.content[0].type === 'text' ? message.content[0].text : '';
  let jsonStr = responseText.trim();

  const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) {
    jsonStr = jsonMatch[1].trim();
  }

  return JSON.parse(jsonStr);
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

    // Validate URL
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

    // Helper to extract text from HTML
    const extractTextFromHtml = (html: string): string => {
      return html
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 50000);
    };

    // First, try simple fetch (faster)
    let pageContent: string;
    let usedHeadlessBrowser = false;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      const response = await fetch(parsedUrl.toString(), {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        pageContent = await response.text();
      } else {
        pageContent = '';
      }
    } catch {
      pageContent = '';
    }

    // Check if simple fetch got meaningful content
    let textContent = extractTextFromHtml(pageContent);
    let menuImageUrls: string[] = extractMenuImageUrls(pageContent, parsedUrl.toString());

    // If simple fetch didn't get enough content, try headless browser
    // This handles JavaScript-rendered menus
    if (textContent.length < 500) {
      try {
        console.log('Simple fetch returned limited content, trying headless browser...');
        const browserResult = await fetchWithHeadlessBrowser(parsedUrl.toString());
        pageContent = browserResult.html;
        textContent = extractTextFromHtml(pageContent);
        menuImageUrls = Array.from(new Set([...menuImageUrls, ...browserResult.imageUrls]));
        usedHeadlessBrowser = true;
      } catch (browserError) {
        console.error('Headless browser failed:', browserError);
        // If we had some content from simple fetch, use it
        if (textContent.length < 100 && menuImageUrls.length === 0) {
          return NextResponse.json(
            { error: 'Could not extract meaningful content from the page. The menu may be loaded dynamically or the site may be blocking access.' },
            { status: 400 }
          );
        }
      }
    }

    console.log(`Extracted ${textContent.length} chars of text content, found ${menuImageUrls.length} potential menu images (headless: ${usedHeadlessBrowser})`)

    // First, try to parse menu from text content (if we have enough)
    let parsedMenu: ParsedMenu = { sections: [] };
    let textParsingFailed = false;

    if (textContent.length >= 100) {
      try {
        const message = await anthropic.messages.create({
          model: CLAUDE_CONFIG.model,
          max_tokens: 4096,
          messages: [
            {
              role: 'user',
              content: `${MENU_PARSE_PROMPT}\n\n${textContent}`,
            },
          ],
        });

        const responseText = message.content[0].type === 'text' ? message.content[0].text : '';
        let jsonStr = responseText.trim();

        const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (jsonMatch) {
          jsonStr = jsonMatch[1].trim();
        }

        parsedMenu = JSON.parse(jsonStr);
      } catch (error) {
        console.error('Error processing text menu with Claude:', error);
        textParsingFailed = true;
      }
    }

    // Check if text parsing found menu items
    const textFoundItems = parsedMenu.sections &&
      Array.isArray(parsedMenu.sections) &&
      parsedMenu.sections.length > 0 &&
      !parsedMenu.error;

    // If text parsing didn't find items, try parsing menu images
    if (!textFoundItems && menuImageUrls.length > 0) {
      console.log(`Text parsing found no items, trying ${menuImageUrls.length} menu images...`);

      const allSections: ParsedSection[] = [];

      // Process up to 5 images to avoid excessive API calls
      const imagesToProcess = menuImageUrls.slice(0, 5);

      for (const imageUrl of imagesToProcess) {
        try {
          console.log(`Processing menu image: ${imageUrl}`);
          const imageData = await fetchImageAsBase64(imageUrl);

          if (!imageData) {
            console.log(`Failed to fetch image: ${imageUrl}`);
            continue;
          }

          const imageParsedMenu = await parseMenuFromImage(imageData.data, imageData.mimeType);

          if (imageParsedMenu.sections &&
              Array.isArray(imageParsedMenu.sections) &&
              imageParsedMenu.sections.length > 0 &&
              !imageParsedMenu.error) {
            allSections.push(...imageParsedMenu.sections);
            console.log(`Found ${imageParsedMenu.sections.length} sections from image`);
          }
        } catch (imageError) {
          console.error(`Error processing menu image ${imageUrl}:`, imageError);
        }
      }

      if (allSections.length > 0) {
        parsedMenu = { sections: allSections };
      }
    }

    // Final validation
    if (!parsedMenu.sections || !Array.isArray(parsedMenu.sections)) {
      return NextResponse.json(
        { error: 'Failed to extract menu structure from the page.' },
        { status: 422 }
      );
    }

    if (parsedMenu.error || parsedMenu.sections.length === 0) {
      // Give more specific error based on what we found
      let errorMsg = 'No menu items found on this page.';
      if (menuImageUrls.length > 0) {
        errorMsg += ' We found images that might be menus but could not read them clearly. Try using the image import directly with a screenshot of the menu.';
      } else if (textParsingFailed) {
        errorMsg += ' The page content could not be processed. Try using image or PDF import instead.';
      } else {
        errorMsg += ' This can happen if the URL points to the restaurant homepage instead of the menu page. Try navigating directly to the menu page, or use image/PDF import.';
      }

      return NextResponse.json({ error: errorMsg }, { status: 422 });
    }

    // Count total items
    const totalItems = parsedMenu.sections.reduce(
      (sum, section) => sum + (section.items?.length || 0),
      0
    );

    return NextResponse.json({
      success: true,
      source_url: url,
      sections: parsedMenu.sections,
      stats: {
        sections_count: parsedMenu.sections.length,
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
