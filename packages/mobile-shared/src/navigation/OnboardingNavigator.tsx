import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { OnboardingStackParamList } from './types';
import {
  // Opening
  OnboardingProblemsScreen,
  // Feature Discovery
  OnboardingHappyHoursScreen,
  OnboardingEventsScreen,
  OnboardingSpecialsScreen,
  OnboardingMoveScreen,
  OnboardingVideoRecsScreen,
  OnboardingRewardsScreen,
  // Personal Questions (kept registered for backward compat, but skipped in flow)
  OnboardingUserTypeScreen,
  OnboardingNameScreen,
  OnboardingDiningHabitsScreen,
  OnboardingEventSeekingScreen,
  // Preferences (kept registered for backward compat, but skipped in flow)
  OnboardingBudgetScreen,
  OnboardingEntertainmentScreen,
  OnboardingFoodScreen,
  // Summary & Conversion
  OnboardingPremiumScreen,
  OnboardingRosieAskScreen,
  OnboardingReviewAskScreen,
  OnboardingPaywallScreen,
  OnboardingLifetimeOfferScreen,
  OnboardingPremiumIntroScreen,
  // Legacy (keeping for backward compatibility)
  OnboardingFrequencyScreen,
  OnboardingDiscoveryScreen,
  OnboardingPreferencesScreen,
} from '../screens/onboarding';
import RootNavigator from './RootNavigator';
import { hasFeature } from '../config/theme';

const Stack = createNativeStackNavigator<OnboardingStackParamList>();

export default function OnboardingNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        gestureEnabled: true,
      }}
    >
      {/* 1. THIS is how you go out */}
      <Stack.Screen name="OnboardingProblems" component={OnboardingProblemsScreen} />
      {/* 2-7. Feature Discovery */}
      {hasFeature('happyHours') && (
        <Stack.Screen name="OnboardingHappyHours" component={OnboardingHappyHoursScreen} />
      )}
      <Stack.Screen name="OnboardingEvents" component={OnboardingEventsScreen} />
      <Stack.Screen name="OnboardingSpecials" component={OnboardingSpecialsScreen} />
      <Stack.Screen name="OnboardingMove" component={OnboardingMoveScreen} />
      <Stack.Screen name="OnboardingVideoRecs" component={OnboardingVideoRecsScreen} />
      <Stack.Screen name="OnboardingRewards" component={OnboardingRewardsScreen} />

      {/* 10. Meet Rosie */}
      <Stack.Screen name="OnboardingPremium" component={OnboardingPremiumScreen} />
      <Stack.Screen name="OnboardingRosieAsk" component={OnboardingRosieAskScreen} />
      {/* 11. Sentiment check */}
      <Stack.Screen name="OnboardingReviewAsk" component={OnboardingReviewAskScreen} />
      {/* 12-13. Paywall */}
      <Stack.Screen name="OnboardingPaywall" component={OnboardingPaywallScreen} />
      <Stack.Screen name="OnboardingLifetimeOffer" component={OnboardingLifetimeOfferScreen} />
      {/* 14. Completion */}
      <Stack.Screen name="OnboardingPremiumIntro" component={OnboardingPremiumIntroScreen} />

      {/* Personal Questions — registered but skipped in main flow.
          Still accessible from Settings > Dining Preferences for later collection. */}
      <Stack.Screen name="OnboardingUserType" component={OnboardingUserTypeScreen} />
      <Stack.Screen name="OnboardingName" component={OnboardingNameScreen} />
      <Stack.Screen name="OnboardingDiningHabits" component={OnboardingDiningHabitsScreen} />
      <Stack.Screen name="OnboardingEventSeeking" component={OnboardingEventSeekingScreen} />
      <Stack.Screen name="OnboardingBudget" component={OnboardingBudgetScreen} />
      <Stack.Screen name="OnboardingEntertainment" component={OnboardingEntertainmentScreen} />
      <Stack.Screen name="OnboardingFood" component={OnboardingFoodScreen} />

      {/* Legacy screens (backward compatibility) */}
      <Stack.Screen name="OnboardingFrequency" component={OnboardingFrequencyScreen} />
      <Stack.Screen name="OnboardingDiscovery" component={OnboardingDiscoveryScreen} />
      <Stack.Screen name="OnboardingPreferences" component={OnboardingPreferencesScreen} />

      {/* Main App Entry */}
      <Stack.Screen name="Main" component={RootNavigator} />
    </Stack.Navigator>
  );
}
