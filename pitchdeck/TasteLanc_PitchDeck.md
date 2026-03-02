# TasteLanc — Investor/Partner Pitch Deck

---

## Slide 1: Cover

# TasteLanc

### Eat. Drink. Experience.

**Lancaster's go-to for what's happening now.**

---

## Slide 2: What Is TasteLanc?

**TasteLanc is the hyper-local discovery platform for restaurants, happy hours, events, and nightlife — powered by AI and community voting.**

- Mobile app (iOS, live on App Store) + responsive web platform
- AI concierge ("Rosie") gives personalized recommendations from real local data
- Community voting crowns "Best Of" winners across 8 categories each month
- Restaurant owners get a full SaaS dashboard to manage menus, events, specials, and analytics
- Multi-market architecture already live in 2 Pennsylvania markets

---

## Slide 3: The Problem

> *"Sound familiar?"*

- **Happy hours scattered across apps.** No single source for what's on right now.
- **Events you hear about too late.** By the time you find out, it's sold out or over.
- **Deals buried in your feed.** Social media algorithms hide the local spots that matter.

There is no Yelp for "what's happening tonight." Google Maps shows hours and reviews — not happy hour specials, live music lineups, or weekly deals. Locals piece together Instagram stories, Facebook events, and word-of-mouth. Visitors are completely lost.

---

## Slide 4: The Solution

TasteLanc is the single source of truth for your local food and nightlife scene.

| Feature | Description |
|---------|-------------|
| **AI Concierge (Rosie)** | OpenAI-powered assistant trained on real restaurant data — recommends spots based on your mood, budget, and dietary preferences |
| **Happy Hours** | Real-time happy hour deals with item-level pricing (original vs. discounted) |
| **Events Calendar** | Live music, trivia, comedy, DJ nights, karaoke, wine tastings — filterable and current |
| **Weekly Specials** | Restaurant-managed specials updated directly from the owner dashboard |
| **Community Voting** | 8 monthly categories (Wings, Burgers, Pizza, Cocktails, Happy Hour, Brunch, Late Night, Live Music) — 4 votes per user per month |
| **Rewards & Loyalty** | Points for check-ins (5 pts), reviews (5 pts), photos (3 pts), social shares (3 pts), event attendance (5 pts), referrals (20 pts); premium users earn 2.5x |
| **Itinerary Builder** | AI-generated "Plan Your Day" with mood-driven stops (Foodie Tour, Date Night, Bar Crawl, etc.), walk-time estimates, and shareable cards |
| **Geofence Notifications** | Radar SDK powers neighborhood-entry push notifications and restaurant check-in prompts |
| **Map Search** | Clustered Google Maps with category filters, neighborhood polygon overlays, and distance-based sorting |

---

## Slide 5: Product Screenshots

> *Real app store screenshots from the live iOS app.*

| Screenshot | Description |
|-----------|-------------|
| `6.5_01_home.png` | Home feed — featured restaurants, happy hours, events, AI chat FAB |
| `6.5_02_search.png` | Map search with clustered pins and category filters |
| `6.5_03_rosie_ai.png` | Rosie AI concierge conversation |
| `6.5_04_happy_hours.png` | Happy hour deals with item-level pricing |
| `6.5_05_detail.png` | Restaurant detail with tabbed info (Menu, Happy Hours, Specials, Events) |
| `6.5_06_voting.png` | Community voting leaderboard with tier badges |

*Screenshots located at: `apps/mobile/assets/app-store-screenshots/`*

---

## Slide 6: How It Works

### Three-Sided Platform

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   CONSUMERS      │     │  RESTAURANT     │     │   SALES REPS    │
│   (Free App)     │     │  OWNERS         │     │   (Commission)  │
│                  │     │  (SaaS Dashboard)│     │                 │
│ • Discover       │     │ • Manage menus   │     │ • CRM + leads   │
│ • Vote           │     │ • Post events    │     │ • AI email gen  │
│ • Earn rewards   │     │ • Track analytics│     │ • 15-20% comm.  │
│ • Chat with AI   │     │ • Happy hours    │     │ • Cart checkout │
│ • Check in       │     │ • Team members   │     │ • Pipeline mgmt │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

### Data Pipeline

1. **Ingest** — Bulk import via OutScraper CSV (Google Maps data) with 4-layer filtering (non-food, geo bounds, chain exclusion, dedup)
2. **Enrich** — Google Places API for hours, meal types, cuisine classification; AI categorization via Claude
3. **Activate** — Restaurant owners claim via sales-assisted onboarding, then self-manage through the dashboard
4. **Engage** — Push notifications, geofence triggers, AI blog content, email marketing via Resend

---

## Slide 7: Business Model

### Five Revenue Streams

