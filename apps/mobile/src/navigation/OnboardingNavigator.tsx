import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { OnboardingStackParamList } from './types';
import {
  // Welcome
  OnboardingSlidesScreen,
  // Feature Discovery
  OnboardingHappyHoursScreen,
  OnboardingEventsScreen,
  OnboardingSpecialsScreen,
  // Personal Questions
  OnboardingUserTypeScreen,
  OnboardingNameScreen,
  OnboardingDiningHabitsScreen,
  OnboardingEventSeekingScreen,
  // Preferences
  OnboardingBudgetScreen,
  OnboardingEntertainmentScreen,
  OnboardingFoodScreen,
  // Summary & Conversion
  OnboardingPremiumScreen,
  OnboardingRosieAskScreen,
  OnboardingVotingScreen,
  OnboardingVotingBadgesScreen,
  OnboardingReviewAskScreen,
  OnboardingPremiumIntroScreen,
  // Legacy (keeping for backward compatibility)
  OnboardingFrequencyScreen,
  OnboardingDiscoveryScreen,
  OnboardingPreferencesScreen,
} from '../screens/onboarding';
import RootNavigator from './RootNavigator';

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
      {/* Phase 1: Welcome & Feature Discovery */}
      <Stack.Screen name="OnboardingSlides" component={OnboardingSlidesScreen} />
      <Stack.Screen name="OnboardingHappyHours" component={OnboardingHappyHoursScreen} />
      <Stack.Screen name="OnboardingEvents" component={OnboardingEventsScreen} />
      <Stack.Screen name="OnboardingSpecials" component={OnboardingSpecialsScreen} />

      {/* Phase 2: Personal Questions */}
      <Stack.Screen name="OnboardingUserType" component={OnboardingUserTypeScreen} />
      <Stack.Screen name="OnboardingName" component={OnboardingNameScreen} />
      <Stack.Screen name="OnboardingDiningHabits" component={OnboardingDiningHabitsScreen} />
      <Stack.Screen name="OnboardingEventSeeking" component={OnboardingEventSeekingScreen} />

      {/* Phase 3: Preferences */}
      <Stack.Screen name="OnboardingBudget" component={OnboardingBudgetScreen} />
      <Stack.Screen name="OnboardingEntertainment" component={OnboardingEntertainmentScreen} />
      <Stack.Screen name="OnboardingFood" component={OnboardingFoodScreen} />

      {/* Phase 4: Summary & Conversion */}
      <Stack.Screen name="OnboardingPremium" component={OnboardingPremiumScreen} />
      <Stack.Screen name="OnboardingRosieAsk" component={OnboardingRosieAskScreen} />
      <Stack.Screen name="OnboardingVoting" component={OnboardingVotingScreen} />
      <Stack.Screen name="OnboardingVotingBadges" component={OnboardingVotingBadgesScreen} />
      <Stack.Screen name="OnboardingReviewAsk" component={OnboardingReviewAskScreen} />
      <Stack.Screen name="OnboardingPremiumIntro" component={OnboardingPremiumIntroScreen} />

      {/* Legacy screens (backward compatibility) */}
      <Stack.Screen name="OnboardingFrequency" component={OnboardingFrequencyScreen} />
      <Stack.Screen name="OnboardingDiscovery" component={OnboardingDiscoveryScreen} />
      <Stack.Screen name="OnboardingPreferences" component={OnboardingPreferencesScreen} />

      {/* Main App Entry */}
      <Stack.Screen name="Main" component={RootNavigator} />
    </Stack.Navigator>
  );
}
