export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';

/**
 * POST /api/voice/connect
 *
 * Returns the WebSocket URL for the voice agent Edge Function.
 * The client connects directly to the Edge Function for real-time audio.
 */
export async function POST(request: Request) {
  try {
    const { market } = await request.json();

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!supabaseUrl) {
      return NextResponse.json(
        { error: 'Supabase URL not configured' },
        { status: 500 }
      );
    }

    // Convert Supabase REST URL to Edge Function WebSocket URL
    // https://xxx.supabase.co → wss://xxx.supabase.co/functions/v1/voice-agent
    // Function has verify_jwt=false so no auth header needed
    const wsUrl = supabaseUrl
      .replace('https://', 'wss://')
      .replace('http://', 'ws://');

    return NextResponse.json({
      wsUrl: `${wsUrl}/functions/v1/voice-agent`,
      market: market || 'lancaster-pa',
    });
  } catch {
    return NextResponse.json(
      { error: 'Failed to generate connection URL' },
      { status: 500 }
    );
  }
}
