import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { verifyRestaurantAccess } from '@/lib/auth/restaurant-access';
import { anthropic, CLAUDE_CONFIG } from '@/lib/anthropic';
import { PDFParse } from 'pdf-parse';

const MENU_PARSE_PROMPT = `You are a menu parser. Extract menu data from the following text extracted from a PDF menu.

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

PDF Text Content:`;

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
    const { file } = body;

    if (!file) {
      return NextResponse.json(
        { error: 'PDF file data is required' },
        { status: 400 }
      );
    }

    // Validate base64 data size (max ~20MB base64)
    if (file.length > 28_000_000) {
      return NextResponse.json(
        { error: 'PDF too large. Maximum size is 20MB.' },
        { status: 400 }
      );
    }

    // Convert base64 to buffer
    let pdfBuffer: Buffer;
    try {
      pdfBuffer = Buffer.from(file, 'base64');
    } catch {
      return NextResponse.json(
        { error: 'Invalid PDF data format.' },
        { status: 400 }
      );
    }

    // Extract text from PDF
    let pdfText: string;
    try {
      const parser = new PDFParse({ data: new Uint8Array(pdfBuffer) });
      const textResult = await parser.getText();
      pdfText = textResult.text;
      await parser.destroy();
    } catch (error) {
      console.error('Error reading PDF:', error);
      return NextResponse.json(
        { error: 'Failed to read PDF file. Please ensure it is a valid PDF document.' },
        { status: 400 }
      );
    }

    if (!pdfText || pdfText.trim().length < 50) {
      return NextResponse.json(
        { error: 'Could not extract meaningful text from the PDF. The file may be image-based or corrupted.' },
        { status: 422 }
      );
    }

    // Limit text to avoid token limits
    const trimmedText = pdfText.slice(0, 50000);

    // Use Claude to parse the menu
    let parsedMenu: ParsedMenu;
    try {
      const message = await anthropic.messages.create({
        model: CLAUDE_CONFIG.model,
        max_tokens: 4096,
        messages: [
          {
            role: 'user',
            content: `${MENU_PARSE_PROMPT}\n\n${trimmedText}`,
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
        { error: 'Failed to read the menu. The PDF content may not contain a recognizable menu format.' },
        { status: 422 }
      );
    }

    // Validate parsed data
    if (!parsedMenu.sections || !Array.isArray(parsedMenu.sections)) {
      return NextResponse.json(
        { error: 'Failed to extract menu structure from the PDF.' },
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
        { error: 'No menu items found in this PDF. Please try a different file.' },
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
      source_type: 'pdf',
      sections: parsedMenu.sections,
      stats: {
        sections_count: parsedMenu.sections.length,
        items_count: totalItems,
      },
    });
  } catch (error) {
    console.error('Error in menu PDF import API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
