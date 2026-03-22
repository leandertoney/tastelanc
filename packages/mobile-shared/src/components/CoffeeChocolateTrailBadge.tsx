import { View, Text, TouchableOpacity } from 'react-native';

const CCT_PURPLE = '#5E2077';
const CCT_GOLD   = '#D4AF37';

// 3 squares at 0°, 60°, 120° → 12-pointed starburst (same geometry as RestaurantWeekBadge)
const ANGLES = [0, 60, 120];

interface Props {
  size?: number;
  onPress?: () => void;
}

/**
 * Starburst badge for Coffee & Chocolate Trail participants.
 * Gold tips + purple fill + circle center — mirrors RestaurantWeekBadge geometry.
 */
export default function CoffeeChocolateTrailBadge({ size = 72, onPress }: Props) {
  const outerSq  = Math.round(size / Math.SQRT2);
  const innerSq  = Math.round(outerSq * 0.92);
  const textWidth = outerSq;
  const fontSize  = Math.round(size * 0.09);

  const inner = (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      {/* Gold star tips (outer squares) */}
      {ANGLES.map((angle) => (
        <View
          key={`g${angle}`}
          style={{
            position: 'absolute',
            width: outerSq,
            height: outerSq,
            backgroundColor: CCT_GOLD,
            transform: [{ rotate: `${angle}deg` }],
          }}
        />
      ))}

      {/* Purple fill (inner squares — covers gold except at the tips) */}
      {ANGLES.map((angle) => (
        <View
          key={`p${angle}`}
          style={{
            position: 'absolute',
            width: innerSq,
            height: innerSq,
            backgroundColor: CCT_PURPLE,
            transform: [{ rotate: `${angle}deg` }],
          }}
        />
      ))}

      {/* Text centered over the starburst */}
      <Text
        style={{
          position: 'absolute',
          width: textWidth,
          fontSize,
          fontWeight: '900',
          color: CCT_GOLD,
          textAlign: 'center',
          letterSpacing: 0,
          textTransform: 'uppercase',
          lineHeight: fontSize * 1.2,
        }}
        adjustsFontSizeToFit
        minimumFontScale={0.4}
        numberOfLines={4}
      >
        {'☕🍫\nTRAIL\n2026'}
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
