# TasteLanc Pitch Deck — Source Documentation

This pitch deck was generated programmatically from the TasteLanc codebase. Every factual claim is backed by a specific file path and line range in the repository. No external sources, ChatGPT documents, or invented data were used.

## How This Deck Was Generated

1. **Codebase exploration** — Three parallel agents scanned the entire repo for pricing, features, geography, monetization, analytics, roadmap, and brand assets.
2. **Source verification** — Every claim was traced to a specific file and line range.
3. **Markdown generation** — `TasteLanc_PitchDeck.md` written slide-by-slide with inline source references.
4. **PPTX generation** — `generate_pptx.py` uses `python-pptx` to build a branded 14-slide PowerPoint using TasteLanc brand colors and real app store screenshots.
5. **README** — This file documents every claim's provenance.

## Regenerating the PPTX

```bash
pip3 install python-pptx Pillow
python3 pitchdeck/generate_pptx.py
```

---

## Source Inventory

| Category | Primary Source Files |
|----------|-------------------|
| **Pricing (Restaurant)** | `apps/web/lib/stripe.ts:66-68` |
| **Pricing (Consumer)** | `apps/web/lib/stripe.ts:35-39, 71-73` |
| **Pricing (Self-Promoter)** | `apps/web/lib/stripe.ts:41-48` |
| **Tier Features** | `apps/web/app/(dashboard)/dashboard/subscription/page.tsx:8-61` |
| **Volume Discounts** | `apps/web/lib/stripe.ts:92-97` |
| **Sales Commissions** | `apps/web/config/commission.ts:27-51` |
| **Brand Identity** | `apps/mobile/src/config/brand.ts:1-46` |
| **Brand Colors** | `apps/mobile/src/constants/colors.ts:1-73` |
| **Navigation/Screens** | `apps/mobile/src/navigation/BottomTabNavigator.tsx`, `RootNavigator.tsx` |
| **AI Chat (Rosie)** | `supabase/functions/rosie-chat/index.ts`, `apps/mobile/src/components/RosieChat.tsx` |
| **Voting System** | `apps/mobile/src/lib/voting.ts:12` |
| **Rewards/Loyalty** | `apps/mobile/src/lib/rewards.ts:10` |
| **Subscription (Consumer)** | `apps/mobile/src/lib/subscription.ts:120-123` |
| **Feature Flags** | `apps/mobile/src/lib/feature-flags.ts` |
| **Markets Table** | `supabase/migrations/20260215000000_multi_market_phase1.sql` |
| **Market Config** | `apps/web/config/market.ts` |
| **Expansion Agent** | `apps/web/app/api/cron/expansion-agent/route.ts` |
| **Expansion Tables** | `supabase/migrations/20260301000000_city_expansion_agent.sql` |
| **Analytics** | `apps/mobile/src/lib/analytics.ts`, `apps/mobile/src/lib/impressions.ts` |
| **Geofencing** | `apps/mobile/src/lib/radar.ts` |
| **Push Notifications** | `apps/mobile/src/lib/notifications.ts` |
| **Onboarding Pain Points** | `apps/mobile/src/screens/onboarding/OnboardingProblemsScreen.tsx:32-36` |
| **Itinerary Builder** | `apps/mobile/src/lib/itineraryGenerator.ts` |
| **Sales CRM** | `apps/web/app/(sales)/sales/` |
| **Ad System** | `supabase/migrations/20260210000000_featured_ads.sql` |
| **Dashboard** | `apps/web/app/(dashboard)/dashboard/` |
| **Roadmap** | `IMPLEMENTATION_PLAN.md:1-80` |
| **App Store Screenshots** | `apps/mobile/assets/app-store-screenshots/6.5_*.png` |

---

## Slide-by-Slide Source Map

### Slide 1: Cover
| Claim | Source |
|-------|--------|
| Tagline: "Eat. Drink. Experience." | `apps/mobile/src/screens/onboarding/OnboardingSlidesScreen.tsx` (animated welcome text) |
| Slogan: "Lancaster's go-to for what's happening now." | `apps/mobile/src/config/brand.ts:17` |
| Background color #1A1A1A | `apps/mobile/src/constants/colors.ts:7` |
| Accent color #A41E22 | `apps/mobile/src/constants/colors.ts:12` |
| Logo image | `apps/web/public/images/tastelanc_new_dark.png` |

