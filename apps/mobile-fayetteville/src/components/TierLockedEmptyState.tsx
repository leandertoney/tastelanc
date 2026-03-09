import SharedTierLockedEmptyState from '@tastelanc/mobile-shared/src/components/TierLockedEmptyState';
import type { FeatureType } from '@tastelanc/mobile-shared/src/components/TierLockedEmptyState';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import type { SubscriptionTier } from '@tastelanc/mobile-shared/src/lib/tier-access';
import { Ionicons } from '@expo/vector-icons';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

// Feature type mapping to navigation routes
const FEATURE_ROUTES: Record<FeatureType, keyof RootStackParamList | null> = {
  'Happy Hours': 'HappyHoursViewAll',
  'Specials': 'SpecialsViewAll',
  'Events': 'EventsViewAll',
  'Menu': null,
};

interface TierLockedEmptyStateProps {
  featureName: FeatureType;
  restaurantName: string;
  restaurantId: string;
  tier: SubscriptionTier | null;
  icon?: keyof typeof Ionicons.glyphMap;
  itemCount?: number;
  previewText?: string;
  userId?: string | null;
}

export default function TierLockedEmptyState(props: TierLockedEmptyStateProps) {
  const navigation = useNavigation<NavigationProp>();

  const handleSeeOther = () => {
    const route = FEATURE_ROUTES[props.featureName];
    if (route) {
      // @ts-ignore - Route type checking will be fine at runtime
      navigation.navigate(route);
    } else {
      navigation.navigate('MainTabs', { screen: 'Search' });
    }
  };

  return <SharedTierLockedEmptyState {...props} onSeeOther={handleSeeOther} />;
}
