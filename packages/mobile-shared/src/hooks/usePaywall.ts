import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import { usePremiumStatus } from './usePremiumStatus';

/**
 * Hook to trigger the paywall from anywhere in the app.
 * No-ops if the user is already premium.
 */
export function usePaywall() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { isPremium } = usePremiumStatus();

  const showPaywall = (source: string) => {
    if (isPremium) return;
    navigation.navigate('Paywall', { source });
  };

  return { showPaywall, isPremium };
}