### Slide 2: What Is TasteLanc?
| Claim | Source |
|-------|--------|
| "hyper-local discovery platform for restaurants, happy hours, events, and nightlife" | Derived from navigation tabs: Home, Search, Favorites, Rewards, Profile (`apps/mobile/src/navigation/BottomTabNavigator.tsx`) and screen inventory (HappyHoursViewAll, EventsViewAll, etc. in `RootNavigator.tsx`) |
| "powered by AI" | `supabase/functions/rosie-chat/index.ts` (OpenAI gpt-4o-mini), `apps/mobile/src/components/RosieChat.tsx` |
| "community voting" | `apps/mobile/src/lib/voting.ts` (8 categories, 4 votes/month) |
| "iOS, live on App Store" | `apps/mobile/src/config/brand.ts:24` (appStoreUrl with ASC ID 6755852717) |
| "Multi-market architecture live in 2 PA markets" | `supabase/migrations/20260215000000_multi_market_phase1.sql` (markets table seeded with lancaster-pa and cumberland-pa) |

### Slide 3: The Problem
| Claim | Source |
|-------|--------|
| "Happy hours scattered across apps." | `apps/mobile/src/screens/onboarding/OnboardingProblemsScreen.tsx:33` |
| "Events you hear about too late." | `apps/mobile/src/screens/onboarding/OnboardingProblemsScreen.tsx:34` |
| "Deals buried in your feed." | `apps/mobile/src/screens/onboarding/OnboardingProblemsScreen.tsx:35` |
| "No Yelp for what's happening tonight" | Common-sense framing — not sourced from code |

### Slide 4: The Solution
| Claim | Source |
|-------|--------|
| AI Concierge (Rosie) | `apps/mobile/src/components/RosieChat.tsx`, `supabase/functions/rosie-chat/index.ts` |
| Happy Hours with item-level pricing | `apps/web/app/(dashboard)/dashboard/happy-hours/page.tsx` (items with original_price, discounted_price) |
| Events Calendar | `apps/web/app/api/mobile/events/route.ts`, `apps/mobile/src/screens/EventsViewAllScreen.tsx` |
| Community Voting (8 categories, 4 votes/month) | `apps/mobile/src/lib/voting.ts:12` (VOTES_PER_MONTH = 4), `apps/mobile/src/screens/voting/VoteCenterScreen.tsx` |
| Rewards & Loyalty (point values) | `apps/mobile/src/lib/rewards.ts:10` (RewardActionType), point values from `apps/web/app/api/mobile/rewards/earn/route.ts` |
| Premium 2.5x multiplier | `apps/mobile/src/lib/subscription.ts:32` (multiplier: 1.0 or 2.5) |
| Itinerary Builder | `apps/mobile/src/lib/itineraryGenerator.ts`, `apps/mobile/src/screens/ItineraryBuilderScreen.tsx` |
| Geofence Notifications | `apps/mobile/src/lib/radar.ts`, `apps/mobile/src/lib/notifications.ts` |
| Map Search with clusters | `apps/mobile/src/screens/SearchScreen.tsx` (ClusteredMapView, category chips) |
| Weekly Specials | `apps/web/app/(dashboard)/dashboard/specials/page.tsx` |

### Slide 5: Product Screenshots
| Claim | Source |
|-------|--------|
| Screenshots are from live iOS app | `apps/mobile/assets/app-store-screenshots/6.5_01_home.png` through `6.5_06_voting.png` |

### Slide 6: How It Works
| Claim | Source |
|-------|--------|
| Three-sided platform: Consumers, Owners, Sales Reps | Consumers: mobile app (`apps/mobile/`), Owners: dashboard (`apps/web/app/(dashboard)/`), Sales: portal (`apps/web/app/(sales)/`) |
| OutScraper CSV import | `apps/web/scripts/import-cumberland-csv.ts`, `apps/web/scripts/import-restaurants-csv.ts` |
| Google Places enrichment | `apps/mobile/scripts/sync_google_places.js`, `apps/web/app/api/sales/places/search/route.ts` |
| AI categorization | `apps/web/scripts/categorize-restaurants.ts` |
| Push notifications | `apps/mobile/src/lib/notifications.ts` |
| Email marketing via Resend | `apps/web/lib/resend.ts` |
| AI blog generation | `apps/web/app/(public)/blog/` routes |

### Slide 7: Business Model
| Claim | Source |
|-------|--------|
| Restaurant SaaS: 3 tiers × 3 durations | `apps/web/lib/stripe.ts:17-27, 66-68` |
| Consumer Premium: $1.99/mo early access | `apps/web/lib/stripe.ts:35-39` |
| Consumer Standard: $4.99/mo | `apps/web/lib/stripe.ts:71-73` |
| Self-Promoter: $50/mo | `apps/web/lib/stripe.ts:41-48` |
| Sponsored Ads with tracking | `supabase/migrations/20260210000000_featured_ads.sql` (featured_ads + ad_events tables) |
| Volume Discounts: 10-20% | `apps/web/lib/stripe.ts:92-97` |
| Consumer premium currently free for all | `apps/mobile/src/lib/subscription.ts:120-122` (`return true`) |

