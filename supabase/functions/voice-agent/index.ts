/**
 * Voice Agent Edge Function
 *
 * Real-time WebSocket handler for the browser-based voice sales agent.
 * Pipeline: Browser mic → Deepgram STT → OpenAI GPT-4o-mini → OpenAI TTS → Browser speakers
 *
 * Protocol (browser ↔ server):
 *   Browser sends:
 *     - Binary frames: raw PCM16 audio from microphone
 *     - JSON: { type: "config", marketSlug, sourceUrl, utmSource, utmMedium, utmCampaign }
 *     - JSON: { type: "end" }   — user ended conversation
 *
 *   Server sends:
 *     - JSON: { type: "ready" }  — connection established, agent ready
 *     - JSON: { type: "transcript", role: "user"|"agent", text: "..." }
 *     - JSON: { type: "status", status: "listening"|"thinking"|"speaking" }
 *     - JSON: { type: "tool_call", name: "...", result: {...} }
 *     - JSON: { type: "error", message: "..." }
 *     - Binary frames: TTS audio (MP3) for playback
 *     - JSON: { type: "audio_end" }  — current TTS response finished
 *     - JSON: { type: "done", transcriptId: "..." }  — conversation saved
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import OpenAI from 'https://esm.sh/openai@4';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

const DEEPGRAM_API_KEY = Deno.env.get('DEEPGRAM_API_KEY') ?? '';
const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY') ?? '';
const NOTIFY_URL = Deno.env.get('NOTIFY_URL') ?? ''; // e.g. https://tastelanc.com/api/voice/notify
const NOTIFY_SECRET = Deno.env.get('CRON_SHARED_SECRET') ?? '';

// Send notification to founders via the web app API
async function sendNotification(type: string, data: Record<string, unknown>) {
  if (!NOTIFY_URL) {
    console.log(`Notification skipped (no NOTIFY_URL): ${type}`, data);
    return;
  }
  try {
    await fetch(NOTIFY_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${NOTIFY_SECRET}`,
      },
      body: JSON.stringify({ type, data }),
    });
  } catch (e) {
    console.error('Notification send error:', e);
  }
}

const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

// ──────────────────────────────────────────
// Market config (mirrors knowledge-base.ts)
// ──────────────────────────────────────────
const MARKET_CONFIG: Record<string, { appName: string; area: string; areaShort: string; aiName: string }> = {
  'lancaster-pa': { appName: 'TasteLanc', area: 'Lancaster, PA', areaShort: 'Lancaster', aiName: 'Rosie' },
  'cumberland-pa': { appName: 'TasteCumberland', area: 'Cumberland County, PA', areaShort: 'Cumberland County', aiName: 'Mollie' },
  'fayetteville-nc': { appName: 'TasteFayetteville', area: 'Fayetteville, NC', areaShort: 'Fayetteville', aiName: 'Libertie' },
};

// ──────────────────────────────────────────
// Pricing data (mirrors agent-tools.ts)
// ──────────────────────────────────────────
const PRICING = {
  premium: { name: 'Premium', monthly: 99, threeMonth: 250, sixMonth: 450, yearly: 800 },
  elite: { name: 'Elite', monthly: 149, threeMonth: 350, sixMonth: 600, yearly: 1100 },
  coffee_shop: { name: 'Coffee Shop', monthly: 49 },
};

// ──────────────────────────────────────────
// System prompt builder
// ──────────────────────────────────────────
function buildSystemPrompt(marketSlug: string): string {
  const market = MARKET_CONFIG[marketSlug] || MARKET_CONFIG['lancaster-pa'];

  return `You are a friendly, professional AI sales assistant for ${market.appName}, the go-to dining and nightlife discovery app for ${market.area}.

## Your Role
You help restaurant owners and managers understand how ${market.appName} can grow their business. You answer questions, explain features, share pricing, and book demo meetings with our team. You're warm, knowledgeable, and consultative — never pushy.

## Conversation Rules
- Keep responses SHORT — this is a voice conversation. 1-3 sentences per turn max.
- Sound natural and conversational, not scripted.
- Use the caller's name once you know it.
- Ask ONE question at a time.
- If you don't know something, say "Let me have one of our team members get back to you on that."
- NEVER make up pricing. Use the get_pricing tool for accurate prices.
- NEVER pretend to be human. If asked, say "I'm an AI assistant for ${market.appName}."

## Opening
When the conversation starts, say: "Hey! Thanks for reaching out to ${market.appName}. I'm here to help — are you a restaurant owner looking to learn more, or are you looking for dining recommendations in ${market.areaShort}?"

## Qualification Flow (for restaurant owners)
1. Learn their name and restaurant name
2. Understand their current marketing
3. Briefly explain what ${market.appName} does
4. Share pricing using the get_pricing tool
5. Offer to book a demo meeting with the team
6. If they want to book → use check_availability and book_meeting
7. Get their contact info for follow-up

## Key Selling Points
- Curated local dining app — not buried in Yelp/Google results
- Dedicated happy hours & events sections diners actively browse
- AI recommendations to match diners with their restaurant
- Monthly community voting drives engagement and social proof
- Full dashboard: photos, specials, analytics
- Push notifications reach engaged local diners directly

## Objection Handling
- "Too expensive" → "We have plans starting at $49/month. Let me pull up the pricing for you." Use get_pricing tool.
- "Already use Yelp" → "${market.appName} complements Yelp by reaching diners specifically looking for local dining, happy hours, and events. It's an additional high-intent channel."
- "Too busy" → "The dashboard takes about 5 minutes to set up. Once you're listed, AI recommendations run automatically."
- "Need to think" → "Of course! Want me to book a quick 15-minute call with our team for any remaining questions?"

## For Diner Callers
If the caller is a diner, help them with restaurant recommendations, use lookup_restaurant, and suggest downloading the app.

## Transfer to Human
Use transfer_to_human if the caller: gets frustrated, has complex legal/contract questions, wants custom pricing, or reports a bug.

## Closing
Always end with a clear next step:
- "I've got your meeting booked — you'll get a confirmation email" (if meeting booked)
- "I'll have someone from our team reach out to you" (if transferred)
- "Feel free to reach out anytime if you have more questions" (if just browsing)
Never offer to send a text message — use email for follow-ups.`;
}

// ──────────────────────────────────────────
// Tool execution
// ──────────────────────────────────────────
async function executeTool(
  name: string,
  args: Record<string, unknown>,
  marketSlug: string,
  marketId: string | null,
  sessionState: SessionState
): Promise<{ success: boolean; data: unknown; message: string }> {
  switch (name) {
    case 'get_pricing': {
      const tier = args.tier as string;
      if (tier === 'all') {
        return {
          success: true,
          data: PRICING,
          message: `Here are our plans: Premium is $99 per month or $250 for 3 months, $450 for 6 months, or $800 for the year. Elite is $149 per month with priority placement. And we have a Coffee Shop plan at $49 per month.`,
        };
      }
      const plan = PRICING[tier as keyof typeof PRICING];
      if (!plan) return { success: false, data: null, message: 'Plan not found.' };
      if (tier === 'coffee_shop') {
        return { success: true, data: plan, message: `The Coffee Shop plan is $49 per month.` };
      }
      const p = plan as typeof PRICING.premium;
      return {
        success: true,
        data: plan,
        message: `The ${p.name} plan is $${p.monthly} per month, or save with $${p.threeMonth} for 3 months, $${p.sixMonth} for 6 months, or $${p.yearly} for the full year.`,
      };
    }

    case 'create_lead': {
      const { data, error } = await supabase.from('business_leads').insert({
        contact_name: args.contact_name,
        business_name: args.business_name,
        phone: args.phone || null,
        email: args.email || null,
        notes: args.notes || 'Created by voice agent',
        source: 'voice_agent',
        status: 'new',
        market_id: marketId,
      }).select('id').single();

      if (error) {
        console.error('create_lead error:', error);
        return { success: false, data: null, message: 'I had trouble saving your info, but no worries — our team will follow up.' };
      }
      sessionState.leadId = data.id;
      return { success: true, data: { leadId: data.id }, message: `Got it, I've saved your information.` };
    }

    case 'check_availability': {
      const date = args.date as string;
      // Query existing meetings for that date to find open slots
      const { data: meetings } = await supabase
        .from('sales_meetings')
        .select('start_time')
        .eq('meeting_date', date);

      // Business hours: 9am-5pm ET, 30-min slots
      const bookedSlots = new Set(
        (meetings || []).map((m: { start_time: string | null }) => {
          if (!m.start_time) return '';
          return m.start_time.substring(0, 5); // "HH:MM"
        }).filter(Boolean)
      );

      const available: string[] = [];
      for (let hour = 9; hour < 17; hour++) {
        for (const min of ['00', '30']) {
          const slot = `${hour.toString().padStart(2, '0')}:${min}`;
          if (!bookedSlots.has(slot)) available.push(slot);
        }
      }

      if (available.length === 0) {
        return { success: true, data: { available: [] }, message: `That day is fully booked. Would you like to try a different day?` };
      }

      // Show a few representative slots
      const display = available.length <= 4
        ? available
        : [available[0], available[Math.floor(available.length / 3)], available[Math.floor(2 * available.length / 3)], available[available.length - 1]];

      const formatted = display.map((s) => {
        const [h, m] = s.split(':');
        const hour = parseInt(h);
        const suffix = hour >= 12 ? 'PM' : 'AM';
        const displayHour = hour > 12 ? hour - 12 : hour;
        return `${displayHour}:${m} ${suffix}`;
      });

      return {
        success: true,
        data: { available, displaySlots: formatted },
        message: `I have ${available.length} slots available. How about ${formatted.join(', or ')}?`,
      };
    }

    case 'book_meeting': {
      // Create lead if we don't have one yet
      if (!sessionState.leadId) {
        const { data: lead } = await supabase.from('business_leads').insert({
          contact_name: args.lead_name,
          business_name: args.business_name,
          source: 'voice_agent',
          status: 'interested',
          market_id: marketId,
        }).select('id').single();
        if (lead) sessionState.leadId = lead.id;
      } else {
        // Update existing lead status to interested
        await supabase.from('business_leads')
          .update({ status: 'interested' })
          .eq('id', sessionState.leadId);
      }

      // Calculate end_time (30 min after start)
      const [startH, startM] = (args.time as string).split(':').map(Number);
      const endMinutes = startH * 60 + startM + 30;
      const endTime = `${Math.floor(endMinutes / 60).toString().padStart(2, '0')}:${(endMinutes % 60).toString().padStart(2, '0')}`;

      const { data, error } = await supabase.from('sales_meetings').insert({
        title: `Demo: ${args.business_name}`,
        description: args.notes || `Booked by voice agent. Contact: ${args.lead_name}, Business: ${args.business_name}`,
        meeting_date: args.date,
        start_time: args.time,
        end_time: endTime,
        lead_id: sessionState.leadId,
        market_id: marketId,
        created_by: '00000000-0000-0000-0000-000000000000', // system/agent user
        meeting_type: args.meeting_type || 'demo',
        status: 'scheduled',
        booked_by: 'ai_agent',
      }).select('id').single();

      if (error) {
        console.error('book_meeting error:', error);
        return { success: false, data: null, message: 'I had trouble booking that slot. Let me have someone from our team reach out to confirm.' };
      }

      // Log activity
      await supabase.from('agent_activity_log').insert({
        market_id: marketId,
        action_type: 'meeting_booked',
        lead_id: sessionState.leadId,
        metadata: { meeting_id: data.id, meeting_date: args.date, start_time: args.time },
        outcome: 'meeting_booked',
      });

      const [h, m] = (args.time as string).split(':');
      const hour = parseInt(h);
      const suffix = hour >= 12 ? 'PM' : 'AM';
      const displayHour = hour > 12 ? hour - 12 : hour;
      const timeStr = `${displayHour}:${m} ${suffix}`;

      // Notify founders
      const market = MARKET_CONFIG[marketSlug] || MARKET_CONFIG['lancaster-pa'];
      sendNotification('meeting_booked', {
        leadName: args.lead_name,
        businessName: args.business_name,
        meetingDate: args.date,
        meetingTime: args.time,
        marketName: market.appName,
      });

      return {
        success: true,
        data: { meetingId: data.id },
        message: `You're all set! I've booked a demo for ${args.date} at ${timeStr}. Our team will be ready for you.`,
      };
    }

    case 'lookup_restaurant': {
      let query = supabase
        .from('restaurants')
        .select('id, name, address, cuisine, is_active')
        .ilike('name', `%${args.name}%`)
        .eq('is_active', true);
      if (marketId) query = query.eq('market_id', marketId);

      const { data } = await query.limit(5);
      if (!data || data.length === 0) {
        return { success: true, data: [], message: `I don't see a restaurant called "${args.name}" in our app yet. That means there's an opportunity to get listed!` };
      }
      const names = data.map((r: { name: string }) => r.name).join(', ');
      return { success: true, data, message: `I found ${data.length === 1 ? data[0].name : `a few matches: ${names}`} in our database.` };
    }

    case 'get_restaurant_count': {
      let query = supabase
        .from('restaurants')
        .select('id', { count: 'exact', head: true })
        .eq('is_active', true);
      if (marketId) query = query.eq('market_id', marketId);

      const { count } = await query;
      const market = MARKET_CONFIG[marketSlug] || MARKET_CONFIG['lancaster-pa'];
      return { success: true, data: { count }, message: `We currently have ${count || 0} restaurants in the ${market.appName} app.` };
    }

    case 'transfer_to_human': {
      // Log urgent activity
      await supabase.from('agent_activity_log').insert({
        market_id: marketId,
        action_type: 'human_transfer',
        lead_id: sessionState.leadId,
        metadata: {
          reason: args.reason,
          caller_name: args.caller_name || 'Unknown',
          caller_phone: args.caller_phone || 'Unknown',
        },
        outcome: 'transferred',
      });

      // Notify founders immediately
      const transferMarket = MARKET_CONFIG[marketSlug] || MARKET_CONFIG['lancaster-pa'];
      sendNotification('hot_lead', {
        leadName: args.caller_name || 'Unknown',
        businessName: '',
        reason: args.reason,
        marketName: transferMarket.appName,
        callerPhone: args.caller_phone || '',
      });

      return {
        success: true,
        data: { transferred: true },
        message: `I'll have one of our team members reach out to you shortly. Thanks for your patience!`,
      };
    }

    default:
      return { success: false, data: null, message: `I'm not sure how to handle that. Let me connect you with our team.` };
  }
}

// ──────────────────────────────────────────
// Session state
// ──────────────────────────────────────────
interface SessionState {
  marketSlug: string;
  marketId: string | null;
  sourceUrl: string;
  utmSource: string;
  utmMedium: string;
  utmCampaign: string;
  leadId: string | null;
  messages: Array<{ role: 'system' | 'user' | 'assistant' | 'tool'; content: string; tool_call_id?: string; name?: string }>;
  transcript: Array<{ role: 'agent' | 'user'; text: string; timestamp_ms: number }>;
  startTime: number;
  configured: boolean;
}

// ──────────────────────────────────────────
// OpenAI function tool definitions
// ──────────────────────────────────────────
const TOOLS: OpenAI.Chat.Completions.ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'get_pricing',
      description: 'Get current pricing for restaurant subscription plans.',
      parameters: {
        type: 'object',
        properties: { tier: { type: 'string', enum: ['premium', 'elite', 'coffee_shop', 'all'] } },
        required: ['tier'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_lead',
      description: 'Create a new business lead in the CRM.',
      parameters: {
        type: 'object',
        properties: {
          contact_name: { type: 'string' },
          business_name: { type: 'string' },
          phone: { type: 'string' },
          email: { type: 'string' },
          notes: { type: 'string' },
        },
        required: ['contact_name', 'business_name'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'check_availability',
      description: 'Check available meeting slots for a given date.',
      parameters: {
        type: 'object',
        properties: { date: { type: 'string', description: 'YYYY-MM-DD' } },
        required: ['date'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'book_meeting',
      description: 'Book a sales meeting/demo.',
      parameters: {
        type: 'object',
        properties: {
          date: { type: 'string' },
          time: { type: 'string', description: 'HH:MM 24-hour' },
          lead_name: { type: 'string' },
          business_name: { type: 'string' },
          meeting_type: { type: 'string', enum: ['demo', 'follow_up', 'onboarding', 'check_in'] },
          notes: { type: 'string' },
        },
        required: ['date', 'time', 'lead_name', 'business_name'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'lookup_restaurant',
      description: 'Search for a restaurant by name.',
      parameters: {
        type: 'object',
        properties: { name: { type: 'string' } },
        required: ['name'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_restaurant_count',
      description: 'Get the number of restaurants in the app for this market.',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'transfer_to_human',
      description: 'Transfer the conversation to a human team member.',
      parameters: {
        type: 'object',
        properties: {
          reason: { type: 'string' },
          caller_name: { type: 'string' },
          caller_phone: { type: 'string' },
        },
        required: ['reason'],
      },
    },
  },
];

// ──────────────────────────────────────────
// Deepgram real-time STT connection
// ──────────────────────────────────────────
function connectDeepgram(onTranscript: (text: string, isFinal: boolean) => void): WebSocket {
  const dgUrl = `wss://api.deepgram.com/v1/listen?model=nova-3&encoding=linear16&sample_rate=16000&channels=1&punctuate=true&interim_results=true&endpointing=300&utterance_end_ms=1000`;

  const ws = new WebSocket(dgUrl, ['token', DEEPGRAM_API_KEY]);

  ws.onmessage = (event) => {
    try {
      const result = JSON.parse(event.data);
      if (result.type === 'Results') {
        const transcript = result.channel?.alternatives?.[0]?.transcript || '';
        const isFinal = result.is_final === true;
        if (transcript.trim()) {
          onTranscript(transcript, isFinal);
        }
      } else if (result.type === 'UtteranceEnd') {
        // Deepgram detected end of utterance — trigger processing
        onTranscript('', true);
      }
    } catch (e) {
      console.error('Deepgram parse error:', e);
    }
  };

  ws.onerror = (e) => console.error('Deepgram WS error:', e);
  ws.onclose = () => console.log('Deepgram WS closed');

  return ws;
}

// ──────────────────────────────────────────
// Generate TTS audio from text
// ──────────────────────────────────────────
async function generateTTS(text: string): Promise<ArrayBuffer> {
  const response = await openai.audio.speech.create({
    model: 'tts-1',
    voice: 'nova',
    input: text,
    response_format: 'mp3',
  });

  return await response.arrayBuffer();
}

// ──────────────────────────────────────────
// Process user utterance through LLM
// ──────────────────────────────────────────
async function processUtterance(
  text: string,
  session: SessionState,
  sendToClient: (data: string | ArrayBuffer) => void
): Promise<void> {
  // Add user message
  session.messages.push({ role: 'user', content: text });
  session.transcript.push({ role: 'user', text, timestamp_ms: Date.now() - session.startTime });

  sendToClient(JSON.stringify({ type: 'transcript', role: 'user', text }));
  sendToClient(JSON.stringify({ type: 'status', status: 'thinking' }));

  // Call OpenAI with function calling
  let completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: session.messages as OpenAI.Chat.Completions.ChatCompletionMessageParam[],
    tools: TOOLS,
    max_tokens: 300,
  });

  let choice = completion.choices[0];

  // Handle tool calls (may be multiple rounds)
  while (choice.finish_reason === 'tool_calls' && choice.message.tool_calls) {
    // Add assistant message with tool calls
    session.messages.push({
      role: 'assistant',
      content: choice.message.content || '',
    });

    for (const toolCall of choice.message.tool_calls) {
      const args = JSON.parse(toolCall.function.arguments);
      console.log(`Tool call: ${toolCall.function.name}`, args);

      const result = await executeTool(
        toolCall.function.name,
        args,
        session.marketSlug,
        session.marketId,
        session
      );

      sendToClient(JSON.stringify({
        type: 'tool_call',
        name: toolCall.function.name,
        result: { success: result.success, message: result.message },
      }));

      session.messages.push({
        role: 'tool',
        content: JSON.stringify(result),
        tool_call_id: toolCall.id,
        name: toolCall.function.name,
      });
    }

    // Call OpenAI again with tool results
    completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: session.messages as OpenAI.Chat.Completions.ChatCompletionMessageParam[],
      tools: TOOLS,
      max_tokens: 300,
    });
    choice = completion.choices[0];
  }

  // Get final text response
  const responseText = choice.message.content || "I'm sorry, I didn't catch that. Could you say that again?";
  session.messages.push({ role: 'assistant', content: responseText });
  session.transcript.push({ role: 'agent', text: responseText, timestamp_ms: Date.now() - session.startTime });

  sendToClient(JSON.stringify({ type: 'transcript', role: 'agent', text: responseText }));
  sendToClient(JSON.stringify({ type: 'status', status: 'speaking' }));

  // Generate and send TTS audio
  try {
    const audio = await generateTTS(responseText);
    sendToClient(audio);
    sendToClient(JSON.stringify({ type: 'audio_end' }));
  } catch (e) {
    console.error('TTS error:', e);
    sendToClient(JSON.stringify({ type: 'error', message: 'Voice synthesis failed' }));
  }
}

// ──────────────────────────────────────────
// Save conversation to database
// ──────────────────────────────────────────
async function saveTranscript(session: SessionState): Promise<string | null> {
  const durationSeconds = Math.round((Date.now() - session.startTime) / 1000);

  // Generate summary
  let summary = '';
  let sentiment: 'positive' | 'neutral' | 'negative' = 'neutral';
  let intent: string[] = [];
  let outcome = 'browsing';

  try {
    const summaryCompletion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `Summarize this sales conversation in 2-3 sentences. Then classify:
- sentiment: positive, neutral, or negative
- intent: array of tags like "pricing_inquiry", "schedule_meeting", "objection_cost", "restaurant_inquiry", "diner_recommendation"
- outcome: one of "meeting_booked", "follow_up", "not_interested", "sale_closed", "transferred", "abandoned", "browsing"

Respond in JSON: { "summary": "...", "sentiment": "...", "intent": [...], "outcome": "..." }`,
        },
        {
          role: 'user',
          content: session.transcript.map((t) => `${t.role}: ${t.text}`).join('\n'),
        },
      ],
      max_tokens: 200,
      response_format: { type: 'json_object' },
    });

    const analysis = JSON.parse(summaryCompletion.choices[0].message.content || '{}');
    summary = analysis.summary || '';
    sentiment = analysis.sentiment || 'neutral';
    intent = analysis.intent || [];
    outcome = analysis.outcome || 'browsing';
  } catch (e) {
    console.error('Summary generation error:', e);
  }

  // Estimate cost (cents): Deepgram $0.004/min + OpenAI LLM ~$0.015/min + TTS ~$0.015/min
  const minutes = durationSeconds / 60;
  const costCents = Math.round(minutes * 3.4); // ~$0.034/min = 3.4 cents/min

  const { data, error } = await supabase.from('voice_transcripts').insert({
    lead_id: session.leadId,
    market_id: session.marketId,
    direction: 'inbound',
    duration_seconds: durationSeconds,
    transcript: session.transcript,
    summary,
    sentiment,
    intent,
    outcome,
    source_url: session.sourceUrl,
    utm_source: session.utmSource || null,
    utm_medium: session.utmMedium || null,
    utm_campaign: session.utmCampaign || null,
    cost_cents: costCents,
  }).select('id').single();

  if (error) {
    console.error('Save transcript error:', error);
    return null;
  }

  // Log activity
  await supabase.from('agent_activity_log').insert({
    market_id: session.marketId,
    action_type: 'conversation_completed',
    lead_id: session.leadId,
    transcript_id: data.id,
    metadata: { duration_seconds: durationSeconds, outcome, sentiment },
    outcome,
  });

  // Send follow-up email to prospect (if we have their email from the lead)
  if (session.leadId && outcome !== 'abandoned' && outcome !== 'not_interested') {
    const { data: lead } = await supabase
      .from('business_leads')
      .select('email, contact_name, business_name')
      .eq('id', session.leadId)
      .single();

    if (lead?.email) {
      const followUpUrl = NOTIFY_URL?.replace('/notify', '/follow-up') || '';
      if (followUpUrl) {
        const market = MARKET_CONFIG[session.marketSlug] || MARKET_CONFIG['lancaster-pa'];
        fetch(followUpUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${NOTIFY_SECRET}`,
          },
          body: JSON.stringify({
            recipientEmail: lead.email,
            recipientName: lead.contact_name || 'there',
            businessName: lead.business_name,
            outcome,
            summary,
            intent,
            marketName: market.appName,
          }),
        }).catch((e) => console.error('Follow-up email trigger error:', e));
      }
    }
  }

  return data.id;
}

// ──────────────────────────────────────────
// Main WebSocket handler
// ──────────────────────────────────────────
serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    });
  }

  // Check for WebSocket upgrade
  const upgrade = req.headers.get('upgrade') || '';
  if (upgrade.toLowerCase() !== 'websocket') {
    return new Response(
      JSON.stringify({ error: 'WebSocket upgrade required', status: 'Voice agent endpoint. Connect via WebSocket.' }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  }

  const { socket, response } = Deno.upgradeWebSocket(req);

  const session: SessionState = {
    marketSlug: 'lancaster-pa',
    marketId: null,
    sourceUrl: '',
    utmSource: '',
    utmMedium: '',
    utmCampaign: '',
    leadId: null,
    messages: [],
    transcript: [],
    startTime: Date.now(),
    configured: false,
  };

  let deepgramWs: WebSocket | null = null;
  let utteranceBuffer = '';
  let silenceTimer: number | null = null;

  const sendToClient = (data: string | ArrayBuffer) => {
    try {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(data);
      }
    } catch (e) {
      console.error('Send to client error:', e);
    }
  };

  socket.onopen = () => {
    console.log('Client connected');
    sendToClient(JSON.stringify({ type: 'ready' }));
  };

  socket.onmessage = async (event) => {
    // Binary data = audio from microphone
    if (event.data instanceof ArrayBuffer) {
      if (deepgramWs?.readyState === WebSocket.OPEN) {
        deepgramWs.send(event.data);
      }
      return;
    }

    // Text data = JSON commands
    try {
      const msg = JSON.parse(event.data);

      if (msg.type === 'config') {
        session.marketSlug = msg.marketSlug || 'lancaster-pa';
        session.sourceUrl = msg.sourceUrl || '';
        session.utmSource = msg.utmSource || '';
        session.utmMedium = msg.utmMedium || '';
        session.utmCampaign = msg.utmCampaign || '';

        // Resolve market ID
        const { data: marketRow } = await supabase
          .from('markets')
          .select('id')
          .eq('slug', session.marketSlug)
          .single();
        session.marketId = marketRow?.id || null;

        // Initialize system prompt
        session.messages = [{ role: 'system', content: buildSystemPrompt(session.marketSlug) }];
        session.configured = true;

        // Connect to Deepgram
        deepgramWs = connectDeepgram((text, isFinal) => {
          if (text) {
            utteranceBuffer += (utteranceBuffer ? ' ' : '') + text;
          }

          if (isFinal && utteranceBuffer.trim()) {
            const finalText = utteranceBuffer.trim();
            utteranceBuffer = '';

            // Clear any silence timer
            if (silenceTimer) {
              clearTimeout(silenceTimer);
              silenceTimer = null;
            }

            // Process the complete utterance
            processUtterance(finalText, session, sendToClient)
              .then(() => {
                sendToClient(JSON.stringify({ type: 'status', status: 'listening' }));
              })
              .catch((e) => {
                console.error('Process utterance error:', e);
                sendToClient(JSON.stringify({ type: 'error', message: 'Processing error. Please try again.' }));
                sendToClient(JSON.stringify({ type: 'status', status: 'listening' }));
              });
          }
        });

        // Send greeting via TTS
        const market = MARKET_CONFIG[session.marketSlug] || MARKET_CONFIG['lancaster-pa'];
        const greeting = `Hey! Thanks for reaching out to ${market.appName}. I'm here to help — are you a restaurant owner looking to learn more, or are you looking for dining recommendations in ${market.areaShort}?`;

        session.messages.push({ role: 'assistant', content: greeting });
        session.transcript.push({ role: 'agent', text: greeting, timestamp_ms: 0 });

        sendToClient(JSON.stringify({ type: 'transcript', role: 'agent', text: greeting }));
        sendToClient(JSON.stringify({ type: 'status', status: 'speaking' }));

        try {
          const greetingAudio = await generateTTS(greeting);
          sendToClient(greetingAudio);
          sendToClient(JSON.stringify({ type: 'audio_end' }));
          sendToClient(JSON.stringify({ type: 'status', status: 'listening' }));
        } catch (e) {
          console.error('Greeting TTS error:', e);
          sendToClient(JSON.stringify({ type: 'status', status: 'listening' }));
        }
      }

      if (msg.type === 'end') {
        // User ended conversation — save and close
        const transcriptId = await saveTranscript(session);
        sendToClient(JSON.stringify({ type: 'done', transcriptId }));
        deepgramWs?.close();
        socket.close();
      }
    } catch (e) {
      console.error('Message parse error:', e);
    }
  };

  socket.onclose = async () => {
    console.log('Client disconnected');
    deepgramWs?.close();
    if (silenceTimer) clearTimeout(silenceTimer);

    // Save transcript if we had any conversation
    if (session.transcript.length > 1) {
      await saveTranscript(session);
    }
  };

  socket.onerror = (e) => {
    console.error('WebSocket error:', e);
    deepgramWs?.close();
  };

  return response;
});
