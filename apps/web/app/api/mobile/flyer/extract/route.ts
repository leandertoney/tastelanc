import { NextResponse } from 'next/server';
import { createMobileClient } from '@/lib/supabase/mobile-auth';
import { createServiceRoleClient } from '@/lib/supabase/admin';
import OpenAI from 'openai';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY_FLYER || process.env.OPENAI_API_KEY });

const EXTRACTION_PROMPT = `You are analyzing an event flyer image. Extract structured event information and return ONLY valid JSON (no markdown, no code blocks).

Return this exact JSON structure with best-effort extraction. Use null for fields you cannot determine:

{
  "event_name": "string or null",
  "venue_name": "string or null",
  "date": "YYYY-MM-DD or null",
  "time_start": "HH:MM (24h) or null",
  "time_end": "HH:MM (24h) or null",
  "description": "string or null",
  "performers": "string or null",
  "ticket_link": "string or null",
  "category": "one of: live_music, dj, trivia, karaoke, comedy, sports, bingo, music_bingo, poker, promotion, other"
}

Rules:
- Prioritize: event title, venue, date, time
- For "category": match to the closest option. Use "live_music" for concerts/bands, "dj" for DJ events, "comedy" for comedy/stand-up, "promotion" for ticketed special events/shows/drag shows/touring acts, "other" if unclear
- If the year is not specified, assume the current year (2026) or next occurrence
- For dates like "Every Friday", return null for date (it's recurring)
- Extract performer/artist names into "performers"
- Return ONLY the JSON object, nothing else`;

export async function POST(request: Request) {
  try {
    const supabase = createMobileClient(request);
    if (!supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const marketId = formData.get('market_id') as string | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!marketId) {
      return NextResponse.json({ error: 'market_id is required' }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Please upload a JPEG, PNG, or WebP image.' },
        { status: 400 }
      );
    }

    // Validate file size (max 10MB for flyers)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 10MB.' },
        { status: 400 }
      );
    }

    // Upload to Supabase Storage
    const storageClient = createServiceRoleClient();
    const ext = file.type.split('/')[1] === 'jpeg' ? 'jpg' : file.type.split('/')[1];
    const timestamp = Date.now();
    const fileName = `flyers/${user.id}/${timestamp}.${ext}`;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { error: uploadError } = await storageClient.storage
      .from('images')
      .upload(fileName, buffer, {
        contentType: file.type,
        upsert: true,
      });

    if (uploadError) {
      console.error('Flyer upload error:', uploadError);
      return NextResponse.json(
        { error: `Failed to upload image: ${uploadError.message}` },
        { status: 500 }
      );
    }

    const { data: urlData } = storageClient.storage
      .from('images')
      .getPublicUrl(fileName);

    const flyerImageUrl = urlData.publicUrl;

    // Call OpenAI Vision API
    const base64 = buffer.toString('base64');
    const dataUrl = `data:${file.type};base64,${base64}`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: EXTRACTION_PROMPT },
            { type: 'image_url', image_url: { url: dataUrl, detail: 'high' } },
          ],
        },
      ],
      max_tokens: 1000,
      temperature: 0.1,
    });

    const rawResponse = completion.choices[0]?.message?.content || '{}';

    // Parse the JSON response, stripping any markdown code blocks
    let extracted;
    try {
      const cleaned = rawResponse.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      extracted = JSON.parse(cleaned);
    } catch {
      console.error('Failed to parse AI extraction:', rawResponse);
      extracted = {
        event_name: null,
        venue_name: null,
        date: null,
        time_start: null,
        time_end: null,
        description: null,
        performers: null,
        ticket_link: null,
        category: 'other',
      };
    }

    return NextResponse.json({
      flyer_image_url: flyerImageUrl,
      extracted,
    });
  } catch (error) {
    console.error('Error in flyer extraction:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