### Slide 8: Pricing
| Claim | Source |
|-------|--------|
| Basic: Free | `apps/web/app/(dashboard)/dashboard/subscription/page.tsx:10` |
| Premium: $250/3mo, $450/6mo, $800/yr | `apps/web/lib/stripe.ts:67` |
| Elite: $350/3mo, $600/6mo, $1,100/yr | `apps/web/lib/stripe.ts:68` |
| Consumer Early Access: $1.99/mo, $19.99/yr | `apps/web/lib/stripe.ts:35` (comment) |
| Consumer Standard: $4.99/mo, $29/yr | `apps/web/lib/stripe.ts:71-72` |
| Self-Promoter: $50/mo | `apps/web/lib/stripe.ts:46-47` |
| Volume: 10% (2 loc), 15% (3), 20% (4+) | `apps/web/lib/stripe.ts:92-97` |
| Commission: 15% (1-6 signups), 20% (7+) | `apps/web/config/commission.ts:27-29` |
| Renewals at 50% of initial | `apps/web/config/commission.ts:9` |

**Note:** There is a minor discrepancy between `stripe.ts:68` (Elite 6mo = $600) and `commission.ts:47` (Elite 6mo cost = $650). The Stripe billing source (`stripe.ts`) is used as canonical pricing since that's what customers are actually charged. The commission config may contain a rounding or planning difference. This should be reconciled.

### Slide 9: Defensibility
| Claim | Source |
|-------|--------|
| Voting: 8 categories, monthly leaderboards | `apps/mobile/src/lib/voting.ts`, `apps/mobile/src/screens/voting/VoteCenterScreen.tsx` |
| Custom analytics on Supabase | `apps/mobile/src/lib/analytics.ts`, `apps/mobile/src/lib/impressions.ts`, `apps/mobile/src/lib/tier-analytics.ts` |
| No PostHog/Amplitude/Mixpanel | Verified by searching codebase — no third-party analytics SDK found |
| Rosie trained on local knowledge | `apps/web/config/market-knowledge.ts` |
| Radar SDK geofences | `apps/mobile/src/lib/radar.ts` |
| Sales CRM with AI email gen | `apps/web/app/(sales)/sales/`, `apps/web/app/api/sales/ai/generate-email/route.ts` |
| Commission structure | `apps/web/config/commission.ts:27-30` |

### Slide 10: Go-to-Market
| Claim | Source |
|-------|--------|
| Sales CRM with AI email generation | `apps/web/app/(sales)/sales/`, `apps/web/app/api/sales/ai/generate-email/route.ts` |
| 15-20% commission | `apps/web/config/commission.ts:27-29` |
| iOS App Store live | `apps/mobile/src/config/brand.ts:24` |
| 15+ screen onboarding | `apps/mobile/src/navigation/OnboardingNavigator.tsx` (15+ screen registrations) |
| Push via Expo + geofence | `apps/mobile/src/lib/notifications.ts`, `apps/mobile/src/lib/radar.ts` |
| AI blog | `apps/web/app/(public)/blog/` |
| Email via Resend | `apps/web/lib/resend.ts` |
| SEO sitemaps | `apps/web/app/sitemap-restaurants.xml/`, `sitemap-events.xml/`, etc. |
| Referral: 20 pts | `apps/mobile/src/lib/rewards.ts:10` (referral type) |
| Influencer/table cards/campus ambassador | **PROPOSAL** — not in codebase |

### Slide 11: Expansion
| Claim | Source |
|-------|--------|
| markets table with lancaster-pa and cumberland-pa | `supabase/migrations/20260215000000_multi_market_phase1.sql` |
| All queries scoped by market_id | `supabase/migrations/20260215000100_multi_market_phase1b.sql` (restaurants), `20260215001000_multi_market_phase1c.sql` (events, ads, blog, etc.) |
| Single web codebase per-market via env var | `apps/web/config/market.ts` (top comment: "To add a new city...") |
| AI Expansion Agent runs every 2 hours | `supabase/migrations/20260301400000_expansion_faster_cycle.sql` (cron update from 6h → 2h) |
| Research data: Census, BEA, Overpass, College Scorecard | `apps/web/lib/ai/census-data.ts`, `bea-data.ts`, `overpass-data.ts`, `college-scorecard-data.ts` |
| Scoring model weights | `apps/web/lib/ai/score-calculator.ts` |
| Brand proposals: name, colors, mascot, tagline | `apps/web/lib/ai/expansion-agent.ts` |
| Job listings | `supabase/migrations/20260301000000_city_expansion_agent.sql` (expansion_job_listings table) |
| Founder review required | `apps/web/config/expansion-team.ts`, `supabase/migrations/20260302_expansion_reviews.sql` |
| Pipeline status flow | `supabase/migrations/20260301000000_city_expansion_agent.sql` (expansion_cities.status CHECK constraint) |
| Lancaster: iOS + Web live | `apps/mobile/src/config/brand.ts:24` (App Store URL), `apps/web/config/market.ts` |
| Cumberland: TestFlight + Web beta | `apps/mobile-cumberland/` exists with `app.json` version 1.0.0, no App Store URL |

