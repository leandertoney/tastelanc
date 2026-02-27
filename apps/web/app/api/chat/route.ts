import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import { buildRestaurantContext } from '@/lib/rosie/database-queries';
import { buildSystemPrompt } from '@/lib/rosie/system-prompt';
import { ChatMessage, ROSIE_CONFIG } from '@/lib/rosie/types';
import { MARKET_SLUG } from '@/config/market';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

// Create Supabase client for API route (without cookies)
function getSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { messages, sessionId } = body as {
      messages: ChatMessage[];
      sessionId: string;
    };

    // Validate request
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: 'Messages are required' },
        { status: 400 }
      );
    }

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      );
    }

    // Count user messages for rate limiting
    const userMessageCount = messages.filter((m) => m.role === 'user').length;

    // Check rate limit
    if (userMessageCount > ROSIE_CONFIG.maxMessages) {
      return NextResponse.json(
        {
          error: 'Message limit reached. Sign up for early access to continue!',
          limitReached: true,
          redirectUrl: ROSIE_CONFIG.redirectUrl,
        },
        { status: 429 }
      );
    }

    // Resolve market
    const supabase = getSupabaseClient();
    const { data: marketRow, error: marketErr } = await supabase
      .from('markets')
      .select('id')
      .eq('slug', MARKET_SLUG)
      .eq('is_active', true)
      .single();
    if (marketErr || !marketRow) {
      return NextResponse.json({ error: 'Market configuration error' }, { status: 500 });
    }
    const marketId = marketRow.id;

    // Fetch restaurant context scoped to this market
    const restaurantContext = await buildRestaurantContext(supabase, marketId);

    // Build system prompt with restaurant data
    const systemPrompt = buildSystemPrompt(restaurantContext);

    // Add current time context to the system prompt so the AI knows exactly what day/time it is
    const currentTime = new Date().toLocaleString('en-US', {
      timeZone: 'America/New_York',
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
    const systemPromptWithTime = `${systemPrompt}\n\n## Current Time\n${currentTime}`;

    // Format messages for OpenAI API (system prompt + conversation)
    const formattedMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      { role: 'system', content: systemPromptWithTime },
      ...messages.map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
    ];

    // Create streaming response
    const stream = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      max_tokens: 1024,
      messages: formattedMessages,
      stream: true,
    });

    // Create encoder for SSE
    const encoder = new TextEncoder();

    // Create readable stream
    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const text = chunk.choices[0]?.delta?.content;
            if (text) {
              const data = JSON.stringify({ text });
              controller.enqueue(encoder.encode(`data: ${data}\n\n`));
            }
          }
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        } catch (error) {
          console.error('Streaming error:', error);
          controller.error(error);
        }
      },
    });

    return new Response(readableStream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      { error: 'Failed to process chat request' },
      { status: 500 }
    );
  }
}
