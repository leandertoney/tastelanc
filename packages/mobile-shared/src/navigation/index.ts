/**
 * Shared navigation — navigators and types.
 *
 * The navigators (BottomTabNavigator, OnboardingNavigator, RootNavigator) are
 * fully shared and can be imported directly by each app.
 *
 * The top-level Navigation wrapper (NavigationContainer + providers + splash)
 * remains app-specific because it depends on app-local env config, splash
 * video assets, and provider composition order.
 */

// Types
export type {
  BottomTabParamList,
  RootStackParamList,
  OnboardingStackParamList,
  ExtractedEventData,
  FlyerDraftData,
} from './types';

// Navigators
export { default as BottomTabNavigator } from './BottomTabNavigator';
export { default as OnboardingNavigator } from './OnboardingNavigator';
export { default as RootNavigator } from './RootNavigator';
