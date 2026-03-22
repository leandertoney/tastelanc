import { View, Text, TouchableOpacity } from 'react-native';

const TERRACOTTA = '#C8532A';
const YELLOW = '#F0D060';

// 3 squares at 0°, 60°, 120° → 12 pointed starburst
// Each square corner reaches exactly to the badge edge (side = size / √2)
const ANGLES = [0, 60, 120];

interface Props {
  size?: number;
  onPress?: () => void;
}

/**
 * Classic "SALE badge" starburst emblem for Restaurant Week participants.
 * Built from overlapping squares whose corners form the star points.
 * Yellow corners (outline) + orange fill + circle center with yellow text.
 */
export default function RestaurantWeekBadge({ size = 72, onPress }: Props) {
  // Outer (yellow) square: corners touch the badge edge exactly
  const outerSq = Math.round(size / Math.SQRT2);
  // Inner (orange) square: slightly smaller so ~3px yellow shows at each tip
  const innerSq = Math.round(outerSq * 0.92);
  // Text area: use the outer square's width so "RESTAURANT" fits on one line
  const textWidth = outerSq;
  const fontSize = Math.round(size * 0.35);

  const yearSize = Math.round(fontSize * 0.38);

  const inner = (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
        {/* Yellow star tips (outer squares) */}
        {ANGLES.map((angle) => (
          <View
            key={`y${angle}`}
            style={{
              position: 'absolute',
              width: outerSq,
              height: outerSq,
              backgroundColor: YELLOW,
              transform: [{ rotate: `${angle}deg` }],
            }}
          />
        ))}

        {/* Orange fill (inner squares — covers yellow except at the tips) */}
        {ANGLES.map((angle) => (
          <View
            key={`o${angle}`}
            style={{
              position: 'absolute',
              width: innerSq,
              height: innerSq,
              backgroundColor: TERRACOTTA,
              transform: [{ rotate: `${angle}deg` }],
            }}
          />
        ))}

        {/* RW — centered by parent's alignItems/justifyContent */}
        <Text style={{ fontSize, fontWeight: '900', color: YELLOW, letterSpacing: 2 }}>
          {'RW'}
        </Text>

        {/* 2026 — below center, independent */}
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