### Slide 12: Traction
| Claim | Source |
|-------|--------|
| 2 markets | See Slide 11 sources |
| iOS App published | `apps/mobile/src/config/brand.ts:24` |
| tastelanc.com + cumberland.tastelanc.com | `apps/web/config/market.ts` (domain config) |
| Full restaurant dashboard | `apps/web/app/(dashboard)/dashboard/` (13+ pages) |
| Stripe billing with 3 tiers | `apps/web/lib/stripe.ts:17-68` |
| Ad platform with tracking | `supabase/migrations/20260210000000_featured_ads.sql` |
| Sales CRM | `apps/web/app/(sales)/sales/` |
| AI systems (5 listed) | Rosie: `supabase/functions/rosie-chat/`, Expansion: `apps/web/app/api/cron/expansion-agent/`, Blog: `apps/web/app/(public)/blog/`, Email: `apps/web/app/api/sales/ai/generate-email/`, Itinerary: `apps/mobile/src/lib/itineraryGenerator.ts` |
| Custom analytics | `apps/mobile/src/lib/analytics.ts`, `impressions.ts`, `tier-analytics.ts` |
| "Available upon request" for metrics | No user counts or MRR hardcoded in repo; admin dashboard at `apps/web/app/(admin)/admin/page.tsx` shows live Stripe MRR |

### Slide 13: Roadmap
| Claim | Source |
|-------|--------|
| Home Screen Personalization — component built, not rendered | `IMPLEMENTATION_PLAN.md:35-43` (Phase 3, RecommendedSection exists but NOT on HomeScreen) |
| Impression-Feedback Loop | `IMPLEMENTATION_PLAN.md:12` (Phase 4: TODO) |
| View All Sort/Filter Chips | `IMPLEMENTATION_PLAN.md:13` (Phase 5: TODO) |
| Daily Trivia — DEFERRED | `apps/mobile/src/lib/rewards.ts:10` (type exists), `apps/web/app/api/mobile/trivia/daily/route.ts` (API exists) |
| Android Play Store — not yet | `apps/mobile/src/config/brand.ts:25` (`playStoreUrl: ''`) |
| Self-Serve Restaurant Claiming | Not in codebase — currently sales-driven |
| Autonomous City Expansion | `apps/web/app/api/cron/expansion-agent/route.ts` (running every 2h) |

### Slide 14: The Ask
| Claim | Source |
|-------|--------|
| Contact: tastelanc.com | `apps/mobile/src/config/brand.ts:23` |
| Contact: support@tastelanc.com | `apps/mobile/src/config/brand.ts:20` |
| No fundraising numbers | Intentionally generic — no amounts fabricated |

---

## TBD Items

These items are explicitly marked as TBD or Proposal on the slides:

| Slide | Item | What's Needed to Confirm |
|-------|------|-------------------------|
| Slide 7 | Sponsored Ad pricing | No price field exists on `featured_ads` table. Ad pricing is managed outside the codebase (manual admin process). Need to add `price_per_impression` or `flat_rate` field, or document pricing externally. |
| Slide 10 | GTM Strategy (Proposals) | Influencer partnerships, table cards, campus ambassadors are proposals not yet in code. Would need implementation to verify. |
| Slide 12 | User counts, MRR, retention | Tracked in live Stripe dashboard and Supabase admin panel but not hardcoded. Pull from `apps/web/app/(admin)/admin/page.tsx` live data. |
| Slide 13 | Self-serve restaurant claiming | Not yet built. Would require new auth flow + claiming verification. |

## Known Data Discrepancy

**Elite 6-Month Pricing:**
- `apps/web/lib/stripe.ts:68` says `$600`
- `apps/web/config/commission.ts:47` says `$650`

The deck uses $600 (from `stripe.ts`) as the canonical price since that's what Stripe actually charges. The commission config should be updated to match.

## Assets Used in PPTX

| Asset | Source Path |
|-------|------------|
| TasteLanc logo | `apps/web/public/images/tastelanc_new_dark.png` |
| Home screenshot | `apps/mobile/assets/app-store-screenshots/6.5_01_home.png` |
| Search screenshot | `apps/mobile/assets/app-store-screenshots/6.5_02_search.png` |
| Rosie AI screenshot | `apps/mobile/assets/app-store-screenshots/6.5_03_rosie_ai.png` |
| Happy Hours screenshot | `apps/mobile/assets/app-store-screenshots/6.5_04_happy_hours.png` |
| Detail screenshot | `apps/mobile/assets/app-store-screenshots/6.5_05_detail.png` |
| Voting screenshot | `apps/mobile/assets/app-store-screenshots/6.5_06_voting.png` |
