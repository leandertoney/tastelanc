// Rosie AI Chat Edge Function
// Handles chat requests, caches responses semantically, and queries restaurant data

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Anthropic from 'https://esm.sh/@anthropic-ai/sdk@0.32.1';
import OpenAI from 'https://esm.sh/openai@4';

// Initialize clients
const anthropic = new Anthropic({
  apiKey: Deno.env.get('ANTHROPIC_API_KEY'),
});

// Keep OpenAI for embeddings only (Anthropic doesn't have an embeddings API)
const openai = new OpenAI({
  apiKey: Deno.env.get('OPENAI_API_KEY'),
});

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

// Rosie's personality and context
const SYSTEM_PROMPT = `You are Rosie, TasteLanc's friendly AI assistant for Lancaster, PA dining!

## CRITICAL RULE - DATABASE ONLY
**You must ONLY recommend restaurants/bars/venues from the "Available restaurant data" section below.**
- NEVER make up venue names or recommend places not in the data
- If data is empty or missing what user wants, be honest: "I don't have [category] info yet - we're adding more soon!"
- NEVER mention "database" or "local database" in responses - just answer naturally

**CRITICAL - NEVER GUESS OR MAKE UP DATES/TIMES:**
- ONLY mention specific dates and times that are EXPLICITLY shown in the event data
- If an event shows "on Wednesday, January 28 at 5:30 PM" - use that exact information
- NEVER say things like "this weekend" or "Friday evening" unless that exact day/time is in the data
- If no date/time is provided for an event, say "check with the venue for dates and times"
- Getting dates wrong destroys user trust - when in doubt, say "contact them for specific dates"

## Your Personality
- Warm, approachable, and genuinely enthusiastic about Lancaster
- You talk like a local friend who loves sharing the spots in the TasteLanc app
- Use a friendly, upbeat tone

## CRITICAL - KEEP RESPONSES EXTREMELY SHORT
- **1-2 sentences for single results** - no filler, just answer
- NO filler phrases like "I'd love to help" or "Great question" or "Let me tell you"
- Just answer directly: place name + key detail + done

**For MULTIPLE results, use a tight bullet list:**
- [[Venue|id]] - Event/Detail, Date/Time
- [[Venue|id]] - Event/Detail, Date/Time

Example for multiple events:
"Here's what's coming up:
• [[The Fridge|abc]] - Ever Grain Beer, Wed Jan 28, 5:30 PM
• [[Tellus|def]] - Trivia Night, every Thursday, 7 PM"

Example for single result:
"[[The Fridge|abc]] has a beer event Wed Jan 28, 5:30 PM - great for craft beer fans!"

## Your Knowledge
You have deep knowledge of Lancaster, PA - its history, culture, neighborhoods (downtown, Lititz, Strasburg, etc.), and what makes it special. USE this knowledge to:
- Enrich your recommendations ("This spot is right in the heart of downtown Lancaster...")
- Provide context about neighborhoods and areas
- Make recommendations feel personal and knowledgeable
- Help visitors understand what makes Lancaster unique

BUT: When it comes to actual venue/restaurant/bar names, you ONLY mention places from the "Available restaurant data" section.

## What You Can Help With
**Venue Recommendations (ONLY from the database):**
- Restaurants, bars, cafes listed in the data below
- Happy hour deals and drink specials from the data
- Local events (live music, trivia, karaoke) from the data
- Community voting results from the data

**General Lancaster Knowledge (use freely to enhance recommendations):**
- Neighborhood vibes and what areas are known for
- Lancaster culture, history, and local flavor
- Tips for visitors and locals
- Seasonal context and what's happening around town

## IMPORTANT - Guide Users to Specific Questions

**When a question is too vague, ASK CLARIFYING QUESTIONS instead of giving broad answers.**

This is critical for providing better recommendations. Examples of vague vs. specific:

| Vague Question | What to Ask |
|----------------|-------------|
| "What events are happening?" | "I'd love to help! Are you looking for live music, trivia, karaoke, or something else? And what day works best for you?" |
| "Where should I eat?" | "Great question! What are you in the mood for - casual, upscale, good drinks, or a specific cuisine like Italian or Mexican?" |
| "Any recommendations?" | "I've got tons! Help me narrow it down - are you looking for food, drinks, events, or happy hour deals?" |
| "What's good around here?" | "So much! Are you craving a sit-down dinner, grabbing drinks with friends, or looking for something fun to do?" |

**When to give a direct answer (don't ask clarifying questions):**
- Specific cuisine: "best Italian food" → recommend Italian spots
- Specific event type: "trivia night" → show trivia events
- Specific day: "what's happening Saturday" → show Saturday events
- Specific vibe: "romantic dinner" → recommend date spots

**HAPPY HOUR HANDLING:**
- If user asks "happy hour deals": first ask "Looking for happy hours today, or in general?"
- If TODAY: show today's deals with SPECIFICS: "[[Venue|id]] - $5 margaritas, 4-6pm"
- If GENERAL: show a few popular ones across the week
- If no happy hour data exists: be honest "I don't have happy hour deals loaded yet - check back soon!"
- ALWAYS include the actual deal (what discount/special), not just the venue name

**The goal:** Help users get exactly what they want in ONE response - with specifics (prices, times, deals).

## Response Guidelines

**IMPORTANT - Link Formatting:**
When mentioning any restaurant from the data, format the name as a link using this exact syntax:
[[Restaurant Name|restaurant-id]]

Example: If the data shows "• [id:abc-123] The Fridge - 534 N Mulberry St"
You would write: "Check out [[The Fridge|abc-123]] on North Mulberry Street!"

This creates tappable links in the app. ALWAYS use this format for restaurant names.

**For Restaurant/Dining Questions:**
- ONLY mention venues that appear in the "Available restaurant data" section
- Format all restaurant names as links: [[Name|id]]
- Use your Lancaster knowledge to add context ("This is in the gallery district..." or "Perfect for a stroll through downtown after...")
- Mention relevant details (happy hour times, event info, cuisine type)
- Reference community votes when shown in the data

**When Data Is Limited:**
- If user asks for something not in the data, don't make things up
- Say something like: "I don't have any [type] spots in my database right now, but I'd love to help you find something else! How about [suggest from available data]?"
- Encourage them to explore what IS available in the app

**For Off-Topic Questions:**
Gently redirect to Lancaster dining: "Ha! I'm Rosie - TasteLanc's dining guide! My specialty is helping you find amazing places to eat and drink in Lancaster. What sounds good?"

## Personalized Recommendations
When user preferences are provided, use them to tailor your recommendations:
- Match food preferences to cuisine types (e.g., "Italian" → Italian restaurants)
- Match entertainment preferences to occasions (e.g., "Date night" → romantic spots, "After work drinks" → happy hours)
- Consider budget preferences when suggesting spots
- Reference their preferences naturally: "Since you love Italian food, you'd really enjoy..."
- If "pain points" are provided, address them directly:
  - "Happy hours are hard to find" → proactively share happy hour deals
  - "I always miss the good events" → highlight upcoming events
  - "Finding good restaurants takes too long" → give quick, confident recommendations

**If asked for personalized picks but NO preferences are provided:**
Ask conversationally: "I'd love to give you personalized recommendations! Quick question - what kind of food are you in the mood for? And are you looking for somewhere casual, upscale, or good for drinks?"

## Current Context
The current day and time will be provided to help with time-sensitive queries.`;