| Stream | Description | Status |
|--------|-------------|--------|
| **1. Restaurant SaaS** | 3 tiers (Basic free, Premium, Elite) × 3 billing durations. Recurring subscriptions via Stripe. | Live — Stripe billing active |
| **2. Consumer Premium** | App subscription with 2.5x rewards multiplier, ad-free experience, premium voting. Early access: $1.99/mo. Standard: $4.99/mo. | Live (currently free for all during launch; RevenueCat integrated but returns `true` for all users) |
| **3. Self-Promoter Plans** | $50/month for DJs, musicians, performers to promote events on the platform. | Live — Stripe billing active |
| **4. Sponsored Ads** | Featured ad placements in the app feed with impression/click tracking and CTR analytics. Admin-managed inventory. | Live — `featured_ads` table with `ad_events` tracking |
| **5. Volume Discounts** | Multi-location restaurant groups get 10% (2 locations), 15% (3), or 20% (4+) discount. | Live — implemented in checkout |

---

## Slide 8: Pricing

### Restaurant Plans (B2B SaaS)

| Tier | 3-Month | 6-Month | Annual | Key Features |
|------|---------|---------|--------|--------------|
| **Basic** | Free | Free | Free | Hours, location, cover photo |
| **Premium** | $250 | $450 | $800 | + Menu, analytics, specials, happy hours, events, entertainment, push notifications (4/mo), logo/details |
| **Elite** | $350 | $600 | $1,100 | + Logo on map, daily special list, social media content, event spotlights, live entertainment spotlight, advanced analytics, weekly updates |

### Consumer Plans (B2C)

| Plan | Monthly | Annual |
|------|---------|--------|
| **Early Access** | $1.99 | $19.99 |
| **Standard** | $4.99 | $29.00 |

### Other Plans

| Plan | Price | For |
|------|-------|-----|
| **Self-Promoter** | $50/month | DJs, musicians, performers |

### Volume Discounts (Multi-Location)

| Locations | Discount |
|-----------|----------|
| 2 | 10% |
| 3 | 15% |
| 4+ | 20% |

### Sales Commission Structure

| Monthly Signups | Commission Rate | Renewal Rate |
|-----------------|-----------------|--------------|
| 1–6 | 15% | 7.5% (50% of initial) |
| 7+ | 20% | 10% (50% of initial) |

---

## Slide 9: Defensibility & Moat

### 1. Local Network Effects
Community voting (8 categories, monthly leaderboards) creates engagement loops that compound over time. Restaurants care about their ranking → they promote the app → more consumers vote → richer data.

### 2. Proprietary First-Party Data
Custom analytics stack built on Supabase (not Google Analytics or Mixpanel):
- Page views, click tracking, impression tracking, check-ins, area visits
- Restaurant-level conversion funnels (impressions → views → clicks → check-ins)
- Tier-gated content analytics (locked content views, upgrade button clicks)

### 3. AI Knowledge Layer
Rosie is not a generic chatbot. She's trained on market-specific local knowledge — neighborhood guides, food scene descriptions, local culture — that can't be replicated by general-purpose AI assistants.

### 4. Geofence Infrastructure
Radar SDK geofences for restaurants and neighborhoods power automatic check-in prompts and area-entry notifications — creating a physical-world engagement loop.

### 5. Operational Moat
Full sales CRM with AI-generated outreach emails, commission-based field sales team, and multi-step lead nurturing pipeline. This is operationally expensive for competitors to replicate.

---

## Slide 10: Go-to-Market

### Current (Verified in Codebase)

