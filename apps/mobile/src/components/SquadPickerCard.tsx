import SharedSquadPickerCard from '@tastelanc/mobile-shared/src/components/SquadPickerCard';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function SquadPickerCard() {
  const navigation = useNavigation<NavigationProp>();
  return <SharedSquadPickerCard onPress={() => navigation.navigate('SquadBuilder')} />;
}
