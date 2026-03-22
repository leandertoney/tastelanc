import { View, Text, TouchableOpacity } from 'react-native';

const TERRACOTTA = '#C8532A';
const YELLOW = '#F0D060';

const ANGLES = [0, 60, 120];

interface Props {
  size?: number;
  onPress?: () => void;
}

export default function RestaurantWeekBadge({ size = 72, onPress }: Props) {
  const outerSq = Math.round(size / Math.SQRT2);
  const innerSq = Math.round(outerSq * 0.92);
  const fontSize = Math.round(size * 0.35);
  const yearSize = Math.round(fontSize * 0.38);

  const inner = (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      {ANGLES.map((angle) => (
        <View key={`y${angle}`} style={{ position: 'absolute', width: outerSq, height: outerSq, backgroundColor: YELLOW, transform: [{ rotate: `${angle}deg` }] }} />
      ))}
      {ANGLES.map((angle) => (
        <View key={`o${angle}`} style={{ position: 'absolute', width: innerSq, height: innerSq, backgroundColor: TERRACOTTA, transform: [{ rotate: `${angle}deg` }] }} />
      ))}
      <Text style={{ fontSize, fontWeight: '900', color: YELLOW, letterSpacing: 2 }}>
        {'RW'}
      </Text>
      <Text style={{ position: 'absolute', top: '65%', fontSize: yearSize, fontWeight: '700', color: YELLOW, letterSpacing: 1 }}>
        {'2026'}
      </Text>
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
        {inner}
      </TouchableOpacity>
    );
  }
  return inner;
}