| Channel | Implementation |
|---------|---------------|
| **Direct Sales** | Field sales team with built-in CRM, AI email generator, cart checkout, commission tracking (15–20%) |
| **App Store** | TasteLanc iOS live on App Store (ASC App ID: 6755852717) |
| **Onboarding Funnel** | 15+ screen preference collection (user type, dining habits, event preferences, budget, food preferences, entertainment preferences) feeds AI personalization |
| **Push Notifications** | Expo Push API, geofence-triggered area notifications, restaurant check-in prompts |
| **Content Marketing** | AI-generated blog (Rosie's Blog), email campaigns via Resend, SEO sitemaps for restaurants/events/happy hours/blog |
| **Public Web** | Full restaurant directory, happy hour listings, event calendar, voting leaderboards at tastelanc.com |
| **Referral System** | 20 reward points per referral (highest point value of any action) |

### Strategy (Proposal — Not Yet in Code)

- Influencer partnerships with local food bloggers
- Restaurant-as-distribution: co-branded table cards and QR codes
- University campus ambassador program (college presence is a key expansion scoring factor)

---

## Slide 11: Expansion

### Multi-Market Architecture Is Live

The platform is not Lancaster-only. Multi-market support is fully architected and operational:

- **`markets` table** with `lancaster-pa` and `cumberland-pa` seeded
- All data queries scoped by `market_id` (restaurants, events, ads, blog posts, itineraries, areas)
- Single web codebase deployed per-market via Netlify environment variable (`NEXT_PUBLIC_MARKET_SLUG`)
- Separate mobile apps per market with shared Supabase backend

### AI Expansion Agent (Autonomous Pipeline)

An AI agent runs **every 2 hours** to identify and research new markets:

1. **Suggest** — Proposes candidate cities if pipeline has <20 active entries
2. **Research** — Pulls data from US Census, BEA (economic), OpenStreetMap (venue counts), College Scorecard (enrollment)
3. **Score** — Weighted model: dining scene (25%), population density (20%), competition (15%), college presence (15%), income level (15%), tourism/economic (10%)
4. **Brand** — Generates 3 brand proposals per city (app name, colors, AI mascot name, tagline) via OpenAI + DALL-E
5. **Jobs** — Creates draft job listings (sales rep, market manager, content creator, community manager)
6. **Review** — Emails founders for vote; both must agree before any city progresses

**Pipeline status flow:** researching → researched → brand_ready → approved → setup_in_progress → live

### Expansion Playbook (From Code Comments)

> "To add a new city: 1. Add entry to MARKET_CONFIG. 2. Seed market row in Supabase. 3. Create Netlify site with NEXT_PUBLIC_MARKET_SLUG=<slug>"

### Live Markets

| Market | Platform | Status |
|--------|----------|--------|
| Lancaster, PA | iOS App Store + Web | **Live** |
| Cumberland County, PA | iOS TestFlight + Web | **Beta** |

---

## Slide 12: Traction

### What's Live Today

| Metric | Status |
|--------|--------|
| **Markets** | 2 (Lancaster PA live, Cumberland County PA beta) |
| **iOS App** | Published on App Store (TasteLanc, ASC ID: 6755852717) |
| **Web Platform** | tastelanc.com (Lancaster), cumberland.tastelanc.com (Cumberland) |
| **Restaurant Dashboard** | Full owner portal with analytics, menus, events, happy hours, specials, team management |
| **Revenue Infrastructure** | Stripe billing live with 3 restaurant tiers, consumer subscriptions, self-promoter plans, multi-restaurant cart checkout |
| **Ad Platform** | `featured_ads` with impression/click tracking, CTR analytics, admin management |
| **Sales CRM** | Lead management, AI email generation, commission tracking, pipeline management |
| **AI Systems** | Rosie chat (live), expansion agent (running every 2h), blog generation, email generation, itinerary generation |
| **Analytics** | Custom Supabase analytics: page views, impressions, clicks, check-ins, area visits, conversion funnels |

### Metrics (TBD — Not in Codebase)

> Active user counts, MRR, restaurant signups, and retention metrics are tracked in the live Stripe dashboard and Supabase admin panel but are not hardcoded in the codebase. **Available upon request.**

---

## Slide 13: Roadmap

### From Codebase (Implementation Plan + TODO Comments)

| Priority | Feature | Status | Source |
|----------|---------|--------|--------|
| **Next** | Home screen personalization | `RecommendedSection` component built, not yet rendered on HomeScreen | `IMPLEMENTATION_PLAN.md` Phase 3 |
| **Next** | Impression-feedback loop | Auto-correct visibility imbalances across restaurant tiers | `IMPLEMENTATION_PLAN.md` Phase 4 |
| **Planned** | View All sort/filter chips | Enhanced browse experience | `IMPLEMENTATION_PLAN.md` Phase 5 |
| **Planned** | Daily trivia | Reward action type exists (`trivia: 1 pt`), marked DEFERRED | `rewards/points.ts` |
| **Planned** | Crash reporting (Sentry) | Stub exists, needs native build integration | `ErrorBoundary.tsx`, `crashLog.ts` |
| **Planned** | Android Play Store listing | App buildable, listing not yet created | `brand.ts:25` |
| **Planned** | Self-serve restaurant claiming | Currently sales-driven only | Not yet in code |

### Expansion Pipeline (Autonomous)

The AI expansion agent is actively researching new PA markets and beyond. Cities progress through a human-gated pipeline from research → brand generation → job listing → founder approval → launch.

---

## Slide 14: The Ask

### Partner With Us

TasteLanc has proven the hyper-local playbook in Lancaster, PA — a mid-sized city with a vibrant food scene, active nightlife, and strong community identity.

**The playbook is repeatable.** Multi-market architecture is live. The AI expansion agent is already identifying and researching the next markets. Brand generation, job listing creation, and market scoring are automated.

**What we're looking for:**

- Strategic partners who can accelerate market expansion
- Investment to scale the sales team and enter new markets
- Restaurant group partnerships for anchor tenant acquisition in new cities

**Contact:**
- Web: tastelanc.com
- Email: support@tastelanc.com

---

*This deck was generated entirely from the TasteLanc codebase. Every factual claim is backed by a specific file path and line range. See `/pitchdeck/README.md` for the complete source map.*
