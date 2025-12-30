import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { anthropic, CLAUDE_CONFIG } from '@/lib/anthropic';
import { buildRestaurantContext } from '@/lib/rosie/database-queries';
import { buildSystemPrompt } from '@/lib/rosie/system-prompt';
import { ChatMessage, ROSIE_CONFIG } from '@/lib/rosie/types';

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

    // Get Supabase client and fetch restaurant context
    const supabase = getSupabaseClient();
    const restaurantContext = await buildRestaurantContext(supabase);

    // Build system prompt with restaurant data
    const systemPrompt = buildSystemPrompt(restaurantContext);

    // Format messages for Anthropic API
    const formattedMessages = messages.map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }));

    // Create streaming response
    const stream = await anthropic.messages.create({
      model: CLAUDE_CONFIG.model,
      max_tokens: CLAUDE_CONFIG.maxTokens,
      system: systemPrompt,
      messages: formattedMessages,
      stream: true,
    });

    // Create encoder for SSE
    const encoder = new TextEncoder();

    // Create readable stream
    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          for await (const event of stream) {
            if (
              event.type === 'content_block_delta' &&
              event.delta.type === 'text_delta'
            ) {
              const chunk = JSON.stringify({ text: event.delta.text });
              controller.enqueue(encoder.encode(`data: ${chunk}\n\n`));
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
