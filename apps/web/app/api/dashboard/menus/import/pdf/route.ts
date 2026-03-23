import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { verifyRestaurantAccess } from '@/lib/auth/restaurant-access';
import OpenAI from 'openai';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const maxDuration = 60;

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY_MENU || process.env.OPENAI_API_KEY });

const MENU_PARSE_PROMPT = `You are a menu parser. Extract menu data from this PDF menu text.

The text may have unusual spacing (e.g. "B u r g e r s" instead of "Burgers") due to PDF encoding — read through it carefully.

Return ONLY valid JSON in this exact format (no markdown, no explanation):
{
  "menu_name": "Banquet Menu",
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
- Use null for price if you see "Market Price" or similar, and put that text in price_description
- dietary_flags should only include: vegetarian, vegan, gluten-free, dairy-free, nut-free, spicy
- Skip navigation, headers, footers, contact info, hours, etc.
- For menu_name: use the actual menu title from the document (e.g. "2026 Banquet Menu", "Dinner Menu", "Happy Hour Menu"). Reconstruct any spaced-out characters (e.g. "2 0 2 6" → "2026", "B a n q u e t" → "Banquet"). If unclear, use a short descriptive name.
- If you cannot find any menu items, return {"sections": [], "error": "No menu items found"}

PDF text:`;

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
  menu_name?: string;
  sections: ParsedSection[];
  error?: string;
}

async function extractTextFromPdfBuffer(buffer: Buffer): Promise<string> {
  const pdfParse = (await import('pdf-parse/lib/pdf-parse.js')).default;
  const result = await pdfParse(buffer);
  return result.text || '';
}

function parseJsonFromResponse(text: string): ParsedMenu {
  let jsonStr = text.trim();
  const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) jsonStr = jsonMatch[1].trim();
  return JSON.parse(jsonStr);
}

export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const restaurantId = searchParams.get('restaurant_id');

    if (!restaurantId) {
      return NextResponse.json({ error: 'restaurant_id is required' }, { status: 400 });
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
      return NextResponse.json({ error: 'PDF file data is required' }, { status: 400 });
    }

    if (file.length > 28_000_000) {
      return NextResponse.json({ error: 'PDF too large. Maximum size is 20MB.' }, { status: 400 });
    }

    // Decode base64 → buffer → extract text
    let pdfText: string;
    try {
      const buffer = Buffer.from(file, 'base64');
      pdfText = await extractTextFromPdfBuffer(buffer);
    } catch (err) {
      console.error('PDF text extraction failed:', err);
      return NextResponse.json({ error: 'Failed to read the PDF. Please ensure it is a valid PDF document.' }, { status: 422 });
    }

    if (!pdfText || pdfText.trim().length < 50) {
      return NextResponse.json({ error: 'This PDF appears to be image-only and cannot be read as text. Try taking a screenshot of the menu and using the Image import instead.' }, { status: 422 });
    }

    let parsedMenu: ParsedMenu;
    try {
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        max_tokens: 4096,
        messages: [{ role: 'user', content: `${MENU_PARSE_PROMPT}\n\n${pdfText.slice(0, 50000)}` }],
      });
      const responseText = completion.choices[0]?.message?.content || '';
      parsedMenu = parseJsonFromResponse(responseText);
    } catch (err) {
      console.error('OpenAI parsing failed:', err);
      return NextResponse.json({ error: 'Failed to parse the menu. Please try again.' }, { status: 422 });
    }

    if (!parsedMenu.sections || !Array.isArray(parsedMenu.sections)) {
      return NextResponse.json({ error: 'Failed to extract menu structure from the PDF.' }, { status: 422 });
    }

    if (parsedMenu.error || parsedMenu.sections.length === 0) {
      return NextResponse.json({ error: 'No menu items found in this PDF.' }, { status: 422 });
    }

    const totalItems = parsedMenu.sections.reduce((sum, s) => sum + (s.items?.length || 0), 0);

    return NextResponse.json({
      success: true,
      source_type: 'pdf',
      menu_name: parsedMenu.menu_name,
      sections: parsedMenu.sections,
      stats: {
        sections_count: parsedMenu.sections.length,
        items_count: totalItems,
      },
    });
  } catch (error) {
    console.error('Error in menu PDF import API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
