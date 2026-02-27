// Rosie AI Chat Edge Function
// Handles chat requests, caches responses semantically, and queries restaurant data

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import OpenAI from 'https://esm.sh/openai@4';

// Initialize OpenAI client (used for both chat and embeddings)
const openai = new OpenAI({
  apiKey: Deno.env.get('OPENAI_API_KEY'),
});

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

// Market configuration — maps market slugs to AI personality + local knowledge
const MARKET_CONFIG: Record<string, { aiName: string; appName: string; area: string; areaShort: string; localKnowledge: string }> = {
  'lancaster-pa': {
    aiName: 'Rosie',
    appName: 'TasteLanc',
    area: 'Lancaster, PA',
    areaShort: 'Lancaster',
    localKnowledge: `You have deep knowledge of Lancaster, PA - its history, culture, neighborhoods (downtown, Lititz, Strasburg, etc.), and what makes it special.`,
  },
  'cumberland-pa': {
    aiName: 'Mollie',
    appName: 'TasteCumberland',
    area: 'Cumberland County, PA',
    areaShort: 'Cumberland County',
    localKnowledge: `You have deep knowledge of Cumberland County, PA - from Carlisle's charming downtown to Mechanicsburg's local favorites, Camp Hill's dining scene, and the history that makes this area special.`,
  },
};

