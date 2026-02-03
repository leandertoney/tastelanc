import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { verifyRestaurantAccess } from '@/lib/auth/restaurant-access';
import { anthropic } from '@/lib/anthropic';

const MENU_VISION_PROMPT = `You are a menu parser. Extract menu data from this menu image.

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
    const { image, mimeType } = body;

    if (!image) {
      return NextResponse.json(
        { error: 'Image data is required' },
        { status: 400 }
      );
    }

    // Validate mime type
    const validMimeTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    const actualMimeType = mimeType || 'image/jpeg';

    if (!validMimeTypes.includes(actualMimeType)) {
      return NextResponse.json(
        { error: 'Invalid image format. Supported formats: JPEG, PNG, GIF, WebP' },
        { status: 400 }
      );
    }

    // Validate base64 data (rough size check - max ~10MB base64)
    if (image.length > 14_000_000) {
      return NextResponse.json(
        { error: 'Image too large. Maximum size is 10MB.' },
        { status: 400 }
      );
    }

    // Use Claude Vision to parse the menu image
    let parsedMenu: ParsedMenu;
    try {
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
                  media_type: actualMimeType as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
                  data: image,
                },
              },
              {
                type: 'text',
                text: MENU_VISION_PROMPT,
              },
            ],
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
      console.error('Error processing menu with Claude Vision:', error);
      return NextResponse.json(
        { error: 'Failed to read the menu image. Please try a clearer image or different format.' },
        { status: 422 }
      );
    }

    // Validate parsed data
    if (!parsedMenu.sections || !Array.isArray(parsedMenu.sections)) {
      return NextResponse.json(
        { error: 'Failed to extract menu structure from the image.' },
        { status: 422 }
      );
    }

    if (parsedMenu.error || parsedMenu.sections.length === 0) {
      return NextResponse.json(
        {
          error: 'No menu items found in this image. Make sure the image clearly shows the menu with item names and prices. If the image is blurry or the text is too small, try a higher quality image or a closer crop of the menu section.'
        },
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
      source_type: 'image',
      sections: parsedMenu.sections,
      stats: {
        sections_count: parsedMenu.sections.length,
        items_count: totalItems,
      },
    });
  } catch (error) {
    console.error('Error in menu image import API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
