# TasteLanc App - Task List

## Instructions for Claude Code

**Your job is to execute one task at a time from the list below.**

### Rules
- Do not redesign architecture
- Do not modify unrelated files
- Do not overwrite existing logic unless the task explicitly requires it
- Maintain all existing code
- Do not touch Supabase config
- Do not touch navigation structure unless instructed
- Always match existing folder/file naming
- Follow TasteLanc's color palette and spacing patterns

### For Each Task
1. State what files you will modify
2. Show the diff or entire file rewrites as needed
3. Explain the reasoning behind key decisions
4. Ensure compatibility with Expo, Supabase, and TypeScript
5. Maintain TasteLanc style system (rounded corners, modern, clean)
6. Keep all navigation intact

### After Completion
Ask: "Next task?"

---

## Open Task List

| # | Task | Status | Notes |
|---|------|--------|-------|
| 1 | Finish Detail Screen Tabs (Menu / Happy Hour / Specials / Events) | DONE | TabBar component created, RestaurantDetailScreen updated |
| 2 | Implement Universal Menu Viewer (pulls from menu_link, uses WebView or parsed HTML) | DONE | MenuViewer component with WebView, PDF handling, error states |
| 3 | Add Happy Hour Module (Supabase table + UI in tab) | DONE | Already fetching from happy_hours table |
| 4 | Add Specials Module | DONE | Already fetching from specials table |
| 5 | Add Events Module | DONE | Already fetching from events table |
| 6 | Create Map Preview Card (static Apple/Google map preview) | DONE | MapPreview component with OpenStreetMap tiles, View Map & Get Directions buttons |
| 7 | Add Favorite Toggle + AsyncStorage persistence | DONE | Favorites utility in src/lib/favorites.ts, integrated into HomeScreen & RestaurantDetailScreen |
| 8 | Add Rewards Check-in (PIN-based verification) | DONE | CheckInModal with 4-digit PIN, src/lib/checkins.ts for storage, floating Check In button |
| 9 | Add Rosie AI Button + Bottom Sheet Chat UI | DONE | RosieChat component with @gorhom/bottom-sheet, "Ask Rosie" FAB on HomeScreen |
| 10 | Add Premium Badges + Spotlight Logic | DONE | PremiumBadge component, 3 tiers (basic/premium/elite), SpotlightCarousel fetches premium restaurants |
| 11 | Add Additional Photos Carousel | DONE | PhotosCarousel component with thumbnails, fullscreen lightbox modal, navigation arrows, pagination dots |
| 12 | Implement Smart Search Filters (category chips + typeahead) | DONE | SearchBar component with animated focus, SearchScreen with 300ms debounced typeahead, category chips, recent searches, premium prioritization |
| 13 | Add Category Screens (Bars, Nightlife, Brunch, etc.) | DONE | CategoryScreen component with icons, descriptions, Supabase filtering; navigation from HomeScreen category chips |
| 14 | Build Profile Screen Settings (logout, preferences) | DONE | Full settings UI with toggles (notifications, location, dark mode), support links, clear data, restart onboarding |
| 15 | Implement onboarding screens (9 screen flow) | DONE | Completed in previous session |
| 16 | Add 3-Day Free Trial Paywall | DONE | Subscription utility (src/lib/subscription.ts), SubscriptionContext for app-wide access, OnboardingPaywallScreen with trial tracking, features list, plan selection |
| 17 | Add "Recommended for You" personalization module | DONE | Recommendations utility (src/lib/recommendations.ts), RecommendedSection component, preference-based scoring |
| 18 | Add error boundaries + graceful fallback screens | DONE | ErrorBoundary component (3 levels: screen/section/component), FallbackScreens with Network/Empty/Offline/NoResults variants, App.tsx wrapped |
| 19 | Optimize performance with React Query or SWR | DONE | TanStack Query v5, QueryClient with 5min stale/30min cache, custom hooks (useRestaurants, useFavorites, useRestaurantDetail), optimistic updates for favorites |
| 20 | Prepare for production bundle + app store builds | DONE | app.json production config, eas.json for EAS Build (dev/preview/prod), env.ts config system, ASSET_REQUIREMENTS.md guide |

---

## Completed Work Summary

### Session 1 (Previous)
- CSV database seeding (573 restaurants)
- Expo React Native app skeleton
- Supabase client setup
- 9-screen onboarding flow
- Dev-only "Restart Onboarding" button

### Session 2 (Current)
- Brand color redesign: Red (#A41E22) backgrounds, Green (#2E7D32) accent
- Created `src/constants/colors.ts` design tokens
- Updated all onboarding screens with new colors
- Updated navigation components
- Created TabBar component (`src/components/TabBar.tsx`)
- Updated RestaurantDetailScreen with 4-tab interface

---

## Technical Reference

### Color Palette
```typescript
// src/constants/colors.ts
export const colors = {
  primary: '#A41E22',      // Red - backgrounds, active states
  accent: '#2E7D32',       // Green - buttons/CTAs
  text: '#FFFFFF',         // White text on dark backgrounds
  textMuted: 'rgba(255,255,255,0.8)',
  cardBg: 'rgba(255,255,255,0.15)',
  error: '#D32F2F',
};
```

### Key Files
- **Navigation**: `src/navigation/` (RootNavigator, DrawerNavigator, BottomTabNavigator)
- **Components**: `src/components/` (exported via index.ts)
- **Screens**: `src/screens/`
- **Types**: `src/types/database.ts`
- **Supabase**: `src/lib/supabase.ts`

### Database Tables (Supabase)
- `restaurants` - Main restaurant data
- `restaurant_hours` - Operating hours
- `happy_hours` - Happy hour deals
- `happy_hour_items` - Individual happy hour items
- `specials` - Restaurant specials
- `events` - Events and entertainment

---

## Next Priority Tasks

**ALL TASKS COMPLETE!**

To build and submit:
```bash
# Development build (simulator/internal)
eas build --profile development

# Preview build (internal testing)
eas build --profile preview

# Production build (App Store/Play Store)
eas build --profile production

# Submit to stores
eas submit --platform ios
eas submit --platform android
```
