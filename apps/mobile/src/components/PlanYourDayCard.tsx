import SharedPlanYourDayCard from '@tastelanc/mobile-shared/src/components/PlanYourDayCard';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function PlanYourDayCard() {
  const navigation = useNavigation<NavigationProp>();
  return <SharedPlanYourDayCard onPress={() => navigation.navigate('ItineraryBuilder', {})} />;
}