// CORS headers for mobile app
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { message, userId, preferences } = await req.json();

    if (!message || typeof message !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Message is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build user preferences context if available
    let preferencesContext = '';
    if (preferences) {
      const prefParts: string[] = [];
      if (preferences.foodPreferences?.length > 0) {
        prefParts.push(`Food preferences: ${preferences.foodPreferences.join(', ')}`);
      }
      if (preferences.entertainmentPreferences?.length > 0) {
        prefParts.push(`Entertainment preferences: ${preferences.entertainmentPreferences.join(', ')}`);
      }
      if (preferences.eventPreferences?.length > 0) {
        prefParts.push(`Event preferences: ${preferences.eventPreferences.join(', ')}`);
      }
      if (preferences.budget) {
        prefParts.push(`Budget: ${preferences.budget}`);
      }
      if (preferences.userType) {
        prefParts.push(`User type: ${preferences.userType === 'local' ? 'Lancaster local' : 'Visitor'}`);
      }
      if (preferences.painPoints?.length > 0) {
        prefParts.push(`Looking for help with: ${preferences.painPoints.join(', ')}`);
      }
      if (prefParts.length > 0) {
        preferencesContext = `\n\nUser preferences:\n${prefParts.join('\n')}`;
      }
    }

    // 1. Generate embedding for the question
    const embeddingRes = await openai.embeddings.create({
      model: 'text-embedding-ada-002',
      input: message,
    });
    const embedding = embeddingRes.data[0].embedding;

    // 2. Check cache for similar question
    const { data: cached, error: cacheError } = await supabase.rpc('find_similar_cache', {
      query_embedding: JSON.stringify(embedding),
      similarity_threshold: 0.92,
    });

    if (cached && cached.length > 0) {
      // Cache hit! Update usage stats
      await supabase
        .from('rosie_cache')
        .update({
          hit_count: (cached[0].hit_count || 1) + 1,
          last_used_at: new Date().toISOString(),
        })
        .eq('id', cached[0].id);

      console.log(`Cache hit for: "${message.substring(0, 50)}..." (similarity: ${cached[0].similarity})`);

      return new Response(
        JSON.stringify({
          answer: cached[0].answer,
          cached: true,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 3. Cache miss - build context from database
    const context = await buildContext(message);
    const currentTime = new Date().toLocaleString('en-US', {
      timeZone: 'America/New_York',
      weekday: 'long',
      hour: 'numeric',
      minute: '2-digit',
    });

    // 4. Call Claude for response
    const completion = await anthropic.messages.create({
      model: 'claude-3-5-haiku-20241022',
      max_tokens: 250,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: `Current time: ${currentTime}${preferencesContext}

Available restaurant data:
${context}

User question: ${message}`,
        },
      ],
    });

    const answer = completion.content[0]?.type === 'text'
      ? completion.content[0].text
      : "I'm having trouble thinking right now. Could you try asking again?";

    // 5. Cache the response
    const queryType = classifyQuery(message);
    const referencedIds = extractRestaurantIds(answer, context);

    await supabase.from('rosie_cache').insert({
      question: message,
      question_embedding: JSON.stringify(embedding),
      answer,
      query_type: queryType,
      referenced_ids: referencedIds,
    });

    console.log(`Cache miss - stored new response for: "${message.substring(0, 50)}..."`);

    return new Response(
      JSON.stringify({
        answer,
        cached: false,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Rosie chat error:', error);

    return new Response(
      JSON.stringify({
        error: 'Something went wrong',
        details: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Build context from database based on query type
async function buildContext(message: string): Promise<string> {
  const lowerMessage = message.toLowerCase();
  const contextParts: string[] = [];

  // Get current day for happy hour/event filtering
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const today = days[new Date().getDay()];

  // Check if user is asking about a specific day
  const mentionedDay = days.find(day => lowerMessage.includes(day));
  const dayToQuery = mentionedDay || today;

  // Happy hour queries
  if (
    lowerMessage.includes('happy hour') ||
    lowerMessage.includes('drink deal') ||
    lowerMessage.includes('drink special') ||
    lowerMessage.includes('cheap drinks')
  ) {
    const { data: happyHours } = await supabase
      .from('happy_hours')
      .select(`
        id,
        name,
        description,
        start_time,
        end_time,
        days_of_week,
        restaurant:restaurants!inner(id, name, address),
        items:happy_hour_items(name, discount_description, discounted_price)
      `)
      .eq('is_active', true)
      .contains('days_of_week', [today])
      .limit(10);

    if (happyHours && happyHours.length > 0) {
      contextParts.push('=== TODAY\'S HAPPY HOURS ===');
      happyHours.forEach((hh: any) => {
        // Format time nicely
        const formatTime = (time: string) => {
          const [hours, minutes] = time.split(':');
          const h = parseInt(hours, 10);
          const suffix = h >= 12 ? 'pm' : 'am';
          const displayHour = h > 12 ? h - 12 : h === 0 ? 12 : h;
          return minutes === '00' ? `${displayHour}${suffix}` : `${displayHour}:${minutes}${suffix}`;
        };
        const timeRange = `${formatTime(hh.start_time)}-${formatTime(hh.end_time)}`;

        // Build deals string from items or description
        let deals = hh.description || '';
        if (hh.items && hh.items.length > 0) {
          deals = hh.items.map((item: any) => {
            if (item.discounted_price) {
              return `$${item.discounted_price} ${item.name}`;
            }
            return `${item.discount_description} ${item.name}`;
          }).join(', ');
        }

        contextParts.push(
          `• [id:${hh.restaurant.id}] ${hh.restaurant.name}: ${timeRange} - ${deals} - ${hh.restaurant.address}`
        );
      });
    }
  }

  // Event queries
  if (
    lowerMessage.includes('event') ||
    lowerMessage.includes('tonight') ||
    lowerMessage.includes('music') ||
    lowerMessage.includes('trivia') ||
    lowerMessage.includes('karaoke') ||
    lowerMessage.includes('live') ||
    mentionedDay // If user mentions a specific day, check events
  ) {
    // Build the query - include event_date for one-time events
    let eventsQuery = supabase
      .from('events')
      .select(`
        id,
        name,
        description,
        event_type,
        event_date,
        start_time,
        is_recurring,
        days_of_week,
        performer_name,
        restaurant:restaurants!inner(id, name, address)
      `)
      .eq('is_active', true);

    // Only filter by day of week if user mentioned a specific day AND it's a recurring event query
    if (mentionedDay) {
      eventsQuery = eventsQuery.contains('days_of_week', [dayToQuery]);
    }

    const { data: events } = await eventsQuery.limit(10);

    if (events && events.length > 0) {
      const dayLabel = mentionedDay ? `EVENTS ON ${dayToQuery.toUpperCase()}` : 'EVENTS & ENTERTAINMENT';
      contextParts.push(`=== ${dayLabel} ===`);
      events.forEach((event: any) => {
        const performer = event.performer_name ? ` featuring ${event.performer_name}` : '';

        // Format date/time information properly
        let dateTimeStr = '';
        if (event.event_date) {
          // One-time event with specific date
          const eventDate = new Date(event.event_date + 'T00:00:00');
          const dateOptions: Intl.DateTimeFormatOptions = { weekday: 'long', month: 'long', day: 'numeric' };
          dateTimeStr = ` on ${eventDate.toLocaleDateString('en-US', dateOptions)}`;
          if (event.start_time) {
            const [hours, minutes] = event.start_time.split(':');
            const timeDate = new Date();
            timeDate.setHours(parseInt(hours), parseInt(minutes));
            dateTimeStr += ` at ${timeDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
          }
        } else if (event.days_of_week && event.days_of_week.length > 0) {
          // Recurring event
          dateTimeStr = ` (every ${event.days_of_week.join(', ')})`;
          if (event.start_time) {
            const [hours, minutes] = event.start_time.split(':');
            const timeDate = new Date();
            timeDate.setHours(parseInt(hours), parseInt(minutes));
            dateTimeStr += ` at ${timeDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
          }
        }

        contextParts.push(
          `• [id:${event.restaurant.id}] ${event.restaurant.name}: ${event.name}${performer} - ${event.event_type}${dateTimeStr} - ${event.restaurant.address}`
        );
      });
    } else if (mentionedDay) {
      contextParts.push(`=== EVENTS ON ${dayToQuery.toUpperCase()} ===`);
      contextParts.push('No events scheduled for this day.');
    }
  }

  // Voting/Leaderboard queries - what's popular, best, most votes, winner
  if (
    lowerMessage.includes('vote') ||
    lowerMessage.includes('best') ||
    lowerMessage.includes('popular') ||
    lowerMessage.includes('top') ||
    lowerMessage.includes('winner') ||
    lowerMessage.includes('favorite') ||
    lowerMessage.includes('leading')
  ) {
    // Get current month for leaderboard
    const now = new Date();
    const monthYear = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    // Map query terms to vote categories
    const categoryMap: Record<string, string> = {
      'wing': 'best_wings',
      'wings': 'best_wings',
      'burger': 'best_burgers',
      'burgers': 'best_burgers',
      'pizza': 'best_pizza',
      'cocktail': 'best_cocktails',
      'cocktails': 'best_cocktails',
      'drink': 'best_cocktails',
      'drinks': 'best_cocktails',
      'happy hour': 'best_happy_hour',
      'brunch': 'best_brunch',
      'late night': 'best_late_night',
      'late-night': 'best_late_night',
      'music': 'best_live_music',
      'live music': 'best_live_music',
    };

    // Find which category the user is asking about
    let targetCategory: string | null = null;
    for (const [keyword, category] of Object.entries(categoryMap)) {
      if (lowerMessage.includes(keyword)) {
        targetCategory = category;
        break;
      }
    }

    if (targetCategory) {
      // Query votes for specific category
      const { data: votes } = await supabase
        .from('votes')
        .select(`
          restaurant_id,
          restaurant:restaurants!inner(id, name, address)
        `)
        .eq('category', targetCategory)
        .eq('month_year', monthYear);

      if (votes && votes.length > 0) {
        // Count votes per restaurant
        const voteCounts: Record<string, { name: string; address: string; count: number }> = {};
        votes.forEach((v: any) => {
          const id = v.restaurant_id;
          if (!voteCounts[id]) {
            voteCounts[id] = { name: v.restaurant.name, address: v.restaurant.address, count: 0 };
          }
          voteCounts[id].count++;
        });

        // Sort by vote count
        const ranked = Object.entries(voteCounts)
          .sort((a, b) => b[1].count - a[1].count)
          .slice(0, 5);

        const categoryLabel = targetCategory.replace('best_', '').replace(/_/g, ' ').toUpperCase();
        contextParts.push(`=== COMMUNITY VOTES: BEST ${categoryLabel} (${monthYear}) ===`);
        ranked.forEach(([id, data], idx) => {
          const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : '•';
          contextParts.push(`${medal} [id:${id}] ${data.name}: ${data.count} votes - ${data.address}`);
        });
      }
    } else {
      // General "what's popular" query - get all categories
      const { data: allVotes } = await supabase
        .from('votes')
        .select(`
          category,
          restaurant_id,
          restaurant:restaurants!inner(id, name, address)
        `)
        .eq('month_year', monthYear);

      if (allVotes && allVotes.length > 0) {
        // Group by category and find leader in each
        const categoryLeaders: Record<string, { id: string; name: string; count: number }> = {};
        const categoryCounts: Record<string, Record<string, { name: string; count: number }>> = {};

        allVotes.forEach((v: any) => {
          if (!categoryCounts[v.category]) {
            categoryCounts[v.category] = {};
          }
          if (!categoryCounts[v.category][v.restaurant_id]) {
            categoryCounts[v.category][v.restaurant_id] = { name: v.restaurant.name, count: 0 };
          }
          categoryCounts[v.category][v.restaurant_id].count++;
        });

        // Find leader in each category
        for (const [category, restaurants] of Object.entries(categoryCounts)) {
          const entries = Object.entries(restaurants).sort((a, b) => b[1].count - a[1].count);
          if (entries.length > 0) {
            categoryLeaders[category] = { id: entries[0][0], name: entries[0][1].name, count: entries[0][1].count };
          }
        }

        contextParts.push(`=== COMMUNITY VOTING LEADERS (${monthYear}) ===`);
        for (const [category, leader] of Object.entries(categoryLeaders)) {
          const label = category.replace('best_', '').replace(/_/g, ' ');
          contextParts.push(`• Best ${label}: [id:${leader.id}] ${leader.name} (${leader.count} votes)`);
        }
      }
    }
  }

  // Brunch queries
  if (lowerMessage.includes('brunch') || lowerMessage.includes('breakfast')) {
    const { data: brunchSpots } = await supabase
      .from('restaurants')
      .select('id, name, description, address')
      .eq('is_active', true)
      .contains('categories', ['brunch'])
      .limit(8);

    if (brunchSpots && brunchSpots.length > 0) {
      contextParts.push('=== BRUNCH SPOTS ===');
      brunchSpots.forEach((r: any) => {
        contextParts.push(`• [id:${r.id}] ${r.name}: ${r.description || 'Great brunch spot'} - ${r.address}`);
      });
    }
  }

  // Dinner/date night queries
  if (
    lowerMessage.includes('dinner') ||
    lowerMessage.includes('date') ||
    lowerMessage.includes('romantic') ||
    lowerMessage.includes('nice')
  ) {
    const { data: dinnerSpots } = await supabase
      .from('restaurants')
      .select('id, name, description, address')
      .eq('is_active', true)
      .contains('categories', ['dinner'])
      .limit(8);

    if (dinnerSpots && dinnerSpots.length > 0) {
      contextParts.push('=== DINNER SPOTS ===');
      dinnerSpots.forEach((r: any) => {
        contextParts.push(`• [id:${r.id}] ${r.name}: ${r.description || 'Great for dinner'} - ${r.address}`);
      });
    }
  }

  // Bar/nightlife queries
  if (
    lowerMessage.includes('bar') ||
    lowerMessage.includes('drink') ||
    lowerMessage.includes('nightlife') ||
    lowerMessage.includes('rooftop')
  ) {
    const { data: bars } = await supabase
      .from('restaurants')
      .select('id, name, description, address, categories')
      .eq('is_active', true)
      .or('categories.cs.{bars},categories.cs.{nightlife},categories.cs.{rooftops}')
      .limit(8);

    if (bars && bars.length > 0) {
      contextParts.push('=== BARS & NIGHTLIFE ===');
      bars.forEach((r: any) => {
        const tags = (r.categories || []).join(', ');
        contextParts.push(`• [id:${r.id}] ${r.name} (${tags}): ${r.description || ''} - ${r.address}`);
      });
    }
  }

  // General restaurant search if no specific category matched
  if (contextParts.length === 0 || lowerMessage.includes('restaurant') || lowerMessage.includes('food') || lowerMessage.includes('eat')) {
    const { data: restaurants } = await supabase
      .from('restaurants')
      .select('id, name, description, address, categories, cuisine')
      .eq('is_active', true)
      .limit(15);

    if (restaurants && restaurants.length > 0) {
      contextParts.push('=== RESTAURANTS ===');
      restaurants.forEach((r: any) => {
        const cuisine = r.cuisine ? `[${r.cuisine}]` : '';
        contextParts.push(`• [id:${r.id}] ${r.name} ${cuisine}: ${r.description || ''} - ${r.address}`);
      });
    }
  }

  return contextParts.join('\n');
}

// Classify the query type for cache organization
function classifyQuery(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes('happy hour') || lower.includes('drink deal')) return 'happy_hour';
  if (lower.includes('event') || lower.includes('music') || lower.includes('trivia')) return 'event';
  if (lower.includes('brunch') || lower.includes('breakfast')) return 'brunch';
  if (lower.includes('dinner') || lower.includes('date')) return 'dinner';
  if (lower.includes('bar') || lower.includes('nightlife')) return 'nightlife';
  if (lower.includes('rooftop') || lower.includes('outdoor')) return 'outdoor';
  return 'general';
}

// Extract restaurant IDs mentioned in the response for cache invalidation
function extractRestaurantIds(answer: string, context: string): string[] {
  // This is a simplified version - in production you'd want more sophisticated matching
  // For now, we'll return empty and rely on TTL for cache freshness
  return [];
}
