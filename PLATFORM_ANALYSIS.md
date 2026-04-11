# TasteLanc Platform Analysis

*Generated April 11, 2026 — based on full codebase audit*

---

## 1. What We Have Built

### Consumer Mobile Apps (4 Markets Live)

Separate native iOS/Android apps for each city, all sharing a common component library:

- **Restaurant discovery** — interactive map with clustering, category filters, neighborhood boundaries, and a fair-rotation algorithm that balances paid tier visibility with variety
- **Real-time happy hour tracker** — knows the current day and time, shows only active deals, rotates through drink and food specials on a 4-second carousel
- **Events and entertainment calendar** — live music, trivia, karaoke, comedy, DJ nights, seasonal campaigns (Restaurant Week, St. Patrick's Day, Coffee & Chocolate Trail)
- **Digital coupons** — claim, redeem with a rotating PIN code, one-per-user limit, staff-facing verification
- **Check-ins with geofencing** — Radar SDK detects when a user is physically at a restaurant and prompts a check-in; one per restaurant per day, earns points automatically
- **Gamification engine** — points for check-ins, reviews, video recommendations, and favorites; badges earned by milestones (Explorer, Local Regular, Happy Hour Hero); weekly leaderboard with rankings by visits and unique spots
- **AI chat assistant** — each market has a named persona (Rosie for Lancaster, Mollie for Cumberland, Libertie for Fayetteville, Sandie for Ocean City); powered by OpenAI with full access to the restaurant database, active happy hours, today's events, and the user's preferences; strict guardrails prevent hallucination (only recommends restaurants that exist in the database)
- **"Plan Your Day" itinerary builder** — user picks a mood (date night, bar crawl, foodie tour, brunch lover, family day, budget-friendly) and a date; system generates a 3-stop itinerary with geographically clustered picks, walk times between stops, and explanations for each selection (happy hour active, event tonight, highly voted, etc.)
- **Video recommendations** — TikTok-style multi-segment recording (up to 60 seconds), text overlays, caption tagging; earns 15 points (the highest-reward action); videos feed into the Instagram repost pipeline
- **Flyer scanner** — photograph a printed event flyer, AI extracts the details, and it gets published as an event listing
- **Squad polls** — group decision-making: create a poll with restaurant options, share with friends, 48-hour expiry
- **Premium subscription** — managed via RevenueCat; unlocks unlimited AI chat, unlimited itineraries, exclusive coupons, ad-free feed, and a 2.5x points multiplier

### Restaurant Dashboard (Web)

A self-serve portal where restaurant owners manage their presence:

- **Profile and branding** — name, address, logo, cover photo, description, categories, vibe tags, parking info, noise level
- **Operating hours** — day-by-day schedule with closed-day support
- **Menu management** — three-level hierarchy (menu → section → item) with drag-to-reorder; supports PDF, image, and URL import
- **Happy hours, specials, events, entertainment** — full CRUD with image upload, day/time scheduling, recurring event support
- **Digital coupons** — percent off, dollar off, BOGO, free item, or custom; set limits per user and total claims; analytics per coupon
- **Photo gallery** — upload, reorder, set cover photo
- **Marketing tools** — send email campaigns, push notifications (with usage meter per tier), manage contact lists (CSV import/export), audience segmentation
- **Analytics dashboard** — impressions, page views, click-through rates by action (phone, website, directions, menu, share, favorite), weekly trends, conversion funnels (impressions → clicks → detail views)
- **Team management** — Elite tier unlocks multi-user access with manager roles
- **Subscription management** — Basic (free), Premium, Elite; monthly through annual billing; Stripe-powered checkout with proration on upgrades
- **Profile completion checklist** — guided onboarding that tracks what's been set up

### Sales CRM

A full pipeline tool for the sales team, accessible from both web and mobile:

- **Lead management** — status pipeline (New → Contacted → Interested → Converted) with sortable table, filtering by rep/status, search, CSV export
- **Activity logging** — calls, emails, Instagram DMs, meetings, notes, follow-ups with timestamps
- **AI email composer** — generates contextual outreach and follow-up emails
- **Commission tracking** — tiered system (15% for 1-6 signups per 30-day window, 20% for 7+, renewals at half rate); real-time earnings dashboard with pay period display (Sun–Sat, paid following Friday)
- **Stale lead reassignment** — leads idle for 14 days become claimable by other reps
- **Email inbox** — sent, drafts, inbox with conversation threading and attachments
- **Contact form pipeline** — inbound inquiries from the website route to the CRM with one-click conversion to leads
- **Multi-restaurant checkout** — volume discounts (10-20%) for restaurants signing up together

### Admin Panel

Internal operations hub with 30+ pages:

- **Platform dashboard** — MRR, ARR, subscription breakdown (restaurant, consumer, self-promoter), page views, contact form tracking
- **Restaurant management** — approve new listings, verify businesses, manage tiers, admin mode to view any restaurant's dashboard
- **Sales operations** — create reps with market assignment, view all leads across markets, track conversion metrics
- **Billing** — invoices, downgrade management, payment reminders
- **Content** — push notification scheduling, Instagram post management, sponsored ads, holiday campaigns
- **Expansion pipeline** — autonomous AI agent that researches new cities, scores them, generates brand proposals, and creates job listings
- **System health** — service monitoring every 2 hours with alerts on failure
- **User management** — app users, consumers, self-promoters, team members, feature requests

### Automation and AI Systems

Production systems running on schedules:

| System | Schedule | What It Does |
|--------|----------|--------------|
| Today's Pick | Daily 4 PM ET | Curated restaurant push notification per market |
| Happy Hour Alerts | Every 30 min, 2-11 PM ET (Thu-Sat) | Push notifications for upcoming happy hours, paid tier only |
| Evening Digest | Daily 6-7 PM ET | 7-day rotation (Who's Open, Deals, Hidden Gem, Trivia, Weekend Vibes, Live Music, Trending) |
| New Coupon Alerts | Hourly | Detects newly created coupons, notifies relevant market |
| Blog Generation | Daily 9 AM ET | AI writes a blog post from a 31-topic rotation, emails subscribers |
| Google Play Reviews | Daily 7 AM ET | Auto-replies to 4-5 star reviews; flags 1-3 star reviews for founder approval with crypto-signed 72-hour link |
| Analytics Rollup | Daily 2 AM ET | Aggregates page views, clicks, sessions, traffic sources, device types into daily summary tables |
| Instagram Spotlight | Saturdays 8:30 AM ET | Generates 14 days of Instagram spotlight slots for Elite and Premium restaurants |
| Stripe Reconciliation | Daily 8 AM UTC | Matches paid Stripe invoices to restaurants and auto-onboards unlinked accounts |
| Expansion Agent | Every 2 hours | Autonomously researches candidate cities, scores them (70+ auto-advance, 55-69 review, <55 reject), generates branding, creates job postings |
| Notification Pre-Generation | Daily 7 AM ET | Pre-builds 14 days of scheduled notifications for all markets; allows review before send |
| Health Check | Every 2 hours | Verifies all critical services; alerts on failure |

### Additional AI Integrations

- **Voice sales agent** — real-time WebSocket pipeline (browser mic → Deepgram speech-to-text → GPT-4o-mini → OpenAI TTS → browser speakers) with tools for pricing lookup, calendar checking, meeting booking, and human escalation; saves full transcripts and triggers follow-up emails based on conversation outcome
- **Restaurant categorization** — GPT-4o-mini classifies restaurants into 45+ categories from name, description, address, and Google Place types
- **Google review highlights** — Claude Haiku reads Google Places reviews and extracts 2-3 short badge labels ("Great Wings", "Craft Cocktails", "Top Brunch")
- **Email generation** — AI-composed emails for cold outreach, follow-ups, launch countdowns, feature announcements across B2B and consumer audiences

---

## 2. What Makes This Platform Unique

Most restaurant discovery apps are directories. TasteLanc is a **local engagement platform** — it combines discovery, loyalty, social features, and business tools into a single system built for small and mid-size markets.

**Key differentiators:**

- **City-first, not chain-first.** Each market gets its own branded app, AI persona, and local knowledge base. The AI assistant knows the neighborhoods, the food scene history, and what's actually happening tonight — not generic nationwide results.

- **The engagement loop is real.** Check-ins are verified by geofencing (not honor system). Points translate to leaderboard positions and badges. Video recommendations earn the most points and feed the Instagram pipeline. It's a system that turns diners into local advocates.

- **Restaurant owners get marketing tools, not just a listing.** Push notifications, email campaigns, digital coupons with PIN redemption, and analytics dashboards let a restaurant run actual campaigns — not just hope someone searches for them.

- **The sales operation is built into the platform.** Lead pipeline, commission tracking, AI email generation, stale lead reassignment, and voice sales agent are not third-party tools bolted on — they're native to the system.

- **Automation replaces manual operations.** Blog posts write themselves daily. Google Play reviews get responded to automatically. The expansion agent researches new cities, scores them, generates branding, and creates job listings without human intervention. Stripe reconciliation auto-onboards paying restaurants.

---

## 3. Technical Advantages for Scaling to Multiple Cities

### Shared Component Architecture
- **100+ reusable React Native components**, 50+ shared screens, and 60+ custom hooks in a `mobile-shared` package
- All mobile apps import from this single library — new city apps inherit every feature on day one
- The web app is a single Next.js codebase deployed to multiple Netlify sites via an environment variable (`NEXT_PUBLIC_MARKET_SLUG`)

### Data Isolation Without Complexity
- One Supabase database with `market_id` on all content tables (restaurants, events, specials, analytics)
- Application-level query filtering enforces isolation — no need for separate databases per city
- A runtime **market guard** validates every push notification before send, preventing cross-market token leaks
- Push tokens are tagged with `app_slug` so Expo batches never mix projects

### Configuration-Driven Branding
- Each market is defined by config objects (name, colors, domain, AI assistant name, app store URLs, local knowledge)
- Launching a new city means adding config entries and seeding restaurant data — no code changes to core features
- AI assistants get market-specific system prompts with neighborhood knowledge, local food scene context, and event awareness

### Analytics Built for Multi-Market Reporting
- Daily rollup tables aggregate views, sessions, clicks, traffic sources, and device types per market
- Section impression tracking with 30-minute epoch deduplication gives accurate visibility metrics
- Restaurant visibility views compute 7-day rolling CTR per restaurant per market
- Admin dashboard shows MRR/ARR broken down by market

### Notification Infrastructure
- Centralized gateway enforces quiet hours (10 AM - 9 PM ET), 90-minute per-market throttling, and atomic deduplication
- Notifications are pre-generated 14 days ahead, allowing human review before send
- Every notification is logged with market_slug, status, sent count, and block reason for full audit trail

---

## 4. Notable Systems

### Autonomous Expansion Agent
Runs every 2 hours. Maintains a pipeline of candidate cities. Uses Claude to research each city on 8 weighted criteria (population, demographics, dining density, competition, etc.). Cities scoring 70+ auto-advance to brand generation. The agent creates brand proposals (name, colors, AI persona) and job listings. Admins only intervene for borderline cases (scores 55-69).

### Real-Time Voice Sales Agent
A WebSocket-based pipeline that handles inbound sales calls. Deepgram converts speech to text in real time, GPT-4o-mini generates responses with access to pricing, calendar, and restaurant data tools, and OpenAI TTS speaks the response back. Full transcripts are saved, and follow-up emails are triggered automatically based on conversation outcome (meeting booked, follow-up needed, not interested).

### Geofenced Check-In System
Radar SDK runs in the background on users' phones. When a user dwells at a restaurant location, the app prompts a check-in with a 4-digit PIN. No manual location sharing required. First-visit area detection triggers neighborhood welcome notifications. Dwell time data feeds engagement scoring.

### Instagram Content Pipeline
Restaurants are automatically slotted for Instagram spotlight features (Elite on Saturdays, Premium on Sundays). The system uses Claude to generate image descriptions and captions. A retry mechanism handles Instagram API failures. Post memory tracking prevents the same restaurant from being featured too frequently. User-created video recommendations are moderated and eligible for reposting.

### Smart Itinerary Generation
Not a simple random pick. The algorithm clusters stops geographically (stops 2 and 3 prefer locations near stop 1), verifies restaurants are open during the proposed time slot, detects active happy hours, factors in community vote scores, and matches restaurant categories to time-of-day fitness (brunch spots for morning, bars for evening).

---

## 5. How the Architecture Supports Expansion

**Current state:** 4 markets live (Lancaster PA, Cumberland PA, Fayetteville NC, Ocean City MD) with infrastructure proven across all of them.

**What's shared across every market (zero duplication):**
- Backend database schema and API routes
- All React Native components, screens, and hooks
- Authentication and subscription billing
- Analytics infrastructure and admin tools
- Notification gateway with market isolation
- AI chat system (just needs local knowledge config)

**What's city-specific (configuration only):**
- Market config entry (name, slug, colors, domain, AI persona name)
- Local knowledge prompt (neighborhoods, food scene, community context)
- App binary (separate Expo project for App Store listing)
- Restaurant seed data

**Scaling assessment:** The architecture is production-ready for 10-20 cities with the current manual launch process. For 50+ cities, the main investment would be scripting the launch sequence (creating Expo projects, seeding data, deploying Netlify sites). The core platform, data model, and feature set require no changes.

---

---

# A. LinkedIn Company Page Summary

**About TasteLanc**

TasteLanc builds city-specific restaurant discovery apps that help people find the best food, drinks, and events in their area — and help restaurants reach the right customers.

Each city we launch gets its own branded app with an AI-powered assistant that actually knows the local dining scene. Users discover restaurants, track live happy hours, earn rewards for checking in, and plan their nights out with smart itinerary suggestions. Restaurant owners get a dashboard with real marketing tools — push notifications, email campaigns, digital coupons, and analytics that show what's working.

We're not a nationwide directory. We go deep in every market we enter: seeding local restaurant data, building relationships with owners, and creating a community of engaged diners who earn points, compete on leaderboards, and share video recommendations.

Our platform currently operates in four markets across Pennsylvania, North Carolina, and Maryland, with infrastructure designed to launch new cities quickly. The same technology powers every market, while each city gets its own identity, AI personality, and local expertise.

Behind the scenes, we've built automated systems that handle daily content generation, review responses, notification scheduling, analytics, and even researching which cities to expand to next — so our team can focus on building relationships, not running manual processes.

---

# B. CTO / Founder Technical Profile

**What I Built**

A multi-market restaurant engagement platform running in 4 cities, consisting of:

- **4 native mobile apps** (React Native/Expo) sharing a common library of 100+ components, 50+ screens, and 60+ hooks — new cities inherit the full feature set on day one
- **A Next.js web platform** serving restaurant dashboards, a sales CRM with commission tracking, and a 30+ page admin panel — deployed to multiple markets from a single codebase via environment-driven configuration
- **A Supabase backend** with 170+ migrations, 50+ tables, row-level security, and market-scoped data isolation across a single database instance
- **An AI layer** including a market-aware chat assistant (OpenAI), a real-time voice sales agent (Deepgram STT + GPT-4o + TTS over WebSocket), automated blog generation, Google Play review auto-responses, restaurant categorization, and an autonomous city expansion agent that researches, scores, and brands new markets
- **A notification gateway** with quiet-hour enforcement, per-market throttling, atomic deduplication, pre-generation with 14-day lookahead, and a runtime market guard that prevents cross-market push token leaks
- **12+ scheduled automation jobs** handling daily analytics rollups, happy hour alerts, coupon notifications, Stripe reconciliation, Instagram spotlight scheduling, health monitoring, and expansion pipeline orchestration

The platform handles the full lifecycle: consumer discovery and engagement, restaurant self-serve marketing, sales team pipeline management, and platform operations — with AI and automation embedded at every layer rather than bolted on as afterthoughts.

**Stack:** React Native (Expo), Next.js, TypeScript, Supabase (PostgreSQL), Stripe, Resend, Radar, RevenueCat, OpenAI, Claude, Deepgram, Netlify, EAS

---

# C. Three Technical Edge Bullet Points

1. **One codebase, many cities.** A shared mobile component library and a single Next.js backend let us launch a fully branded city app — complete with its own AI assistant, local knowledge, and App Store listing — by adding configuration, not writing new code. Four markets are live today on this architecture.

2. **AI is operational, not decorative.** An autonomous expansion agent researches new cities every 2 hours. A voice agent handles inbound sales calls end-to-end. Blog posts, Google Play review responses, and Instagram content generate themselves on schedule. These aren't demos — they run in production daily and reduce manual work to near zero for content and outreach.

3. **The engagement loop is infrastructure, not a feature.** Geofenced check-ins (Radar SDK), a points-and-badges system, weekly leaderboards, video recommendations that feed an Instagram pipeline, and AI-generated itineraries work together as a retention engine — turning passive restaurant searches into active community participation that compounds over time.
