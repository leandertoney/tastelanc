/**
 * Market-Specific Local Knowledge
 *
 * Per-market content for AI system prompts (Rosie/Mollie).
 * Separated from market.ts because these are large text blocks
 * used only in AI prompt construction.
 *
 * To add a new city: add an entry with local knowledge content.
 */

import { MARKET_SLUG } from './market';

export interface MarketKnowledge {
  neighborhoods: string;
  foodScene: string;
  localCulture: string;
  history: string;
  artsEvents: string;
  audienceGuide: string;
}

const MARKET_KNOWLEDGE_CONFIG: Record<string, MarketKnowledge> = {
  'lancaster-pa': {
    neighborhoods: `### Neighborhoods & Areas (Use this to give better recommendations)
- **Downtown Lancaster**: The heart of the scene - walkable, trendy, always evolving. Best for bar hopping and date nights.
- **Lititz**: Charming small-town vibes with surprising culinary depth. Great for day trips.
- **Manheim**: More casual, local favorites. Less pretentious.
- **East Petersburg / Rohrerstown**: Strip mall gems and family spots.
- **Columbia**: Riverside town with a growing food scene.
- **Strasburg**: Tourist-heavy but some legit spots mixed in.`,

    foodScene: `### The Food Scene (Your insider knowledge)
- Farm-to-table isn't a trend here - it's heritage (Amish country, Lancaster Central Market)
- The craft cocktail scene has exploded in the last 5 years
- Brunch culture is HUGE - weekends get competitive, recommend reservations
- Happy hour is taken seriously here - real deals, not token discounts
- Rooftop/outdoor dining demand exceeds supply - mention it when relevant
- Late night options are limited - be honest about this (we're not Philly)
- First Friday is a big deal downtown - mention it if someone's visiting on a Friday`,

    localCulture: `### Local Culture
- Locals are loyal - once they find "their spot," they stick
- Word of mouth travels fast in a city this size
- The NYC/Philly transplant influence is real and growing
- College crowd (F&M) impacts certain areas seasonally`,

    history: `### Local History & Heritage (Use to add color to conversations)
- **America's oldest inland city** - founded in 1729, was the U.S. capital for one day in 1777
- **Lancaster Central Market** - the nation's oldest continuously operating farmers market (since 1730). A must-visit for anyone new to the area. Open Tues, Fri, Sat mornings.
- **Pennsylvania Dutch country** - "Dutch" is actually "Deutsch" (German). The Amish and Mennonite communities shaped the region's food traditions.
- **Food traditions**: Shoofly pie, whoopie pies, chicken pot pie (it's a soup here, not a pie), scrapple, chow chow, soft pretzels. These aren't tourist gimmicks - they're real local food.
- **The Red Rose City** - Lancaster's nickname, from the House of Lancaster in England
- **Historic architecture** - many downtown buildings date to the 1800s, giving restaurants that old-world character
- **The revival story** - Downtown was struggling in the 90s/2000s, but a major renaissance over the last 15 years brought new restaurants, galleries, and nightlife`,

    artsEvents: `### Arts & Events (Relevant to dining recommendations)
- **First Friday** - Monthly art walk downtown, galleries open late, restaurants packed. Huge night out.
- **Long's Park Summer Music Series** - Free concerts, people bring picnics and blankets
- **Lancaster Arts District** - Gallery Row on Prince Street, often paired with dinner plans
- **Fulton Theatre** - One of the oldest operating theaters in the U.S., great dinner-and-show combos nearby
- **Music Fridays at Central Market** - Live music during market hours
- **Seasonal events** - Christmas in Lititz, Bridge Bust in Columbia, various food festivals throughout the year`,

    audienceGuide: `### Who You're Talking To (Adjust your tone)
- **Young adults (21-30)**: Care about vibe, Instagram-worthy spots, value
- **Date night couples**: Want ambiance, good drinks, not too loud
- **Families**: Need kid-friendly but parents still want good food
- **Tourists/Visitors**: Need orientation, "must-try" guidance, walkable options
- **Locals**: Already know basics, want hidden gems or what's new`,
  },

  'cumberland-pa': {
    neighborhoods: `### Neighborhoods & Areas (Use this to give better recommendations)
- **Carlisle**: Historic college town (Dickinson College), walkable downtown with a growing restaurant scene.
- **Mechanicsburg**: Family-friendly with a mix of chains and local gems along the main corridors.
- **Camp Hill / Lemoyne**: West Shore suburbs with upscale dining options near Harrisburg.
- **Shippensburg**: Small-town charm at the southern end of the county, Shippensburg University area.
- **New Cumberland**: Quaint borough along the Susquehanna with a few standout spots.`,

    foodScene: `### The Food Scene (Your insider knowledge)
- The Carlisle downtown dining scene has been growing steadily
- Strong farm-to-table presence thanks to Cumberland Valley agriculture
- Craft beer culture is thriving with several local breweries
- The West Shore (Camp Hill/Lemoyne) has the most upscale options
- Proximity to Harrisburg means people often cross county lines for dining
- BYOB restaurants are common and popular`,

    localCulture: `### Local Culture
- College towns (Dickinson, Shippensburg) bring seasonal energy
- Strong military community (Carlisle Barracks, Army War College)
- Outdoor recreation crowd (Appalachian Trail runs through the county)
- Mix of longtime locals and Harrisburg-area commuters`,

    history: `### Local History & Heritage (Use to add color to conversations)
- **Carlisle Barracks** - one of the oldest military installations in the U.S.
- **Dickinson College** - founded in 1783, shapes Carlisle's culture
- **Cumberland Valley** - rich agricultural heritage, known for apples and produce
- **Appalachian Trail** - runs right through the county, attracting hikers and outdoor enthusiasts
- **Historic downtown Carlisle** - well-preserved 18th-century architecture`,

    artsEvents: `### Arts & Events (Relevant to dining recommendations)
- **Carlisle Car Shows** - Major events that pack the town multiple times per year
- **Summerfair** - Annual arts festival in Carlisle
- **First Friday Carlisle** - Monthly downtown art walk
- **Dickinson College events** - Lectures, performances, cultural events open to the community`,

    audienceGuide: `### Who You're Talking To (Adjust your tone)
- **Young adults (21-30)**: College crowd and young professionals, care about vibe and value
- **Date night couples**: Want quality options without driving to Harrisburg
- **Families**: Need kid-friendly spots with good food
- **Tourists/Visitors**: Often here for car shows, hiking, or college visits
- **Locals**: Know the basics, looking for what's new or hidden gems`,
  },
};

export const LOCAL_KNOWLEDGE: MarketKnowledge =
  MARKET_KNOWLEDGE_CONFIG[MARKET_SLUG] || MARKET_KNOWLEDGE_CONFIG['lancaster-pa'];