// Build market-aware system prompt
function buildSystemPrompt(marketSlug: string): string {
  const market = MARKET_CONFIG[marketSlug] || MARKET_CONFIG['lancaster-pa'];

  return `You are ${market.aiName}, ${market.appName}'s friendly AI assistant for ${market.area} dining!

## CRITICAL RULE - DATABASE ONLY
**You must ONLY recommend restaurants/bars/venues from the "Available restaurant data" section below.**
- NEVER make up venue names or recommend places not in the data
- If data is empty or missing what user wants, be honest: "I don't have [category] info yet - we're adding more soon!"
- NEVER mention "database" or "local database" in responses - just answer naturally

**CRITICAL - DAY/TIME AWARENESS:**
- The "Current time" tells you EXACTLY what day and time it is RIGHT NOW
- "Tonight", "today", "this evening" = the CURRENT day shown in "Current time" — NEVER any other day
- The event/happy hour data you receive is ALREADY filtered to the correct day — trust it
- ONLY mention specific dates and times that are EXPLICITLY shown in the event data
- If an event shows "on Wednesday, January 28 at 5:30 PM" - use that exact information
- NEVER recommend a Tuesday event when today is Wednesday, or any other day mismatch
- NEVER say "you can do this tonight" for an event that runs on a DIFFERENT day than today
- If no events match what the user wants today, say "I don't see any [type] events tonight, but here's what's coming up on [day]" or suggest checking back
- Getting days/dates wrong destroys user trust - when in doubt, say "contact them for specific dates"

## Your Personality
- Warm, approachable, and genuinely enthusiastic about ${market.areaShort}
- You talk like a local friend who loves sharing the spots in the ${market.appName} app
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
${market.localKnowledge} USE this knowledge to:
- Enrich your recommendations ("This spot is right in the heart of downtown ${market.areaShort}...")
- Provide context about neighborhoods and areas
- Make recommendations feel personal and knowledgeable
- Help visitors understand what makes ${market.areaShort} unique

BUT: When it comes to actual venue/restaurant/bar names, you ONLY mention places from the "Available restaurant data" section.

## What You Can Help With
**Venue Information (ONLY from the database):**
- Restaurant/bar/cafe details: address, phone, website, cuisine, price range
- Operating hours: open/close times for every day of the week
- Happy hour deals and drink specials with specific items and prices
- Daily/weekly specials (food deals, discounts, promotions)
- Events and entertainment: live music, trivia, karaoke, comedy, DJ, bingo, sports
- Menu items and featured dishes with prices and dietary info (vegan, GF, etc.)
- Community voting results and leaderboards
- Google ratings and app ratings
- Signature dishes, vibe tags, and "best for" tags
- Neighborhood and parking info

**General ${market.areaShort} Knowledge (use freely to enhance recommendations):**
- Neighborhood vibes and what areas are known for
- ${market.areaShort} culture, history, and local flavor
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
- Hours: "is X open?" → check their hours in the data
- Phone/website: "what's their number?" → provide contact info
- Menu: "what's on their menu?" → list dishes and prices
- Specials: "any deals today?" → show today's specials
- Dietary: "vegan options?" → show restaurants/items with dietary flags

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
- Use your ${market.areaShort} knowledge to add context ("This is in the gallery district..." or "Perfect for a stroll through downtown after...")
- Mention relevant details (happy hour times, event info, cuisine type)
- Reference community votes when shown in the data

**When Data Is Limited:**
- If user asks for something not in the data, don't make things up
- Say something like: "I don't have any [type] spots in my recommendations right now, but I'd love to help you find something else! How about [suggest from available data]?"
- Encourage them to explore what IS available in the app

**For Off-Topic Questions:**
Gently redirect to ${market.areaShort} dining: "Ha! I'm ${market.aiName} - ${market.appName}'s dining guide! My specialty is helping you find amazing places to eat and drink in ${market.areaShort}. What sounds good?"

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
}

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
    const { message, userId, preferences, marketSlug } = await req.json();

    if (!message || typeof message !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Message is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Resolve market — default to lancaster-pa for backwards compatibility
    const resolvedSlug = marketSlug || 'lancaster-pa';
    let marketId: string | null = null;
    const { data: marketRow } = await supabase
      .from('markets')
      .select('id')
      .eq('slug', resolvedSlug)
      .eq('is_active', true)
      .single();
    if (marketRow) {
      marketId = marketRow.id;
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
        const marketConfig = MARKET_CONFIG[resolvedSlug] || MARKET_CONFIG['lancaster-pa'];
        prefParts.push(`User type: ${preferences.userType === 'local' ? `${marketConfig.areaShort} local` : 'Visitor'}`);
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

    // 2. Check cache for similar question — BUT skip cache for time-sensitive queries
    // "What's happening tonight?" on Tuesday !== "What's happening tonight?" on Wednesday
    const lowerMsg = message.toLowerCase();
    const isTimeSensitive = lowerMsg.includes('tonight') ||
      lowerMsg.includes('today') ||
      lowerMsg.includes('this evening') ||
      lowerMsg.includes('right now') ||
      lowerMsg.includes('going on now') ||
      lowerMsg.includes('happy hour') ||
      lowerMsg.includes('this week') ||
      lowerMsg.includes('this weekend');

    if (!isTimeSensitive) {
      const { data: cached, error: cacheError } = await supabase.rpc('find_similar_cache', {
        query_embedding: JSON.stringify(embedding),
        similarity_threshold: 0.88,
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
    } else {
      console.log(`Skipping cache for time-sensitive query: "${message.substring(0, 50)}..."`);
    }

    // 3. Cache miss - build context from database
    const context = await buildContext(message, marketId);
    const now = new Date();
    const currentTime = now.toLocaleString('en-US', {
      timeZone: 'America/New_York',
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });

    // 4. Call OpenAI for response with market-aware system prompt
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      max_tokens: 500,
      messages: [
        {
          role: 'system',
          content: buildSystemPrompt(resolvedSlug),
        },
        {
          role: 'user',
          content: `Current time: ${currentTime}${preferencesContext}

Available restaurant data:
${context}

User question: ${message}`,
        },
      ],
    });

    const answer = completion.choices[0]?.message?.content
      || "I'm having trouble thinking right now. Could you try asking again?";

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

// Helper to format time like "4pm" or "4:30pm"
function formatTime(time: string): string {
  const [hours, minutes] = time.split(':');
  const h = parseInt(hours, 10);
  const suffix = h >= 12 ? 'pm' : 'am';
  const displayHour = h > 12 ? h - 12 : h === 0 ? 12 : h;
  return minutes === '00' ? `${displayHour}${suffix}` : `${displayHour}:${minutes}${suffix}`;
}

// Build context from database — comprehensive, covers ALL data the app has
async function buildContext(message: string, marketId: string | null): Promise<string> {
  const lowerMessage = message.toLowerCase();
  const contextParts: string[] = [];

  // ── Date/time setup (EASTERN TIME — all data is in ET) ──
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const now = new Date();

  // Get the correct local day and date in Eastern Time (NOT UTC)
  const etOptions: Intl.DateTimeFormatOptions = { timeZone: 'America/New_York' };
  const etDayIndex = parseInt(new Intl.DateTimeFormat('en-US', { ...etOptions, weekday: 'narrow' })
    .formatToParts(now).find(p => p.type === 'weekday')?.value || '0');
  // Use a reliable method: get ET date components
  const etParts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'long',
  }).formatToParts(now);
  const etWeekday = etParts.find(p => p.type === 'weekday')?.value?.toLowerCase() || '';
  const etYear = etParts.find(p => p.type === 'year')?.value || '';
  const etMonth = etParts.find(p => p.type === 'month')?.value || '';
  const etDay = etParts.find(p => p.type === 'day')?.value || '';
  const todayDateStr = `${etYear}-${etMonth}-${etDay}`; // YYYY-MM-DD in ET

  const today = etWeekday; // e.g. "saturday"
  const mentionedDay = days.find(day => lowerMessage.includes(day));
  const dayToQuery = mentionedDay || today;

  // Calculate target date string (YYYY-MM-DD) for one-time events/specials
  const todayIndex = days.indexOf(today);
  const targetIndex = days.indexOf(dayToQuery);
  let dayOffset = targetIndex - todayIndex;
  if (dayOffset < 0) dayOffset += 7;
  // Build target date from ET date (not UTC)
  const todayDate = new Date(`${todayDateStr}T12:00:00`); // noon to avoid DST edge cases
  todayDate.setDate(todayDate.getDate() + dayOffset);
  const targetDateStr = todayDate.toISOString().split('T')[0];

  const isAskingAboutToday = lowerMessage.includes('tonight') ||
    lowerMessage.includes('today') ||
    lowerMessage.includes('this evening') ||
    lowerMessage.includes('right now') ||
    lowerMessage.includes('going on now');

  // ── Keyword detection for conditional queries ──
  const wantsHappyHours = lowerMessage.includes('happy hour') ||
    lowerMessage.includes('drink deal') ||
    lowerMessage.includes('drink special') ||
    lowerMessage.includes('cheap drinks');

  const wantsEvents = lowerMessage.includes('event') ||
    lowerMessage.includes('tonight') ||
    lowerMessage.includes('music') ||
    lowerMessage.includes('trivia') ||
    lowerMessage.includes('karaoke') ||
    lowerMessage.includes('live') ||
    lowerMessage.includes('comedy') ||
    lowerMessage.includes('dj') ||
    lowerMessage.includes('bingo') ||
    lowerMessage.includes('sports') ||
    lowerMessage.includes('entertainment') ||
    !!mentionedDay;

  const wantsSpecials = lowerMessage.includes('special') ||
    lowerMessage.includes('deal') ||
    lowerMessage.includes('discount') ||
    lowerMessage.includes('promotion') ||
    lowerMessage.includes('offer') ||
    lowerMessage.includes('coupon') ||
    lowerMessage.includes('sale') ||
    lowerMessage.includes('cheap');

  const wantsMenu = lowerMessage.includes('menu') ||
    lowerMessage.includes('dish') ||
    lowerMessage.includes('appetizer') ||
    lowerMessage.includes('entree') ||
    lowerMessage.includes('dessert') ||
    lowerMessage.includes('vegan') ||
    lowerMessage.includes('vegetarian') ||
    lowerMessage.includes('gluten');

  const wantsHours = lowerMessage.includes('open') ||
    lowerMessage.includes('close') ||
    lowerMessage.includes('hours') ||
    lowerMessage.includes('when do') ||
    lowerMessage.includes('what time');

  const wantsContact = lowerMessage.includes('phone') ||
    lowerMessage.includes('number') ||
    lowerMessage.includes('call') ||
    lowerMessage.includes('website') ||
    lowerMessage.includes('reservation') ||
    lowerMessage.includes('book');

  const wantsVotes = lowerMessage.includes('vote') ||
    lowerMessage.includes('best') ||
    lowerMessage.includes('popular') ||
    lowerMessage.includes('top') ||
    lowerMessage.includes('winner') ||
    lowerMessage.includes('favorite') ||
    lowerMessage.includes('leading');

  const wantsBrunch = lowerMessage.includes('brunch') || lowerMessage.includes('breakfast');
  const wantsDinner = lowerMessage.includes('dinner') || lowerMessage.includes('date') ||
    lowerMessage.includes('romantic') || lowerMessage.includes('nice');
  const wantsBars = lowerMessage.includes('bar') || lowerMessage.includes('nightlife') ||
    lowerMessage.includes('rooftop');

  // ══════════════════════════════════════════════
  // BUILD ALL QUERIES IN PARALLEL
  // ══════════════════════════════════════════════

  // Enriched restaurant select — includes contact, ratings, hours
  const richRestaurantSelect = `
    id, name, address, phone, website, cuisine, price_range,
    categories, description, neighborhood, google_rating,
    tastelancrating, signature_dishes, vibe_tags, best_for,
    hours:restaurant_hours(day_of_week, open_time, close_time, is_closed)
  `;

  // Parallel query array — we always run restaurants + conditionals
  const queryPromises: Record<string, Promise<any>> = {};

  // 1. ALWAYS: Restaurants (enriched, but capped at 30 for context size)
  let restaurantsQuery = supabase
    .from('restaurants')
    .select(richRestaurantSelect)
    .eq('is_active', true);
  if (marketId) {
    restaurantsQuery = restaurantsQuery.eq('market_id', marketId);
  }
  queryPromises.restaurants = restaurantsQuery.limit(30);

  // 1b. TARGETED SEARCH: Extract potential restaurant name from the message
  // Remove common question words, keep the likely venue name
  const stopWords = new Set(['what', 'whats', 'where', 'when', 'how', 'is', 'are', 'the', 'a', 'an',
    'do', 'does', 'can', 'for', 'to', 'in', 'on', 'at', 'of', 'any', 'their', 'there', 'they',
    'i', 'me', 'my', 'you', 'your', 'it', 'its', 'have', 'has', 'get', 'tell',
    'phone', 'number', 'hours', 'open', 'close', 'menu', 'website', 'call', 'address',
    'tonight', 'today', 'tomorrow', 'right', 'now', 'time', 'about']);
  const nameWords = message.split(/[?.,!]+/)[0] // Take the first sentence/clause
    .split(/\s+/)
    .filter(w => w.length > 1 && !stopWords.has(w.toLowerCase()))
    .join(' ')
    .trim();

  if (nameWords.length > 2) {
    // Search for restaurants matching the potential name
    // Use a simpler select first, then enhance with hours if found
    let nameSearchQuery = supabase
      .from('restaurants')
      .select(`
        id, name, address, phone, website, cuisine, price_range,
        categories, description, neighborhood, google_rating,
        tastelancrating, signature_dishes, vibe_tags, best_for,
        hours:restaurant_hours(day_of_week, open_time, close_time, is_closed)
      `)
      .eq('is_active', true)
      .ilike('name', `%${nameWords}%`);
    if (marketId) nameSearchQuery = nameSearchQuery.eq('market_id', marketId);
    queryPromises.nameSearch = nameSearchQuery.limit(5);

    // Also try with just the first word (handles "Tequila" from "Tequila Willies")
    const firstWord = nameWords.split(/\s+/)[0];
    if (firstWord.length > 3 && firstWord !== nameWords) {
      let broadSearchQuery = supabase
        .from('restaurants')
        .select(`
          id, name, address, phone, website, cuisine, price_range,
          categories, description, neighborhood, google_rating,
          tastelancrating, signature_dishes, vibe_tags, best_for,
          hours:restaurant_hours(day_of_week, open_time, close_time, is_closed)
        `)
        .eq('is_active', true)
        .ilike('name', `%${firstWord}%`);
      if (marketId) broadSearchQuery = broadSearchQuery.eq('market_id', marketId);
      queryPromises.broadSearch = broadSearchQuery.limit(5);
    }
  }

  // 2. Happy hours (on dayToQuery) — always fetch to surface deals
  let happyHoursQuery = supabase
    .from('happy_hours')
    .select(`
      id, name, description, start_time, end_time, days_of_week,
      restaurant:restaurants!inner(id, name, address, market_id),
      items:happy_hour_items(name, discount_description, discounted_price)
    `)
    .eq('is_active', true)
    .contains('days_of_week', [dayToQuery]);
  if (marketId) {
    happyHoursQuery = happyHoursQuery.eq('restaurant.market_id', marketId);
  }
  queryPromises.happyHours = happyHoursQuery.limit(15);

  // 3. Events — always fetch (recurring + one-time)
  const eventSelect = `
    id, name, description, event_type, event_date, start_time,
    is_recurring, days_of_week, performer_name,
    restaurant:restaurants!inner(id, name, address, market_id)
  `;
  let recurringEventsQuery = supabase
    .from('events').select(eventSelect).eq('is_active', true)
    .contains('days_of_week', [dayToQuery]);
  if (marketId) recurringEventsQuery = recurringEventsQuery.eq('restaurant.market_id', marketId);

  let oneTimeEventsQuery = supabase
    .from('events').select(eventSelect).eq('is_active', true)
    .eq('event_date', targetDateStr);
  if (marketId) oneTimeEventsQuery = oneTimeEventsQuery.eq('restaurant.market_id', marketId);

  queryPromises.recurringEvents = recurringEventsQuery.limit(15);
  queryPromises.oneTimeEvents = oneTimeEventsQuery.limit(15);

  // 4. Specials — always fetch (recurring + date-specific)
  const specialSelect = `
    id, name, description, days_of_week, start_time, end_time,
    original_price, special_price, discount_description,
    restaurant:restaurants!inner(id, name, address, market_id)
  `;
  let recurringSpecialsQuery = supabase
    .from('specials').select(specialSelect).eq('is_active', true)
    .contains('days_of_week', [dayToQuery]);
  if (marketId) recurringSpecialsQuery = recurringSpecialsQuery.eq('restaurant.market_id', marketId);

  let dateSpecialsQuery = supabase
    .from('specials').select(`
      id, name, description, start_date, end_date, start_time, end_time,
      original_price, special_price, discount_description,
      restaurant:restaurants!inner(id, name, address, market_id)
    `).eq('is_active', true).eq('is_recurring', false)
    .lte('start_date', targetDateStr).gte('end_date', targetDateStr);
  if (marketId) dateSpecialsQuery = dateSpecialsQuery.eq('restaurant.market_id', marketId);

  queryPromises.recurringSpecials = recurringSpecialsQuery.limit(15);
  queryPromises.dateSpecials = dateSpecialsQuery.limit(15);

  // 5. Menu items — only when relevant
  if (wantsMenu) {
    let menuQuery = supabase
      .from('menu_items')
      .select(`
        name, description, price, dietary_flags, is_featured,
        section:menu_sections!inner(
          name,
          menu:menus!inner(
            is_active,
            restaurant:restaurants!inner(id, name, market_id)
          )
        )
      `)
      .eq('is_available', true)
      .eq('section.menu.is_active', true);
    if (marketId) menuQuery = menuQuery.eq('section.menu.restaurant.market_id', marketId);
    queryPromises.menu = menuQuery.limit(100);
  }

  // 6. Votes — only when relevant
  if (wantsVotes) {
    const monthYear = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    let votesQuery = supabase
      .from('votes')
      .select(`category, restaurant_id, restaurant:restaurants!inner(id, name, address, market_id)`)
      .eq('month_year', monthYear);
    if (marketId) votesQuery = votesQuery.eq('restaurant.market_id', marketId);
    queryPromises.votes = votesQuery;
  }

  // 7. Category-specific restaurant queries
  if (wantsBrunch) {
    let q = supabase.from('restaurants').select(richRestaurantSelect)
      .eq('is_active', true).contains('categories', ['brunch']);
    if (marketId) q = q.eq('market_id', marketId);
    queryPromises.brunch = q.limit(10);
  }
  if (wantsDinner) {
    let q = supabase.from('restaurants').select(richRestaurantSelect)
      .eq('is_active', true).contains('categories', ['dinner']);
    if (marketId) q = q.eq('market_id', marketId);
    queryPromises.dinner = q.limit(10);
  }
  if (wantsBars) {
    let q = supabase.from('restaurants').select(richRestaurantSelect)
      .eq('is_active', true)
      .or('categories.cs.{bars},categories.cs.{nightlife},categories.cs.{rooftops}');
    if (marketId) q = q.eq('market_id', marketId);
    queryPromises.bars = q.limit(10);
  }

  // ── Run ALL queries in parallel ──
  const keys = Object.keys(queryPromises);
  const results = await Promise.all(Object.values(queryPromises));
  const data: Record<string, any> = {};
  const debugErrors: Record<string, string> = {};
  keys.forEach((key, i) => {
    data[key] = results[i].data || [];
    if (results[i].error) {
      debugErrors[key] = results[i].error.message || JSON.stringify(results[i].error);
    }
  });
  if (Object.keys(debugErrors).length > 0) {
    console.error('Query errors:', JSON.stringify(debugErrors));
  }
  console.log(`Context queries: ${keys.join(', ')} | nameSearch: ${data.nameSearch?.length || 0} | broadSearch: ${data.broadSearch?.length || 0}`);

  // ══════════════════════════════════════════════
  // FORMAT RESULTS
  // ══════════════════════════════════════════════

  // Helper to format a restaurant entry
  const formatRestaurant = (r: any, compact = false): string => {
    const parts: string[] = [`[id:${r.id}] ${r.name}`];
    if (r.cuisine) parts.push(`(${r.cuisine})`);
    if (r.price_range) parts.push(r.price_range);
    parts.push(`- ${r.address}`);
    // Always include contact info — it's small and users frequently ask
    if (r.phone) parts.push(`| Phone: ${r.phone}`);
    if (r.website) parts.push(`| Web: ${r.website}`);
    if (!compact) {
      if (r.neighborhood) parts.push(`| Area: ${r.neighborhood}`);
      if (r.google_rating) parts.push(`| Google: ${r.google_rating}★`);
      if (r.signature_dishes?.length > 0) parts.push(`| Known for: ${r.signature_dishes.join(', ')}`);
      if (r.vibe_tags?.length > 0) parts.push(`| Vibe: ${r.vibe_tags.join(', ')}`);
      if (r.best_for?.length > 0) parts.push(`| Best for: ${r.best_for.join(', ')}`);
    }
    if (r.categories?.length > 0) parts.push(`| Tags: ${r.categories.join(', ')}`);

    // Today's hours
    const todayHours = (r.hours || []).find((h: any) => h.day_of_week === today);
    if (todayHours) {
      if (todayHours.is_closed) {
        parts.push(`| Today: CLOSED`);
      } else if (todayHours.open_time && todayHours.close_time) {
        parts.push(`| Today: ${formatTime(todayHours.open_time)}-${formatTime(todayHours.close_time)}`);
      }
    }

    // Full hours when specifically asked
    if (wantsHours || wantsContact) {
      const allHours = (r.hours || [])
        .map((h: any) => {
          if (h.is_closed) return `${h.day_of_week.slice(0, 3)}: closed`;
          if (h.open_time && h.close_time) return `${h.day_of_week.slice(0, 3)}: ${formatTime(h.open_time)}-${formatTime(h.close_time)}`;
          return null;
        }).filter(Boolean);
      if (allHours.length > 0) parts.push(`| All hours: ${allHours.join(', ')}`);
    }

    return `• ${parts.join(' ')}`;
  };

  // ── 1. RESTAURANT DIRECTORY (merge general + name search + broad search) ──
  const generalRestaurants = data.restaurants || [];
  const nameSearchResults = data.nameSearch || [];
  const broadSearchResults = data.broadSearch || [];
  const seenRestIds = new Set(generalRestaurants.map((r: any) => r.id));
  const searchedResults = [...nameSearchResults, ...broadSearchResults];
  const extraFromSearch = searchedResults.filter((r: any) => {
    if (seenRestIds.has(r.id)) return false;
    seenRestIds.add(r.id);
    return true;
  });
  const restaurants = [...extraFromSearch, ...generalRestaurants]; // searched names first
  if (restaurants.length > 0) {
    contextParts.push('=== RESTAURANTS ===');
    restaurants.forEach((r: any) => contextParts.push(formatRestaurant(r, restaurants.length > 20)));
  }

  // ── Category-specific restaurants (deduplicated) ──
  const mainIds = new Set(restaurants.map((r: any) => r.id));
  const addCategorySection = (key: string, label: string) => {
    const items = (data[key] || []).filter((r: any) => !mainIds.has(r.id));
    if (items.length > 0) {
      contextParts.push(`\n=== ${label} ===`);
      items.forEach((r: any) => contextParts.push(formatRestaurant(r)));
    }
  };
  if (wantsBrunch) addCategorySection('brunch', 'BRUNCH SPOTS');
  if (wantsDinner) addCategorySection('dinner', 'DINNER / DATE NIGHT SPOTS');
  if (wantsBars) addCategorySection('bars', 'BARS & NIGHTLIFE');

  // ── 2. HAPPY HOURS ──
  const happyHours = data.happyHours || [];
  if (happyHours.length > 0) {
    const dayLabel = dayToQuery === today ? "TODAY'S" : `${dayToQuery.toUpperCase()}'S`;
    contextParts.push(`\n=== ${dayLabel} HAPPY HOURS ===`);
    happyHours.forEach((hh: any) => {
      const timeRange = `${formatTime(hh.start_time)}-${formatTime(hh.end_time)}`;
      let deals = hh.description || '';
      if (hh.items && hh.items.length > 0) {
        deals = hh.items.map((item: any) => {
          if (item.discounted_price) return `$${item.discounted_price} ${item.name}`;
          return `${item.discount_description} ${item.name}`;
        }).join(', ');
      }
      contextParts.push(`• [id:${hh.restaurant.id}] ${hh.restaurant.name}: ${timeRange} - ${deals}`);
    });
  } else if (wantsHappyHours) {
    contextParts.push(`\n=== HAPPY HOURS ===\nNo happy hours found for ${dayToQuery}.`);
  }

  // ── 3. EVENTS (recurring + one-time, deduplicated) ──
  const allEvents = [...(data.recurringEvents || []), ...(data.oneTimeEvents || [])];
  const seenEvents = new Set<string>();
  const events = allEvents.filter((e: any) => {
    if (seenEvents.has(e.id)) return false;
    seenEvents.add(e.id);
    return true;
  });

  if (events.length > 0) {
    const dayLabel = isAskingAboutToday
      ? `EVENTS HAPPENING TODAY (${today.toUpperCase()})`
      : mentionedDay
        ? `EVENTS ON ${dayToQuery.toUpperCase()}`
        : `TODAY'S EVENTS (${today.toUpperCase()})`;
    contextParts.push(`\n=== ${dayLabel} ===`);
    events.forEach((event: any) => {
      const performer = event.performer_name ? ` featuring ${event.performer_name}` : '';
      let dateTimeStr = '';
      if (event.event_date) {
        const eventDate = new Date(event.event_date + 'T00:00:00');
        const dateOptions: Intl.DateTimeFormatOptions = { weekday: 'long', month: 'long', day: 'numeric' };
        dateTimeStr = ` on ${eventDate.toLocaleDateString('en-US', dateOptions)}`;
        if (event.start_time) {
          const [hours, minutes] = event.start_time.split(':');
          const timeDate = new Date();
          timeDate.setHours(parseInt(hours), parseInt(minutes));
          dateTimeStr += ` at ${timeDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
        }
      } else if (event.days_of_week?.length > 0) {
        dateTimeStr = ` (every ${event.days_of_week.join(', ')})`;
        if (event.start_time) {
          const [hours, minutes] = event.start_time.split(':');
          const timeDate = new Date();
          timeDate.setHours(parseInt(hours), parseInt(minutes));
          dateTimeStr += ` at ${timeDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
        }
      }
      contextParts.push(
        `• [id:${event.restaurant.id}] ${event.restaurant.name}: ${event.name}${performer} - ${event.event_type}${dateTimeStr}`
      );
    });
  } else if (wantsEvents) {
    contextParts.push(`\n=== EVENTS ON ${dayToQuery.toUpperCase()} ===`);
    contextParts.push('No events scheduled for this day.');
  }

  // ── 4. SPECIALS (recurring + date-specific, deduplicated) ──
  const allSpecials = [...(data.recurringSpecials || []), ...(data.dateSpecials || [])];
  const seenSpecials = new Set<string>();
  const specials = allSpecials.filter((s: any) => {
    if (seenSpecials.has(s.id)) return false;
    seenSpecials.add(s.id);
    return true;
  });

  if (specials.length > 0) {
    const dayLabel = dayToQuery === today ? "TODAY'S" : `${dayToQuery.toUpperCase()}'S`;
    contextParts.push(`\n=== ${dayLabel} SPECIALS ===`);
    specials.forEach((s: any) => {
      const pricing = s.special_price
        ? `$${s.special_price}${s.original_price ? ` (was $${s.original_price})` : ''}`
        : s.discount_description || '';
      const timeStr = s.start_time && s.end_time
        ? ` ${formatTime(s.start_time)}-${formatTime(s.end_time)}`
        : '';
      contextParts.push(
        `• [id:${s.restaurant.id}] ${s.restaurant.name}: ${s.name}${timeStr} - ${pricing}${s.description ? ` - ${s.description}` : ''}`
      );
    });
  } else if (wantsSpecials) {
    contextParts.push(`\n=== SPECIALS ===\nNo specials found for ${dayToQuery}.`);
  }

  // ── 5. MENU ITEMS ──
  if (wantsMenu && data.menu?.length > 0) {
    contextParts.push(`\n=== MENU ITEMS ===`);
    const byRestaurant: Record<string, { name: string; id: string; items: any[] }> = {};
    data.menu.forEach((item: any) => {
      const rest = item.section?.menu?.restaurant;
      if (!rest) return;
      if (!byRestaurant[rest.id]) {
        byRestaurant[rest.id] = { name: rest.name, id: rest.id, items: [] };
      }
      byRestaurant[rest.id].items.push(item);
    });
    for (const [restId, rdata] of Object.entries(byRestaurant)) {
      const itemStrs = rdata.items.map((item: any) => {
        const dietary = item.dietary_flags?.length > 0 ? ` (${item.dietary_flags.join(', ')})` : '';
        const price = item.price ? ` $${item.price}` : '';
        return `${item.name}${price}${dietary}`;
      });
      contextParts.push(`• [id:${restId}] ${rdata.name}: ${itemStrs.join(' | ')}`);
    }
  }

  // ── 6. VOTING / LEADERBOARD ──
  if (wantsVotes && data.votes?.length > 0) {
    const votes = data.votes;
    const monthYear = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const categoryMap: Record<string, string> = {
      'wing': 'best_wings', 'wings': 'best_wings',
      'burger': 'best_burgers', 'burgers': 'best_burgers',
      'pizza': 'best_pizza',
      'cocktail': 'best_cocktails', 'cocktails': 'best_cocktails',
      'happy hour': 'best_happy_hour', 'brunch': 'best_brunch',
      'late night': 'best_late_night', 'late-night': 'best_late_night',
      'music': 'best_live_music', 'live music': 'best_live_music',
    };

    let targetCategory: string | null = null;
    for (const [keyword, category] of Object.entries(categoryMap)) {
      if (lowerMessage.includes(keyword)) { targetCategory = category; break; }
    }

    if (targetCategory) {
      const filtered = votes.filter((v: any) => v.category === targetCategory);
      const voteCounts: Record<string, { name: string; address: string; count: number }> = {};
      filtered.forEach((v: any) => {
        if (!voteCounts[v.restaurant_id]) voteCounts[v.restaurant_id] = { name: v.restaurant.name, address: v.restaurant.address, count: 0 };
        voteCounts[v.restaurant_id].count++;
      });
      const ranked = Object.entries(voteCounts).sort((a, b) => b[1].count - a[1].count).slice(0, 5);
      if (ranked.length > 0) {
        const label = targetCategory.replace('best_', '').replace(/_/g, ' ').toUpperCase();
        contextParts.push(`\n=== COMMUNITY VOTES: BEST ${label} (${monthYear}) ===`);
        ranked.forEach(([id, d], i) => {
          const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '•';
          contextParts.push(`${medal} [id:${id}] ${d.name}: ${d.count} votes`);
        });
      }
    } else {
      const cats: Record<string, Record<string, { name: string; count: number }>> = {};
      votes.forEach((v: any) => {
        if (!cats[v.category]) cats[v.category] = {};
        if (!cats[v.category][v.restaurant_id]) cats[v.category][v.restaurant_id] = { name: v.restaurant.name, count: 0 };
        cats[v.category][v.restaurant_id].count++;
      });
      contextParts.push(`\n=== COMMUNITY VOTING LEADERS (${monthYear}) ===`);
      for (const [cat, rests] of Object.entries(cats)) {
        const entries = Object.entries(rests).sort((a, b) => b[1].count - a[1].count);
        if (entries.length > 0) {
          const label = cat.replace('best_', '').replace(/_/g, ' ');
          contextParts.push(`• Best ${label}: [id:${entries[0][0]}] ${entries[0][1].name} (${entries[0][1].count} votes)`);
        }
      }
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
