# Fair Visibility System — Implementation Plan

This file persists the implementation plan so agents can reference it after context loss / RAM issues.

## Overall Phases

| Phase | Name | Status |
|-------|------|--------|
| 1 | Paid-Only Gating + Fair Rotation Core | DONE |
| 2 | Impression Tracking + Dashboard Display | DONE |
| 3 | Home Screen Personalization | DONE |
| 4 | Impression-Feedback Loop (auto-correcting visibility) | TODO |
| 5 | View All Screen Enhancements (sort/filter chips) | TODO |

---

## Phase 1 — DONE

- `paidFairRotate()` in `apps/mobile/src/lib/fairRotation.ts` — epoch-based seeded shuffle
- Elite guaranteed first block, Premium shuffled after, Basic excluded from premium sections
- `basicFairRotate()` for "Other Places Nearby"
- `tieredFairRotate()` for View All / Search / Category screens
- Applied to: HappyHourSection, EntertainmentSection, EventsSection, FeaturedSection, HomeScreen

## Phase 2 — DONE

- `section_impressions` table in Supabase (dedup unique index)
- `section_impression_summary` + `restaurant_visibility_7d` views
- `apps/mobile/src/lib/impressions.ts` — fire-and-forget batched tracker
- Hooked into 10 screens/sections
- Restaurant owner dashboard: impressions chart, section breakdown, conversion funnel
- Admin dashboard: tier averages, outlier detection, sales tool table
- **Migration**: `supabase/migrations/20260207000000_section_impressions.sql`

## Phase 3 — PLANNED: Home Screen Personalization

### Problem
The paid sections use `paidFairRotate()` which shuffles randomly within tiers. A user who loves Italian food sees Italian restaurants with the same frequency as BBQ restaurants. The existing `RecommendedSection` component and `scoreRestaurant()` function exist but aren't used on the home screen.

### Key Codebase Context

**What exists but is UNUSED:**
- `RecommendedSection` component (`apps/mobile/src/components/RecommendedSection.tsx`) — complete UI with personalized greeting, reason badges, horizontal scroll cards. NOT rendered on HomeScreen.
- `scoreRestaurant()` in `recommendations.ts` — scores by category match, food pref, visits, favorites, distance
- `getPersonalizedGreeting()` — time-of-day awareness
- `getRecommendationReason()` — "Perfect for brunch lovers", "Great bar scene", etc.

**Restaurant fields available for matching:**
- `categories: RestaurantCategory[]` — maps to entertainment preferences
- `cuisine: CuisineType | null` — maps to food preferences via `FOOD_PREFERENCE_TO_CUISINE`
- `price_range: string | null` — maps to budget preference
- `vibe_tags: string[] | null` — "date night", "casual", etc.
- `best_for: string[] | null` — "brunch", "late night", etc.

**Onboarding data (`OnboardingData` in `types/onboarding.ts`):**
- `entertainmentPreferences: string[]` — "Date night", "Casual hangout", "Weekend brunch", etc.
- `foodPreferences: string[]` — "Modern American", "Italian", "Asian", etc.
- `budget: string | null` — "$", "$$", "$$$"
- `eventPreferences: string[]` — "Live Music", "Trivia", "Comedy", etc.

### Design Principle
**Personalization must NOT break fairness.** Over time, all paid restaurants in the same tier MUST get roughly equal visibility. Personalization adds a relevance layer on top — not a replacement.

### Implementation Steps

#### Step 1: Add RecommendedSection to HomeScreen
- Insert `<RecommendedSection>` between PlanYourDayCard and FeaturedSection
- This shows personalized picks from ALL active restaurants (not just paid)
- Already built — just needs to be rendered
- Add impression tracking to RecommendedSection

#### Step 2: Enhance scoreRestaurant() with cuisine + budget + vibe matching
In `apps/mobile/src/lib/recommendations.ts`:
- Add `cuisine` field matching using `FOOD_PREFERENCE_TO_CUISINE` map (+25 points)
- Add `price_range` vs `budget` matching (+10 points)
- Add `vibe_tags` vs `entertainmentPreferences` matching (+15 per match)
- Add `best_for` vs `entertainmentPreferences` matching (+15 per match)
- Remove the `Math.random()` factor (breaks determinism, contradicts fair rotation ethos)

#### Step 3: Add personalized greeting to HomeScreen header
- Call `getPersonalizedGreeting()` and display above the first section
- Time-aware: "Good evening! Time for cocktails?" etc.

#### Step 4: Add recommendation reason badges to FeaturedSection cards
- When rendering each featured restaurant card, call `getRecommendationReason()`
- Display as a small badge overlay (like RecommendedSection already does)
- Helps users understand why they're seeing a restaurant without changing the order

#### Step 5: Personalize "Other Places Nearby" ordering
- `getOtherRestaurants()` currently uses `basicFairRotate()` (pure shuffle)
- Change to: score basic restaurants using `scoreRestaurant()`, then sort by score
- This is safe because basic restaurants are FREE — no paid fairness obligation
- Higher-scored (preference-matched) basic restaurants appear first

#### Step 6: Track impressions on RecommendedSection
- Add `onViewableItemsChanged` to the horizontal ScrollView in RecommendedSection
- Section name: `'recommended'`
- Add `'recommended'` to the `SectionName` type in `impressions.ts`

### Files to Modify
1. `apps/mobile/src/screens/HomeScreen.tsx` — add RecommendedSection + greeting
2. `apps/mobile/src/lib/recommendations.ts` — enhance scoring
3. `apps/mobile/src/components/RecommendedSection.tsx` — add impression tracking
4. `apps/mobile/src/components/FeaturedSection.tsx` — add reason badges
5. `apps/mobile/src/lib/impressions.ts` — add 'recommended' section name

### What This Does NOT Change
- `paidFairRotate()` — untouched, paid fairness preserved
- Section ordering on home screen — premium sections still show paid-only, fairly rotated
- Tier hierarchy — Elite first, Premium second, Basic excluded from premium sections

---

## Phase 4 — TODO: Impression-Feedback Loop

Use impression data to auto-correct visibility imbalances. If a restaurant gets significantly fewer impressions than its tier peers, boost it in the next rotation cycle.

## Phase 5 — TODO: View All Screen Enhancements

Add sort/filter chips to View All screens (distance, price, cuisine, rating).
