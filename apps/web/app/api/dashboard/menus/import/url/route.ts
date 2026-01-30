import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { verifyRestaurantAccess } from '@/lib/auth/restaurant-access';
import { anthropic, CLAUDE_CONFIG } from '@/lib/anthropic';

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

    // Fetch the webpage content
    let pageContent: string;
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

      const response = await fetch(parsedUrl.toString(), {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; TasteLancBot/1.0; +https://tastelanc.com)',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        return NextResponse.json(
          { error: `Failed to fetch URL: ${response.status} ${response.statusText}` },
          { status: 400 }
        );
      }

      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('text/html') && !contentType.includes('text/plain')) {
        return NextResponse.json(
          { error: 'URL does not appear to be a webpage. Please provide a link to a menu page.' },
          { status: 400 }
        );
      }

      pageContent = await response.text();
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        return NextResponse.json(
          { error: 'Request timed out. The website may be slow or blocking our access.' },
          { status: 408 }
        );
      }
      return NextResponse.json(
        { error: 'Failed to fetch the URL. Please check the link and try again.' },
        { status: 400 }
      );
    }

    // Extract text content from HTML (basic cleanup)
    const textContent = pageContent
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 50000); // Limit content to avoid token limits

    if (textContent.length < 100) {
      return NextResponse.json(
        { error: 'Could not extract meaningful content from the page. Try a different menu URL.' },
        { status: 400 }
      );
    }

    // Use Claude to parse the menu
    let parsedMenu: ParsedMenu;
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

      // Try to extract JSON from the response
      let jsonStr = responseText.trim();

      // Handle case where Claude might wrap in markdown code block
      const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        jsonStr = jsonMatch[1].trim();
      }

      parsedMenu = JSON.parse(jsonStr);
    } catch (error) {
      console.error('Error processing menu with Claude:', error);
      return NextResponse.json(
        { error: 'Failed to read the menu. The page content may not contain a recognizable menu format.' },
        { status: 422 }
      );
    }

    // Validate parsed data
    if (!parsedMenu.sections || !Array.isArray(parsedMenu.sections)) {
      return NextResponse.json(
        { error: 'Failed to extract menu structure from the page.' },
        { status: 422 }
      );
    }

    if (parsedMenu.error) {
      return NextResponse.json(
        { error: parsedMenu.error },
        { status: 422 }
      );
    }

    if (parsedMenu.sections.length === 0) {
      return NextResponse.json(
        { error: 'No menu items found on this page. Please try a different URL.' },
        { status: 422 }
      );
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
