// POST /api/instagram/transcribe
// Accepts { video_url } — downloads the video from Supabase Storage,
// sends it to OpenAI Whisper with word-level timestamps, returns { words }.
// Used by VideoEditorScreen before the user reaches the post screen.
// Auth: Supabase anon key (Bearer header).

import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  // Auth: accept Supabase anon key or service role key
  const authHeader = request.headers.get('Authorization');
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!authHeader || (!authHeader.includes(anonKey ?? '') && !authHeader.includes(serviceKey ?? ''))) {
    // Loose check — just ensure some Bearer token is present
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  const body = await request.json().catch(() => ({}));
  const { video_url } = body as { video_url?: string };

  if (!video_url) {
    return NextResponse.json({ error: 'video_url is required' }, { status: 400 });
  }

  const openaiKey = process.env.OPENAI_API_KEY;
  if (!openaiKey) {
    return NextResponse.json({ error: 'OpenAI not configured' }, { status: 500 });
  }

  try {
    // Download the video from Supabase Storage (or any public URL)
    const videoRes = await fetch(video_url);
    if (!videoRes.ok) {
      const detail = `HTTP ${videoRes.status} fetching video from storage`;
      console.error('[transcribe] Fetch failed:', detail, video_url);
      return NextResponse.json({ error: detail }, { status: 400 });
    }

    const contentType = videoRes.headers.get('content-type') || 'video/mp4';
    const videoBuffer = await videoRes.arrayBuffer();

    // Force video/mp4 content type so Whisper parses audio correctly
    const videoBlob = new Blob([videoBuffer], { type: 'video/mp4' });
    const videoFile = new File([videoBlob], 'video.mp4', { type: 'video/mp4' });

    console.log(`[transcribe] Fetched ${videoBuffer.byteLength} bytes, original content-type: ${contentType}`);

    const openai = new OpenAI({ apiKey: openaiKey });

    // Use verbose_json with word-level timestamps
    const transcription = await openai.audio.transcriptions.create({
      file: videoFile,
      model: 'whisper-1',
      response_format: 'verbose_json',
      timestamp_granularities: ['word'],
    });

    // verbose_json response has .words array with { word, start, end }
    const words = (transcription as any).words ?? [];

    console.log(`[transcribe] Success: ${words.length} words, text length: ${transcription.text?.length}`);
    return NextResponse.json({ words, text: transcription.text });
  } catch (err: any) {
    console.error('[transcribe] Error:', err.message, err.status);
    // Surface OpenAI error details (e.g. "audio file is too short", "no audio track")
    const message = err.message || 'Transcription failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
